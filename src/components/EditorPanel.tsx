import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { searchKeymap } from "@codemirror/search";
import { keymap } from "@codemirror/view";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";

interface EditorPanelProps {
  path: string;
  value: string;
  onChange(value: string): void;
}

export function EditorPanel({ path, value, onChange }: EditorPanelProps) {
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setDark(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <section className="editor-panel">
      <header><FileText size={16} />Markdown source <span>{path}</span></header>
      <CodeMirror
        value={value}
        height="100%"
        theme={dark ? githubDark : githubLight}
        extensions={[markdown(), keymap.of(searchKeymap)]}
        onChange={onChange}
      />
    </section>
  );
}
