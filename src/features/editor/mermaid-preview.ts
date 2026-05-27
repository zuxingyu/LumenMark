type MermaidRender = (id: string, source: string) => Promise<{ svg: string }>;

let diagramSequence = 0;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function renderMermaidPreview(source: string, render: MermaidRender): Promise<string> {
  try {
    const { svg } = await render(`lumenmark-${diagramSequence++}`, source);
    return `<div class="mermaid-preview">${svg}</div>`;
  } catch {
    return `<div class="mermaid-error"><p>Mermaid diagram error</p><pre>${escapeHtml(source)}</pre></div>`;
  }
}
