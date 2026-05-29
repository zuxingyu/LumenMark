import { describe, expect, it } from "vitest";
import { enhanceCodeBlockWrapping } from "./code-block-enhancements";

describe("code block enhancements", () => {
  it("adds an independent wrap toggle to each code block", () => {
    document.body.innerHTML = `
      <div class="crepe-root">
        <div class="milkdown-code-block"><div class="cm-scroller"></div></div>
        <div class="milkdown-code-block"><div class="cm-scroller"></div></div>
      </div>
    `;

    enhanceCodeBlockWrapping(document.querySelector(".crepe-root") as HTMLElement, "自动换行");

    const blocks = Array.from(document.querySelectorAll<HTMLElement>(".milkdown-code-block"));
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".code-wrap-toggle"));
    expect(buttons).toHaveLength(2);
    expect(blocks[0].classList.contains("code-wrap-off")).toBe(false);
    expect(blocks[1].classList.contains("code-wrap-off")).toBe(false);

    buttons[0].click();

    expect(blocks[0].classList.contains("code-wrap-off")).toBe(true);
    expect(blocks[1].classList.contains("code-wrap-off")).toBe(false);
    expect(buttons[0].getAttribute("aria-pressed")).toBe("false");
    expect(buttons[1].getAttribute("aria-pressed")).toBe("true");
  });
});
