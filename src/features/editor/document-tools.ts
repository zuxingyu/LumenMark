import type { OutlineItem } from "../../types";

export const supportedCodeAliases = [
  "java",
  "json",
  "sql",
  "sh",
  "shell",
  "bash",
  "python",
  "py",
] as const;

export function buildOutline(source: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  const pattern = /^(#{1,6})\s+(.+?)\s*#?\s*$/gm;
  for (const match of source.matchAll(pattern)) {
    items.push({
      id: `heading-${items.length}`,
      level: match[1].length,
      text: match[2],
      position: match.index ?? 0,
    });
  }
  return items;
}

export function replaceAllMatches(source: string, query: string, replacement: string): string {
  if (!query) return source;
  return source.split(query).join(replacement);
}
