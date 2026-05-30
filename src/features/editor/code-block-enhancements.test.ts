import { afterEach, describe, expect, it, vi } from "vitest";
import { enhanceCodeBlockControls, syncIconButton } from "./code-block-enhancements";

describe("code block enhancements", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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
          <div class="cm-content"><div class="cm-line">echo ok</div></div>
          <button class="copy-button">Copy</button>
        </div>
      </div>
    `;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    enhanceCodeBlockControls(document.querySelector(".crepe-root") as HTMLElement, { wrapLabel: "Wrap code", copyLabel: "Copy" });

    const toolbar = document.querySelector(".code-block-tools");
    expect(toolbar?.querySelector(".copy-button")).toBeTruthy();
    expect(toolbar?.querySelector(".code-wrap-toggle")).toBeTruthy();
    expect(toolbar?.textContent).not.toContain("Copy");
    expect(toolbar?.textContent).not.toContain("Wrap code");
  });

  it("does not rewrite unchanged icon buttons during observer refreshes", () => {
    const button = document.createElement("button");
    const icon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h13"></path></svg>`;

    syncIconButton(button, "Wrap code", icon);
    const firstIconNode = button.firstChild;

    syncIconButton(button, "Wrap code", icon);

    expect(button.firstChild).toBe(firstIconNode);
    expect(button.innerHTML).toBe(icon);
    expect(button).toHaveAttribute("aria-label", "Wrap code");
    expect(button).toHaveAttribute("title", "Wrap code");
  });

  it("shows a short success icon after the copy button reports success", async () => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <div class="crepe-root">
        <div class="milkdown-code-block">
          <button class="copy-button">Copy</button>
        </div>
      </div>
    `;

    enhanceCodeBlockControls(document.querySelector(".crepe-root") as HTMLElement, {
      wrapLabel: "Wrap code",
      copyLabel: "Copy",
      copiedLabel: "Copied",
    });

    const button = document.querySelector<HTMLButtonElement>(".copy-button");
    expect(button?.textContent).not.toContain("✅");

    button?.dispatchEvent(new Event("click", { bubbles: true }));
    await Promise.resolve();
    vi.advanceTimersByTime(0);

    expect(button?.textContent).not.toContain("✅");
    expect(button?.querySelector("svg")).not.toBeNull();
    expect(button?.innerHTML).toContain("path");

    vi.advanceTimersByTime(2000);

    expect(button?.textContent).not.toContain("✅");
    expect(button).toHaveAttribute("aria-label", "Copy");
  });

  it("reveals Mermaid source when the rendered preview is clicked and hides it on blur", () => {
    document.body.innerHTML = `
      <div class="crepe-root">
        <div class="milkdown-code-block" data-language="mermaid">
          <div class="cm-editor">
            <div class="cm-content" contenteditable="true"><div class="cm-line">graph TD; A-->B</div></div>
          </div>
          <div class="mermaid-preview"><svg aria-label="diagram"></svg></div>
        </div>
      </div>
    `;

    enhanceCodeBlockControls(document.querySelector(".crepe-root") as HTMLElement, { wrapLabel: "Wrap code", copyLabel: "Copy" });
    const block = document.querySelector<HTMLElement>(".milkdown-code-block");
    const preview = document.querySelector<HTMLElement>(".mermaid-preview");

    expect(block).not.toHaveClass("mermaid-source-visible");

    preview?.click();

    expect(block).toHaveClass("mermaid-source-visible");
    expect(block?.querySelector(".cm-content")).toHaveFocus();

    block?.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: document.body }));

    expect(block).not.toHaveClass("mermaid-source-visible");
  });
});
