import { describe, expect, it } from "vitest";
import { enhanceCodeBlockControls } from "./code-block-enhancements";

describe("code block enhancements", () => {
  it("adds an independent wrap toggle to each code block", () => {
    document.body.innerHTML = `
      <div class="crepe-root">
        <div class="milkdown-code-block"><div class="cm-scroller"></div></div>
        <div class="milkdown-code-block"><div class="cm-scroller"></div></div>
      </div>
    `;

    enhanceCodeBlockControls(document.querySelector(".crepe-root") as HTMLElement, { wrapLabel: "自动换行", copyLabel: "复制" });

    const blocks = Array.from(document.querySelectorAll<HTMLElement>(".milkdown-code-block"));
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".code-wrap-toggle"));
    expect(document.querySelectorAll(".code-block-tools")).toHaveLength(2);
    expect(buttons).toHaveLength(2);
    expect(blocks[0].classList.contains("code-wrap-off")).toBe(false);
    expect(blocks[1].classList.contains("code-wrap-off")).toBe(false);

    buttons[0].click();

    expect(blocks[0].classList.contains("code-wrap-off")).toBe(true);
    expect(blocks[1].classList.contains("code-wrap-off")).toBe(false);
    expect(buttons[0].getAttribute("aria-pressed")).toBe("false");
    expect(buttons[1].getAttribute("aria-pressed")).toBe("true");
  });

  it("places wrap and copy buttons in one persistent toolbar", () => {
    document.body.innerHTML = `
      <div class="crepe-root">
        <div class="milkdown-code-block">
          <button class="copy-button">Copy</button>
        </div>
      </div>
    `;

    enhanceCodeBlockControls(document.querySelector(".crepe-root") as HTMLElement, { wrapLabel: "Wrap code", copyLabel: "Copy" });

    const toolbar = document.querySelector(".code-block-tools");
    expect(toolbar?.querySelector(".copy-button")).toBeTruthy();
    expect(toolbar?.querySelector(".code-wrap-toggle")).toBeTruthy();
    expect(toolbar?.textContent).not.toContain("Copy");
    expect(toolbar?.textContent).not.toContain("Wrap code");
  });
});
