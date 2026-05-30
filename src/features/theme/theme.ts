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
  if (/^(?:#write|\.typora-export|body|html)$/i.test(trimmed)) return ".markdown-theme-scope";
  if (trimmed.startsWith(".markdown-theme-scope")) return trimmed;
  return `.markdown-theme-scope ${trimmed}`;
}

export function scopeTyporaThemeCss(css: string): string {
  const safe = sanitizeImportedThemeCss(css);
  return safe.replace(/([^{}@][^{}]*)\{/g, (_match, selectorText: string) => {
    const selectors = selectorText
      .split(",")
      .map(scopeSelector)
      .join(", ");
    return `${selectors} {`;
  });
}
