import { useState } from "react";
import type { Messages } from "../i18n";
import type { WorkspaceSearchResult } from "../types";

interface WorkspaceSearchPanelProps {
  labels: Messages;
  disabled: boolean;
  results: WorkspaceSearchResult[];
  onSearch(query: string): void;
  onOpenResult(result: WorkspaceSearchResult): void;
}

export function WorkspaceSearchPanel({ labels, disabled, results, onSearch, onOpenResult }: WorkspaceSearchPanelProps) {
  const [query, setQuery] = useState("");
  const lineText = (line: number | null) => line === null ? "" : labels.lineLabel.replace("{line}", String(line));

  return (
    <section className="workspace-search">
      <label>
        <span>{labels.workspaceSearch}</span>
        <input
          aria-label={labels.workspaceSearch}
          disabled={disabled}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <button type="button" disabled={disabled || !query.trim()} onClick={() => onSearch(query)}>
        {labels.searchWorkspace}
      </button>
      {results.length ? (
        <div className="workspace-search-results">
          {results.map((result) => (
            <button
              key={`${result.relativePath}:${result.line}:${result.excerpt}`}
              type="button"
              aria-label={result.kind === "file" ? result.name : `${result.name} ${lineText(result.line)}: ${result.excerpt}`}
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
