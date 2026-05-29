import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export type ExportFormat = "html" | "pdf" | "png";

interface StandaloneHtmlInput {
  title: string;
  body: string;
  styles: string;
}

export function exportFileName(title: string, format: ExportFormat): string {
  const base = (title.trim() || "document").replace(/\.md$/i, "").replace(/[\\/:*?"<>|]+/g, "-");
  return `${base}.${format}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildStandaloneHtml({ title, body, styles }: StandaloneHtmlInput): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
${styles}
body { margin: 0; background: var(--page, #fff); }
.export-document { max-width: 1040px; margin: 0 auto; padding: 48px 64px; }
  </style>
</head>
<body>
  <main class="export-document markdown-preview">${body}</main>
</body>
</html>`;
}

export function collectExportStyles(): string {
  return Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        return [];
      }
    })
    .join("\n");
}

export function cloneDocumentBody(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".code-block-tools, .code-language-search, .preview-toggle-button").forEach((node) => node.remove());
  return clone;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function renderElementToPngBase64(element: HTMLElement): Promise<string> {
  const canvas = await html2canvas(element, {
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--page").trim() || "#ffffff",
    scale: Math.min(2, window.devicePixelRatio || 1),
    useCORS: true,
  });
  return canvas.toDataURL("image/png").split(",")[1] ?? "";
}

export async function renderElementToPdfBase64(element: HTMLElement): Promise<string> {
  const canvas = await html2canvas(element, {
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--page").trim() || "#ffffff",
    scale: Math.min(2, window.devicePixelRatio || 1),
    useCORS: true,
  });
  const pdf = new jsPDF("p", "pt", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imageWidth = pageWidth;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;
  let remainingHeight = imageHeight;
  let y = 0;
  const dataUrl = canvas.toDataURL("image/png");
  pdf.addImage(dataUrl, "PNG", 0, y, imageWidth, imageHeight);
  remainingHeight -= pageHeight;
  while (remainingHeight > 0) {
    y -= pageHeight;
    pdf.addPage();
    pdf.addImage(dataUrl, "PNG", 0, y, imageWidth, imageHeight);
    remainingHeight -= pageHeight;
  }
  return blobToBase64(pdf.output("blob"));
}
