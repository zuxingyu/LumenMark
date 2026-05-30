export function mermaidThemeConfig() {
  const dark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return {
    startOnLoad: false,
    securityLevel: "strict" as const,
    theme: "base" as const,
    themeVariables: dark
      ? {
          background: "#151a21",
          primaryColor: "#1f3b57",
          primaryTextColor: "#eef6ff",
          primaryBorderColor: "#60a5fa",
          secondaryColor: "#263c2f",
          secondaryTextColor: "#ecfdf5",
          secondaryBorderColor: "#34d399",
          tertiaryColor: "#3b2f53",
          tertiaryTextColor: "#f5f3ff",
          tertiaryBorderColor: "#a78bfa",
          lineColor: "#8fb6d8",
          textColor: "#e5e7eb",
          mainBkg: "#1f3b57",
          nodeBorder: "#60a5fa",
          clusterBkg: "#17202b",
          clusterBorder: "#4b5563",
          edgeLabelBackground: "#151a21",
        }
      : {
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
        },
  };
}
