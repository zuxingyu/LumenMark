import { describe, expect, it } from "vitest";
import {
  getCodeFenceQuery,
  getCodeLanguageSuggestions,
  getNextCodeLanguageSelection,
  normalizeCodeLanguage,
  parseEnterShortcut,
  shouldKeepLiteralSpace,
} from "./markdown-shortcuts";
import { getNextCodeLineIndent } from "./code-block-enhancements";

describe("Markdown visual shortcut timing", () => {
  it("keeps delayed block syntax literal when the user presses Space", () => {
    expect(shouldKeepLiteralSpace("#")).toBe(true);
    expect(shouldKeepLiteralSpace("##")).toBe(true);
    expect(shouldKeepLiteralSpace("###")).toBe(true);
    expect(shouldKeepLiteralSpace(">")).toBe(true);
    expect(shouldKeepLiteralSpace("```json")).toBe(true);
    expect(shouldKeepLiteralSpace("normal")).toBe(false);
  });

  it("lets built-in list input rules handle list markers followed by Space", () => {
    expect(shouldKeepLiteralSpace("*")).toBe(false);
    expect(shouldKeepLiteralSpace("-")).toBe(false);
    expect(shouldKeepLiteralSpace("+")).toBe(false);
    expect(shouldKeepLiteralSpace("1.")).toBe(false);
    expect(shouldKeepLiteralSpace("12.")).toBe(false);
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
    expect(parseEnterShortcut("```yaml")).toEqual({ kind: "code", language: "yaml" });
    expect(parseEnterShortcut("```yml")).toEqual({ kind: "code", language: "yaml" });
    expect(parseEnterShortcut("```markdown")).toEqual({ kind: "code", language: "markdown" });
    expect(parseEnterShortcut("```mermaid")).toEqual({ kind: "code", language: "mermaid" });
    expect(parseEnterShortcut("```text")).toEqual({ kind: "code", language: "text" });
    expect(normalizeCodeLanguage("md")).toBe("markdown");
    expect(normalizeCodeLanguage("mmd")).toBe("mermaid");
    expect(normalizeCodeLanguage("txt")).toBe("text");
    expect(normalizeCodeLanguage("yml")).toBe("yaml");
    expect(parseEnterShortcut("```go")).toEqual({ kind: "code", language: "go" });
    expect(parseEnterShortcut("```golang")).toEqual({ kind: "code", language: "go" });
    expect(parseEnterShortcut("```js")).toEqual({ kind: "code", language: "javascript" });
    expect(parseEnterShortcut("```ts")).toEqual({ kind: "code", language: "typescript" });
    expect(parseEnterShortcut("```html")).toEqual({ kind: "code", language: "html" });
    expect(parseEnterShortcut("```css")).toEqual({ kind: "code", language: "css" });
    expect(parseEnterShortcut("```rs")).toEqual({ kind: "code", language: "rust" });
    expect(parseEnterShortcut("```cpp")).toEqual({ kind: "code", language: "cpp" });
    expect(parseEnterShortcut("```c++")).toEqual({ kind: "code", language: "cpp" });
    expect(parseEnterShortcut("```c")).toEqual({ kind: "code", language: "cpp" });
    expect(parseEnterShortcut("```php")).toEqual({ kind: "code", language: "php" });
    expect(parseEnterShortcut("```xml")).toEqual({ kind: "code", language: "xml" });
  });

  it("extracts a Typora-style code fence language query", () => {
    expect(getCodeFenceQuery("```")).toBe("");
    expect(getCodeFenceQuery("```j")).toBe("j");
    expect(getCodeFenceQuery("```python")).toBe("python");
    expect(getCodeFenceQuery("```java ")).toBeNull();
    expect(getCodeFenceQuery("text ```j")).toBeNull();
  });

  it("suggests searchable code block languages from the typed fence query", () => {
    expect(getCodeLanguageSuggestions("j").map((language) => language.id)).toEqual(["json", "java", "javascript"]);
    expect(getCodeLanguageSuggestions("py").map((language) => language.id)).toEqual(["python"]);
    expect(getCodeLanguageSuggestions("m").map((language) => language.id)).toEqual(["markdown", "mermaid"]);
    expect(getCodeLanguageSuggestions("y").map((language) => language.id)).toEqual(["yaml"]);
    expect(getCodeLanguageSuggestions("go").map((language) => language.id)).toEqual(["go"]);
    expect(getCodeLanguageSuggestions("ts").map((language) => language.id)).toEqual(["typescript"]);
    expect(getCodeLanguageSuggestions("rs").map((language) => language.id)).toEqual(["rust"]);
    expect(getCodeLanguageSuggestions("c").map((language) => language.id)).toEqual(["css", "cpp"]);
    expect(getCodeLanguageSuggestions("x").map((language) => language.id)).toEqual(["xml"]);
    expect(getCodeLanguageSuggestions("zz")).toEqual([]);
  });

  it("moves code fence language selection with arrow keys", () => {
    const suggestions = getCodeLanguageSuggestions("j");

    expect(getNextCodeLanguageSelection(0, suggestions.length, "ArrowDown")).toBe(1);
    expect(getNextCodeLanguageSelection(1, suggestions.length, "ArrowDown")).toBe(2);
    expect(getNextCodeLanguageSelection(2, suggestions.length, "ArrowDown")).toBe(0);
    expect(getNextCodeLanguageSelection(0, suggestions.length, "ArrowUp")).toBe(2);
  });

  it("keeps code block enter indentation near structured code", () => {
    expect(getNextCodeLineIndent("  const value = 1")).toBe("  ");
    expect(getNextCodeLineIndent("  if (ready) {")).toBe("    ");
    expect(getNextCodeLineIndent("\titems: [")).toBe("\t  ");
  });
});
