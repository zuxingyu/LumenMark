import type { Editor } from "@milkdown/kit/core";
import type { Command } from "@milkdown/kit/prose/state";
import { TextSelection } from "@milkdown/kit/prose/state";
import { $shortcut } from "@milkdown/kit/utils";

export type EnterShortcut =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "code"; language: string };

const codeLanguageAliases = new Map([
  ["json", "json"],
  ["python", "python"],
  ["py", "python"],
  ["java", "java"],
  ["shell", "shell"],
  ["sh", "shell"],
  ["bash", "shell"],
  ["sql", "sql"],
]);

export function normalizeCodeLanguage(language: string): string {
  const normalized = language.trim().toLowerCase();
  return codeLanguageAliases.get(normalized) ?? normalized;
}

export function shouldKeepLiteralSpace(lineBeforeCursor: string): boolean {
  return /^(#{1,6}|[-+*]|\d+\.|>|\[(?: |x|X)\]|---|\*\*\*|___|\|\d+[xX]\d+\||```[A-Za-z0-9_-]*)$/.test(
    lineBeforeCursor,
  );
}

export function parseEnterShortcut(lineText: string): EnterShortcut | null {
  const heading = /^(#{1,3})\s+(.+?)\s*$/.exec(lineText);
  if (heading) {
    return {
      kind: "heading",
      level: heading[1].length as 1 | 2 | 3,
      text: heading[2].trim(),
    };
  }

  const code = /^```([A-Za-z0-9_-]+)\s*$/.exec(lineText);
  if (code) {
    return {
      kind: "code",
      language: normalizeCodeLanguage(code[1]),
    };
  }

  return null;
}

const spaceCommand: Command = (state, dispatch) => {
  if (!state.selection.empty) return false;
  const { $from } = state.selection;
  if ($from.parent.type.name !== "paragraph") return false;
  const lineBeforeCursor = $from.parent.textBetween(0, $from.parentOffset);
  if (!shouldKeepLiteralSpace(lineBeforeCursor)) return false;
  dispatch?.(state.tr.insertText(" "));
  return true;
};

const enterCommand: Command = (state, dispatch) => {
  if (!state.selection.empty) return false;
  const { $from } = state.selection;
  if ($from.parent.type.name !== "paragraph") return false;
  if ($from.parentOffset !== $from.parent.content.size) return false;

  const shortcut = parseEnterShortcut($from.parent.textContent);
  if (!shortcut) return false;

  const blockStart = $from.before($from.depth);
  const blockEnd = $from.after($from.depth);
  const paragraphType = state.schema.nodes.paragraph;
  if (!paragraphType) return false;

  if (shortcut.kind === "heading") {
    const headingType = state.schema.nodes.heading;
    if (!headingType || !dispatch) return Boolean(headingType);

    const heading = headingType.create({ level: shortcut.level }, state.schema.text(shortcut.text));
    const paragraph = paragraphType.create();
    const tr = state.tr.replaceWith(blockStart, blockEnd, [heading, paragraph]);
    return dispatchAndSelect(tr, blockStart + heading.nodeSize + 1, dispatch);
  }

  const codeBlockType = state.schema.nodes.code_block;
  if (!codeBlockType || !dispatch) return Boolean(codeBlockType);

  const codeBlock = codeBlockType.create({ language: shortcut.language });
  const tr = state.tr.replaceWith(blockStart, blockEnd, codeBlock);
  return dispatchAndSelect(tr, blockStart + 1, dispatch);
};

function dispatchAndSelect(
  tr: Parameters<NonNullable<Parameters<Command>[1]>>[0],
  position: number,
  dispatch: NonNullable<Parameters<Command>[1]>,
): true {
  dispatch(tr.setSelection(TextSelection.create(tr.doc, position)).scrollIntoView());
  return true;
}

const enterConfirmedShortcut = $shortcut(() => ({
  Space: {
    key: "Space",
    priority: 100,
    onRun: () => spaceCommand,
  },
  Enter: {
    key: "Enter",
    priority: 100,
    onRun: () => enterCommand,
  },
}));

export function enterConfirmedMarkdownShortcuts(editor: Editor): void {
  editor.use(enterConfirmedShortcut);
}
