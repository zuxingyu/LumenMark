interface CodeBlockControlLabels {
  wrapLabel: string;
  copyLabel: string;
  copiedLabel?: string;
}

const copyIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const wrapIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h13a4 4 0 0 1 0 8H7"></path><path d="m10 11-3 3 3 3"></path><path d="M3 18h12"></path></svg>`;
const copiedIcon = `<span aria-hidden="true">✅</span>`;

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

function extractCodeText(block: HTMLElement): string {
  const content = block.querySelector<HTMLElement>(".cm-content");
  const lines = Array.from((content ?? block).querySelectorAll<HTMLElement>(".cm-line"));
  if (lines.length > 0) return lines.map((line) => line.textContent ?? "").join("\n");
  if (content) return content.textContent ?? "";
  const clone = block.cloneNode(true) as HTMLElement;
  clone.querySelector(".code-block-tools")?.remove();
  return clone.querySelector<HTMLElement>("pre, code")?.textContent ?? clone.textContent ?? "";
}

export function enhanceCodeBlockControls(root: HTMLElement, labels: CodeBlockControlLabels): () => void {
  const timers = new WeakMap<HTMLButtonElement, number>();

  const showCopiedFeedback = (button: HTMLButtonElement) => {
    const existing = timers.get(button);
    if (existing) window.clearTimeout(existing);
    button.dataset.copied = "true";
    syncIconButton(button, labels.copiedLabel ?? labels.copyLabel, copiedIcon);
    const timer = window.setTimeout(() => {
      button.dataset.copied = "false";
      syncIconButton(button, labels.copyLabel, copyIcon);
      timers.delete(button);
    }, 2000);
    timers.set(button, timer);
  };

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
      if (copyButton) {
        if (copyButton.dataset.copyFeedbackBound !== "true") {
          copyButton.dataset.copyFeedbackBound = "true";
          copyButton.addEventListener("click", (event) => {
            const codeText = extractCodeText(block);
            if (!codeText.trim()) {
              window.setTimeout(() => showCopiedFeedback(copyButton), 0);
              return;
            }
            const clipboard = navigator.clipboard;
            if (!clipboard) {
              console.error("Unable to copy code block.", new Error("Clipboard API is unavailable."));
              return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            clipboard.writeText(codeText)
              .then(() => showCopiedFeedback(copyButton))
              .catch((error) => console.error("Unable to copy code block.", error));
          });
        }
        if (copyButton.dataset.copied === "true") {
          syncIconButton(copyButton, labels.copiedLabel ?? labels.copyLabel, copiedIcon);
        } else {
          syncIconButton(copyButton, labels.copyLabel, copyIcon);
        }
      }

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
    root.querySelectorAll<HTMLButtonElement>(".copy-button").forEach((button) => {
      const timer = timers.get(button);
      if (timer) window.clearTimeout(timer);
    });
  };
}

export function enhanceCodeBlockWrapping(root: HTMLElement, label: string): () => void {
  return enhanceCodeBlockControls(root, { wrapLabel: label, copyLabel: "Copy" });
}
