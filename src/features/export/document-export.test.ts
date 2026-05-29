import { describe, expect, it } from "vitest";
import { buildStandaloneHtml, exportFileName, type ExportFormat } from "./document-export";

describe("document export", () => {
  it("builds standalone HTML from rendered document markup", () => {
    const html = buildStandaloneHtml({
      title: "guide.md",
      body: "<h1>Guide</h1><pre><code>echo ok</code></pre>",
      styles: ".markdown-preview{color:red}",
    });

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>guide.md</title>");
    expect(html).toContain("<h1>Guide</h1>");
    expect(html).toContain(".markdown-preview{color:red}");
  });

  it.each([
    ["html", "guide.html"],
    ["pdf", "guide.pdf"],
    ["png", "guide.png"],
  ] satisfies Array<[ExportFormat, string]>)("derives %s export file names", (format, expected) => {
    expect(exportFileName("guide.md", format)).toBe(expected);
  });
});
