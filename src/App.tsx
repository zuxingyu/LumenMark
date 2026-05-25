import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { UnsavedDialog } from "./components/UnsavedDialog";
import { createSession, editSession, markSaved, changeMode } from "./features/document/session";
import { createDemoApi, exportFiles, isTauriRuntime, tauriApi, type DesktopApi } from "./services/desktop";
import type { DocumentSession, WorkspaceEntry, WorkspaceInfo } from "./types";

interface AppProps {
  api?: DesktopApi;
}

type PendingAction = (() => Promise<void>) | null;

const MarkdownPreview = lazy(() => import("./features/preview/MarkdownPreview").then((module) => ({ default: module.MarkdownPreview })));
const EditorPanel = lazy(() => import("./components/EditorPanel").then((module) => ({ default: module.EditorPanel })));

function mapEntryTree(entries: WorkspaceEntry[], relativePath: string, update: (entry: WorkspaceEntry) => WorkspaceEntry): WorkspaceEntry[] {
  return entries.map((entry) => {
    if (entry.relativePath === relativePath) return update(entry);
    if (entry.children) return { ...entry, children: mapEntryTree(entry.children, relativePath, update) };
    return entry;
  });
}

function removeEntry(entries: WorkspaceEntry[], relativePath: string): WorkspaceEntry[] {
  return entries
    .filter((entry) => entry.relativePath !== relativePath)
    .map((entry) => entry.children ? { ...entry, children: removeEntry(entry.children, relativePath) } : entry);
}

export function App({ api: providedApi }: AppProps) {
  const api = useMemo(() => providedApi ?? (isTauriRuntime() ? tauriApi : createDemoApi()), [providedApi]);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [entries, setEntries] = useState<WorkspaceEntry[]>([]);
  const [session, setSession] = useState<DocumentSession | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState<string>();
  const allowClose = useRef(false);

  const attempt = useCallback(async (action: () => Promise<void>) => {
    try {
      setError(undefined);
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }, []);

  const saveDocument = useCallback(async (): Promise<boolean> => {
    if (!workspace || !session) return false;
    try {
      await api.writeMarkdownFile(workspace.root, session.path, session.sourceText);
      setSession((current) => (current ? markSaved(current) : current));
      setStatus(`Saved ${session.path}`);
      setError(undefined);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      return false;
    }
  }, [api, session, workspace]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && session) {
        event.preventDefault();
        if (session.isDirty) void saveDocument();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveDocument, session?.isDirty]);

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
          await currentWindow.destroy();
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

  function openWorkspace() {
    afterDirty(async () => {
      const selected = await api.selectWorkspace();
      if (!selected) return;
      const nextEntries = await api.listWorkspaceEntries(selected.root);
      setWorkspace(selected);
      setEntries(nextEntries);
      setSession(null);
      setStatus(`Opened ${selected.name}`);
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
      setStatus(`Reading ${entry.name}`);
    });
  }

  function createDocument() {
    if (!workspace) return;
    afterDirty(async () => {
      const requested = window.prompt("New Markdown document name", "untitled.md");
      if (!requested) return;
      const filename = requested.endsWith(".md") ? requested : `${requested}.md`;
      const entry = await api.createMarkdownFile(workspace.root, filename);
      setEntries((current) => [...current, entry]);
      const document = await api.readMarkdownFile(workspace.root, entry.relativePath);
      setSession(createSession(document.relativePath, document.content));
      setStatus(`Created ${entry.name}`);
    });
  }

  function renameDocument() {
    if (!workspace || !session) return;
    const oldName = session.path.split("/").at(-1) ?? session.path;
    const requested = window.prompt("Rename Markdown document", oldName);
    if (!requested || requested === oldName) return;
    const nextName = requested.endsWith(".md") ? requested : `${requested}.md`;
    const parent = session.path.includes("/") ? `${session.path.slice(0, session.path.lastIndexOf("/") + 1)}` : "";
    const nextPath = `${parent}${nextName}`;
    void attempt(async () => {
      const renamed = await api.renameMarkdownEntry(workspace.root, session.path, nextPath);
      setEntries((current) => mapEntryTree(current, session.path, () => renamed));
      setSession((current) => current ? { ...current, path: renamed.relativePath } : current);
      setStatus(`Renamed to ${renamed.name}`);
    });
  }

  function deleteDocument() {
    if (!workspace || !session || !window.confirm(`Delete ${session.path}? This cannot be undone.`)) return;
    void attempt(async () => {
      await api.deleteMarkdownEntry(workspace.root, session.path);
      setEntries((current) => removeEntry(current, session.path));
      setSession(null);
      setStatus("Document deleted");
    });
  }

  async function exportCode() {
    if (!session) return;
    const { buildExportItems } = await import("./features/export/codeBlocks");
    const items = buildExportItems(session.sourceText);
    if (items.length === 0) {
      setStatus("No fenced code blocks found");
      return;
    }
    const directory = await api.chooseExportDirectory();
    if (!directory) return;
    if (!window.confirm(`Export ${items.length} code blocks?\n\n${items.map((item) => item.resolvedFileName).join("\n")}`)) return;
    const result = await api.exportCodeBlocks(directory, exportFiles(items), false);
    if (result.conflicts.length > 0 && window.confirm(`Overwrite existing files?\n\n${result.conflicts.join("\n")}`)) {
      const conflicts = items.filter((item) => result.conflicts.includes(item.resolvedFileName));
      const overwritten = await api.exportCodeBlocks(directory, exportFiles(conflicts), true);
      result.written.push(...overwritten.written);
    }
    setStatus(`Exported ${result.written.length} files${result.rejected.length ? `; rejected ${result.rejected.length}` : ""}`);
  }

  return (
    <div className="app-shell">
      <Toolbar
        hasWorkspace={Boolean(workspace)}
        hasDocument={Boolean(session)}
        dirty={Boolean(session?.isDirty)}
        mode={session?.mode ?? "preview"}
        onOpen={openWorkspace}
        onNew={createDocument}
        onSave={() => void saveDocument()}
        onToggleMode={() => setSession((current) => current ? changeMode(current, current.mode === "preview" ? "edit" : "preview") : current)}
        onExport={() => void attempt(exportCode)}
      />
      <div className="workspace-layout">
        <Sidebar
          workspace={workspace}
          entries={entries}
          activePath={session?.path}
          onSelect={selectEntry}
          onRename={renameDocument}
          onDelete={deleteDocument}
        />
        <main className="document-surface">
          {session ? (
            <Suspense fallback={<div className="surface-loading">Loading document...</div>}>
              {session.mode === "preview" ? (
                <MarkdownPreview
                  source={session.sourceText}
                  imageResolver={(source) => api.readWorkspaceAsset(workspace!.root, session.path, source)}
                />
              ) : (
                <EditorPanel
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
              <p>Open a Markdown workspace to read and edit technical documentation with formulas, diagrams, and exportable code.</p>
              <button className="primary" type="button" onClick={openWorkspace}>Open Folder</button>
            </section>
          )}
        </main>
      </div>
      <footer className="statusbar">
        <span>{status}</span>
        {error ? <span className="error" role="alert">{error}</span> : <span>{session?.isDirty ? "Unsaved changes" : "Saved"}</span>}
      </footer>
      {pendingAction ? (
        <UnsavedDialog
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
