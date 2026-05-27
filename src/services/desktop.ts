import { invoke } from "@tauri-apps/api/core";
import type { DocumentContent, OpenedDocument, WorkspaceEntry, WorkspaceInfo } from "../types";

export interface DesktopApi {
  selectWorkspace(): Promise<WorkspaceInfo | null>;
  selectMarkdownFile(): Promise<OpenedDocument | null>;
  listWorkspaceEntries(root: string, relativePath?: string): Promise<WorkspaceEntry[]>;
  readMarkdownFile(root: string, relativePath: string): Promise<DocumentContent>;
  readWorkspaceAsset(root: string, documentPath: string, source: string): Promise<string>;
  writeMarkdownFile(root: string, relativePath: string, content: string): Promise<{ success: boolean }>;
  saveNewMarkdownFile(content: string): Promise<OpenedDocument | null>;
  createMarkdownFile(root: string, relativePath: string): Promise<WorkspaceEntry>;
  renameMarkdownEntry(root: string, from: string, to: string): Promise<WorkspaceEntry>;
}

export const tauriApi: DesktopApi = {
  selectWorkspace: () => invoke("select_workspace"),
  selectMarkdownFile: () => invoke("select_markdown_file"),
  listWorkspaceEntries: (root, relativePath) => invoke("list_workspace_entries", { root, relativePath }),
  readMarkdownFile: (root, relativePath) => invoke("read_markdown_file", { root, relativePath }),
  readWorkspaceAsset: (root, documentPath, source) => invoke("read_workspace_asset", { root, documentPath, source }),
  writeMarkdownFile: (root, relativePath, content) =>
    invoke("write_markdown_file", { root, relativePath, content }),
  saveNewMarkdownFile: (content) => invoke("save_new_markdown_file", { content }),
  createMarkdownFile: (root, relativePath) => invoke("create_markdown_file", { root, relativePath }),
  renameMarkdownEntry: (root, from, to) => invoke("rename_markdown_entry", { root, from, to }),
};

const sampleMarkdown = `# Service Deployment Notes

This document captures the steps and references for deploying our service to production. It includes the deployment flow, configuration guidelines, and rollback strategy.

## Capacity Planning

We model request throughput using Little's Law:

$$L = \\lambda W$$

## Deployment Flow

\`\`\`mermaid
flowchart LR
  A[Code Commit] --> B[CI Pipeline] --> C{Tests Pass?}
  C -->|Yes| D[Build Image] --> E[Deploy]
  C -->|No| F[Fail Build]
\`\`\`

## Deployment Script

\`\`\`python
import subprocess

def deploy(target):
    subprocess.run(["deploy", target], check=True)
\`\`\`
`;

export function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export function createDemoApi(): DesktopApi {
  let source = sampleMarkdown;
  const documents: WorkspaceEntry[] = [
    { name: "architecture.md", relativePath: "docs/architecture.md", kind: "markdown", childrenLoaded: false },
    { name: "deployment.md", relativePath: "docs/deployment.md", kind: "markdown", childrenLoaded: false },
  ];
  return {
    selectWorkspace: async () => ({ root: "demo", name: "docs" }),
    selectMarkdownFile: async () => ({ root: "demo", relativePath: "architecture.md", name: "architecture.md", content: source }),
    listWorkspaceEntries: async (_root, relativePath) => {
      if (!relativePath) {
        return [{ name: "docs", relativePath: "docs", kind: "directory", childrenLoaded: false }];
      }
      return relativePath === "docs" ? documents : [];
    },
    readMarkdownFile: async (_root, relativePath) => ({ relativePath, content: source }),
    readWorkspaceAsset: async (_root, _documentPath, assetSource) => assetSource,
    writeMarkdownFile: async (_root, _path, content) => {
      source = content;
      return { success: true };
    },
    saveNewMarkdownFile: async (content) => {
      source = content;
      return { root: "demo", relativePath: "untitled.md", name: "untitled.md", content };
    },
    createMarkdownFile: async (_root, relativePath) => {
      const entry = { name: relativePath, relativePath, kind: "markdown" as const, childrenLoaded: false };
      documents.push(entry);
      return entry;
    },
    renameMarkdownEntry: async (_root, from, to) => {
      const entry = documents.find((document) => document.relativePath === from);
      if (!entry) throw new Error("Document not found.");
      entry.name = to.split("/").at(-1) ?? to;
      entry.relativePath = to;
      return entry;
    },
  };
}
