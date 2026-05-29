import type { Editor } from "@milkdown/kit/core";
import { editorViewOptionsCtx, parserCtx } from "@milkdown/kit/core";
import { Slice } from "@milkdown/kit/prose/model";

const MARKDOWN_PASTE_PATTERNS = [
  /^#{1,6}\s+\S/m,
  /^>\s+\S/m,
  /^[-+*]\s+\S/m,
  /^\d+\.\s+\S/m,
  /^-\s+\[[ xX]\]\s+\S/m,
  /^\|.+\|\s*\n\|[-:\s|]+\|/m,
  /^```[\s\S]*```$/m,
  /^\$\$[\s\S]*\$\$$/m,
  /(^|[^*])\*\*[^*\n]+\*\*/,
  /(^|[^_])_[^_\n]+_/,
  /`[^`\n]+`/,
  /\[[^\]\n]+\]\([^)]+\)/,
];

export function looksLikeMarkdownPaste(text: string): boolean {
  const value = text.trim();
  if (!value) return false;
  return MARKDOWN_PASTE_PATTERNS.some((pattern) => pattern.test(value));
}

export function markdownPasteAsRichText(editor: Editor): void {
  editor.config((ctx) => {
    ctx.update(editorViewOptionsCtx, (previous) => ({
      ...previous,
      handlePaste: (view, event, slice) => {
        const text = event.clipboardData?.getData("text/plain") ?? "";
        const currentNode = view.state.selection.$from.node();
        if (!currentNode.type.spec.code && looksLikeMarkdownPaste(text)) {
          const parsed = ctx.get(parserCtx)(text);
          if (parsed) {
            try {
              view.dispatch(view.state.tr.replaceSelection(new Slice(parsed.content, 0, 0)).scrollIntoView());
              return true;
            } catch {
              return false;
            }
          }
        }
        return previous.handlePaste?.(view, event, slice) ?? false;
      },
    }));
  });
}
