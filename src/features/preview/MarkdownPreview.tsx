import { useEffect, useId, useState, type MouseEvent } from "react";
import { Highlight, themes } from "prism-react-renderer";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { Components } from "react-markdown";
import { openUrl } from "@tauri-apps/plugin-opener";
import { codeLanguageLabel, messages, type Locale } from "../../i18n";
import { isTauriRuntime } from "../../services/desktop";
import { typoraInlineRemarkPlugin } from "../markdown/typora-inline";

interface MarkdownPreviewProps {
  locale?: Locale;
  source: string;
  imageResolver?: (source: string) => Promise<string>;
}

function MermaidBlock({ locale, source }: { locale: Locale; source: string }) {
  const labels = messages[locale];
  const generatedId = useId().replaceAll(":", "");
  const [svg, setSvg] = useState<string>();
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    async function renderDiagram() {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
        const output = await mermaid.render(`lumenmark-${generatedId}`, source);
        if (active) setSvg(output.svg);
      } catch {
        if (active) setError(true);
      }
    }
    void renderDiagram();
    return () => {
      active = false;
    };
  }, [generatedId, source]);

  if (error) {
    return (
      <div className="diagram-error">
        <p>{labels.diagramError}</p>
        <pre>{source}</pre>
      </div>
    );
  }
  if (!svg) return <div className="diagram-loading">{labels.diagramLoading}</div>;
  return <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function CodeBlock({
  locale,
  language,
  source,
}: {
  locale: Locale;
  language: string;
  source: string;
}) {
  const labels = messages[locale];
  const label = codeLanguageLabel(language);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(source);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1000);
  }

  return (
    <section className="code-panel">
      <header>
        <span>{label}</span>
        <button type="button" aria-label={locale === "zh-CN" ? `复制 ${label} 代码` : `Copy ${label} code`} onClick={() => void copy()}>
          {copied ? labels.copied : labels.copy}
        </button>
      </header>
      <Highlight theme={themes.github} code={source.replace(/\n$/, "")} language={language}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={className} style={style}>
            {tokens.map((line, index) => (
              <div key={index} {...getLineProps({ line })}>
                <span className="line-number">{index + 1}</span>
                {line.map((token, tokenIndex) => (
                  <span key={tokenIndex} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </section>
  );
}

function WorkspaceImage({
  locale,
  source,
  alt,
  resolver,
}: {
  locale: Locale;
  source: string;
  alt: string;
  resolver?: (source: string) => Promise<string>;
}) {
  const labels = messages[locale];
  const [resolved, setResolved] = useState(resolver ? undefined : source);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!resolver) return;
    let active = true;
    resolver(source)
      .then((value) => {
        if (active) setResolved(value);
      })
      .catch(() => {
        if (active) setBlocked(true);
      });
    return () => {
      active = false;
    };
  }, [resolver, source]);

  if (blocked) return <span className="image-blocked">{labels.imageBlocked}</span>;
  return resolved ? <img src={resolved} alt={alt} /> : <span className="image-loading">{labels.imageLoading}</span>;
}

export function MarkdownPreview({ locale = "en-US", source, imageResolver }: MarkdownPreviewProps) {
  const labels = messages[locale];
  const components: Components = {
    code({ className, children }) {
      const match = /language-([^\s]+)/.exec(className ?? "");
      if (!match) return <code className={className}>{children}</code>;
      const language = match[1].toLowerCase();
      const value = String(children);
      if (language === "mermaid") return <MermaidBlock locale={locale} source={value.replace(/\n$/, "")} />;
      return <CodeBlock locale={locale} language={language} source={value} />;
    },
    a({ href, children }) {
      const isExternal = Boolean(href && /^https?:\/\//i.test(href));
      async function openExternal(event: MouseEvent<HTMLAnchorElement>) {
        if (!isExternal || !href) return;
        event.preventDefault();
        if (!window.confirm(`${labels.externalLink}\n\n${href}`)) return;
        if (isTauriRuntime()) await openUrl(href);
        else window.open(href, "_blank", "noopener,noreferrer");
      }
      return (
        <a href={href} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined} onClick={(event) => void openExternal(event)}>
          {children}
        </a>
      );
    },
    img({ src, alt }) {
      const safe = src && !/^(?:[a-z]+:|\/|\\)/i.test(src) && (imageResolver || !src.split(/[\\/]/).includes(".."));
      return safe ? <WorkspaceImage locale={locale} source={src} alt={alt ?? ""} resolver={imageResolver} /> : <span className="image-blocked">{labels.imageBlocked}</span>;
    },
  };

  return (
    <article className="markdown-preview">
      <ReactMarkdown
        remarkPlugins={[[remarkGfm, { singleTilde: false }], remarkMath, typoraInlineRemarkPlugin]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </article>
  );
}
