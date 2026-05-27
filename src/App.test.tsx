import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  selectMarkdownFile: async () => ({ root: "/single", relativePath: "solo.md", name: "solo.md", content: "# Solo" }),
  listWorkspaceEntries: async () => [
    { name: "guide.md", relativePath: "guide.md", kind: "markdown", childrenLoaded: false },
  ],
  readMarkdownFile: async () => ({ relativePath: "guide.md", content: "# Guide" }),
  writeMarkdownFile: async () => ({ success: true }),
  createMarkdownFile: async () => ({ name: "new.md", relativePath: "new.md", kind: "markdown", childrenLoaded: false }),
  renameMarkdownEntry: async () => ({ name: "guide.md", relativePath: "guide.md", kind: "markdown", childrenLoaded: false }),
  readWorkspaceAsset: async (_root, _documentPath, source) => source,
};

describe("LumenMark app shell", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("uses Chinese by default and persists an English locale choice", () => {
    const { unmount } = render(<App api={api} />);
    expect(screen.getAllByRole("button", { name: "打开文件夹" })[0]).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getAllByRole("button", { name: "Open Folder" })[0]).toBeVisible();
    unmount();

    render(<App api={api} />);
    expect(screen.getAllByRole("button", { name: "Open Folder" })[0]).toBeVisible();
  });

  it("opens a workspace document and switches to source editing", async () => {
    render(<App api={api} />);
    fireEvent.click(screen.getAllByRole("button", { name: "打开文件夹" })[0]);

    await waitFor(() => expect(screen.getByText("guide.md")).toBeVisible());
    fireEvent.click(screen.getByText("guide.md"));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Guide" })).toBeVisible());

    fireEvent.click(screen.getByRole("button", { name: "编辑" }));
    await waitFor(() => expect(screen.getByText(/Markdown source/)).toBeVisible());
  });

  it("opens a single Markdown file without adding a recent workspace", async () => {
    render(<App api={api} />);
    fireEvent.click(screen.getAllByRole("button", { name: "打开文件" })[0]);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Solo" })).toBeVisible());
    expect(screen.queryByText("最近工作区")).not.toBeInTheDocument();
    expect(localStorage.getItem("lumenmark.recentWorkspaces")).toBe("[]");
  });

  it("persists opened folders and removes only their app association", async () => {
    render(<App api={api} />);
    fireEvent.click(screen.getAllByRole("button", { name: "打开文件夹" })[0]);
    await waitFor(() => expect(screen.getByText("docs")).toBeVisible());
    expect(screen.getByText("最近工作区")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "移除 docs" }));
    expect(localStorage.getItem("lumenmark.recentWorkspaces")).toBe("[]");
    expect(screen.queryByRole("button", { name: "删除" })).not.toBeInTheDocument();
  });

  it("loads Markdown documents within expanded folders", async () => {
    const folderApi: DesktopApi = {
      ...api,
      listWorkspaceEntries: async (_root, relativePath) => relativePath
        ? [{ name: "inside.md", relativePath: "notes/inside.md", kind: "markdown", childrenLoaded: false }]
        : [{ name: "notes", relativePath: "notes", kind: "directory", childrenLoaded: false }],
    };
    render(<App api={folderApi} />);
    fireEvent.click(screen.getAllByRole("button", { name: "打开文件夹" })[0]);

    await waitFor(() => expect(screen.getByText("notes")).toBeVisible());
    fireEvent.click(screen.getByText("notes"));
    await waitFor(() => expect(screen.getByText("inside.md")).toBeVisible());
  });

  it("saves changed content with Ctrl+S", async () => {
    const writeMarkdownFile = vi.fn().mockResolvedValue({ success: true });
    render(<App api={{ ...api, writeMarkdownFile }} />);
    fireEvent.click(screen.getAllByRole("button", { name: "打开文件夹" })[0]);
    await waitFor(() => expect(screen.getByText("guide.md")).toBeVisible());
    fireEvent.click(screen.getByText("guide.md"));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Guide" })).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "编辑" }));
    await waitFor(() => expect(screen.getByText("Change source")).toBeVisible());
    fireEvent.click(screen.getByText("Change source"));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => expect(writeMarkdownFile).toHaveBeenCalledWith("/docs", "guide.md", "# Changed"));
  });

  it("asks before replacing a changed document with a new one", async () => {
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("new.md");
    render(<App api={api} />);
    fireEvent.click(screen.getAllByRole("button", { name: "打开文件夹" })[0]);
    await waitFor(() => expect(screen.getByText("guide.md")).toBeVisible());
    fireEvent.click(screen.getByText("guide.md"));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Guide" })).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "编辑" }));
    await waitFor(() => expect(screen.getByText("Change source")).toBeVisible());
    fireEvent.click(screen.getByText("Change source"));

    fireEvent.click(screen.getByRole("button", { name: "新建" }));

    expect(screen.getByRole("dialog", { name: "保存更改？" })).toBeVisible();
    prompt.mockRestore();
  });
});
