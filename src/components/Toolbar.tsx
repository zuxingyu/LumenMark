import { Eye, FilePlus2, FileText, FolderOpen, PencilLine, Save } from "lucide-react";
import type { Messages } from "../i18n";
import type { EditorMode } from "../types";

interface ToolbarProps {
  labels: Messages;
  hasWorkspace: boolean;
  hasDocument: boolean;
  dirty: boolean;
  mode: EditorMode;
  onOpenFile(): void;
  onOpenFolder(): void;
  onNew(): void;
  onSave(): void;
  onToggleMode(): void;
  onToggleLocale(): void;
}

export function Toolbar(props: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand-mark">L</span>
        <strong>LumenMark</strong>
      </div>
      <div className="toolbar-actions">
        <button type="button" onClick={props.onOpenFile}><FileText />{props.labels.openFile}</button>
        <button type="button" onClick={props.onOpenFolder}><FolderOpen />{props.labels.openFolder}</button>
        <button type="button" disabled={!props.hasWorkspace} onClick={props.onNew}><FilePlus2 />{props.labels.newDocument}</button>
        <button type="button" disabled={!props.hasDocument || !props.dirty} onClick={props.onSave}><Save />{props.labels.save}</button>
        <button type="button" className={props.mode === "preview" ? "selected" : ""} disabled={!props.hasDocument} onClick={props.onToggleMode}>
          {props.mode === "preview" ? <PencilLine /> : <Eye />}
          {props.mode === "preview" ? props.labels.edit : props.labels.preview}
        </button>
        <button type="button" className="locale-switch" onClick={props.onToggleLocale}>{props.labels.changeLanguage}</button>
      </div>
    </header>
  );
}
