import { ChevronDown, ChevronLeft, ChevronRight, FileText, Folder, FolderTree, PanelLeftOpen, X } from "lucide-react";
import type { ReactNode } from "react";
import type { Messages } from "../i18n";
import type { OutlineItem, RecentWorkspace, WorkspaceEntry, WorkspaceInfo, WorkspaceSearchResult } from "../types";
import { WorkspaceQuickSearch } from "./WorkspaceQuickSearch";

interface SidebarProps {
  labels: Messages;
  workspace: WorkspaceInfo | null;
  recentWorkspaces: RecentWorkspace[];
  entries: WorkspaceEntry[];
  outline: OutlineItem[];
  activePath?: string;
  collapsed: boolean;
  searchResults: WorkspaceSearchResult[];
  activePanel: "workspace" | "outline";
  onSelect(entry: WorkspaceEntry): void;
  onSelectWorkspace(workspace: RecentWorkspace): void;
  onRemoveWorkspace(workspace: RecentWorkspace): void;
  onRename(): void;
  onOutlineSelect(item: OutlineItem): void;
  onToggleCollapsed(): void;
  onPanelChange(panel: "workspace" | "outline"): void;
  onSearch(query: string): void;
  onOpenSearchResult(result: WorkspaceSearchResult): void;
}

export function Sidebar({ labels, workspace, recentWorkspaces, entries, outline, activePath, collapsed, searchResults, activePanel, onSelect, onSelectWorkspace, onRemoveWorkspace, onRename, onOutlineSelect, onToggleCollapsed, onPanelChange, onSearch, onOpenSearchResult }: SidebarProps) {
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
  if (collapsed) {
    return (
      <aside className="sidebar sidebar-icon-rail" aria-label={labels.workspace}>
        <button type="button" aria-label={labels.expandSidebar} onClick={onToggleCollapsed}>
          <PanelLeftOpen size={18} />
        </button>
        <button type="button" aria-label={labels.workspace} onClick={() => onPanelChange("workspace")}>
          <FolderTree size={18} />
        </button>
        <button type="button" aria-label={labels.outline} onClick={() => onPanelChange("outline")}>
          <FileText size={18} />
        </button>
      </aside>
    );
  }
  return (
    <aside className="sidebar">
      <div className="sidebar-title">
        <span>{activePanel === "workspace" ? labels.workspace : labels.outline}</span>
        <button className="sidebar-collapse-button" type="button" aria-label={labels.collapseSidebar} onClick={onToggleCollapsed}>
          <ChevronLeft size={15} />
        </button>
        {activePath ? (
          <div className="document-menu">
            <button type="button" aria-label={labels.rename} onClick={onRename}>{labels.rename}</button>
          </div>
        ) : null}
      </div>
      <div className="sidebar-tabs" role="tablist" aria-label={labels.workspace}>
        <button
          type="button"
          role="tab"
          aria-selected={activePanel === "workspace"}
          className={activePanel === "workspace" ? "active" : undefined}
          onClick={() => onPanelChange("workspace")}
        >
          {labels.workspace}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activePanel === "outline"}
          className={activePanel === "outline" ? "active" : undefined}
          onClick={() => onPanelChange("outline")}
        >
          {labels.outline}
        </button>
      </div>
      {activePanel === "workspace" ? (
        <div className="sidebar-panel" role="tabpanel">
          <WorkspaceQuickSearch
            labels={labels}
            disabled={!workspace}
            results={searchResults}
            onSearch={onSearch}
            onOpenResult={onOpenSearchResult}
          />
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
        </div>
      ) : (
        <nav className="outline" aria-label={labels.outline}>
          {outline.length ? outline.map((item) => (
              <button
                className="outline-item"
                key={item.id}
                style={{ paddingLeft: `${10 + (item.level - 1) * 14}px` }}
                type="button"
                onClick={() => onOutlineSelect(item)}
              >
                {item.text}
              </button>
            )) : <p className="sidebar-empty">{labels.outline}</p>}
        </nav>
      )}
    </aside>
  );
}
