import { describe, expect, it } from "vitest";
import { firstMarkdownPath } from "./desktop";

describe("desktop Markdown delivery", () => {
  it("selects only the first Markdown file from a desktop drop", () => {
    expect(firstMarkdownPath(["/tmp/a.txt", "/tmp/guide.md", "/tmp/other.md"])).toBe("/tmp/guide.md");
    expect(firstMarkdownPath(["/tmp/a.txt"])).toBeUndefined();
  });
});
