# LumenMark

LumenMark is a Windows-first desktop Markdown workspace editor built with Tauri 2, React, TypeScript, and Rust. It reads and edits local `.md` files, renders technical content, and exports fenced code blocks without running them.

## MVP Features

- Open a local folder and browse nested Markdown documents in a desktop sidebar.
- Switch between clean preview and CodeMirror source editing; save manually with `Ctrl+S`.
- Render GFM tables and task lists, KaTeX math, Mermaid diagrams, and highlighted code blocks.
- Export every fenced code block from a document, supporting `file=<name>` metadata or safe generated names.
- Reject workspace path escapes, unsafe exported file names, raw HTML execution, and untrusted local image reads.

## Run Locally

Prerequisites: Node.js 24+, Rust stable, and the platform prerequisites required by [Tauri 2](https://v2.tauri.app/start/prerequisites/).

```bash
npm install
npm run tauri dev
```

For browser-only UI inspection, `npm run dev` uses a built-in demonstration workspace. Local filesystem actions are active in the Tauri application.

## Verify

```bash
npm run test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

The sample document at `examples/workspace/architecture.md` covers formulas, Mermaid, and JSON, SQL, Shell, Python, and Java export cases.

## Windows Installer

The GitHub Actions workflow in `.github/workflows/windows-build.yml` produces a Windows x64 NSIS installer artifact. The installer targets per-user installation and configures WebView2 bootstrap download through Tauri. The MVP is unsigned; public distribution should add Windows code signing.
