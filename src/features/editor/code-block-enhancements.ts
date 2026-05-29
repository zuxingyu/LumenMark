interface CodeBlockControlLabels {
  wrapLabel: string;
  copyLabel: string;
}

const copyIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const wrapIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h13a4 4 0 0 1 0 8H7"></path><path d="m10 11-3 3 3 3"></path><path d="M3 18h12"></path></svg>`;

export function getNextCodeLineIndent(line: string): string {
  const currentIndent = line.match(/^[\t ]*/)?.[0] ?? "";
  const trimmed = line.trimEnd();
  return /(?:[{[(]|=>|then|do)\s*$/.test(trimmed) ? `${currentIndent}  ` : currentIndent;
}

export function syncIconButton(button: HTMLButtonElement, label: string, icon: string) {
  if (button.title !== label) button.title = label;
  if (button.getAttribute("aria-label") !== label) button.setAttribute("aria-label", label);
  if (button.innerHTML !== icon) button.innerHTML = icon;
}

function findCopyButton(block: HTMLElement): HTMLButtonElement | null {
  return (
    block.querySelector<HTMLButtonElement>(".copy-button")
    ?? Array.from(block.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      /copy|复制/i.test(button.textContent ?? "") || /copy/i.test(button.className),
    )
    ?? null
  );
}

export function enhanceCodeBlockControls(root: HTMLElement, labels: CodeBlockControlLabels): () => void {
  const apply = () => {
    root.querySelectorAll<HTMLElement>(".milkdown-code-block").forEach((block) => {
      let toolbar = block.querySelector<HTMLElement>(".code-block-tools");
      if (!toolbar) {
        toolbar = document.createElement("div");
        toolbar.className = "code-block-tools";
        block.append(toolbar);
      }

      const copyButton = findCopyButton(block);
      if (copyButton && copyButton.parentElement !== toolbar) toolbar.prepend(copyButton);
      if (copyButton) syncIconButton(copyButton, labels.copyLabel, copyIcon);

      let button = block.querySelector<HTMLButtonElement>(".code-wrap-toggle");
      if (!button) {
        button = document.createElement("button");
        const wrapButton = button;
        button.type = "button";
        button.className = "code-wrap-toggle";
        button.setAttribute("aria-pressed", "true");
        button.addEventListener("click", () => {
          const nextOff = !block.classList.contains("code-wrap-off");
          block.classList.toggle("code-wrap-off", nextOff);
          wrapButton.setAttribute("aria-pressed", nextOff ? "false" : "true");
        });
        toolbar.append(button);
      }
      syncIconButton(button, labels.wrapLabel, wrapIcon);
    });
  };

  const keepCodeIndent = (event: KeyboardEvent) => {
    if (event.key !== "Enter" || event.defaultPrevented) return;
    const target = event.target as HTMLElement | null;
    const content = target?.closest(".milkdown-code-block .cm-content");
    if (!content) return;
    const selection = document.getSelection();
    const focusElement = selection?.focusNode instanceof Element
      ? selection.focusNode
      : selection?.focusNode?.parentElement;
    const line = focusElement
      ? (focusElement.closest(".cm-line")?.textContent ?? "")
      : "";
    const indent = getNextCodeLineIndent(line);
    if (!indent) return;
    event.preventDefault();
    document.execCommand("insertText", false, `\n${indent}`);
  };

  apply();
  root.addEventListener("keydown", keepCodeIndent, true);
  const observer = new MutationObserver(apply);
  observer.observe(root, { childList: true, subtree: true });
  return () => {
    root.removeEventListener("keydown", keepCodeIndent, true);
    observer.disconnect();
  };
}

export function enhanceCodeBlockWrapping(root: HTMLElement, label: string): () => void {
  return enhanceCodeBlockControls(root, { wrapLabel: label, copyLabel: "Copy" });
}
