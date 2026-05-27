# LumenMark

[简体中文](./README_ZH.md)

LumenMark is a local Markdown reader and editor for Windows 10/11 x64 and macOS Apple Silicon, built with Tauri 2, React, TypeScript, and Rust.

## Features

- Launch directly into an untitled document, then save it as `.md` with `Ctrl+S` or `Cmd+S`.
- Edit formatted Markdown directly through the Milkdown Crepe visual editor; open a file, a folder workspace, drag a `.md` into the window, or use the operating system's Open With action.
- Edit GFM tables and tasks, KaTeX math, Mermaid diagrams, and highlighted JSON, SQL, Shell, Python, and Java blocks.
- Navigate headings with the live outline and use find and replace inside the document.
- Copy code blocks; LumenMark never executes or exports code blocks.
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

The sample workspace at `examples/workspace/architecture.md` exercises formulas, Mermaid, and supported highlighted languages. Visual editing may normalize equivalent Markdown whitespace, list layout, or fenced-block formatting when saving; byte-for-byte preservation of nonstandard extensions is not promised.

## Releases

Pushing the `v0.3.0` version tag creates a GitHub Release with:

- `LumenMark_<version>_x64-setup.exe` for Windows x64 (NSIS, per-user installation, WebView2 bootstrapper).
- `LumenMark_<version>_aarch64.dmg` for macOS Apple Silicon.

Version `v0.3.0` adds direct visual editing and desktop Markdown file integration while retaining the window-closing correction from `v0.2.2`. These builds are test releases. The Windows installer is unsigned. The macOS bundle receives an ad-hoc signature so Apple Silicon can validate its app bundle structure, but it is not notarized. Windows may show a SmartScreen warning. On macOS, use Finder's Open action or System Settings > Privacy & Security to allow the app on first launch.
