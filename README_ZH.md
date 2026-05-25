# LumenMark

[English](./README.md)

LumenMark 是一款面向 Windows 10/11 x64 与 macOS Apple Silicon 的本地 Markdown 阅读和编辑软件，基于 Tauri 2、React、TypeScript 与 Rust 构建。

## 功能

- 打开单个 `.md` 文件，或打开文件夹作为工作区；可从最近工作区中解除文件夹关联，不会删除磁盘文件。
- 在排版预览与 CodeMirror 源码编辑之间切换；使用 `Ctrl+S`（Windows）或 `Cmd+S`（macOS）手动保存。
- 显示 GFM 表格与任务列表、KaTeX 数学公式、Mermaid 流程图，以及 JSON、SQL、Shell、Python、Java 代码高亮。
- 代码块可复制，但软件不会执行代码，也不会把代码块导出到磁盘。
- 默认不执行 Markdown 原始 HTML，并限制本地图片与文档读写只能位于选定的安全目录内。
- 默认使用简体中文，可在工具栏切换英文界面。

## 本地运行

前置条件：Node.js 24+、Rust stable，以及 [Tauri 2 平台依赖](https://v2.tauri.app/start/prerequisites/)。

```bash
npm install
npm run tauri dev
```

单独运行 `npm run dev` 可在浏览器中查看演示文档界面；本地文件选择和保存仅在 Tauri 桌面程序中启用。

## 验证命令

```bash
npm run test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

示例工作区文档 `examples/workspace/architecture.md` 包含数学公式、Mermaid 流程图和目标代码语言展示。

## 安装包与首次运行

推送 `v0.2.0` 等版本标签后，GitHub Release 会生成：

- Windows x64 的 `LumenMark_<version>_x64-setup.exe`（NSIS 用户级安装，包含 WebView2 引导安装配置）。
- macOS Apple Silicon 的 `LumenMark_<version>_aarch64.dmg`。

`v0.2.0` 为未签名测试版本。Windows 首次运行时可能显示 SmartScreen 提示；macOS 首次运行时可在 Finder 中右键选择“打开”，或在“系统设置 > 隐私与安全性”中允许启动。
