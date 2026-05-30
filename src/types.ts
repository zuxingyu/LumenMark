export type SourceKind = "untitled" | "workspace" | "single-file";

export interface DocumentSession {
  path: string | null;
  root: string | null;
  title: string;
  sourceText: string;
  savedText: string;
  isDirty: boolean;
  sourceKind: SourceKind;
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

export interface WorkspaceSearchResult {
  kind: "file" | "content";
  relativePath: string;
  name: string;
  line: number | null;
  excerpt: string;
}

export interface DocumentContext {
  kind: Exclude<SourceKind, "untitled">;
  root: string;
  workspaceName?: string;
}

export interface RecentWorkspace {
  root: string;
  name: string;
}

export interface ImportedTheme {
  id: string;
  name: string;
}

export interface ThemeImportResult extends ImportedTheme {
  css: string;
}

export interface OutlineItem {
  id: string;
  level: number;
  text: string;
  position: number;
}
