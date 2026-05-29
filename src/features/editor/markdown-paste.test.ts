import { describe, expect, it } from "vitest";
import { looksLikeMarkdownPaste } from "./markdown-paste";

describe("Markdown clipboard paste detection", () => {
  it("detects pasted Markdown source that should be parsed as formatted content", () => {
    expect(looksLikeMarkdownPaste("# 标题")).toBe(true);
    expect(looksLikeMarkdownPaste("**重要** and `code`")).toBe(true);
    expect(looksLikeMarkdownPaste("- item\n- item 2")).toBe(true);
    expect(looksLikeMarkdownPaste("> quote")).toBe(true);
    expect(looksLikeMarkdownPaste("| A | B |\n| - | - |\n| 1 | 2 |")).toBe(true);
    expect(looksLikeMarkdownPaste("```yaml\nname: LumenMark\n```")).toBe(true);
    expect(looksLikeMarkdownPaste("$$\na^2+b^2=c^2\n$$")).toBe(true);
  });

  it("does not hijack ordinary plain-text paste", () => {
    expect(looksLikeMarkdownPaste("普通文本，不需要转换")).toBe(false);
    expect(looksLikeMarkdownPaste("hello world")).toBe(false);
    expect(looksLikeMarkdownPaste("")).toBe(false);
  });
});
