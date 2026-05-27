import { describe, expect, it } from "vitest";
import { buildOutline, replaceAllMatches, supportedCodeAliases } from "./document-tools";

describe("visual editor document tools", () => {
  it("derives heading navigation items from Markdown source", () => {
    expect(buildOutline("# Title\n\n## Details\ntext\n### Notes")).toEqual([
      { id: "heading-0", level: 1, text: "Title", position: 0 },
      { id: "heading-1", level: 2, text: "Details", position: 9 },
      { id: "heading-2", level: 3, text: "Notes", position: 25 },
    ]);
  });

  it("replaces all literal matches without treating queries as regular expressions", () => {
    expect(replaceAllMatches("a+b a+b", "a+b", "sum")).toBe("sum sum");
  });

  it("advertises every required highlighted code fence alias", () => {
    expect(supportedCodeAliases).toEqual(expect.arrayContaining([
      "java", "json", "sql", "sh", "shell", "bash", "python", "py",
    ]));
  });
});
