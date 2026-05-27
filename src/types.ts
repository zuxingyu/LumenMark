export type EditorMode = "preview" | "edit";
export type SourceKind = "workspace" | "single-file";

export interface DocumentSession {
  path: string;
  sourceText: string;
  savedText: string;
  isDirty: boolean;
  mode: EditorMode;
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

export interface OpenedDocument extends DocumentContent {
  root: string;
  name: string;
}

export interface DocumentContext {
  kind: SourceKind;
  root: string;
  workspaceName?: string;
}

export interface RecentWorkspace {
  root: string;
  name: string;
}
