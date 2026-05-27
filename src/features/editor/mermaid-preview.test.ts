import { describe, expect, it, vi } from "vitest";
import { renderMermaidPreview } from "./mermaid-preview";

describe("Mermaid visual code block", () => {
  it("renders mermaid source as a safe diagram preview", async () => {
    const render = vi.fn().mockResolvedValue({ svg: "<svg>diagram</svg>" });
    const output = await renderMermaidPreview("flowchart TD; A-->B", render);

    expect(render).toHaveBeenCalledWith(expect.stringContaining("lumenmark-"), "flowchart TD; A-->B");
    expect(output).toContain("<svg>diagram</svg>");
  });

  it("returns a local error card when Mermaid source is invalid", async () => {
    const output = await renderMermaidPreview("invalid", vi.fn().mockRejectedValue(new Error("bad")));
    expect(output).toContain("mermaid-error");
    expect(output).toContain("invalid");
  });
});
