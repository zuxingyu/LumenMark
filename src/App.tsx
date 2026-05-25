import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { UnsavedDialog } from "./components/UnsavedDialog";
import { changeMode, createSession, editSession, markSaved } from "./features/document/session";
import { initialLocale, LOCALE_KEY, messages, RECENT_WORKSPACES_KEY, type Locale } from "./i18n";
import { createDemoApi, isTauriRuntime, tauriApi, type DesktopApi } from "./services/desktop";
import type { DocumentContext, DocumentSession, RecentWorkspace, WorkspaceEntry, WorkspaceInfo } from "./types";

interface AppProps {
  api?: DesktopApi;
}

type PendingAction = (() => Promise<void>) | null;

const MarkdownPreview = lazy(() => import("./features/preview/MarkdownPreview").then((module) => ({ default: module.MarkdownPreview })));
const EditorPanel = lazy(() => import("./components/EditorPanel").then((module) => ({ default: module.EditorPanel })));

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
  const [context, setContext] = useState<DocumentContext | null>(null);
  const [entries, setEntries] = useState<WorkspaceEntry[]>([]);
  const [session, setSession] = useState<DocumentSession | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [status, setStatus] = useState<string>(() => messages[initialLocale()].ready);
  const [error, setError] = useState<string>();
  const allowClose = useRef(false);

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
    if (!context || !session) return false;
    try {
      await api.writeMarkdownFile(context.root, session.path, session.sourceText);
      setSession((current) => (current ? markSaved(current) : current));
      setStatus(locale === "zh-CN" ? `已保存 ${session.path}` : `Saved ${session.path}`);
      setError(undefined);
      return true;
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : String(reason);
      setError(`${labels.operationFailed}: ${detail}`);
      return false;
    }
  }, [api, context, labels.operationFailed, locale, session]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && session) {
        event.preventDefault();
        if (session.isDirty) void saveDocument();
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
        if (!session?.isDirty || allowClose.current) return;
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
  }, [session?.isDirty]);

  function afterDirty(action: () => Promise<void>) {
    if (session?.isDirty) setPendingAction(() => action);
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
      setContext({ kind: "workspace", root: selected.root, workspaceName: selected.name });
      setEntries(nextEntries);
      setSession(null);
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
        setContext(null);
        setEntries([]);
        setSession(null);
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
      setContext({ kind: "single-file", root: selected.root });
      setSession(createSession(selected.relativePath, selected.content));
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
      setSession(createSession(document.relativePath, document.content));
      setStatus(locale === "zh-CN" ? `正在阅读 ${entry.name}` : `Reading ${entry.name}`);
    });
  }

  function createDocument() {
    if (!workspace) return;
    afterDirty(async () => {
      const requested = window.prompt(labels.createPrompt, "untitled.md");
      if (!requested) return;
      const filename = requested.endsWith(".md") ? requested : `${requested}.md`;
      const entry = await api.createMarkdownFile(workspace.root, filename);
      setEntries((current) => [...current, entry]);
      const document = await api.readMarkdownFile(workspace.root, entry.relativePath);
      setSession(createSession(document.relativePath, document.content));
      setStatus(locale === "zh-CN" ? `已创建 ${entry.name}` : `Created ${entry.name}`);
    });
  }

  function renameDocument() {
    if (!workspace || !session) return;
    const oldName = session.path.split("/").at(-1) ?? session.path;
    const requested = window.prompt(labels.renamePrompt, oldName);
    if (!requested || requested === oldName) return;
    const nextName = requested.endsWith(".md") ? requested : `${requested}.md`;
    const parent = session.path.includes("/") ? session.path.slice(0, session.path.lastIndexOf("/") + 1) : "";
    const nextPath = `${parent}${nextName}`;
    void attempt(async () => {
      const renamed = await api.renameMarkdownEntry(workspace.root, session.path, nextPath);
      setEntries((current) => mapEntryTree(current, session.path, () => renamed));
      setSession((current) => current ? { ...current, path: renamed.relativePath } : current);
      setStatus(locale === "zh-CN" ? `已重命名为 ${renamed.name}` : `Renamed to ${renamed.name}`);
    });
  }

  return (
    <div className="app-shell">
      <Toolbar
        labels={labels}
        hasWorkspace={Boolean(workspace)}
        hasDocument={Boolean(session)}
        dirty={Boolean(session?.isDirty)}
        mode={session?.mode ?? "preview"}
        onOpenFile={openFile}
        onOpenFolder={openWorkspace}
        onNew={createDocument}
        onSave={() => void saveDocument()}
        onToggleMode={() => setSession((current) => current ? changeMode(current, current.mode === "preview" ? "edit" : "preview") : current)}
        onToggleLocale={changeLocale}
      />
      <div className="workspace-layout">
        <Sidebar
          labels={labels}
          workspace={workspace}
          recentWorkspaces={recentWorkspaces}
          entries={entries}
          activePath={workspace ? session?.path : undefined}
          onSelect={selectEntry}
          onSelectWorkspace={openRecentWorkspace}
          onRemoveWorkspace={removeWorkspace}
          onRename={renameDocument}
        />
        <main className="document-surface">
          {session && context ? (
            <Suspense fallback={<div className="surface-loading">{labels.loading}</div>}>
              {session.mode === "preview" ? (
                <MarkdownPreview
                  locale={locale}
                  source={session.sourceText}
                  imageResolver={(source) => api.readWorkspaceAsset(context.root, session.path, source)}
                />
              ) : (
                <EditorPanel
                  labels={labels}
                  path={session.path}
                  value={session.sourceText}
                  onChange={(value) => setSession((current) => current ? editSession(current, value) : current)}
                />
              )}
            </Suspense>
          ) : (
            <section className="welcome">
              <div className="welcome-mark">L</div>
              <h1>LumenMark</h1>
              <p>{labels.welcome}</p>
              <div className="welcome-actions">
                <button type="button" onClick={openFile}>{labels.openFile}</button>
                <button className="primary" type="button" onClick={openWorkspace}>{labels.openFolder}</button>
              </div>
            </section>
          )}
        </main>
      </div>
      <footer className="statusbar">
        <span>{status}</span>
        {error ? <span className="error" role="alert">{error}</span> : <span>{session?.isDirty ? labels.unsaved : labels.saved}</span>}
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
