export type EditorMode = "preview" | "edit";

export interface DocumentSession {
  path: string;
  sourceText: string;
  savedText: string;
  isDirty: boolean;
  mode: EditorMode;
}

export interface CodeBlockExportItem {
  language: string;
  requestedFileName?: string;
  resolvedFileName: string;
  content: string;
  hasConflict: boolean;
}

export interface WorkspaceEntry {
  name: string;
  relativePath: string;
  kind: "directory" | "markdown";
  childrenLoaded: boolean;
  children?: WorkspaceEntry[];
  expanded?: boolean;
}

export interface WorkspaceInfo {
  root: string;
  name: string;
}

export interface DocumentContent {
  relativePath: string;
  content: string;
}

export interface ExportResult {
  written: string[];
  conflicts: string[];
  rejected: string[];
}
