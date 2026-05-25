import { ChevronDown, ChevronRight, FileText, Folder, FolderTree, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import type { WorkspaceEntry, WorkspaceInfo } from "../types";

interface SidebarProps {
  workspace: WorkspaceInfo | null;
  entries: WorkspaceEntry[];
  activePath?: string;
  onSelect(entry: WorkspaceEntry): void;
  onRename(): void;
  onDelete(): void;
}

export function Sidebar({ workspace, entries, activePath, onSelect, onRename, onDelete }: SidebarProps) {
  function treeRow(entry: WorkspaceEntry, depth = 0): ReactNode {
    const isDirectory = entry.kind === "directory";
    return (
      <div key={entry.relativePath}>
        <button
          className={entry.relativePath === activePath ? "tree-item active" : "tree-item"}
          style={{ paddingLeft: `${16 + depth * 16}px` }}
          type="button"
          onClick={() => onSelect(entry)}
        >
          {isDirectory ? (entry.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="tree-spacer" />}
          {isDirectory ? <Folder size={16} /> : <FileText size={16} />}
          <span>{entry.name}</span>
        </button>
        {entry.expanded ? entry.children?.map((child) => treeRow(child, depth + 1)) : null}
      </div>
    );
  }
  return (
    <aside className="sidebar">
      <div className="sidebar-title">
        <span>Workspace</span>
        {activePath ? (
          <div className="document-menu">
            <button type="button" aria-label="Rename active document" onClick={onRename}>Rename</button>
            <button type="button" aria-label="Delete active document" onClick={onDelete}>Delete</button>
          </div>
        ) : <MoreHorizontal size={16} />}
      </div>
      {workspace ? (
        <>
          <div className="workspace-root"><FolderTree size={17} />{workspace.name}</div>
          <nav aria-label="Markdown documents">
            {entries.map((entry) => treeRow(entry))}
          </nav>
        </>
      ) : (
        <p className="sidebar-empty">Open a folder containing Markdown documents.</p>
      )}
    </aside>
  );
}
