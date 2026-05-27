import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { DesktopApi } from "./services/desktop";

vi.mock("./components/VisualMarkdownEditor", () => ({
  VisualMarkdownEditor: ({ title, value, onChange }: { title: string; value: string; onChange(value: string): void }) => (
    <section>
      <h1>{title}</h1>
      <span>{value}</span>
      <button type="button" onClick={() => onChange("# Changed")}>修改文档</button>
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
  saveNewMarkdownFile: async (content) => ({
    root: "/new",
    relativePath: "untitled.md",
    name: "untitled.md",
    content,
  }),
};

describe("LumenMark app shell", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts in an untitled Chinese visual editing document and persists an English locale choice", async () => {
    const { unmount } = render(<App api={api} />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "未命名" })).toBeVisible());
    expect(screen.getAllByRole("button", { name: "打开文件夹" })[0]).toBeVisible();
    expect(screen.queryByRole("button", { name: "预览" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getAllByRole("button", { name: "Open Folder" })[0]).toBeVisible();
    unmount();

    render(<App api={api} />);
    expect(screen.getAllByRole("button", { name: "Open Folder" })[0]).toBeVisible();
  });

  it("opens a workspace document directly in the visual editor", async () => {
    render(<App api={api} />);
    fireEvent.click(screen.getAllByRole("button", { name: "打开文件夹" })[0]);

    await waitFor(() => expect(screen.getByText("guide.md")).toBeVisible());
    fireEvent.click(screen.getByText("guide.md"));
    await waitFor(() => expect(screen.getByRole("heading", { name: "guide.md" })).toBeVisible());
    expect(screen.getByText("# Guide")).toBeVisible();
  });

  it("opens a single Markdown file without adding a recent workspace", async () => {
    render(<App api={api} />);
    fireEvent.click(screen.getAllByRole("button", { name: "打开文件" })[0]);

    await waitFor(() => expect(screen.getByRole("heading", { name: "solo.md" })).toBeVisible());
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
    await waitFor(() => expect(screen.getByRole("heading", { name: "guide.md" })).toBeVisible());
    fireEvent.click(screen.getByText("修改文档"));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => expect(writeMarkdownFile).toHaveBeenCalledWith("/docs", "guide.md", "# Changed"));
  });

  it("saves a changed untitled document through Save As", async () => {
    const saveNewMarkdownFile = vi.fn().mockResolvedValue({
      root: "/created",
      relativePath: "draft.md",
      name: "draft.md",
      content: "# Changed",
    });
    render(<App api={{ ...api, saveNewMarkdownFile }} />);
    fireEvent.click(screen.getByText("修改文档"));
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => expect(saveNewMarkdownFile).toHaveBeenCalledWith("# Changed"));
    expect(screen.getByRole("heading", { name: "draft.md" })).toBeVisible();
  });

  it("asks before replacing a changed document with a new blank one", async () => {
    render(<App api={api} />);
    fireEvent.click(screen.getByText("修改文档"));

    fireEvent.click(screen.getByRole("button", { name: "新建" }));

    expect(screen.getByRole("dialog", { name: "保存更改？" })).toBeVisible();
  });

  it("shows an outline derived from the active document headings", async () => {
    render(<App api={{
      ...api,
      selectMarkdownFile: async () => ({
        root: "/single",
        relativePath: "outline.md",
        name: "outline.md",
        content: "# Title\n\n## Details",
      }),
    }} />);
    fireEvent.click(screen.getAllByRole("button", { name: "打开文件" })[0]);

    await waitFor(() => expect(screen.getByText("文档大纲")).toBeVisible());
    expect(screen.getByRole("button", { name: "Title" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Details" })).toBeVisible();
  });

  it("opens find and replace and applies a literal replace-all operation", async () => {
    render(<App api={{
      ...api,
      selectMarkdownFile: async () => ({
        root: "/single",
        relativePath: "replace.md",
        name: "replace.md",
        content: "alpha alpha",
      }),
    }} />);
    fireEvent.click(screen.getAllByRole("button", { name: "打开文件" })[0]);
    await waitFor(() => expect(screen.getByText("alpha alpha")).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "查找" }));
    fireEvent.change(screen.getByLabelText("查找内容"), { target: { value: "alpha" } });
    fireEvent.change(screen.getByLabelText("替换为"), { target: { value: "beta" } });
    fireEvent.click(screen.getByRole("button", { name: "全部替换" }));

    expect(screen.getByText("beta beta")).toBeVisible();
  });
});
