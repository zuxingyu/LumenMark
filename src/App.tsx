import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { createRoot } from "react-dom/client";
import { FindReplaceBar } from "./components/FindReplaceBar";
import { RecoveryDialog } from "./components/RecoveryDialog";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { UnsavedDialog } from "./components/UnsavedDialog";
import { clearDraft, loadDraft, saveDraft, sessionFromDraft, shouldPersistDraft, type RecoveryDraft } from "./features/document/draft";
import { createOpenedSession, createUntitledSession, editSession, markSaved } from "./features/document/session";
import { buildOutline } from "./features/editor/document-tools";
import {
  buildStandaloneHtml,
  collectExportStyles,
  createExportPreviewHost,
  exportFileName,
  renderElementToPdfBase64,
  renderElementToPngBase64,
  waitForExportPreviewReady,
  type ExportFormat,
} from "./features/export/document-export";
import { MarkdownPreview } from "./features/preview/MarkdownPreview";
import { initialLocale, LOCALE_KEY, messages, RECENT_WORKSPACES_KEY, type Locale } from "./i18n";
import { createDemoApi, firstMarkdownPath, isTauriRuntime, tauriApi, type DesktopApi } from "./services/desktop";
import type { DocumentSession, OpenedDocument, RecentWorkspace, WorkspaceEntry, WorkspaceInfo, WorkspaceSearchResult } from "./types";

interface AppProps {
  api?: DesktopApi;
}

type PendingAction = (() => Promise<void>) | null;

const VisualMarkdownEditor = lazy(() => import("./components/VisualMarkdownEditor").then((module) => ({ default: module.VisualMarkdownEditor })));
const SIDEBAR_WIDTH_KEY = "lumenmark.sidebarWidth";
const SIDEBAR_COLLAPSED_KEY = "lumenmark.sidebarCollapsed";
const DEFAULT_SIDEBAR_WIDTH = 264;
const COLLAPSED_SIDEBAR_WIDTH = 56;
const MIN_EXPANDED_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 360;

function loadRecentWorkspaces(): RecentWorkspace[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_WORKSPACES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadSidebarWidth(): number {
  const parsed = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
  if (!Number.isFinite(parsed)) return DEFAULT_SIDEBAR_WIDTH;
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_EXPANDED_SIDEBAR_WIDTH, parsed));
}

function mapEntryTree(entries: WorkspaceEntry[], relativePath: string, update: (entry: WorkspaceEntry) => WorkspaceEntry): WorkspaceEntry[] {
  return entries.map((entry) => {
    if (entry.relativePath === relativePath) return update(entry);
    if (entry.children) return { ...entry, children: mapEntryTree(entry.children, relativePath, update) };
    return entry;
  });
}

export function App({ api: providedApi }: AppProps) {
  const api = useMemo(() => providedApi ?? (isTauriRuntime() ? tauriApi : createDemoApi()), [providedApi]);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const labels = messages[locale];
  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspace[]>(loadRecentWorkspaces);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [entries, setEntries] = useState<WorkspaceEntry[]>([]);
  const [session, setSession] = useState<DocumentSession>(() => createUntitledSession(messages[initialLocale()].untitled));
  const [editorKey, setEditorKey] = useState(0);
  const [findVisible, setFindVisible] = useState(false);
  const [searchResults, setSearchResults] = useState<WorkspaceSearchResult[]>([]);
  const [searchRevealText, setSearchRevealText] = useState<string>();
  const [sidebarWidth, setSidebarWidth] = useState(loadSidebarWidth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
  const [sidebarPanel, setSidebarPanel] = useState<"workspace" | "outline">("workspace");
  const [pendingDraft, setPendingDraft] = useState<RecoveryDraft | null>(() => loadDraft());
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [status, setStatus] = useState<string>(() => messages[initialLocale()].ready);
  const [error, setError] = useState<string>();
  const allowClose = useRef(false);
  const localeRef = useRef(locale);
  const sessionRef = useRef(session);
  localeRef.current = locale;
  sessionRef.current = session;
  const outline = useMemo(() => buildOutline(session.sourceText), [session.sourceText]);
  const assetContext = session.root && session.path ? { root: session.root, path: session.path } : null;

  function replaceSession(next: DocumentSession, revealText?: string) {
    setSearchRevealText(revealText);
    setSession(next);
    setEditorKey((current) => current + 1);
  }

  useEffect(() => {
    localStorage.setItem(RECENT_WORKSPACES_KEY, JSON.stringify(recentWorkspaces));
  }, [recentWorkspaces]);

  useEffect(() => {
    if (!sidebarCollapsed) localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarCollapsed, sidebarWidth]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    void api.setMenuLocale(locale === "zh-CN" ? "zh" : "en").catch(() => undefined);
  }, [api, locale]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (shouldPersistDraft(session)) saveDraft(session);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [session]);

  function changeLocale() {
    const next = locale === "zh-CN" ? "en-US" : "zh-CN";
    localStorage.setItem(LOCALE_KEY, next);
    setLocale(next);
    setStatus(messages[next].ready);
  }

  async function exportDocument(format: ExportFormat) {
    const defaultName = exportFileName(session.title || "document", format);
    const host = createExportPreviewHost();
    const previewRoot = createRoot(host);
    try {
      previewRoot.render(
        <MarkdownPreview
          locale={locale}
          source={session.sourceText}
          imageResolver={assetContext ? (source) => api.readWorkspaceAsset(assetContext.root, assetContext.path, source) : undefined}
        />,
      );
      await waitForExportPreviewReady(host);
      const preview = host.querySelector<HTMLElement>(".markdown-preview");
      if (!preview) throw new Error("Export preview did not render.");

      if (format === "html") {
        const html = buildStandaloneHtml({
          title: session.title || defaultName,
          body: preview.innerHTML,
          styles: collectExportStyles(),
        });
        const saved = await api.saveExportTextFile(defaultName, html);
        if (saved) setStatus(labels.exportComplete.replace("{name}", saved.split(/[\\/]/).at(-1) ?? saved));
        return;
      }

      const contentBase64 = format === "png"
        ? await renderElementToPngBase64(preview)
        : await renderElementToPdfBase64(preview);
      const saved = await api.saveExportBinaryFile(defaultName, contentBase64);
      if (saved) setStatus(labels.exportComplete.replace("{name}", saved.split(/[\\/]/).at(-1) ?? saved));
    } finally {
      previewRoot.unmount();
      host.remove();
    }
  }

  const attempt = useCallback(async (action: () => Promise<void>) => {
    try {
      setError(undefined);
      await action();
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : String(reason);
      setError(`${labels.operationFailed}: ${detail}`);
    }
  }, [labels.operationFailed]);
  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;
  const appCommandHandler = useRef<(command: string) => void>(() => undefined);

  const saveDocument = useCallback(async (): Promise<boolean> => {
    try {
      if (session.sourceKind === "untitled") {
        const saved = await api.saveNewMarkdownFile(session.sourceText);
        if (!saved) return false;
        replaceSession(markSaved(createOpenedSession("single-file", saved.root, saved.relativePath, session.sourceText)));
        clearDraft();
        setStatus(locale === "zh-CN" ? `已保存 ${saved.name}` : `Saved ${saved.name}`);
      } else {
        if (!session.root || !session.path) return false;
        await api.writeMarkdownFile(session.root, session.path, session.sourceText);
        setSession((current) => markSaved(current));
        clearDraft();
        setStatus(locale === "zh-CN" ? `已保存 ${session.path}` : `Saved ${session.path}`);
      }
      setError(undefined);
      return true;
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : String(reason);
      setError(`${labels.operationFailed}: ${detail}`);
      return false;
    }
  }, [api, labels.operationFailed, locale, session]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (session.isDirty) void saveDocument();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFindVisible(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveDocument, session]);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      const currentWindow = getCurrentWindow();
      void currentWindow.onCloseRequested((event) => {
        if (!session.isDirty || allowClose.current) return;
        event.preventDefault();
        setPendingAction(() => async () => {
          allowClose.current = true;
          await currentWindow.close();
        });
      }).then((stop) => {
        unlisten = stop;
      });
    });
    return () => unlisten?.();
  }, [session.isDirty]);

  function afterDirty(action: () => Promise<void>) {
    if (session.isDirty) setPendingAction(() => action);
    else void attempt(action);
  }

  function editOpenedDocument(selected: OpenedDocument) {
    setWorkspace(null);
    setEntries([]);
    setSearchResults([]);
    replaceSession(createOpenedSession("single-file", selected.root, selected.relativePath, selected.content));
    setStatus(localeRef.current === "zh-CN" ? `正在编辑 ${selected.name}` : `Editing ${selected.name}`);
  }

  useEffect(() => {
    if (isTauriRuntime()) return;
    let active = true;
    void api.pendingExternalDocuments()
      .then(([selected]) => {
        if (active && selected) editOpenedDocument(selected);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        const detail = reason instanceof Error ? reason.message : String(reason);
        setError(`${messages[localeRef.current].operationFailed}: ${detail}`);
      });
    return () => {
      active = false;
    };
    // Non-desktop adapters do not publish native document-open events.
  }, [api]);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    let disposed = false;
    const stops: Array<() => void> = [];
    const requestOpen = (selected: OpenedDocument, ignoredAdditionalFiles = false) => {
      const action = async () => {
        editOpenedDocument(selected);
        if (ignoredAdditionalFiles) {
          setStatus(localeRef.current === "zh-CN" ? "已打开首个 Markdown 文件，其余文件未处理" : "Opened the first Markdown file; other files were ignored");
        }
      };
      if (sessionRef.current.isDirty) setPendingAction(() => action);
      else void attemptRef.current(action);
    };

    void (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      const stopEvents = await listen<OpenedDocument>("external-document-opened", (event) => requestOpen(event.payload));
      if (disposed) {
        stopEvents();
        return;
      }
      stops.push(stopEvents);
      const [pendingDocument] = await api.pendingExternalDocuments();
      if (pendingDocument) requestOpen(pendingDocument);

      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const stopDrops = await getCurrentWindow().onDragDropEvent(async (event) => {
        if (event.payload.type !== "drop") return;
        const path = firstMarkdownPath(event.payload.paths);
        if (!path) return;
        try {
          const selected = await api.openExternalMarkdownFile(path);
          requestOpen(selected, event.payload.paths.length > 1);
        } catch (reason) {
          const detail = reason instanceof Error ? reason.message : String(reason);
          setError(`${messages[localeRef.current].operationFailed}: ${detail}`);
        }
      });
      if (disposed) {
        stopDrops();
        return;
      }
      stops.push(stopDrops);
    })().catch((reason: unknown) => {
      if (!disposed) {
        const detail = reason instanceof Error ? reason.message : String(reason);
        setError(`${messages[localeRef.current].operationFailed}: ${detail}`);
      }
    });
    return () => {
      disposed = true;
      stops.forEach((stop) => stop());
    };
  }, [api]);

  function addRecentWorkspace(selected: WorkspaceInfo) {
    setRecentWorkspaces((current) => [
      selected,
      ...current.filter((entry) => entry.root !== selected.root),
    ]);
  }

  function activateWorkspace(selected: WorkspaceInfo) {
    return async () => {
      const nextEntries = await api.listWorkspaceEntries(selected.root);
      setWorkspace(selected);
      setEntries(nextEntries);
      setSearchResults([]);
      setSidebarPanel("workspace");
      replaceSession(createUntitledSession(labels.untitled));
      setStatus(locale === "zh-CN" ? `已打开 ${selected.name}` : `Opened ${selected.name}`);
    };
  }

  function openWorkspace() {
    afterDirty(async () => {
      const selected = await api.selectWorkspace();
      if (!selected) return;
      addRecentWorkspace(selected);
      await activateWorkspace(selected)();
    });
  }

  function openRecentWorkspace(selected: RecentWorkspace) {
    afterDirty(activateWorkspace(selected));
  }

  function removeWorkspace(selected: RecentWorkspace) {
    const remove = async () => {
      setRecentWorkspaces((current) => current.filter((entry) => entry.root !== selected.root));
      if (workspace?.root === selected.root) {
        setWorkspace(null);
        setEntries([]);
        replaceSession(createUntitledSession(labels.untitled));
      }
      setStatus(locale === "zh-CN" ? `已移除 ${selected.name} 的关联` : `Removed ${selected.name}`);
    };
    if (workspace?.root === selected.root) afterDirty(remove);
    else void remove();
  }

  function openFile() {
    afterDirty(async () => {
      const selected = await api.selectMarkdownFile();
      if (!selected) return;
      editOpenedDocument(selected);
    });
  }

  function selectEntry(entry: WorkspaceEntry) {
    if (!workspace) return;
    if (entry.kind === "directory") {
      void attempt(async () => {
        const children = entry.childrenLoaded
          ? entry.children ?? []
          : await api.listWorkspaceEntries(workspace.root, entry.relativePath);
        setEntries((current) => mapEntryTree(current, entry.relativePath, (currentEntry) => ({
          ...currentEntry,
          children,
          childrenLoaded: true,
          expanded: !currentEntry.expanded,
        })));
      });
      return;
    }
    afterDirty(async () => {
      const document = await api.readMarkdownFile(workspace.root, entry.relativePath);
      replaceSession(createOpenedSession("workspace", workspace.root, document.relativePath, document.content));
      setStatus(locale === "zh-CN" ? `正在阅读 ${entry.name}` : `Reading ${entry.name}`);
    });
  }

  function createDocument() {
    afterDirty(async () => {
      replaceSession(createUntitledSession(labels.untitled));
      setStatus(locale === "zh-CN" ? "已新建空白文档" : "New blank document");
    });
  }

  function renameDocument() {
    if (!workspace || session.sourceKind !== "workspace" || !session.path) return;
    const currentPath = session.path;
    const workspaceRoot = workspace.root;
    const oldName = currentPath.split("/").at(-1) ?? currentPath;
    const requested = window.prompt(labels.renamePrompt, oldName);
    if (!requested || requested === oldName) return;
    const nextName = requested.endsWith(".md") ? requested : `${requested}.md`;
    const parent = currentPath.includes("/") ? currentPath.slice(0, currentPath.lastIndexOf("/") + 1) : "";
    const nextPath = `${parent}${nextName}`;
    void attempt(async () => {
      const renamed = await api.renameMarkdownEntry(workspaceRoot, currentPath, nextPath);
      setEntries((current) => mapEntryTree(current, currentPath, () => renamed));
      setSession((current) => ({ ...current, path: renamed.relativePath, title: renamed.name }));
      setEditorKey((current) => current + 1);
      setStatus(locale === "zh-CN" ? `已重命名为 ${renamed.name}` : `Renamed to ${renamed.name}`);
    });
  }

  function replaceFromFind(sourceText: string) {
    setSession((current) => editSession(current, sourceText));
    setEditorKey((current) => current + 1);
  }

  const searchWorkspace = useCallback((query: string) => {
    if (!workspace || !query.trim()) {
      setSearchResults([]);
      return;
    }
    void attempt(async () => {
      const results = await api.searchWorkspace(workspace.root, query);
      setSearchResults(results);
      setStatus(locale === "zh-CN" ? `找到 ${results.length} 个匹配项` : `Found ${results.length} matches`);
    });
  }, [api, attempt, locale, workspace]);

  function openSearchResult(result: WorkspaceSearchResult) {
    if (!workspace) return;
    afterDirty(async () => {
      const document = await api.readMarkdownFile(workspace.root, result.relativePath);
      replaceSession(
        createOpenedSession("workspace", workspace.root, document.relativePath, document.content),
        result.kind === "content" ? result.excerpt : undefined,
      );
      setStatus(result.kind === "content" && result.line
        ? (locale === "zh-CN" ? `已打开 ${result.name} 第 ${result.line} 行` : `Opened ${result.name} line ${result.line}`)
        : (locale === "zh-CN" ? `已打开 ${result.name}` : `Opened ${result.name}`));
    });
  }

  function resizeSidebar(startEvent: ReactPointerEvent<HTMLButtonElement>) {
    startEvent.currentTarget.setPointerCapture(startEvent.pointerId);
    const originX = startEvent.clientX;
    const originWidth = sidebarWidth;
    const move = (event: PointerEvent) => {
      const rawWidth = originWidth + event.clientX - originX;
      if (rawWidth <= 96) {
        setSidebarCollapsed(true);
        setSidebarWidth(MIN_EXPANDED_SIDEBAR_WIDTH);
        return;
      }
      setSidebarCollapsed(false);
      setSidebarWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_EXPANDED_SIDEBAR_WIDTH, rawWidth)));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  appCommandHandler.current = (command: string) => {
    if (command === "new-document") createDocument();
    else if (command === "open-file") openFile();
    else if (command === "open-folder") openWorkspace();
    else if (command === "save-document") void saveDocument();
    else if (command === "find") setFindVisible(true);
    else if (command === "export-html") void attempt(() => exportDocument("html"));
    else if (command === "export-pdf") void attempt(() => exportDocument("pdf"));
    else if (command === "export-png") void attempt(() => exportDocument("png"));
    else if (command === "toggle-locale") changeLocale();
    else if (command === "show-workspace-panel") setSidebarPanel("workspace");
    else if (command === "show-outline-panel") setSidebarPanel("outline");
  };

  useEffect(() => {
    const runWindowCommand = (event: Event) => {
      const command = (event as CustomEvent<string>).detail;
      if (command) appCommandHandler.current(command);
    };
    window.addEventListener("lumenmark:app-command", runWindowCommand);
    let unlistenAppMenu: (() => void) | undefined;
    if (isTauriRuntime()) {
      void import("@tauri-apps/api/event")
        .then(({ listen }) => listen<string>("app-command", (event) => appCommandHandler.current(event.payload)))
        .then((unlisten) => {
          unlistenAppMenu = unlisten;
        });
    }
    return () => {
      window.removeEventListener("lumenmark:app-command", runWindowCommand);
      unlistenAppMenu?.();
    };
  }, []);

  return (
    <div className="app-shell">
      <Toolbar labels={labels} />
      <div
        className={sidebarCollapsed ? "workspace-layout sidebar-collapsed" : "workspace-layout"}
        style={{ "--sidebar-width": `${sidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth}px` } as CSSProperties}
      >
        <Sidebar
          labels={labels}
          workspace={workspace}
          recentWorkspaces={recentWorkspaces}
          entries={entries}
          outline={outline}
          activePath={workspace ? session.path ?? undefined : undefined}
          collapsed={sidebarCollapsed}
          searchResults={searchResults}
          activePanel={sidebarPanel}
          onSelect={selectEntry}
          onSelectWorkspace={openRecentWorkspace}
          onRemoveWorkspace={removeWorkspace}
          onRename={renameDocument}
          onOutlineSelect={(item) => window.dispatchEvent(new CustomEvent("lumenmark:outline", { detail: item.id }))}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
          onPanelChange={setSidebarPanel}
          onSearch={searchWorkspace}
          onOpenSearchResult={openSearchResult}
        />
        <button
          className="sidebar-resizer"
          type="button"
          aria-label={labels.workspace}
          onPointerDown={resizeSidebar}
        />
        <main className="document-surface">
          {findVisible ? (
            <div className="find-stack">
              <FindReplaceBar
                labels={labels}
                source={session.sourceText}
                onReplace={replaceFromFind}
                onClose={() => {
                  setFindVisible(false);
                }}
              />
            </div>
          ) : null}
          <Suspense fallback={<div className="surface-loading">{labels.loading}</div>}>
            <VisualMarkdownEditor
              key={editorKey}
              labels={labels}
              title={session.title}
              value={session.sourceText}
              onChange={(value) => setSession((current) => editSession(current, value))}
              revealText={searchRevealText}
              resolveImage={assetContext
                ? (source) => api.readWorkspaceAsset(assetContext.root, assetContext.path, source)
                : undefined}
            />
          </Suspense>
        </main>
      </div>
      <footer className="statusbar">
        <span>{status}</span>
        {error ? <span className="error" role="alert">{error}</span> : <span>{session.isDirty ? labels.unsaved : labels.saved}</span>}
      </footer>
      {pendingAction ? (
        <UnsavedDialog
          labels={labels}
          onCancel={() => setPendingAction(null)}
          onDiscard={() => {
            const action = pendingAction;
            setPendingAction(null);
            void attempt(action);
          }}
          onSave={() => {
            const action = pendingAction;
            void saveDocument().then((saved) => {
              if (saved) {
                setPendingAction(null);
                void attempt(action);
              }
            });
          }}
        />
      ) : null}
      {pendingDraft ? (
        <RecoveryDialog
          labels={labels}
          draft={pendingDraft}
          onDiscard={() => {
            clearDraft();
            setPendingDraft(null);
          }}
          onRestore={() => {
            replaceSession(sessionFromDraft(pendingDraft));
            setPendingDraft(null);
            setStatus(locale === "zh-CN" ? "已恢复本地草稿" : "Local draft restored");
          }}
        />
      ) : null}
    </div>
  );
}
