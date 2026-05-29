import { FilePlus2, FileText, FolderOpen, FileCode2, FileImage, FileType2, Search, Save } from "lucide-react";
import type { Messages } from "../i18n";

interface ToolbarProps {
  labels: Messages;
  hasWorkspace: boolean;
  hasDocument: boolean;
  dirty: boolean;
  onOpenFile(): void;
  onOpenFolder(): void;
  onNew(): void;
  onSave(): void;
  onExportHtml(): void;
  onExportPdf(): void;
  onExportPng(): void;
  onFind(): void;
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
        <button type="button" onClick={props.onNew}><FilePlus2 />{props.labels.newDocument}</button>
        <button type="button" disabled={!props.hasDocument || !props.dirty} onClick={props.onSave}><Save />{props.labels.save}</button>
        <button type="button" disabled={!props.hasDocument} onClick={props.onExportHtml}><FileCode2 />{props.labels.exportHtml}</button>
        <button type="button" disabled={!props.hasDocument} onClick={props.onExportPdf}><FileType2 />{props.labels.exportPdf}</button>
        <button type="button" disabled={!props.hasDocument} onClick={props.onExportPng}><FileImage />{props.labels.exportPng}</button>
        <button type="button" disabled={!props.hasDocument} onClick={props.onFind}><Search />{props.labels.find}</button>
        <button type="button" className="locale-switch" onClick={props.onToggleLocale}>{props.labels.changeLanguage}</button>
      </div>
    </header>
  );
}
