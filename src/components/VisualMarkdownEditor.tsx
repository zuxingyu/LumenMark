import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import { useEffect, useRef } from "react";
import type { Messages } from "../i18n";

interface VisualMarkdownEditorProps {
  labels: Messages;
  title: string;
  value: string;
  onChange(value: string): void;
}

export function VisualMarkdownEditor({ labels, title, value, onChange }: VisualMarkdownEditorProps) {
  const editorRoot = useRef<HTMLDivElement>(null);
  const changeHandler = useRef(onChange);

  useEffect(() => {
    changeHandler.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!editorRoot.current) return;
    const editor = new Crepe({
      root: editorRoot.current,
      defaultValue: value,
      featureConfigs: {
        [Crepe.Feature.Placeholder]: {
          text: labels.untitled,
          mode: "block",
        },
        [Crepe.Feature.CodeMirror]: {
          copyText: labels.copy,
          searchPlaceholder: labels.find,
        },
      },
    });
    editor.on((listener) => {
      listener.markdownUpdated((_ctx, markdown) => changeHandler.current(markdown));
    });
    void editor.create();
    return () => {
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
