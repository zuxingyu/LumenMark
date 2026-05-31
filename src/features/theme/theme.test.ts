import { describe, expect, it } from "vitest";
import {
  ACTIVE_THEME_KEY,
  buildApplicationThemeCss,
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

    expect(scoped).toContain(".markdown-theme-scope.markdown-body { color: red;");
    expect(scoped).toContain(".markdown-theme-scope h1, .markdown-theme-scope h2");
    expect(scoped).not.toContain("#write");
  });

  it("keeps GitHub markdown-body themes effective inside media queries", () => {
    const scoped = scopeTyporaThemeCss(`
      @media (prefers-color-scheme: dark) {
        .markdown-body, [data-theme="dark"] { color: #f0f6fc; background-color: #0d1117; }
        .markdown-body pre { background-color: #151b23; }
      }
      .markdown-body h1, .markdown-body h2 { border-bottom: 1px solid #3d444d; }
    `);

    expect(scoped).toContain("@media (prefers-color-scheme: dark)");
    expect(scoped).toContain(".markdown-theme-scope.markdown-body");
    expect(scoped).toContain(".markdown-theme-scope.markdown-body pre");
    expect(scoped).toContain(".markdown-theme-scope.markdown-body h1, .markdown-theme-scope.markdown-body h2");
    expect(scoped).not.toContain(".markdown-theme-scope @media");
  });

  it("derives application shell variables from imported GitHub-style theme CSS", () => {
    const appCss = buildApplicationThemeCss(`
      .markdown-body {
        color: #f0f6fc;
        background-color: #0d1117;
      }
      .markdown-body a { color: #4493f8; }
      .markdown-body pre { background-color: #151b23; }
      .markdown-body code { color: #a5d6ff; }
    `);

    expect(appCss).toContain("--app-bg: #0d1117");
    expect(appCss).toContain("--page: #0d1117");
    expect(appCss).toContain("--text: #f0f6fc");
    expect(appCss).toContain("--accent: #4493f8");
    expect(appCss).toContain("--code-bg: #151b23");
    expect(appCss).toContain("--code-string: #a5d6ff");
  });
});
