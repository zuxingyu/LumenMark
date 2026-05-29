export function enhanceCodeBlockWrapping(root: HTMLElement, label: string): () => void {
  const apply = () => {
    root.querySelectorAll<HTMLElement>(".milkdown-code-block").forEach((block) => {
      if (block.querySelector(".code-wrap-toggle")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "code-wrap-toggle";
      button.textContent = label;
      button.setAttribute("aria-label", label);
      button.setAttribute("aria-pressed", "true");
      button.addEventListener("click", () => {
        const nextOff = !block.classList.contains("code-wrap-off");
        block.classList.toggle("code-wrap-off", nextOff);
        button.setAttribute("aria-pressed", nextOff ? "false" : "true");
      });
      block.append(button);
    });
  };

  apply();
  const observer = new MutationObserver(apply);
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
