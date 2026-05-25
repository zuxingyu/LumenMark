import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { DesktopApi } from "./services/desktop";

vi.mock("./components/EditorPanel", () => ({
  EditorPanel: ({ path, onChange }: { path: string; onChange(value: string): void }) => (
    <section>
      Markdown source {path}
      <button type="button" onClick={() => onChange("# Changed")}>Change source</button>
    </section>
  ),
}));

const api: DesktopApi = {
  selectWorkspace: async () => ({ root: "/docs", name: "docs" }),
  listWorkspaceEntries: async () => [
    { name: "guide.md", relativePath: "guide.md", kind: "markdown", childrenLoaded: false },
  ],
  readMarkdownFile: async () => ({ relativePath: "guide.md", content: "# Guide" }),
  writeMarkdownFile: async () => ({ success: true }),
  createMarkdownFile: async () => ({ name: "new.md", relativePath: "new.md", kind: "markdown", childrenLoaded: false }),
  renameMarkdownEntry: async () => ({ name: "guide.md", relativePath: "guide.md", kind: "markdown", childrenLoaded: false }),
  deleteMarkdownEntry: async () => ({ success: true }),
  chooseExportDirectory: async () => null,
  exportCodeBlocks: async () => ({ written: [], conflicts: [], rejected: [] }),
  readWorkspaceAsset: async (_root, _documentPath, source) => source,
};

describe("LumenMark app shell", () => {
  it("opens a workspace document and switches to source editing", async () => {
    render(<App api={api} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Open Folder" })[0]);

    await waitFor(() => expect(screen.getByText("guide.md")).toBeVisible());
    fireEvent.click(screen.getByText("guide.md"));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Guide" })).toBeVisible());

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await waitFor(() => expect(screen.getByText(/Markdown source/)).toBeVisible());
  });

  it("loads Markdown documents within expanded folders", async () => {
    const folderApi: DesktopApi = {
      ...api,
      listWorkspaceEntries: async (_root, relativePath) => relativePath
        ? [{ name: "inside.md", relativePath: "notes/inside.md", kind: "markdown", childrenLoaded: false }]
        : [{ name: "notes", relativePath: "notes", kind: "directory", childrenLoaded: false }],
    };
    render(<App api={folderApi} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Open Folder" })[0]);

    await waitFor(() => expect(screen.getByText("notes")).toBeVisible());
    fireEvent.click(screen.getByText("notes"));
    await waitFor(() => expect(screen.getByText("inside.md")).toBeVisible());
  });

  it("saves changed content with Ctrl+S", async () => {
    const writeMarkdownFile = vi.fn().mockResolvedValue({ success: true });
    render(<App api={{ ...api, writeMarkdownFile }} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Open Folder" })[0]);
    await waitFor(() => expect(screen.getByText("guide.md")).toBeVisible());
    fireEvent.click(screen.getByText("guide.md"));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Guide" })).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await waitFor(() => expect(screen.getByText("Change source")).toBeVisible());
    fireEvent.click(screen.getByText("Change source"));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => expect(writeMarkdownFile).toHaveBeenCalledWith("/docs", "guide.md", "# Changed"));
  });

  it("asks before replacing a changed document with a new one", async () => {
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("new.md");
    render(<App api={api} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Open Folder" })[0]);
    await waitFor(() => expect(screen.getByText("guide.md")).toBeVisible());
    fireEvent.click(screen.getByText("guide.md"));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Guide" })).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await waitFor(() => expect(screen.getByText("Change source")).toBeVisible());
    fireEvent.click(screen.getByText("Change source"));

    fireEvent.click(screen.getByRole("button", { name: "New" }));

    expect(screen.getByRole("dialog", { name: "Save your changes?" })).toBeVisible();
    prompt.mockRestore();
  });
});
