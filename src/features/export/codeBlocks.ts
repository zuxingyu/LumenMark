import type { CodeBlockExportItem } from "../../types";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { visit } from "unist-util-visit";

const EXTENSIONS: Record<string, string> = {
  json: "json",
  sql: "sql",
  sh: "sh",
  shell: "sh",
  bash: "sh",
  python: "py",
  py: "py",
  java: "java",
};

const FILE_PATTERN = /(?:^|\s)file=(?:"([^"]+)"|'([^']+)'|([^\s]+))/;

interface CodeNode {
  lang?: string | null;
  meta?: string | null;
  value: string;
}

function safeRequestedFileName(metadata: string): string | undefined {
  const match = FILE_PATTERN.exec(metadata);
  const name = match?.[1] ?? match?.[2] ?? match?.[3];
  if (
    !name ||
    name === "." ||
    name === ".." ||
    name.includes("/") ||
    name.includes("\\") ||
    name.includes("\0")
  ) {
    return undefined;
  }
  return name;
}

export function extensionForLanguage(language: string): string {
  return EXTENSIONS[language.toLowerCase()] ?? "txt";
}

export function buildExportItems(markdown: string): CodeBlockExportItem[] {
  const items: CodeBlockExportItem[] = [];
  const resolvedNames = new Set<string>();
  const tree = unified().use(remarkParse).parse(markdown);

  visit(tree, "code", (untypedNode) => {
    const node = untypedNode as CodeNode;
    const language = (node.lang || "text").toLowerCase();
    const requestedFileName = safeRequestedFileName(node.meta ?? "");
    const generatedName = `snippet-${String(items.length + 1).padStart(2, "0")}.${extensionForLanguage(language)}`;
    const resolvedFileName = requestedFileName ?? generatedName;
    const hasConflict = resolvedNames.has(resolvedFileName.toLowerCase());
    resolvedNames.add(resolvedFileName.toLowerCase());

    items.push({
      language,
      ...(requestedFileName ? { requestedFileName } : {}),
      resolvedFileName,
      content: node.value,
      hasConflict,
    });
  });

  return items;
}
