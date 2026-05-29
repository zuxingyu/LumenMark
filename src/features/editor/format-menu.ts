import type { Editor } from "@milkdown/kit/core";
import { commandsCtx, editorViewCtx } from "@milkdown/kit/core";
import {
  blockquoteSchema,
  bulletListSchema,
  codeBlockSchema,
  headingSchema,
  listItemSchema,
  orderedListSchema,
  paragraphSchema,
  setBlockTypeCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
  wrapInBlockTypeCommand,
} from "@milkdown/kit/preset/commonmark";
import { toggleStrikethroughCommand } from "@milkdown/kit/preset/gfm";
import { toggleLinkCommand } from "@milkdown/kit/component/link-tooltip";

export type FormatCommandKind = "block" | "inline";

export interface FormatCommandDefinition {
  id: string;
  kind: FormatCommandKind;
}

export const FORMAT_COMMANDS: FormatCommandDefinition[] = [
  { id: "paragraph", kind: "block" },
  { id: "heading-1", kind: "block" },
  { id: "heading-2", kind: "block" },
  { id: "heading-3", kind: "block" },
  { id: "heading-4", kind: "block" },
  { id: "heading-5", kind: "block" },
  { id: "heading-6", kind: "block" },
  { id: "blockquote", kind: "block" },
  { id: "bullet-list", kind: "block" },
  { id: "ordered-list", kind: "block" },
  { id: "task-list", kind: "block" },
  { id: "code-block", kind: "block" },
  { id: "strong", kind: "inline" },
  { id: "emphasis", kind: "inline" },
  { id: "strikethrough", kind: "inline" },
  { id: "inline-code", kind: "inline" },
  { id: "link", kind: "inline" },
];

export function formatCommandIds(): string[] {
  return FORMAT_COMMANDS.map((command) => command.id);
}

export function runFormatCommand(editor: Editor, commandId: string): boolean {
  if (!formatCommandIds().includes(commandId)) return false;

  return editor.action((ctx) => {
    const commands = ctx.get(commandsCtx);
    const view = ctx.get(editorViewCtx);
    view.focus();

    if (commandId === "paragraph") {
      commands.call(setBlockTypeCommand.key, { nodeType: paragraphSchema.type(ctx) });
      return true;
    }

    const heading = /^heading-([1-6])$/.exec(commandId);
    if (heading) {
      commands.call(setBlockTypeCommand.key, {
        nodeType: headingSchema.type(ctx),
        attrs: { level: Number(heading[1]) },
      });
      return true;
    }

    if (commandId === "blockquote") {
      commands.call(wrapInBlockTypeCommand.key, { nodeType: blockquoteSchema.type(ctx) });
      return true;
    }
    if (commandId === "bullet-list") {
      commands.call(wrapInBlockTypeCommand.key, { nodeType: bulletListSchema.type(ctx) });
      return true;
    }
    if (commandId === "ordered-list") {
      commands.call(wrapInBlockTypeCommand.key, { nodeType: orderedListSchema.type(ctx) });
      return true;
    }
    if (commandId === "task-list") {
      commands.call(wrapInBlockTypeCommand.key, {
        nodeType: listItemSchema.type(ctx),
        attrs: { checked: false },
      });
      return true;
    }
    if (commandId === "code-block") {
      commands.call(setBlockTypeCommand.key, { nodeType: codeBlockSchema.type(ctx) });
      return true;
    }
    if (commandId === "strong") {
      commands.call(toggleStrongCommand.key);
      return true;
    }
    if (commandId === "emphasis") {
      commands.call(toggleEmphasisCommand.key);
      return true;
    }
    if (commandId === "strikethrough") {
      commands.call(toggleStrikethroughCommand.key);
      return true;
    }
    if (commandId === "inline-code") {
      commands.call(toggleInlineCodeCommand.key);
      return true;
    }
    if (commandId === "link") {
      commands.call(toggleLinkCommand.key);
      return true;
    }

    return false;
  });
}
