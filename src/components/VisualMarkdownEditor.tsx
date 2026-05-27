import { java } from "@codemirror/lang-java";
import { json } from "@codemirror/lang-json";
import { python } from "@codemirror/lang-python";
import { PostgreSQL, sql } from "@codemirror/lang-sql";
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
import { useEffect, useRef } from "react";
import type { Messages } from "../i18n";
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
];

export function VisualMarkdownEditor({ labels, title, value, onChange, resolveImage }: VisualMarkdownEditorProps) {
  const editorRoot = useRef<HTMLDivElement>(null);
  const changeHandler = useRef(onChange);

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
          copyText: labels.copy,
          searchPlaceholder: labels.find,
          previewLabel: "Mermaid",
          previewLoading: labels.diagramLoading,
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
    return () => {
      window.removeEventListener("lumenmark:outline", focusHeading);
      void editor.destroy();
    };
  }, []);

  return (
    <section className="visual-editor" aria-label={title}>
      <header className="visual-document-header">
        <h1>{title}</h1>
      </header>
      <div className="crepe-root" ref={editorRoot} />
    </section>
  );
}
