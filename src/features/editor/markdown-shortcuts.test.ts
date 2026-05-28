import { describe, expect, it } from "vitest";
import {
  getCodeFenceQuery,
  getCodeLanguageSuggestions,
  normalizeCodeLanguage,
  parseEnterShortcut,
  shouldKeepLiteralSpace,
} from "./markdown-shortcuts";

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
    expect(parseEnterShortcut("#### H4")).toEqual({ kind: "heading", level: 4, text: "H4" });
    expect(parseEnterShortcut("##### H5")).toEqual({ kind: "heading", level: 5, text: "H5" });
    expect(parseEnterShortcut("###### H6")).toEqual({ kind: "heading", level: 6, text: "H6" });
    expect(parseEnterShortcut("#")).toBeNull();
    expect(parseEnterShortcut("##")).toBeNull();
    expect(parseEnterShortcut("######")).toBeNull();
  });

  it("normalizes supported fenced code languages when Enter is pressed", () => {
    expect(parseEnterShortcut("```json")).toEqual({ kind: "code", language: "json" });
    expect(parseEnterShortcut("```Python")).toEqual({ kind: "code", language: "python" });
    expect(parseEnterShortcut("```Java")).toEqual({ kind: "code", language: "java" });
    expect(parseEnterShortcut("```shell")).toEqual({ kind: "code", language: "shell" });
    expect(parseEnterShortcut("```bash")).toEqual({ kind: "code", language: "shell" });
    expect(parseEnterShortcut("```sql")).toEqual({ kind: "code", language: "sql" });
    expect(parseEnterShortcut("```markdown")).toEqual({ kind: "code", language: "markdown" });
    expect(parseEnterShortcut("```mermaid")).toEqual({ kind: "code", language: "mermaid" });
    expect(parseEnterShortcut("```text")).toEqual({ kind: "code", language: "text" });
    expect(normalizeCodeLanguage("md")).toBe("markdown");
    expect(normalizeCodeLanguage("mmd")).toBe("mermaid");
    expect(normalizeCodeLanguage("txt")).toBe("text");
  });

  it("extracts a Typora-style code fence language query", () => {
    expect(getCodeFenceQuery("```")).toBe("");
    expect(getCodeFenceQuery("```j")).toBe("j");
    expect(getCodeFenceQuery("```python")).toBe("python");
    expect(getCodeFenceQuery("```java ")).toBeNull();
    expect(getCodeFenceQuery("text ```j")).toBeNull();
  });

  it("suggests searchable code block languages from the typed fence query", () => {
    expect(getCodeLanguageSuggestions("j").map((language) => language.id)).toEqual(["json", "java"]);
    expect(getCodeLanguageSuggestions("py").map((language) => language.id)).toEqual(["python"]);
    expect(getCodeLanguageSuggestions("m").map((language) => language.id)).toEqual(["markdown", "mermaid"]);
    expect(getCodeLanguageSuggestions("x")).toEqual([]);
  });
});
