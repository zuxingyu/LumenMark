import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");

function cssRule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styles.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  return match?.[1] ?? "";
}

describe("application layout", () => {
  it("keeps the sidebar independently scrollable inside the fixed app shell", () => {
    const sidebar = cssRule(".sidebar");

    expect(sidebar).toContain("min-height: 0");
    expect(sidebar).toContain("overflow-y: auto");
    expect(sidebar).toContain("overflow-x: auto");
  });

  it("uses a wider writing surface with responsive padding", () => {
    expect(cssRule(".visual-editor")).toContain("max-width: 1360px");
    expect(styles).toContain("@media (max-width: 860px)");
    expect(styles).toContain(".visual-editor");
  });

  it("does not expose a manual Mermaid preview toggle button", () => {
    expect(styles).toContain(".milkdown-code-block .preview-toggle-button");
    expect(cssRule(".crepe-root .milkdown-code-block .preview-toggle-button")).toContain("display: none !important");
  });

  it("supports a collapsible and resizable workspace sidebar", () => {
    expect(styles).toContain("--sidebar-width");
    expect(styles).toContain(".workspace-layout.sidebar-collapsed");
    expect(cssRule(".sidebar-resizer")).toContain("cursor: col-resize");
    expect(cssRule(".workspace-layout.sidebar-collapsed")).toContain("--sidebar-width: 56px");
  });

  it("adds a per-code-block wrap toggle with a horizontal-scroll off state", () => {
    expect(cssRule(".code-block-tools")).toContain("display: inline-flex");
    expect(cssRule(".crepe-root .milkdown-code-block.code-wrap-off .cm-scroller")).toContain("overflow-x: auto");
    expect(cssRule(".crepe-root .milkdown-code-block.code-wrap-off .cm-line")).toContain("white-space: pre");
  });

  it("hides Crepe block add and drag handles for a pure writing surface", () => {
    expect(styles).toContain(".crepe-root .milkdown-block-handle");
    expect(styles).toContain(".crepe-root .milkdown-slash-menu");
    expect(styles).toContain(".crepe-root [data-block-handle]");
    expect(styles).toContain("display: none !important");
  });

  it("keeps the visual editor and Milkdown frame dark-mode aware", () => {
    expect(cssRule(".document-surface")).toContain("background: var(--page)");
    expect(styles).toContain(".crepe-root .milkdown");
    expect(styles).toContain("background: var(--page)");
  });

  it("removes the old brand toolbar and lets the editor start at the top of the window", () => {
    expect(styles).not.toContain(".brand-mark");
    expect(styles).not.toContain(".toolbar");
    expect(cssRule(".app-shell")).toContain("grid-template-rows: minmax(0, 1fr) auto");
  });

  it("forces CodeMirror code blocks and code tool buttons onto theme variables", () => {
    expect(cssRule(".crepe-root .milkdown-code-block")).toContain("background: var(--code-bg)");
    expect(cssRule(".crepe-root .milkdown-code-block .cm-editor")).toContain("background: var(--code-bg)");
    expect(cssRule(".crepe-root .milkdown-code-block .cm-scroller")).toContain("background: var(--code-bg)");
    expect(cssRule(".crepe-root .milkdown-code-block .cm-gutters")).toContain("background: var(--code-bg)");
    expect(cssRule(".code-block-tools button, .code-wrap-toggle")).toContain("background: var(--code-bg)");
  });

  it("themes LaTeX preview blocks and settings controls without white surfaces", () => {
    expect(cssRule(".crepe-root .milkdown-code-block .preview-panel")).toContain("background: var(--code-bg)");
    expect(cssRule(".crepe-root .milkdown-code-block .katex")).toContain("color: var(--code-text)");
    expect(cssRule(".settings-dialog")).toContain("background: var(--surface)");
    expect(cssRule(".theme-row")).toContain("background: var(--chrome)");
    expect(cssRule(".icon-button")).toContain("background: transparent");
  });
});
