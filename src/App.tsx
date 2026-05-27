import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FindReplaceBar } from "./components/FindReplaceBar";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { UnsavedDialog } from "./components/UnsavedDialog";
import { createOpenedSession, createUntitledSession, editSession, markSaved } from "./features/document/session";
import { buildOutline } from "./features/editor/document-tools";
import { initialLocale, LOCALE_KEY, messages, RECENT_WORKSPACES_KEY, type Locale } from "./i18n";
import { createDemoApi, isTauriRuntime, tauriApi, type DesktopApi } from "./services/desktop";
import type { DocumentSession, RecentWorkspace, WorkspaceEntry, WorkspaceInfo } from "./types";

interface AppProps {
  api?: DesktopApi;
}

type PendingAction = (() => Promise<void>) | null;

const VisualMarkdownEditor = lazy(() => import("./components/VisualMarkdownEditor").then((module) => ({ default: module.VisualMarkdownEditor })));

function loadRecentWorkspaces(): RecentWorkspace[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_WORKSPACES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [status, setStatus] = useState<string>(() => messages[initialLocale()].ready);
  const [error, setError] = useState<string>();
  const allowClose = useRef(false);
  const outline = useMemo(() => buildOutline(session.sourceText), [session.sourceText]);

  function replaceSession(next: DocumentSession) {
    setSession(next);
    setEditorKey((current) => current + 1);
  }

  useEffect(() => {
    localStorage.setItem(RECENT_WORKSPACES_KEY, JSON.stringify(recentWorkspaces));
  }, [recentWorkspaces]);

  function changeLocale() {
    const next = locale === "zh-CN" ? "en-US" : "zh-CN";
    localStorage.setItem(LOCALE_KEY, next);
    setLocale(next);
    setStatus(messages[next].ready);
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

  const saveDocument = useCallback(async (): Promise<boolean> => {
    try {
      if (session.sourceKind === "untitled") {
        const saved = await api.saveNewMarkdownFile(session.sourceText);
        if (!saved) return false;
        replaceSession(markSaved(createOpenedSession("single-file", saved.root, saved.relativePath, session.sourceText)));
        setStatus(locale === "zh-CN" ? `已保存 ${saved.name}` : `Saved ${saved.name}`);
      } else {
        if (!session.root || !session.path) return false;
        await api.writeMarkdownFile(session.root, session.path, session.sourceText);
        setSession((current) => markSaved(current));
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
      setWorkspace(null);
      setEntries([]);
      replaceSession(createOpenedSession("single-file", selected.root, selected.relativePath, selected.content));
      setStatus(locale === "zh-CN" ? `正在阅读 ${selected.name}` : `Reading ${selected.name}`);
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
      setStatus(locale === "zh-CN" ? `已重命名为 ${renamed.name}` : `Renamed to ${renamed.name}`);
    });
  }

  function replaceFromFind(sourceText: string) {
    setSession((current) => editSession(current, sourceText));
    setEditorKey((current) => current + 1);
  }

  return (
    <div className="app-shell">
      <Toolbar
        labels={labels}
        hasWorkspace={Boolean(workspace)}
        hasDocument
        dirty={session.isDirty}
        onOpenFile={openFile}
        onOpenFolder={openWorkspace}
        onNew={createDocument}
        onSave={() => void saveDocument()}
        onFind={() => setFindVisible(true)}
        onToggleLocale={changeLocale}
      />
      <div className="workspace-layout">
        <Sidebar
          labels={labels}
          workspace={workspace}
          recentWorkspaces={recentWorkspaces}
          entries={entries}
          outline={outline}
          activePath={workspace ? session.path ?? undefined : undefined}
          onSelect={selectEntry}
          onSelectWorkspace={openRecentWorkspace}
          onRemoveWorkspace={removeWorkspace}
          onRename={renameDocument}
          onOutlineSelect={(item) => window.dispatchEvent(new CustomEvent("lumenmark:outline", { detail: item.id }))}
        />
        <main className="document-surface">
          {findVisible ? (
            <FindReplaceBar
              labels={labels}
              source={session.sourceText}
              onReplace={replaceFromFind}
              onClose={() => setFindVisible(false)}
            />
          ) : null}
          <Suspense fallback={<div className="surface-loading">{labels.loading}</div>}>
            <VisualMarkdownEditor
              key={editorKey}
              labels={labels}
              title={session.title}
              value={session.sourceText}
              onChange={(value) => setSession((current) => editSession(current, value))}
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
    </div>
  );
}
