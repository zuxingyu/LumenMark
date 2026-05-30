import html2canvas from "html2canvas";
import { describe, expect, it, vi } from "vitest";
import {
  buildStandaloneHtml,
  exportFileName,
  renderElementToPngBase64,
  waitForExportPreviewReady,
  type ExportFormat,
} from "./document-export";

vi.mock("html2canvas", () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => "data:image/png;base64,c2FmZQ==",
  }),
}));

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

  it("waits for Mermaid preview output before export capture", async () => {
    const host = document.createElement("div");
    host.innerHTML = `<article class="markdown-preview"><div class="diagram-loading">loading</div></article>`;
    document.body.append(host);

    const ready = waitForExportPreviewReady(host, { timeoutMs: 500 });
    window.setTimeout(() => {
      host.innerHTML = `<article class="markdown-preview"><div class="mermaid-diagram"><svg aria-label="diagram"></svg></div></article>`;
    }, 20);

    await expect(ready).resolves.toBeUndefined();
    expect(host.querySelector("svg")).not.toBeNull();
    host.remove();
  });

  it("uses a legacy-safe background color for html2canvas export capture", async () => {
    const element = document.createElement("article");
    element.className = "markdown-preview";
    document.documentElement.style.setProperty("--page", "color(display-p3 1 1 1)");

    await renderElementToPngBase64(element);

    expect(html2canvas).toHaveBeenCalledWith(element, expect.objectContaining({
      backgroundColor: "#ffffff",
    }));
  });
});
