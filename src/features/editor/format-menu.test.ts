import { describe, expect, it } from "vitest";
import { FORMAT_COMMANDS, formatCommandIds } from "./format-menu";

describe("system format menu command map", () => {
  it("contains Typora-style block and inline formatting commands", () => {
    expect(formatCommandIds()).toEqual([
      "paragraph",
      "heading-1",
      "heading-2",
      "heading-3",
      "heading-4",
      "heading-5",
      "heading-6",
      "blockquote",
      "bullet-list",
      "ordered-list",
      "task-list",
      "code-block",
      "strong",
      "emphasis",
      "strikethrough",
      "superscript",
      "subscript",
      "underline",
      "inline-code",
      "link",
    ]);
    expect(FORMAT_COMMANDS.find((command) => command.id === "heading-6")?.kind).toBe("block");
    expect(FORMAT_COMMANDS.find((command) => command.id === "strong")?.kind).toBe("inline");
    expect(FORMAT_COMMANDS.find((command) => command.id === "superscript")?.kind).toBe("inline");
    expect(FORMAT_COMMANDS.find((command) => command.id === "underline")?.kind).toBe("inline");
  });
});
