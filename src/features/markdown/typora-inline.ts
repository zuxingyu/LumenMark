import type { Editor } from "@milkdown/kit/core";
import { markRule } from "@milkdown/kit/prose";
import { toggleMark } from "@milkdown/kit/prose/commands";
import { $command, $inputRule, $markAttr, $markSchema, $remark } from "@milkdown/kit/utils";

type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  data?: Record<string, unknown>;
};

type InlinePart =
  | { type: "text"; value: string }
  | { type: "superscript" | "subscript"; value: string };

const SKIP_TYPES = new Set(["inlineCode", "code", "html", "math", "inlineMath"]);

export const superscriptAttr = $markAttr("superscript");
export const subscriptAttr = $markAttr("subscript");

export const superscriptSchema = $markSchema("superscript", (ctx) => ({
  parseDOM: [{ tag: "sup" }],
  toDOM: (mark) => ["sup", ctx.get(superscriptAttr.key)(mark)],
  parseMarkdown: {
    match: (node) => node.type === "superscript",
    runner: (state, node, markType) => {
      state.openMark(markType);
      state.next(node.children);
      state.closeMark(markType);
    },
  },
  toMarkdown: {
    match: (mark) => mark.type.name === "superscript",
    runner: (state, _mark, node) => {
      state.addNode("text", undefined, `^${node.text ?? ""}^`);
      return true;
    },
  },
}));

export const subscriptSchema = $markSchema("subscript", (ctx) => ({
  parseDOM: [{ tag: "sub" }],
  toDOM: (mark) => ["sub", ctx.get(subscriptAttr.key)(mark)],
  parseMarkdown: {
    match: (node) => node.type === "subscript",
    runner: (state, node, markType) => {
      state.openMark(markType);
      state.next(node.children);
      state.closeMark(markType);
    },
  },
  toMarkdown: {
    match: (mark) => mark.type.name === "subscript",
    runner: (state, _mark, node) => {
      state.addNode("text", undefined, `~${node.text ?? ""}~`);
      return true;
    },
  },
}));

export const toggleSuperscriptCommand = $command("ToggleSuperscript", (ctx) => () =>
  toggleMark(superscriptSchema.type(ctx)),
);

export const toggleSubscriptCommand = $command("ToggleSubscript", (ctx) => () =>
  toggleMark(subscriptSchema.type(ctx)),
);

export const superscriptInputRule = $inputRule((ctx) =>
  markRule(/(?<![\w:/])\^([^^\s](?:[^^]*[^^\s])?)\^(?![\w/])$/, superscriptSchema.type(ctx)),
);

export const subscriptInputRule = $inputRule((ctx) =>
  markRule(/(?<![\w:/~])~([^~\s](?:[^~]*[^~\s])?)~(?![\w/~])$/, subscriptSchema.type(ctx)),
);

export function parseTyporaInlineText(value: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let index = 0;
  let buffer = "";

  const flush = () => {
    if (buffer) parts.push({ type: "text", value: buffer });
    buffer = "";
  };

  while (index < value.length) {
    const char = value[index];
    if ((char === "^" || char === "~") && value[index + 1] !== char && value[index - 1] !== char) {
      const end = value.indexOf(char, index + 1);
      if (end > index + 1 && value[end + 1] !== char) {
        const inner = value.slice(index + 1, end);
        if (inner.trim() === inner && inner.length > 0) {
          flush();
          parts.push({ type: char === "^" ? "superscript" : "subscript", value: inner });
          index = end + 1;
          continue;
        }
      }
    }
    buffer += char;
    index += 1;
  }

  flush();
  return parts;
}

function partToNode(part: InlinePart): MarkdownNode {
  if (part.type === "text") return { type: "text", value: part.value };
  return {
    type: part.type,
    data: { hName: part.type === "superscript" ? "sup" : "sub" },
    children: [{ type: "text", value: part.value }],
  };
}

export function transformTyporaInlineSyntax(tree: MarkdownNode): MarkdownNode {
  function visit(node: MarkdownNode) {
    if (!node.children || SKIP_TYPES.has(node.type)) return;
    const next: MarkdownNode[] = [];
    for (const child of node.children) {
      if (child.type === "text" && child.value) {
        const parts = parseTyporaInlineText(child.value);
        next.push(...parts.map(partToNode));
      } else {
        visit(child);
        next.push(child);
      }
    }
    node.children = next;
  }
  visit(tree);
  return tree;
}

export const typoraInlineRemarkPlugin = () => (tree: unknown) => {
  transformTyporaInlineSyntax(tree as MarkdownNode);
};
export const typoraInlineRemark = $remark("typora-inline", () => typoraInlineRemarkPlugin);

export function typoraInlineSyntax(editor: Editor): void {
  editor
    .use(typoraInlineRemark)
    .use(superscriptAttr)
    .use(subscriptAttr)
    .use(superscriptSchema)
    .use(subscriptSchema)
    .use(toggleSuperscriptCommand)
    .use(toggleSubscriptCommand)
    .use(superscriptInputRule)
    .use(subscriptInputRule);
}
