import { ChevronDown, ChevronRight, FileText, Folder, FolderTree, X } from "lucide-react";
import type { ReactNode } from "react";
import type { Messages } from "../i18n";
import type { RecentWorkspace, WorkspaceEntry, WorkspaceInfo } from "../types";

interface SidebarProps {
  labels: Messages;
  workspace: WorkspaceInfo | null;
  recentWorkspaces: RecentWorkspace[];
  entries: WorkspaceEntry[];
  activePath?: string;
  onSelect(entry: WorkspaceEntry): void;
  onSelectWorkspace(workspace: RecentWorkspace): void;
  onRemoveWorkspace(workspace: RecentWorkspace): void;
  onRename(): void;
}

export function Sidebar({ labels, workspace, recentWorkspaces, entries, activePath, onSelect, onSelectWorkspace, onRemoveWorkspace, onRename }: SidebarProps) {
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
        <span>{labels.workspace}</span>
        {activePath ? (
          <div className="document-menu">
            <button type="button" aria-label={labels.rename} onClick={onRename}>{labels.rename}</button>
          </div>
        ) : null}
      </div>
      {recentWorkspaces.length ? <p className="sidebar-section">{labels.recentWorkspaces}</p> : null}
      {recentWorkspaces.map((recent) => (
        <div className="recent-workspace" key={recent.root}>
          <button className={workspace?.root === recent.root ? "workspace-root active" : "workspace-root"} type="button" onClick={() => onSelectWorkspace(recent)}>
            <FolderTree size={17} />{recent.name}
          </button>
          <button className="remove-workspace" type="button" aria-label={`${labels.remove} ${recent.name}`} onClick={() => onRemoveWorkspace(recent)}>
            <X size={14} />
          </button>
          {workspace?.root === recent.root ? (
            <nav aria-label="Markdown documents">{entries.map((entry) => treeRow(entry))}</nav>
          ) : null}
        </div>
      ))}
      {!workspace && !recentWorkspaces.length ? <p className="sidebar-empty">{labels.noWorkspace}</p> : null}
    </aside>
  );
}
