import { describe, expect, it } from "vitest";
import { createTyporaInlineMarkdownNode, parseTyporaInlineText } from "./typora-inline";

describe("Typora inline markdown syntax", () => {
  it("parses single tilde as subscript and keeps double tilde for strikethrough", () => {
    expect(parseTyporaInlineText("H~2~O and ~~removed~~")).toEqual([
      { type: "text", value: "H" },
      { type: "subscript", value: "2" },
      { type: "text", value: "O and ~~removed~~" },
    ]);
  });

  it("serializes subscript with raw Typora markdown instead of escaped text", () => {
    expect(createTyporaInlineMarkdownNode("subscript", "2")).toEqual({ type: "html", value: "~2~" });
    expect(createTyporaInlineMarkdownNode("superscript", "2")).toEqual({ type: "html", value: "^2^" });
    expect(createTyporaInlineMarkdownNode("underline", "test")).toEqual({ type: "html", value: "<u>test</u>" });
  });
});
