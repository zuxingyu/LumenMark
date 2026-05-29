import type { Editor } from "@milkdown/kit/core";
import type { Command } from "@milkdown/kit/prose/state";
import { Plugin, PluginKey, TextSelection } from "@milkdown/kit/prose/state";
import { $prose, $shortcut } from "@milkdown/kit/utils";

export type EnterShortcut =
  | { kind: "heading"; level: HeadingLevel; text: string }
  | { kind: "code"; language: string };

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface CodeLanguageOption {
  id: string;
  label: string;
  aliases: string[];
}

export interface CodeFenceSearchState {
  query: string;
  suggestions: CodeLanguageOption[];
  top: number;
  left: number;
}

export const CODE_LANGUAGE_SELECTED_EVENT = "lumenmark:code-language-selected";

export const codeLanguageOptions: CodeLanguageOption[] = [
  { id: "json", label: "JSON", aliases: ["json"] },
  { id: "java", label: "Java", aliases: ["java"] },
  { id: "python", label: "Python", aliases: ["python", "py"] },
  { id: "shell", label: "Shell", aliases: ["shell", "sh", "bash"] },
  { id: "sql", label: "SQL", aliases: ["sql"] },
  { id: "yaml", label: "YAML", aliases: ["yaml", "yml"] },
  { id: "markdown", label: "Markdown", aliases: ["markdown", "md"] },
  { id: "mermaid", label: "Mermaid", aliases: ["mermaid", "mmd"] },
  { id: "text", label: "Text", aliases: ["text", "txt"] },
];

const codeLanguageAliases = new Map<string, string>(
  codeLanguageOptions.flatMap((language) => [
    [language.id, language.id] as const,
    ...language.aliases.map((alias) => [alias, language.id] as const),
  ]),
);

const legacyCodeLanguageAliases = new Map([
  ["json", "json"],
  ["python", "python"],
  ["py", "python"],
  ["java", "java"],
  ["shell", "shell"],
  ["sh", "shell"],
  ["bash", "shell"],
  ["sql", "sql"],
  ["yaml", "yaml"],
  ["yml", "yaml"],
]);

export function normalizeCodeLanguage(language: string): string {
  const normalized = language.trim().toLowerCase();
  return codeLanguageAliases.get(normalized) ?? legacyCodeLanguageAliases.get(normalized) ?? normalized;
}

export function getCodeFenceQuery(lineText: string): string | null {
  const match = /^```([A-Za-z0-9_-]*)$/.exec(lineText);
  return match ? match[1].toLowerCase() : null;
}

export function getCodeLanguageSuggestions(query: string): CodeLanguageOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return codeLanguageOptions;
  return codeLanguageOptions.filter((language) => {
    const searchable = [language.id, language.label.toLowerCase(), ...language.aliases];
    return searchable.some((value) => value.startsWith(normalized));
  });
}

export function shouldKeepLiteralSpace(lineBeforeCursor: string): boolean {
  return /^(#{1,6}|[-+*]|\d+\.|>|\[(?: |x|X)\]|---|\*\*\*|___|\|\d+[xX]\d+\||```[A-Za-z0-9_-]*)$/.test(
    lineBeforeCursor,
  );
}

export function parseEnterShortcut(lineText: string): EnterShortcut | null {
  const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(lineText);
  if (heading) {
    return {
      kind: "heading",
      level: heading[1].length as HeadingLevel,
      text: heading[2].trim(),
    };
  }

  const code = /^```([A-Za-z0-9_-]+)\s*$/.exec(lineText);
  if (code) {
    const suggested = getCodeLanguageSuggestions(code[1])[0]?.id;
    return {
      kind: "code",
      language: suggested ?? normalizeCodeLanguage(code[1]),
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

function createCodeBlockCommand(language: string): Command {
  return (state, dispatch) => {
    if (!state.selection.empty) return false;
    const { $from } = state.selection;
    if ($from.parent.type.name !== "paragraph") return false;
    if (getCodeFenceQuery($from.parent.textContent) === null) return false;

    const codeBlockType = state.schema.nodes.code_block;
    if (!codeBlockType || !dispatch) return Boolean(codeBlockType);

    const blockStart = $from.before($from.depth);
    const blockEnd = $from.after($from.depth);
    const codeBlock = codeBlockType.create({ language: normalizeCodeLanguage(language) });
    const tr = state.tr.replaceWith(blockStart, blockEnd, codeBlock);
    return dispatchAndSelect(tr, blockStart + 1, dispatch);
  };
}

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

function createCodeFenceSearchPlugin(onSearchChange: (state: CodeFenceSearchState | null) => void) {
  return $prose(
    () =>
      new Plugin({
        key: new PluginKey("lumenmark-code-fence-search"),
        view(view) {
          const updateSearch = () => {
            const { selection } = view.state;
            if (!selection.empty) {
              onSearchChange(null);
              return;
            }
            const { $from } = selection;
            if ($from.parent.type.name !== "paragraph" || $from.parentOffset !== $from.parent.content.size) {
              onSearchChange(null);
              return;
            }

            const query = getCodeFenceQuery($from.parent.textContent);
            if (query === null || query.length === 0) {
              onSearchChange(null);
              return;
            }

            const suggestions = getCodeLanguageSuggestions(query);
            if (suggestions.length === 0) {
              onSearchChange(null);
              return;
            }

            const editorRect = view.dom.closest(".visual-editor")?.getBoundingClientRect() ?? view.dom.getBoundingClientRect();
            const cursorRect = view.coordsAtPos(selection.from);
            onSearchChange({
              query,
              suggestions,
              top: cursorRect.bottom - editorRect.top + 8,
              left: cursorRect.left - editorRect.left,
            });
          };

          const selectLanguage = (event: Event) => {
            const language = (event as CustomEvent<string>).detail;
            if (!language) return;
            createCodeBlockCommand(language)(view.state, view.dispatch);
            onSearchChange(null);
            view.focus();
          };

          window.addEventListener(CODE_LANGUAGE_SELECTED_EVENT, selectLanguage);
          updateSearch();
          return {
            update: updateSearch,
            destroy: () => {
              window.removeEventListener(CODE_LANGUAGE_SELECTED_EVENT, selectLanguage);
              onSearchChange(null);
            },
          };
        },
      }),
  );
}

export function enterConfirmedMarkdownShortcuts(editor: Editor): void {
  editor.use(enterConfirmedShortcut);
}

export function enterConfirmedMarkdownShortcutsWithSearch(
  onSearchChange: (state: CodeFenceSearchState | null) => void,
) {
  return (editor: Editor): void => {
    editor.use(enterConfirmedShortcut);
    editor.use(createCodeFenceSearchPlugin(onSearchChange));
  };
}
