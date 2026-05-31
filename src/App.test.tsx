import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { DesktopApi } from "./services/desktop";

vi.mock("./components/VisualMarkdownEditor", () => ({
  VisualMarkdownEditor: ({ title, value, onChange }: { title: string; value: string; onChange(value: string): void }) => (
    <section>
      {title === "未命名" || title === "Untitled" ? null : <h1>{title}</h1>}
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
  searchWorkspace: async () => [],
  readWorkspaceAsset: async (_root, _documentPath, source) => source,
  saveNewMarkdownFile: async (content) => ({
    root: "/new",
    relativePath: "untitled.md",
    name: "untitled.md",
    content,
  }),
  openExternalMarkdownFile: async (path) => ({ root: "/dropped", relativePath: "drop.md", name: "drop.md", content: path }),
  pendingExternalDocuments: async () => [],
  saveExportTextFile: async (defaultName) => defaultName,
  saveExportBinaryFile: async (defaultName) => defaultName,
  importThemeCss: async () => null,
  listImportedThemes: async () => [],
  readThemeCss: async () => "",
  deleteImportedTheme: async () => ({ success: true }),
  setAppMenu: async () => ({ success: true }),
  checkForUpdate: async () => null,
  downloadAndInstallUpdate: async () => undefined,
  relaunchApp: async () => undefined,
};

function dispatchAppCommand(command: string) {
  act(() => {
    window.dispatchEvent(new CustomEvent("lumenmark:app-command", { detail: command }));
  });
}

describe("LumenMark app shell", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in an untitled Chinese visual editing document and persists an English locale choice", async () => {
    const { unmount } = render(<App api={api} />);
    await waitFor(() => expect(screen.queryByRole("heading", { name: "未命名" })).not.toBeInTheDocument());
    expect(screen.queryByText("LumenMark")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "打开文件夹" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "English" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "预览" })).not.toBeInTheDocument();
    dispatchAppCommand("toggle-locale");
    await waitFor(() => expect(localStorage.getItem("lumenmark.locale")).toBe("en-US"));
    unmount();

    render(<App api={api} />);
    expect(screen.queryByRole("button", { name: "Open Folder" })).not.toBeInTheDocument();
  });

  it("opens a workspace document directly in the visual editor", async () => {
    render(<App api={api} />);
    dispatchAppCommand("open-folder");

    await waitFor(() => expect(screen.getByText("guide.md")).toBeVisible());
    fireEvent.click(screen.getByText("guide.md"));
    await waitFor(() => expect(screen.getByRole("heading", { name: "guide.md" })).toBeVisible());
    expect(screen.getByText("# Guide")).toBeVisible();
  });

  it("opens a single Markdown file without adding a recent workspace", async () => {
    render(<App api={api} />);
    dispatchAppCommand("open-file");

    await waitFor(() => expect(screen.getByRole("heading", { name: "solo.md" })).toBeVisible());
    expect(screen.queryByText("最近工作区")).not.toBeInTheDocument();
    expect(localStorage.getItem("lumenmark.recentWorkspaces")).toBe("[]");
  });

  it("persists opened folders and removes only their app association", async () => {
    render(<App api={api} />);
    dispatchAppCommand("open-folder");
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
    dispatchAppCommand("open-folder");

    await waitFor(() => expect(screen.getByText("notes")).toBeVisible());
    fireEvent.click(screen.getByText("notes"));
    await waitFor(() => expect(screen.getByText("inside.md")).toBeVisible());
  });

  it("saves changed content with Ctrl+S", async () => {
    const writeMarkdownFile = vi.fn().mockResolvedValue({ success: true });
    render(<App api={{ ...api, writeMarkdownFile }} />);
    dispatchAppCommand("open-folder");
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
    await waitFor(() => expect(screen.getByText("未保存的更改")).toBeVisible());

    dispatchAppCommand("new-document");

    await waitFor(() => expect(screen.getByRole("dialog", { name: "保存更改？" })).toBeVisible());
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
    dispatchAppCommand("open-file");

    await waitFor(() => expect(screen.getByRole("tab", { name: "文档大纲" })).toBeVisible());
    fireEvent.click(screen.getByRole("tab", { name: "文档大纲" }));
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
    dispatchAppCommand("open-file");
    await waitFor(() => expect(screen.getByText("alpha alpha")).toBeVisible());
    dispatchAppCommand("find");
    await waitFor(() => expect(screen.getByLabelText("查找内容")).toBeVisible());
    fireEvent.change(screen.getByLabelText("查找内容"), { target: { value: "alpha" } });
    fireEvent.change(screen.getByLabelText("替换为"), { target: { value: "beta" } });
    fireEvent.click(screen.getByRole("button", { name: "全部替换" }));

    expect(screen.getByText("beta beta")).toBeVisible();
  });

  it("searches the active workspace and opens a selected result", async () => {
    const readMarkdownFile = vi.fn().mockResolvedValue({ relativePath: "guide.md", content: "# Search Hit" });
    const searchWorkspace = vi.fn().mockResolvedValue([{
      kind: "content",
      relativePath: "guide.md",
      name: "guide.md",
      line: 3,
      excerpt: "contains Search",
    }]);
    render(<App api={{
      ...api,
      readMarkdownFile,
      searchWorkspace,
    }} />);
    dispatchAppCommand("open-folder");
    await waitFor(() => expect(screen.getByText("guide.md")).toBeVisible());

    fireEvent.change(screen.getByLabelText("搜索工作区"), { target: { value: "Search" } });

    await waitFor(() => expect(searchWorkspace).toHaveBeenCalledWith("/docs", "Search"));
    await waitFor(() => expect(screen.getByRole("button", { name: /guide.md 第 3 行/ })).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: /guide.md 第 3 行/ }));

    await waitFor(() => expect(readMarkdownFile).toHaveBeenCalledWith("/docs", "guide.md"));
    expect(screen.getByText("# Search Hit")).toBeVisible();
  });

  it("searches from the workspace sidebar as the user types and groups file and content matches", async () => {
    const readMarkdownFile = vi.fn().mockResolvedValue({ relativePath: "guide.md", content: "# Sidebar Search" });
    const searchWorkspace = vi.fn().mockResolvedValue([
      { kind: "file", relativePath: "guide.md", name: "guide.md", line: null, excerpt: "guide.md" },
      { kind: "content", relativePath: "guide.md", name: "guide.md", line: 7, excerpt: "sidebar match" },
    ]);
    render(<App api={{ ...api, readMarkdownFile, searchWorkspace }} />);
    dispatchAppCommand("open-folder");
    await waitFor(() => expect(screen.getByText("guide.md")).toBeVisible());

    fireEvent.change(screen.getByLabelText("搜索工作区"), { target: { value: "guide" } });
    await waitFor(() => expect(searchWorkspace).toHaveBeenCalledWith("/docs", "guide"));

    expect(await screen.findByText("文件名匹配")).toBeVisible();
    expect(screen.getByText("正文匹配")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /guide.md 第 7 行/ }));
    await waitFor(() => expect(readMarkdownFile).toHaveBeenCalledWith("/docs", "guide.md"));
  });

  it("clears workspace search results when the query is cleared", async () => {
    const searchWorkspace = vi.fn().mockResolvedValue([
      { kind: "file", relativePath: "guide.md", name: "guide.md", line: null, excerpt: "guide.md" },
    ]);
    render(<App api={{ ...api, searchWorkspace }} />);
    dispatchAppCommand("open-folder");
    await waitFor(() => expect(screen.getByText("guide.md")).toBeVisible());

    fireEvent.change(screen.getByLabelText("搜索工作区"), { target: { value: "guide" } });
    await screen.findByText("文件名匹配");
    fireEvent.change(screen.getByLabelText("搜索工作区"), { target: { value: "" } });

    await waitFor(() => expect(screen.queryByText("文件名匹配")).not.toBeInTheDocument());
  });

  it("switches workspace and outline as sidebar tabs instead of stacked sections", async () => {
    render(<App api={{
      ...api,
      selectMarkdownFile: async () => ({
        root: "/single",
        relativePath: "outline.md",
        name: "outline.md",
        content: "# Title\n\n## Details",
      }),
    }} />);
    dispatchAppCommand("open-file");
    await waitFor(() => expect(screen.getByRole("tab", { name: "工作区" })).toBeVisible());

    expect(screen.getByRole("tab", { name: "工作区" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("button", { name: "Title" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "文档大纲" }));

    expect(screen.getByRole("tab", { name: "文档大纲" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Title" })).toBeVisible();
    expect(screen.queryByLabelText("搜索工作区")).not.toBeInTheDocument();
  });

  it("runs export commands from the native menu command bridge", async () => {
    const saveExportTextFile = vi.fn().mockResolvedValue("guide.html");
    render(<App api={{ ...api, saveExportTextFile }} />);

    dispatchAppCommand("export-html");

    await waitFor(() => expect(saveExportTextFile).toHaveBeenCalledWith("未命名.html", expect.stringContaining("<!doctype html>")));
  });

  it("opens settings from the file menu and switches language there", async () => {
    render(<App api={api} />);

    dispatchAppCommand("open-settings");

    expect(await screen.findByRole("dialog", { name: "设置" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "English" }));

    await waitFor(() => expect(localStorage.getItem("lumenmark.locale")).toBe("en-US"));
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeVisible();
  });

  it("loads imported themes, imports CSS themes, and switches themes from menu commands", async () => {
    const setAppMenu = vi.fn().mockResolvedValue({ success: true });
    const importThemeCss = vi.fn().mockResolvedValue({
      id: "typora-newsprint",
      name: "Newsprint",
      css: "#write { color: rgb(10, 20, 30); }",
    });
    render(<App api={{ ...api, importThemeCss, setAppMenu }} />);

    await waitFor(() => expect(setAppMenu).toHaveBeenCalled());
    dispatchAppCommand("open-settings");
    fireEvent.click(await screen.findByRole("button", { name: "导入主题" }));

    await waitFor(() => expect(importThemeCss).toHaveBeenCalled());
    expect(await screen.findByLabelText("Newsprint 主题")).toBeVisible();

    dispatchAppCommand("theme-imported:typora-newsprint");

    await waitFor(() => expect(localStorage.getItem("lumenmark.theme.active")).toBe("imported:typora-newsprint"));
    expect(document.documentElement.dataset.themeMode).toBe("imported");
    expect(document.querySelector("#lumenmark-imported-theme")?.textContent).toContain(".markdown-theme-scope");
  });

  it("previews, applies, and deletes imported themes from the compact settings manager", async () => {
    const setAppMenu = vi.fn().mockResolvedValue({ success: true });
    const deleteImportedTheme = vi.fn().mockResolvedValue({ success: true });
    const readThemeCss = vi.fn().mockResolvedValue(".markdown-body { color: #f0f6fc; background-color: #0d1117; }");
    render(<App api={{
      ...api,
      setAppMenu,
      deleteImportedTheme,
      readThemeCss,
      listImportedThemes: async () => [{ id: "github-dark", name: "GitHub Dark" }],
    }} />);

    dispatchAppCommand("open-settings");

    const row = await screen.findByLabelText("GitHub Dark 主题");
    fireEvent.click(within(row).getByRole("button", { name: "预览 GitHub Dark" }));
    await waitFor(() => expect(document.documentElement.dataset.themeMode).toBe("imported"));
    expect(localStorage.getItem("lumenmark.theme.active")).not.toBe("imported:github-dark");

    fireEvent.click(within(row).getByRole("button", { name: "应用 GitHub Dark" }));
    await waitFor(() => expect(localStorage.getItem("lumenmark.theme.active")).toBe("imported:github-dark"));

    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(within(row).getByRole("button", { name: "删除 GitHub Dark" }));

    await waitFor(() => expect(deleteImportedTheme).toHaveBeenCalledWith("github-dark"));
    await waitFor(() => expect(localStorage.getItem("lumenmark.theme.active")).toBe("system"));
  });

  it("checks for updates from the app menu and installs before relaunching", async () => {
    const checkForUpdate = vi.fn().mockResolvedValue({
      version: "0.3.12",
      date: "2026-06-01T00:00:00Z",
      body: "主题和更新修复",
    });
    const downloadAndInstallUpdate = vi.fn().mockImplementation(async (onProgress?: (progress: number) => void) => {
      onProgress?.(48);
      onProgress?.(100);
    });
    const relaunchApp = vi.fn().mockResolvedValue(undefined);
    render(<App api={{ ...api, checkForUpdate, downloadAndInstallUpdate, relaunchApp }} />);

    dispatchAppCommand("check-updates");

    expect(await screen.findByRole("dialog", { name: "软件更新" })).toBeVisible();
    await waitFor(() => expect(screen.getByText(/发现新版本 0\.3\.12/)).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "下载并安装" }));

    await waitFor(() => expect(downloadAndInstallUpdate).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("更新已安装，准备重启。")).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "重启应用" }));
    expect(relaunchApp).toHaveBeenCalled();
  });

  it("shows official themes in settings and switches them from menu commands", async () => {
    render(<App api={api} />);

    dispatchAppCommand("open-settings");

    expect(await screen.findByText("GitHub Dark Dimmed")).toBeVisible();
    expect(screen.getByText("Oh My Zsh Dark")).toBeVisible();
    expect(screen.getByText("Lumen Ink")).toBeVisible();

    dispatchAppCommand("theme-official:monokai-terminal");

    await waitFor(() => expect(localStorage.getItem("lumenmark.theme.active")).toBe("official:monokai-terminal"));
    expect(document.documentElement.dataset.themeMode).toBe("official");
    expect(document.querySelector("#lumenmark-imported-theme")?.textContent).toContain("--mermaid-preview-bg");
  });

  it("opens file-name workspace search matches without showing a null line number", async () => {
    const readMarkdownFile = vi.fn().mockResolvedValue({ relativePath: "guide.md", content: "# File Match" });
    const searchWorkspace = vi.fn().mockResolvedValue([
      { kind: "file", relativePath: "guide.md", name: "guide.md", line: null, excerpt: "guide.md" },
    ]);
    render(<App api={{ ...api, readMarkdownFile, searchWorkspace }} />);
    dispatchAppCommand("open-folder");
    await waitFor(() => expect(screen.getByText("guide.md")).toBeVisible());

    fireEvent.change(screen.getByLabelText("搜索工作区"), { target: { value: "guide" } });
    const quickSearch = document.querySelector(".workspace-quick-search");
    expect(quickSearch).not.toBeNull();
    await waitFor(() => expect(within(quickSearch as HTMLElement).getByRole("button", { name: "guide.md" })).toBeVisible());
    fireEvent.click(within(quickSearch as HTMLElement).getByRole("button", { name: "guide.md" }));

    await waitFor(() => expect(screen.getByText(/已打开 guide\.md/)).toBeVisible());
    expect(screen.queryByText(/null/)).not.toBeInTheDocument();
  });

  it("collapses and expands the workspace sidebar", async () => {
    render(<App api={api} />);

    expect(document.querySelector(".workspace-layout")?.classList.contains("sidebar-collapsed")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "折叠工作区" }));
    expect(document.querySelector(".workspace-layout")?.classList.contains("sidebar-collapsed")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "展开工作区" }));
    expect(document.querySelector(".workspace-layout")?.classList.contains("sidebar-collapsed")).toBe(false);
  });

  it("does not render an expanded sidebar at icon-rail width from older local preferences", () => {
    localStorage.setItem("lumenmark.sidebarWidth", "56");
    localStorage.setItem("lumenmark.sidebarCollapsed", "false");

    render(<App api={api} />);

    const layout = document.querySelector<HTMLElement>(".workspace-layout");
    expect(layout?.classList.contains("sidebar-collapsed")).toBe(false);
    expect(layout?.style.getPropertyValue("--sidebar-width")).toBe("220px");
  });

  it("offers to restore a saved local draft on startup", async () => {
    localStorage.setItem("lumenmark.recoveryDraft", JSON.stringify({
      sourceKind: "untitled",
      root: null,
      path: null,
      title: "未命名",
      sourceText: "# Recovered",
      savedText: "",
      updatedAt: "2026-05-29T04:00:00.000Z",
    }));

    render(<App api={api} />);

    expect(screen.getByRole("dialog", { name: "恢复草稿？" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "恢复" }));

    await waitFor(() => expect(screen.getByText("# Recovered")).toBeVisible());
  });

  it("opens a pending desktop-delivered Markdown file on startup", async () => {
    render(<App api={{
      ...api,
      pendingExternalDocuments: async () => [{
        root: "/external",
        relativePath: "launch.md",
        name: "launch.md",
        content: "# Launched",
      }],
    }} />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "launch.md" })).toBeVisible());
    expect(screen.getByText("# Launched")).toBeVisible();
  });
});
