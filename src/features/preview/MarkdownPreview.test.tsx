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
      <MarkdownPreview
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
    expect(screen.getByText("main.py")).toBeVisible();
    expect(screen.getByRole("button", { name: "Copy main.py" })).toBeVisible();
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector(".katex")).not.toBeNull();
  });

  it("renders Mermaid fenced blocks as diagrams", async () => {
    render(<MarkdownPreview source={"```mermaid\ngraph TD; A-->B\n```"} />);

    await waitFor(() => expect(screen.getByLabelText("diagram")).toBeVisible());
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
