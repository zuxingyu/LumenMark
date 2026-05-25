import { Code2, Eye, FilePlus2, FolderOpen, PencilLine, Save } from "lucide-react";
import type { EditorMode } from "../types";

interface ToolbarProps {
  hasWorkspace: boolean;
  hasDocument: boolean;
  dirty: boolean;
  mode: EditorMode;
  onOpen(): void;
  onNew(): void;
  onSave(): void;
  onToggleMode(): void;
  onExport(): void;
}

export function Toolbar(props: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand-mark">L</span>
        <strong>LumenMark</strong>
      </div>
      <div className="toolbar-actions">
        <button type="button" onClick={props.onOpen}><FolderOpen />Open Folder</button>
        <button type="button" disabled={!props.hasWorkspace} onClick={props.onNew}><FilePlus2 />New</button>
        <button type="button" disabled={!props.hasDocument || !props.dirty} onClick={props.onSave}><Save />Save</button>
        <button type="button" className={props.mode === "preview" ? "selected" : ""} disabled={!props.hasDocument} onClick={props.onToggleMode}>
          {props.mode === "preview" ? <PencilLine /> : <Eye />}
          {props.mode === "preview" ? "Edit" : "Preview"}
        </button>
        <button type="button" disabled={!props.hasDocument} onClick={props.onExport}><Code2 />Export Code</button>
      </div>
    </header>
  );
}
