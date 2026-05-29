import { java } from "@codemirror/lang-java";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { PostgreSQL, sql } from "@codemirror/lang-sql";
import { yaml } from "@codemirror/lang-yaml";
import { LanguageDescription, LanguageSupport, StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { CrepeBuilder } from "@milkdown/crepe/builder";
import { blockEdit } from "@milkdown/crepe/feature/block-edit";
import { codeMirror } from "@milkdown/crepe/feature/code-mirror";
import { cursor } from "@milkdown/crepe/feature/cursor";
import { imageBlock } from "@milkdown/crepe/feature/image-block";
import { latex } from "@milkdown/crepe/feature/latex";
import { linkTooltip } from "@milkdown/crepe/feature/link-tooltip";
import { listItem } from "@milkdown/crepe/feature/list-item";
import { placeholder } from "@milkdown/crepe/feature/placeholder";
import { table } from "@milkdown/crepe/feature/table";
import { toolbar } from "@milkdown/crepe/feature/toolbar";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import { useEffect, useRef, useState } from "react";
import type { Messages } from "../i18n";
import { lumenCodeTheme } from "../features/editor/code-theme";
import { runFormatCommand } from "../features/editor/format-menu";
import {
  CODE_LANGUAGE_SELECTED_EVENT,
  type CodeFenceSearchState,
  codeLanguageOptions,
  enterConfirmedMarkdownShortcutsWithSearch,
  normalizeCodeLanguage,
} from "../features/editor/markdown-shortcuts";
import { markdownPasteAsRichText } from "../features/editor/markdown-paste";
import { renderMermaidPreview } from "../features/editor/mermaid-preview";

interface VisualMarkdownEditorProps {
  labels: Messages;
  title: string;
  value: string;
  onChange(value: string): void;
  resolveImage?(source: string): Promise<string>;
}

const codeLanguages = [
  LanguageDescription.of({ name: "Java", alias: ["java"], extensions: ["java"], support: java() }),
  LanguageDescription.of({ name: "JSON", alias: ["json"], extensions: ["json"], support: json() }),
  LanguageDescription.of({ name: "SQL", alias: ["sql"], extensions: ["sql"], support: sql({ dialect: PostgreSQL }) }),
  LanguageDescription.of({
    name: "Shell",
    alias: ["sh", "shell", "bash"],
    extensions: ["sh"],
    support: new LanguageSupport(StreamLanguage.define(shell)),
  }),
  LanguageDescription.of({ name: "Python", alias: ["python", "py"], extensions: ["py"], support: python() }),
  LanguageDescription.of({ name: "YAML", alias: ["yaml", "yml"], extensions: ["yaml", "yml"], support: yaml() }),
  LanguageDescription.of({ name: "Markdown", alias: ["markdown", "md"], extensions: ["md"], support: markdown() }),
  LanguageDescription.of({ name: "Mermaid", alias: ["mermaid", "mmd"], extensions: ["mmd"], support: markdown() }),
  LanguageDescription.of({ name: "Text", alias: ["text", "txt"], extensions: ["txt"], support: markdown() }),
];

function renderCodeLanguage(language: string): string {
  const normalized = normalizeCodeLanguage(language);
  return codeLanguageOptions.find((option) => option.id === normalized)?.label ?? (language || "Text");
}

export function VisualMarkdownEditor({ labels, title, value, onChange, resolveImage }: VisualMarkdownEditorProps) {
  const editorRoot = useRef<HTMLDivElement>(null);
  const changeHandler = useRef(onChange);
  const [languageSearch, setLanguageSearch] = useState<CodeFenceSearchState | null>(null);

  useEffect(() => {
    changeHandler.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!editorRoot.current) return;
    const editor = new CrepeBuilder({
      root: editorRoot.current,
      defaultValue: value,
    })
      .addFeature(cursor)
      .addFeature(markdownPasteAsRichText)
      .addFeature(enterConfirmedMarkdownShortcutsWithSearch(setLanguageSearch))
      .addFeature(listItem)
      .addFeature(linkTooltip)
      .addFeature(imageBlock, {
          proxyDomURL: (source) => resolveImage?.(source).catch(() => "") ?? "",
      })
      .addFeature(blockEdit)
      .addFeature(placeholder, {
          text: labels.untitled,
          mode: "block",
      })
      .addFeature(toolbar)
      .addFeature(codeMirror, {
          languages: codeLanguages,
          theme: lumenCodeTheme,
          copyText: labels.copy,
          searchPlaceholder: labels.find,
          renderLanguage: (language) => renderCodeLanguage(language),
          previewLabel: "Mermaid",
          previewLoading: labels.diagramLoading,
          previewOnlyByDefault: true,
          renderPreview: (language, source, applyPreview) => {
            if (language.toLowerCase() !== "mermaid") return null;
            void import("mermaid").then(({ default: mermaid }) => {
              mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
              return renderMermaidPreview(source, (id, diagram) => mermaid.render(id, diagram));
            }).then((html) => applyPreview(html));
            return undefined;
          },
      })
      .addFeature(table)
      .addFeature(latex, {
          katexOptions: { throwOnError: false },
      });
    editor.on((listener) => {
      listener.markdownUpdated((_ctx, markdown) => changeHandler.current(markdown));
    });
    void editor.create();
    function focusHeading(event: Event) {
      const id = (event as CustomEvent<string>).detail;
      const index = Number(id.replace("heading-", ""));
      const heading = editorRoot.current?.querySelectorAll("h1, h2, h3, h4, h5, h6")[index] as HTMLElement | undefined;
      heading?.scrollIntoView({ block: "center" });
      heading?.focus();
    }
    window.addEventListener("lumenmark:outline", focusHeading);
    function runFormatFromWindow(event: Event) {
      const command = (event as CustomEvent<string>).detail;
      if (command) runFormatCommand(editor.editor, command);
    }
    window.addEventListener("lumenmark:format-command", runFormatFromWindow);
    let unlistenFormatMenu: (() => void) | undefined;
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      void import("@tauri-apps/api/event")
        .then(({ listen }) => listen<string>("format-command", (event) => runFormatCommand(editor.editor, event.payload)))
        .then((unlisten) => {
          unlistenFormatMenu = unlisten;
        });
    }
    return () => {
      window.removeEventListener("lumenmark:outline", focusHeading);
      window.removeEventListener("lumenmark:format-command", runFormatFromWindow);
      unlistenFormatMenu?.();
      void editor.destroy();
    };
  }, []);

  return (
    <section className="visual-editor" aria-label={title}>
      <header className="visual-document-header">
        <h1>{title}</h1>
      </header>
      <div className="crepe-root" ref={editorRoot} />
      {languageSearch ? (
        <div
          className="code-language-search"
          style={{ top: languageSearch.top, left: languageSearch.left }}
          role="listbox"
          aria-label="Code block language"
        >
          {languageSearch.suggestions.map((language) => (
            <button
              key={language.id}
              type="button"
              role="option"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                window.dispatchEvent(new CustomEvent(CODE_LANGUAGE_SELECTED_EVENT, { detail: language.id }));
              }}
            >
              {language.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
