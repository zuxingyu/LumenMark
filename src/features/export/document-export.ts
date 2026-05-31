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
  <main class="export-document markdown-preview markdown-theme-scope typora-export markdown-body">${body}</main>
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

const UNSUPPORTED_CANVAS_COLOR = /\b(?:color|color-mix|lab|lch|oklab|oklch)\(/i;

function safeColor(value: string | null | undefined, fallback: string): string {
  const color = value?.trim();
  if (!color || color.startsWith("var(") || UNSUPPORTED_CANVAS_COLOR.test(color)) return fallback;
  return color;
}

function safeCanvasBackground(): string {
  return safeColor(getComputedStyle(document.documentElement).getPropertyValue("--page"), "#ffffff");
}

function applyCanvasSafeColors(source: Element, clone: Element) {
  if (!(source instanceof HTMLElement) || !(clone instanceof HTMLElement)) return;
  const computed = getComputedStyle(source);
  clone.style.color = safeColor(computed.color, "#111827");
  clone.style.backgroundColor = safeColor(computed.backgroundColor, "transparent");
  clone.style.borderTopColor = safeColor(computed.borderTopColor, "#d1d5db");
  clone.style.borderRightColor = safeColor(computed.borderRightColor, "#d1d5db");
  clone.style.borderBottomColor = safeColor(computed.borderBottomColor, "#d1d5db");
  clone.style.borderLeftColor = safeColor(computed.borderLeftColor, "#d1d5db");
  clone.style.outlineColor = safeColor(computed.outlineColor, "#60a5fa");
  clone.style.textDecorationColor = safeColor(computed.textDecorationColor, "currentColor");
}

function makeCanvasCloneSafe(sourceRoot: HTMLElement, clonedDocument: Document) {
  const clonedRoot = clonedDocument.body.querySelector<HTMLElement>(".markdown-preview");
  if (!clonedRoot) return;
  const sourceElements = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll("*"))];
  const cloneElements = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll("*"))];
  sourceElements.forEach((source, index) => {
    const clone = cloneElements[index];
    if (clone) applyCanvasSafeColors(source, clone);
  });
}

export function createExportPreviewHost(): HTMLDivElement {
  const host = document.createElement("div");
  host.className = "export-capture-host";
  document.body.append(host);
  return host;
}

export async function waitForExportPreviewReady(
  host: HTMLElement,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const intervalMs = options.intervalMs ?? 50;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const preview = host.querySelector(".markdown-preview");
    const loading = host.querySelector(".diagram-loading, .image-loading");
    if (preview && !loading) return;
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out while waiting for export preview rendering.");
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
    backgroundColor: safeCanvasBackground(),
    onclone: (clonedDocument) => makeCanvasCloneSafe(element, clonedDocument),
    scale: Math.min(2, window.devicePixelRatio || 1),
    useCORS: true,
  });
  return canvas.toDataURL("image/png").split(",")[1] ?? "";
}

export async function renderElementToPdfBase64(element: HTMLElement): Promise<string> {
  const canvas = await html2canvas(element, {
    backgroundColor: safeCanvasBackground(),
    onclone: (clonedDocument) => makeCanvasCloneSafe(element, clonedDocument),
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
