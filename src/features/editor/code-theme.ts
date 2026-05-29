import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

export const lumenCodeTheme = [
  EditorView.theme({
    "&": {
      color: "var(--code-text)",
      backgroundColor: "var(--code-bg)",
    },
    ".cm-content": {
      caretColor: "var(--code-caret)",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--code-caret)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "var(--code-selection)",
    },
    ".cm-gutters": {
      color: "var(--code-line-number)",
      backgroundColor: "var(--code-bg)",
      borderRightColor: "var(--code-border)",
    },
    ".cm-activeLine": {
      backgroundColor: "var(--code-active-line)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "var(--code-active-line)",
    },
    ".cm-matchingBracket, .cm-nonmatchingBracket": {
      outline: "1px solid var(--code-border-strong)",
      backgroundColor: "var(--code-selection)",
    },
  }),
  syntaxHighlighting(
    HighlightStyle.define([
      { tag: tags.keyword, color: "var(--code-keyword)", fontWeight: "650" },
      { tag: [tags.name, tags.deleted, tags.character, tags.propertyName, tags.macroName], color: "var(--code-name)" },
      { tag: [tags.function(tags.variableName), tags.labelName], color: "var(--code-function)" },
      { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: "var(--code-constant)" },
      { tag: [tags.definition(tags.name), tags.separator], color: "var(--code-text)" },
      { tag: [tags.typeName, tags.className], color: "var(--code-type)" },
      { tag: [tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace], color: "var(--code-number)" },
      { tag: [tags.operator, tags.operatorKeyword, tags.url, tags.escape, tags.regexp, tags.link], color: "var(--code-operator)" },
      { tag: [tags.meta, tags.comment, tags.lineComment, tags.blockComment], color: "var(--code-comment)", fontStyle: "italic" },
      { tag: tags.strong, fontWeight: "700" },
      { tag: tags.emphasis, fontStyle: "italic" },
      { tag: tags.strikethrough, textDecoration: "line-through" },
      { tag: tags.link, color: "var(--code-link)", textDecoration: "underline" },
      { tag: tags.heading, color: "var(--code-heading)", fontWeight: "700" },
      { tag: [tags.atom, tags.bool, tags.special(tags.variableName)], color: "var(--code-atom)" },
      { tag: [tags.processingInstruction, tags.string, tags.inserted], color: "var(--code-string)" },
      { tag: tags.invalid, color: "var(--code-invalid)" },
      { tag: tags.punctuation, color: "var(--code-punctuation)" },
    ]),
  ),
];
