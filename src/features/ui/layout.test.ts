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
    expect(sidebar).toContain("overflow-x: hidden");
  });

  it("uses a wider writing surface with responsive padding", () => {
    expect(cssRule(".visual-editor")).toContain("max-width: 1240px");
    expect(styles).toContain("@media (max-width: 860px)");
    expect(styles).toContain(".visual-editor");
  });

  it("does not expose a manual Mermaid preview toggle button", () => {
    expect(styles).toContain(".milkdown-code-block .preview-toggle-button");
    expect(cssRule(".crepe-root .milkdown-code-block .preview-toggle-button")).toContain("display: none");
  });
});
