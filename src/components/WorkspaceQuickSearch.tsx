import { useEffect, useMemo, useState } from "react";
import type { Messages } from "../i18n";
import type { WorkspaceSearchResult } from "../types";

interface WorkspaceQuickSearchProps {
  labels: Messages;
  disabled: boolean;
  results: WorkspaceSearchResult[];
  onSearch(query: string): void;
  onOpenResult(result: WorkspaceSearchResult): void;
}

export function WorkspaceQuickSearch({ labels, disabled, results, onSearch, onOpenResult }: WorkspaceQuickSearchProps) {
  const [query, setQuery] = useState("");
  const grouped = useMemo(() => ({
    files: results.filter((result) => result.kind === "file"),
    content: results.filter((result) => result.kind === "content"),
  }), [results]);

  useEffect(() => {
    if (disabled || !query.trim()) return;
    const timer = window.setTimeout(() => onSearch(query), 250);
    return () => window.clearTimeout(timer);
  }, [disabled, onSearch, query]);

  const lineText = (line: number | null) => line === null ? "" : labels.lineLabel.replace("{line}", String(line));
  const resultLabel = (result: WorkspaceSearchResult) => result.kind === "file"
    ? result.name
    : `${result.name} ${lineText(result.line)}: ${result.excerpt}`;

  return (
    <section className="workspace-quick-search">
      <label>
        <span>{labels.searchWorkspace}</span>
        <input
          aria-label={labels.searchWorkspace}
          disabled={disabled}
          placeholder={labels.workspaceSearchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {grouped.files.length ? (
        <div className="quick-search-group">
          <p>{labels.fileNameMatches}</p>
          {grouped.files.map((result) => (
            <button key={`file:${result.relativePath}`} type="button" aria-label={resultLabel(result)} onClick={() => onOpenResult(result)}>
              <strong>{result.name}</strong>
              <small>{result.excerpt}</small>
            </button>
          ))}
        </div>
      ) : null}
      {grouped.content.length ? (
        <div className="quick-search-group">
          <p>{labels.contentMatches}</p>
          {grouped.content.map((result) => (
            <button
              key={`content:${result.relativePath}:${result.line}:${result.excerpt}`}
              type="button"
              aria-label={resultLabel(result)}
              onClick={() => onOpenResult(result)}
            >
              <strong>{result.name}</strong>
              <span>{lineText(result.line)}</span>
              <small>{result.excerpt}</small>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
