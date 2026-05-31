import type { ImportedTheme } from "../../types";

export type BuiltInThemeId = "system" | "system-light" | "system-dark";
export type ThemePreference = BuiltInThemeId | `imported:${string}`;

export interface ActiveTheme {
  id: "system-light" | "system-dark" | `imported:${string}`;
  label: string;
  mode: "light" | "dark" | "imported";
  importedId?: string;
}

export interface ThemeMenuItem {
  id: ThemePreference;
  label: string;
}

export const ACTIVE_THEME_KEY = "lumenmark.theme.active";

const BUILT_IN_THEME_ITEMS: ThemeMenuItem[] = [
  { id: "system", label: "Follow System" },
  { id: "system-light", label: "Light" },
  { id: "system-dark", label: "Dark" },
];

export function loadThemePreference(): ThemePreference {
  const value = localStorage.getItem(ACTIVE_THEME_KEY);
  if (value === "system-light" || value === "system-dark") return value;
  if (value?.startsWith("imported:")) return value as `imported:${string}`;
  return "system";
}

export function saveThemePreference(value: ThemePreference): void {
  localStorage.setItem(ACTIVE_THEME_KEY, value);
}

export function buildThemeMenuItems(importedThemes: ImportedTheme[]): ThemeMenuItem[] {
  return [
    ...BUILT_IN_THEME_ITEMS,
    ...importedThemes.map((theme) => ({ id: `imported:${theme.id}` as ThemePreference, label: theme.name })),
  ];
}

export function resolveActiveTheme(
  importedThemes: ImportedTheme[],
  systemDark: boolean,
  preference: ThemePreference = loadThemePreference(),
): ActiveTheme {
  if (preference.startsWith("imported:")) {
    const importedId = preference.slice("imported:".length);
    const imported = importedThemes.find((theme) => theme.id === importedId);
    if (imported) {
      return { id: preference as `imported:${string}`, label: imported.name, mode: "imported", importedId };
    }
  }
  if (preference === "system-dark" || (preference === "system" && systemDark)) {
    return { id: "system-dark", label: "Dark", mode: "dark" };
  }
  return { id: "system-light", label: "Light", mode: "light" };
}

export function sanitizeImportedThemeCss(css: string): string {
  return css
    .replace(/@import[^;]+;/gi, "")
    .replace(/url\(\s*(['"]?)(?:https?:|file:|\/|\\|\.)[^)]*\1\s*\)/gi, "none");
}

function scopeSelector(selector: string): string {
  const trimmed = selector.trim();
  if (!trimmed) return trimmed;
  if (/^(?:from|to|\d+(?:\.\d+)?%)$/i.test(trimmed)) return trimmed;
  if (/^(?:#write|\.typora-export|\.markdown-body|body|html)$/i.test(trimmed)) return ".markdown-theme-scope.markdown-body";
  if (trimmed.startsWith(".markdown-body")) return trimmed.replace(/^\.markdown-body/, ".markdown-theme-scope.markdown-body");
  if (trimmed.startsWith(".markdown-theme-scope")) return trimmed;
  return `.markdown-theme-scope ${trimmed}`;
}

function scopeCssBlock(css: string): string {
  return css.replace(/([^{}@][^{}]*)\{/g, (_match, selectorText: string) => {
    const selectors = selectorText
      .split(",")
      .map(scopeSelector)
      .join(", ");
    return `${selectors} {`;
  });
}

export function scopeTyporaThemeCss(css: string): string {
  const safe = sanitizeImportedThemeCss(css);
  const mediaPattern = /@media[^{]+\{(?:[^{}]|\{[^{}]*\})*\}/gi;
  let output = "";
  let cursor = 0;
  for (const match of safe.matchAll(mediaPattern)) {
    const index = match.index ?? 0;
    output += scopeCssBlock(safe.slice(cursor, index));
    const mediaBlock = match[0];
    const open = mediaBlock.indexOf("{");
    const prefix = mediaBlock.slice(0, open + 1);
    const body = mediaBlock.slice(open + 1, -1);
    output += `${prefix}${scopeCssBlock(body)}}`;
    cursor = index + mediaBlock.length;
  }
  output += scopeCssBlock(safe.slice(cursor));
  return output;
}

function cssValue(css: string, selectorPattern: string, property: string): string | undefined {
  const selector = selectorPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = css.match(new RegExp(`${selector}\\s*\\{([^}]+)\\}`, "i"))?.[1];
  return block?.match(new RegExp(`${property}\\s*:\\s*([^;]+)`, "i"))?.[1]?.trim();
}

function firstValue(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value && !value.startsWith("var("));
}

export function buildApplicationThemeCss(css: string): string {
  const safe = sanitizeImportedThemeCss(css);
  const text = firstValue(cssValue(safe, ".markdown-body", "color"), "#1f2328");
  const page = firstValue(cssValue(safe, ".markdown-body", "background-color"), cssValue(safe, ".markdown-body", "background"), "#ffffff");
  const accent = firstValue(cssValue(safe, ".markdown-body a", "color"), cssValue(safe, ".markdown-body", "--fgColor-accent"), "#2563eb");
  const border = firstValue(cssValue(safe, ".markdown-body h1", "border-bottom-color"), cssValue(safe, ".markdown-body table td", "border-color"), "#d1d5db");
  const codeBg = firstValue(cssValue(safe, ".markdown-body pre", "background-color"), cssValue(safe, ".markdown-body pre", "background"), "#f6f8fa");
  const codeText = firstValue(cssValue(safe, ".markdown-body code", "color"), text);
  const codeString = firstValue(cssValue(safe, ".markdown-body", "--color-prettylights-syntax-string"), codeText);
  const codeComment = firstValue(cssValue(safe, ".markdown-body", "--color-prettylights-syntax-comment"), "#6b7280");
  const codeKeyword = firstValue(cssValue(safe, ".markdown-body", "--color-prettylights-syntax-keyword"), accent);
  const codeNumber = firstValue(cssValue(safe, ".markdown-body", "--color-prettylights-syntax-constant"), accent);
  return `
:root[data-theme-mode="imported"] {
  --window: ${page};
  --app-bg: ${page};
  --chrome: ${codeBg};
  --sidebar: ${codeBg};
  --surface: ${codeBg};
  --page: ${page};
  --text: ${text};
  --muted: ${codeComment};
  --border: ${border ?? codeComment};
  --accent: ${accent};
  --accent-soft: color-mix(in srgb, ${accent} 16%, transparent);
  --code-bg: ${codeBg};
  --code-text: ${codeText};
  --code-line-number: ${codeComment};
  --code-border: ${border ?? codeComment};
  --code-border-strong: ${accent};
  --code-caret: ${accent};
  --code-selection: color-mix(in srgb, ${accent} 22%, transparent);
  --code-active-line: color-mix(in srgb, ${accent} 12%, transparent);
  --code-keyword: ${codeKeyword};
  --code-name: ${codeText};
  --code-function: ${accent};
  --code-constant: ${codeNumber};
  --code-type: ${accent};
  --code-number: ${codeNumber};
  --code-operator: ${codeText};
  --code-comment: ${codeComment};
  --code-link: ${accent};
  --code-heading: ${accent};
  --code-atom: ${codeNumber};
  --code-string: ${codeString};
  --code-invalid: #ef4444;
  --code-punctuation: ${codeText};
}`.trim();
}
