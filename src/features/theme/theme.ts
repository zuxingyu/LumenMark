import type { ImportedTheme } from "../../types";

export type BuiltInThemeId = "system" | "system-light" | "system-dark";
export type OfficialThemeId =
  | "github-light"
  | "github-dark-dimmed"
  | "github-dark-colorblind"
  | "oh-my-zsh-dark"
  | "monokai-terminal"
  | "solarized-light"
  | "lumen-paper"
  | "lumen-ink";
export type ThemePreference = BuiltInThemeId | `official:${OfficialThemeId}` | `imported:${string}`;

export interface ActiveTheme {
  id: "system-light" | "system-dark" | `official:${OfficialThemeId}` | `imported:${string}`;
  label: string;
  mode: "light" | "dark" | "official" | "imported";
  officialId?: OfficialThemeId;
  importedId?: string;
}

export interface ThemeMenuItem {
  id: ThemePreference;
  label: string;
}

export interface OfficialTheme {
  id: OfficialThemeId;
  name: string;
  zhName: string;
  mode: "light" | "dark";
  variables: Record<string, string>;
  mermaid: Record<string, string>;
}

export const ACTIVE_THEME_KEY = "lumenmark.theme.active";

const BUILT_IN_THEME_ITEMS: ThemeMenuItem[] = [
  { id: "system", label: "Follow System" },
  { id: "system-light", label: "Light" },
  { id: "system-dark", label: "Dark" },
];

const BASE_LIGHT = {
  "--window": "#f7f8fa",
  "--app-bg": "#f7f8fa",
  "--chrome": "#f5f6f8",
  "--sidebar": "#f5f6f8",
  "--surface": "#f7f8fb",
  "--page": "#ffffff",
  "--text": "#1b1d20",
  "--muted": "#667080",
  "--border": "#dde1e8",
  "--accent": "#2563eb",
  "--accent-soft": "#e5eeff",
  "--shadow": "0 14px 38px rgba(16, 24, 40, 0.05)",
  "--diagram-canvas": "#ffffff",
  "--mermaid-preview-bg": "#ffffff",
  "--code-bg": "#f8fafc",
  "--code-text": "#0f172a",
  "--code-caret": "#111827",
  "--code-selection": "#bfdbfe",
  "--code-active-line": "rgba(37, 99, 235, 0.08)",
  "--code-line-number": "#64748b",
  "--code-border": "#d8dee9",
  "--code-border-strong": "#94a3b8",
  "--code-keyword": "#6d28d9",
  "--code-name": "#0f766e",
  "--code-function": "#1d4ed8",
  "--code-constant": "#b45309",
  "--code-type": "#be123c",
  "--code-number": "#b45309",
  "--code-operator": "#334155",
  "--code-comment": "#64748b",
  "--code-link": "#1d4ed8",
  "--code-heading": "#1e40af",
  "--code-atom": "#9333ea",
  "--code-string": "#047857",
  "--code-invalid": "#b91c1c",
  "--code-punctuation": "#1f2937",
};

const BASE_DARK = {
  ...BASE_LIGHT,
  "--window": "#0d1117",
  "--app-bg": "#0d1117",
  "--chrome": "#161b22",
  "--sidebar": "#161b22",
  "--surface": "#21262d",
  "--page": "#0d1117",
  "--text": "#e6edf3",
  "--muted": "#9da7b3",
  "--border": "#30363d",
  "--accent": "#58a6ff",
  "--accent-soft": "#1f2d3d",
  "--shadow": "none",
  "--diagram-canvas": "#f6f8fa",
  "--mermaid-preview-bg": "#f6f8fa",
  "--code-bg": "#0d1117",
  "--code-text": "#e6edf3",
  "--code-caret": "#f0f6fc",
  "--code-selection": "#1f6feb66",
  "--code-active-line": "#1f6feb1f",
  "--code-line-number": "#8b949e",
  "--code-border": "#30363d",
  "--code-border-strong": "#8b949e",
  "--code-keyword": "#ff7b72",
  "--code-name": "#7ee787",
  "--code-function": "#d2a8ff",
  "--code-constant": "#79c0ff",
  "--code-type": "#ffa657",
  "--code-number": "#79c0ff",
  "--code-operator": "#e6edf3",
  "--code-comment": "#8b949e",
  "--code-link": "#a5d6ff",
  "--code-heading": "#1f6feb",
  "--code-atom": "#79c0ff",
  "--code-string": "#a5d6ff",
  "--code-invalid": "#ffa198",
  "--code-punctuation": "#e6edf3",
};

const LIGHT_MERMAID = {
  background: "#ffffff",
  primaryColor: "#dbeafe",
  primaryTextColor: "#172554",
  primaryBorderColor: "#2563eb",
  secondaryColor: "#dcfce7",
  secondaryTextColor: "#14532d",
  secondaryBorderColor: "#16a34a",
  tertiaryColor: "#f3e8ff",
  tertiaryTextColor: "#581c87",
  tertiaryBorderColor: "#9333ea",
  lineColor: "#3b6382",
  textColor: "#111827",
  mainBkg: "#dbeafe",
  nodeBorder: "#2563eb",
  clusterBkg: "#f8fafc",
  clusterBorder: "#cbd5e1",
  edgeLabelBackground: "#ffffff",
};

const DARK_READABLE_MERMAID = {
  ...LIGHT_MERMAID,
  background: "#f6f8fa",
  textColor: "#111827",
  lineColor: "#1f4b67",
  edgeLabelBackground: "#f6f8fa",
};

export const OFFICIAL_THEMES: OfficialTheme[] = [
  {
    id: "github-light",
    name: "GitHub Light",
    zhName: "GitHub 浅色",
    mode: "light",
    variables: {
      ...BASE_LIGHT,
      "--page": "#ffffff",
      "--text": "#1f2328",
      "--muted": "#59636e",
      "--border": "#d1d9e0",
      "--accent": "#0969da",
      "--accent-soft": "#ddf4ff",
      "--code-bg": "#f6f8fa",
      "--code-string": "#0a3069",
      "--code-keyword": "#cf222e",
      "--code-comment": "#6e7781",
    },
    mermaid: LIGHT_MERMAID,
  },
  {
    id: "github-dark-dimmed",
    name: "GitHub Dark Dimmed",
    zhName: "GitHub 暗色柔和",
    mode: "dark",
    variables: {
      ...BASE_DARK,
      "--window": "#22272e",
      "--app-bg": "#22272e",
      "--chrome": "#2d333b",
      "--sidebar": "#2d333b",
      "--surface": "#373e47",
      "--page": "#22272e",
      "--text": "#adbac7",
      "--muted": "#909dab",
      "--border": "#444c56",
      "--accent": "#539bf5",
      "--accent-soft": "#25364a",
      "--code-bg": "#2d333b",
      "--code-text": "#adbac7",
      "--code-comment": "#768390",
      "--code-string": "#96d0ff",
    },
    mermaid: DARK_READABLE_MERMAID,
  },
  {
    id: "github-dark-colorblind",
    name: "GitHub Dark Colorblind",
    zhName: "GitHub 暗色高辨识",
    mode: "dark",
    variables: {
      ...BASE_DARK,
      "--accent": "#71b7ff",
      "--accent-soft": "#1e3349",
      "--code-keyword": "#ff9492",
      "--code-name": "#6fffe9",
      "--code-string": "#b6e3ff",
      "--code-comment": "#9fb1c1",
    },
    mermaid: DARK_READABLE_MERMAID,
  },
  {
    id: "oh-my-zsh-dark",
    name: "Oh My Zsh Dark",
    zhName: "Oh My Zsh 暗色",
    mode: "dark",
    variables: {
      ...BASE_DARK,
      "--window": "#151515",
      "--app-bg": "#151515",
      "--chrome": "#202020",
      "--sidebar": "#202020",
      "--surface": "#272822",
      "--page": "#1b1b1b",
      "--text": "#f8f8f2",
      "--muted": "#c2c2b0",
      "--border": "#49483e",
      "--accent": "#66d9ef",
      "--accent-soft": "#16343a",
      "--code-bg": "#272822",
      "--code-text": "#f8f8f2",
      "--code-keyword": "#f92672",
      "--code-name": "#a6e22e",
      "--code-function": "#66d9ef",
      "--code-string": "#e6db74",
      "--code-comment": "#a6a68a",
    },
    mermaid: DARK_READABLE_MERMAID,
  },
  {
    id: "monokai-terminal",
    name: "Monokai Terminal",
    zhName: "Monokai 终端",
    mode: "dark",
    variables: {
      ...BASE_DARK,
      "--window": "#1f201b",
      "--app-bg": "#1f201b",
      "--chrome": "#292a24",
      "--sidebar": "#292a24",
      "--surface": "#33342d",
      "--page": "#1f201b",
      "--text": "#f8f8f2",
      "--muted": "#cfcfbd",
      "--border": "#515247",
      "--accent": "#a6e22e",
      "--accent-soft": "#2e3b20",
      "--code-bg": "#272822",
      "--code-keyword": "#f92672",
      "--code-function": "#66d9ef",
      "--code-string": "#e6db74",
    },
    mermaid: DARK_READABLE_MERMAID,
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    zhName: "Solarized 浅色",
    mode: "light",
    variables: {
      ...BASE_LIGHT,
      "--window": "#eee8d5",
      "--app-bg": "#eee8d5",
      "--chrome": "#fdf6e3",
      "--sidebar": "#fdf6e3",
      "--surface": "#eee8d5",
      "--page": "#fdf6e3",
      "--text": "#073642",
      "--muted": "#657b83",
      "--border": "#d6cdb6",
      "--accent": "#268bd2",
      "--accent-soft": "#d9eef7",
      "--code-bg": "#eee8d5",
      "--code-text": "#073642",
      "--code-string": "#2aa198",
      "--code-keyword": "#859900",
      "--code-comment": "#657b83",
    },
    mermaid: LIGHT_MERMAID,
  },
  {
    id: "lumen-paper",
    name: "Lumen Paper",
    zhName: "Lumen 纸张",
    mode: "light",
    variables: {
      ...BASE_LIGHT,
      "--window": "#f3f4f6",
      "--page": "#ffffff",
      "--text": "#111827",
      "--muted": "#4b5563",
      "--accent": "#2563eb",
      "--code-bg": "#f1f5f9",
    },
    mermaid: LIGHT_MERMAID,
  },
  {
    id: "lumen-ink",
    name: "Lumen Ink",
    zhName: "Lumen 墨色",
    mode: "dark",
    variables: {
      ...BASE_DARK,
      "--window": "#111827",
      "--app-bg": "#111827",
      "--chrome": "#172033",
      "--sidebar": "#172033",
      "--surface": "#1f2937",
      "--page": "#111827",
      "--text": "#e5e7eb",
      "--muted": "#cbd5e1",
      "--border": "#334155",
      "--accent": "#93c5fd",
      "--accent-soft": "#21314b",
      "--code-bg": "#0b1020",
      "--code-text": "#dbeafe",
    },
    mermaid: DARK_READABLE_MERMAID,
  },
];

export function loadThemePreference(): ThemePreference {
  const value = localStorage.getItem(ACTIVE_THEME_KEY);
  if (value === "system-light" || value === "system-dark") return value;
  if (value?.startsWith("official:") && OFFICIAL_THEMES.some((theme) => `official:${theme.id}` === value)) {
    return value as `official:${OfficialThemeId}`;
  }
  if (value?.startsWith("imported:")) return value as `imported:${string}`;
  return "system";
}

export function saveThemePreference(value: ThemePreference): void {
  localStorage.setItem(ACTIVE_THEME_KEY, value);
}

export function buildThemeMenuItems(importedThemes: ImportedTheme[]): ThemeMenuItem[] {
  return [
    ...BUILT_IN_THEME_ITEMS,
    ...OFFICIAL_THEMES.map((theme) => ({ id: `official:${theme.id}` as ThemePreference, label: theme.name })),
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
  if (preference.startsWith("official:")) {
    const officialId = preference.slice("official:".length) as OfficialThemeId;
    const official = OFFICIAL_THEMES.find((theme) => theme.id === officialId);
    if (official) return { id: `official:${officialId}`, label: official.name, mode: "official", officialId };
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
  --diagram-canvas: #ffffff;
  --mermaid-preview-bg: #ffffff;
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

export function buildOfficialThemeCss(themeId: OfficialThemeId): string {
  const theme = OFFICIAL_THEMES.find((item) => item.id === themeId);
  if (!theme) return "";
  const variables = Object.entries(theme.variables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
  const mermaid = Object.entries(theme.mermaid)
    .map(([key, value]) => `  --mermaid-${key}: ${value};`)
    .join("\n");
  return `:root[data-theme-mode="official"] {\n${variables}\n${mermaid}\n}`;
}

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function hexToRgb(color: string): [number, number, number] | null {
  const normalized = color.trim();
  const match = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const hex = match[1].length === 3
    ? match[1].split("").map((part) => `${part}${part}`).join("")
    : match[1];
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function luminance(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 1;
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

export function contrastRatio(foreground: string, background: string): number {
  const fg = luminance(foreground);
  const bg = luminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}
