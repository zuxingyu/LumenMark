import { describe, expect, it } from "vitest";
import { buildExportItems } from "./codeBlocks";

describe("buildExportItems", () => {
  it("uses file metadata and maps supported language extensions", () => {
    const markdown = [
      "```python file=main.py",
      "print('hello')",
      "```",
      "```shell",
      "echo ok",
      "```",
    ].join("\n");

    expect(buildExportItems(markdown)).toEqual([
      {
        content: "print('hello')",
        language: "python",
        requestedFileName: "main.py",
        resolvedFileName: "main.py",
        hasConflict: false,
      },
      {
        content: "echo ok",
        language: "shell",
        resolvedFileName: "snippet-02.sh",
        hasConflict: false,
      },
    ]);
  });

  it("falls back to txt and rejects unsafe requested file names", () => {
    const markdown = [
      "```ruby file=../escape.rb",
      "puts 'stop'",
      "```",
    ].join("\n");

    expect(buildExportItems(markdown)[0]?.resolvedFileName).toBe("snippet-01.txt");
  });

  it("extracts tilde fenced code blocks through Markdown syntax parsing", () => {
    const markdown = ["~~~sql file=query.sql", "select 1;", "~~~"].join("\n");

    expect(buildExportItems(markdown)[0]).toMatchObject({
      language: "sql",
      resolvedFileName: "query.sql",
      content: "select 1;",
    });
  });
});
