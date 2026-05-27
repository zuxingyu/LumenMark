# LumenMark

[简体中文](./README_ZH.md)

LumenMark is a local Markdown reader and editor for Windows 10/11 x64 and macOS Apple Silicon, built with Tauri 2, React, TypeScript, and Rust.

## Features

- Open a single `.md` file or a folder workspace; remove recent-folder associations without deleting files.
- Switch between a clean preview and CodeMirror source editing; save manually with `Ctrl+S` or `Cmd+S`.
- Render GFM tables and tasks, KaTeX math, Mermaid diagrams, and highlighted JSON, SQL, Shell, Python, and Java blocks.
- Copy code blocks from preview; LumenMark never executes or exports code blocks.
- Keep raw HTML inactive and restrict local images and document I/O to the selected safety root.
- Start in Simplified Chinese with an in-app English switch.

## Run Locally

Prerequisites: Node.js 24+, Rust stable, and the platform prerequisites required by [Tauri 2](https://v2.tauri.app/start/prerequisites/).

```bash
npm install
npm run tauri dev
```

For browser-only UI inspection, `npm run dev` uses a demonstration document and workspace. Filesystem dialogs are active in the Tauri desktop application.

## Verify

```bash
npm run test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

The sample workspace at `examples/workspace/architecture.md` exercises formulas, Mermaid, and supported highlighted languages.

## Releases

Pushing a version tag such as `v0.2.1` creates a GitHub Release with:

- `LumenMark_<version>_x64-setup.exe` for Windows x64 (NSIS, per-user installation, WebView2 bootstrapper).
- `LumenMark_<version>_aarch64.dmg` for macOS Apple Silicon.

Version `v0.2.1` builds are test releases. The Windows installer is unsigned. The macOS bundle receives an ad-hoc signature so Apple Silicon can validate its app bundle structure, but it is not notarized. Windows may show a SmartScreen warning. On macOS, use Finder's Open action or System Settings > Privacy & Security to allow the app on first launch.
