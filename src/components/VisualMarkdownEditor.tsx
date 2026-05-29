import { cpp } from "@codemirror/lang-cpp";
import { css } from "@codemirror/lang-css";
import { go } from "@codemirror/lang-go";
import { html } from "@codemirror/lang-html";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { php } from "@codemirror/lang-php";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { PostgreSQL, sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { LanguageDescription, LanguageSupport, StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { CrepeBuilder } from "@milkdown/crepe/builder";
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
import { enhanceCodeBlockControls } from "../features/editor/code-block-enhancements";
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
  revealText?: string;
}

const codeLanguages = [
  LanguageDescription.of({ name: "Go", alias: ["go", "golang"], extensions: ["go"], support: go() }),
  LanguageDescription.of({ name: "Java", alias: ["java"], extensions: ["java"], support: java() }),
  LanguageDescription.of({ name: "JavaScript", alias: ["javascript", "js"], extensions: ["js", "mjs", "cjs"], support: javascript() }),
  LanguageDescription.of({ name: "TypeScript", alias: ["typescript", "ts"], extensions: ["ts", "tsx"], support: javascript({ typescript: true }) }),
  LanguageDescription.of({ name: "HTML", alias: ["html"], extensions: ["html", "htm"], support: html() }),
  LanguageDescription.of({ name: "CSS", alias: ["css"], extensions: ["css"], support: css() }),
  LanguageDescription.of({ name: "Rust", alias: ["rust", "rs"], extensions: ["rs"], support: rust() }),
  LanguageDescription.of({ name: "C++", alias: ["cpp", "c++", "c"], extensions: ["cpp", "cc", "cxx", "c", "h", "hpp"], support: cpp() }),
  LanguageDescription.of({ name: "PHP", alias: ["php"], extensions: ["php"], support: php() }),
  LanguageDescription.of({ name: "XML", alias: ["xml"], extensions: ["xml"], support: xml() }),
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

export function VisualMarkdownEditor({ labels, title, value, onChange, resolveImage, revealText }: VisualMarkdownEditorProps) {
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
      .addFeature(placeholder, {
          text: "",
          mode: "block",
      })
      .addFeature(toolbar)
      .addFeature(codeMirror, {
          languages: codeLanguages,
          theme: lumenCodeTheme,
          copyText: "",
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
    let cleanupCodeBlocks: (() => void) | undefined;
    void editor.create().then(() => {
      if (editorRoot.current) cleanupCodeBlocks = enhanceCodeBlockControls(editorRoot.current, { wrapLabel: labels.wrapCode, copyLabel: labels.copy });
      if (!revealText?.trim()) return;
      window.setTimeout(() => {
        const normalized = revealText.trim().replace(/\s+/g, " ");
        const candidates = Array.from(editorRoot.current?.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6, p, li, pre") ?? []);
        const target = candidates.find((element) => (element.textContent ?? "").replace(/\s+/g, " ").includes(normalized));
        target?.scrollIntoView({ block: "center" });
        target?.classList.add("search-reveal");
        window.setTimeout(() => target?.classList.remove("search-reveal"), 1600);
      });
    });
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
      cleanupCodeBlocks?.();
      unlistenFormatMenu?.();
      void editor.destroy();
    };
  }, []);

  return (
    <section className="visual-editor" aria-label={title}>
      <div className="crepe-root" ref={editorRoot} />
      {languageSearch ? (
        <div
          className="code-language-search"
          style={{ top: languageSearch.top, left: languageSearch.left }}
          role="listbox"
          aria-label="Code block language"
        >
          {languageSearch.suggestions.map((language, index) => (
            <button
              key={language.id}
              type="button"
              role="option"
              aria-selected={index === languageSearch.selectedIndex}
              className={index === languageSearch.selectedIndex ? "selected" : undefined}
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
