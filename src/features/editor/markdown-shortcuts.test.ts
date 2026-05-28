import { describe, expect, it } from "vitest";
import { parseEnterShortcut, shouldKeepLiteralSpace } from "./markdown-shortcuts";

describe("Markdown visual shortcut timing", () => {
  it("keeps block syntax literal when the user presses Space", () => {
    expect(shouldKeepLiteralSpace("#")).toBe(true);
    expect(shouldKeepLiteralSpace("##")).toBe(true);
    expect(shouldKeepLiteralSpace("###")).toBe(true);
    expect(shouldKeepLiteralSpace("-")).toBe(true);
    expect(shouldKeepLiteralSpace("1.")).toBe(true);
    expect(shouldKeepLiteralSpace(">")).toBe(true);
    expect(shouldKeepLiteralSpace("```json")).toBe(true);
    expect(shouldKeepLiteralSpace("normal")).toBe(false);
  });

  it("converts non-empty heading syntax only when Enter is pressed", () => {
    expect(parseEnterShortcut("# 标题")).toEqual({ kind: "heading", level: 1, text: "标题" });
    expect(parseEnterShortcut("## Details")).toEqual({ kind: "heading", level: 2, text: "Details" });
    expect(parseEnterShortcut("### Notes")).toEqual({ kind: "heading", level: 3, text: "Notes" });
    expect(parseEnterShortcut("#")).toBeNull();
    expect(parseEnterShortcut("##")).toBeNull();
  });

  it("normalizes supported fenced code languages when Enter is pressed", () => {
    expect(parseEnterShortcut("```json")).toEqual({ kind: "code", language: "json" });
    expect(parseEnterShortcut("```Python")).toEqual({ kind: "code", language: "python" });
    expect(parseEnterShortcut("```Java")).toEqual({ kind: "code", language: "java" });
    expect(parseEnterShortcut("```shell")).toEqual({ kind: "code", language: "shell" });
    expect(parseEnterShortcut("```bash")).toEqual({ kind: "code", language: "shell" });
    expect(parseEnterShortcut("```sql")).toEqual({ kind: "code", language: "sql" });
  });
});
