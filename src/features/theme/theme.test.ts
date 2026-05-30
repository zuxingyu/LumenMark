import { describe, expect, it } from "vitest";
import {
  ACTIVE_THEME_KEY,
  buildThemeMenuItems,
  resolveActiveTheme,
  sanitizeImportedThemeCss,
  scopeTyporaThemeCss,
} from "./theme";

describe("theme preferences and Typora CSS handling", () => {
  it("defaults to the system theme and exposes built-in menu choices", () => {
    localStorage.removeItem(ACTIVE_THEME_KEY);

    expect(resolveActiveTheme([], false).id).toBe("system-light");
    expect(resolveActiveTheme([], true).id).toBe("system-dark");
    expect(buildThemeMenuItems([]).map((item) => item.id)).toEqual([
      "system",
      "system-light",
      "system-dark",
    ]);
  });

  it("sanitizes imported CSS to avoid external resource and local path leaks", () => {
    const css = `
      @import url("https://fonts.example/private.css");
      #write { color: #222; background: white; }
      p { background-image: url(file:///private/person/theme.png); }
      blockquote { background-image: url("/private/person/theme.png"); }
      code { background-image: url("./ok.png"); }
    `;

    const sanitized = sanitizeImportedThemeCss(css);

    expect(sanitized).not.toContain("@import");
    expect(sanitized).not.toContain("https://");
    expect(sanitized).not.toContain("file://");
    expect(sanitized).not.toContain("/private/person");
    expect(sanitized).not.toContain("./ok.png");
    expect(sanitized).toContain("#write");
  });

  it("scopes Typora selectors to the document theme surface", () => {
    const scoped = scopeTyporaThemeCss("#write { color: red; } h1, h2 { font-weight: 700; }");

    expect(scoped).toContain(".markdown-theme-scope { color: red;");
    expect(scoped).toContain(".markdown-theme-scope h1, .markdown-theme-scope h2");
    expect(scoped).not.toContain("#write");
  });
});
