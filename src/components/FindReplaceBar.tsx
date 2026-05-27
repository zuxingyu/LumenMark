import { useState } from "react";
import type { Messages } from "../i18n";
import { replaceAllMatches } from "../features/editor/document-tools";

interface FindReplaceBarProps {
  labels: Messages;
  source: string;
  onReplace(source: string): void;
  onClose(): void;
}

export function FindReplaceBar({ labels, source, onReplace, onClose }: FindReplaceBarProps) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");

  function locate(backwards = false) {
    if (!query) return;
    const browserFind = (window as Window & { find?: (text: string, caseSensitive?: boolean, backwards?: boolean) => boolean }).find;
    browserFind?.(query, false, backwards);
  }

  function replaceOne() {
    const index = source.indexOf(query);
    if (!query || index < 0) return;
    onReplace(`${source.slice(0, index)}${replacement}${source.slice(index + query.length)}`);
  }

  return (
    <section className="find-bar" aria-label={labels.find}>
      <label>
        <span>{labels.findText}</span>
        <input autoFocus aria-label={labels.findText} value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <label>
        <span>{labels.replaceWith}</span>
        <input aria-label={labels.replaceWith} value={replacement} onChange={(event) => setReplacement(event.target.value)} />
      </label>
      <button type="button" onClick={() => locate(true)}>{labels.previous}</button>
      <button type="button" onClick={() => locate()}>{labels.next}</button>
      <button type="button" onClick={replaceOne}>{labels.replace}</button>
      <button type="button" onClick={() => onReplace(replaceAllMatches(source, query, replacement))}>{labels.replaceAll}</button>
      <button type="button" onClick={onClose}>{labels.close}</button>
    </section>
  );
}
