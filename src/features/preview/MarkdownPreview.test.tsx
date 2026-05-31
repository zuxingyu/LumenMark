import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MarkdownPreview } from "./MarkdownPreview";

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: "<svg aria-label=\"diagram\"></svg>" }),
  },
}));

describe("MarkdownPreview", () => {
  it("renders GFM content, math, and highlighted source without executing HTML", () => {
    render(
      <MarkdownPreview locale="zh-CN"
        source={[
          "# Release Notes",
          "",
          "| state | value |",
          "| --- | --- |",
          "| ready | yes |",
          "",
          "$$L = \\\\lambda W$$",
          "",
          "<script>alert('no')</script>",
          "",
          "```python file=main.py",
          "print('ok')",
          "```",
        ].join("\n")}
      />,
    );

    expect(screen.getByRole("heading", { name: "Release Notes" })).toBeVisible();
    expect(screen.getByRole("table")).toBeVisible();
    expect(screen.getByText("Python")).toBeVisible();
    expect(screen.getByRole("button", { name: "复制 Python 代码" })).toBeVisible();
    expect(screen.queryByText("main.py")).not.toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector(".katex")).not.toBeNull();
  });

  it("renders Mermaid fenced blocks as diagrams", async () => {
    render(<MarkdownPreview source={"```mermaid\ngraph TD; A-->B\n```"} />);

    await waitFor(() => expect(screen.getByLabelText("diagram")).toBeVisible());
  });

  it("exposes GitHub and Typora compatible theme classes on the preview surface", () => {
    render(<MarkdownPreview source={"# Themed"} />);

    const preview = document.querySelector(".markdown-preview");
    expect(preview).toHaveClass("markdown-theme-scope");
    expect(preview).toHaveClass("typora-export");
    expect(preview).toHaveClass("markdown-body");
  });

  it("renders Typora-style superscript and subscript while preserving strikethrough", () => {
    render(<MarkdownPreview source={"E = mc^2^ and H~2~O plus ~~removed~~"} />);

    expect(document.querySelector("sup")?.textContent).toBe("2");
    expect(document.querySelector("sub")?.textContent).toBe("2");
    expect(document.querySelector("del")?.textContent).toBe("removed");
  });

  it("renders HTML underline tags while preserving safe Markdown output", () => {
    render(<MarkdownPreview source={"This is <u>underlined</u> and H~2~O"} />);

    expect(document.querySelector("u")?.textContent).toBe("underlined");
    expect(document.querySelector("sub")?.textContent).toBe("2");
  });

  it("loads relative images through a workspace-scoped resolver", async () => {
    render(
      <MarkdownPreview
        source="![diagram](assets/flow.png)"
        imageResolver={async () => "data:image/png;base64,c2FmZQ=="}
      />,
    );

    await waitFor(() => expect(screen.getByRole("img", { name: "diagram" })).toHaveAttribute("src", "data:image/png;base64,c2FmZQ=="));
  });
});
