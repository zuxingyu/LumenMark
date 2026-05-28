# LumenMark

[English](./README.md)

LumenMark 是一款面向 Windows 10/11 x64 与 macOS Apple Silicon 的本地 Markdown 阅读和编辑软件，基于 Tauri 2、React、TypeScript 与 Rust 构建。

## 功能

- 启动后直接进入未命名空白文档；使用 `Ctrl+S`（Windows）或 `Cmd+S`（macOS）首次另存为 `.md`。
- 通过 Milkdown Crepe 直接编辑排版后的 Markdown；可打开文件、打开工作区、拖入 `.md`，或使用系统“打开方式”。
- 直接编辑 GFM 表格与任务列表、KaTeX 数学公式、Mermaid 流程图，以及具有高亮的 JSON、SQL、Shell、Python、Java 代码块。
- 使用实时大纲定位标题，并在文档内执行查找和替换。
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

示例工作区文档 `examples/workspace/architecture.md` 包含数学公式、Mermaid 流程图和目标代码语言展示。直接编辑在保存时可能规范化等价的 Markdown 空白行、列表布局或 fenced code block 排版；非标准扩展语法不承诺字节级原样保留。

## 安装包与首次运行

推送 `v0.3.1` 版本标签后，GitHub Release 会生成：

- Windows x64 的 `LumenMark_<version>_x64-setup.exe`（NSIS 用户级安装，包含 WebView2 离线安装器）。
- macOS Apple Silicon 的 `LumenMark_<version>_aarch64.dmg`。

`v0.3.1` 修复 Windows 离线安装路径，并改进标题层级视觉、回车确认 Markdown 快捷样式以及 fenced code block 高亮。该版本仍为测试版本。Windows 安装包未签名，并内置 WebView2 离线安装器，安装时不需要联网下载 WebView2。macOS 应用包已进行 ad-hoc 签名以保证 Apple Silicon 能校验应用包结构，但尚未经过 Apple 公证。Windows 首次运行时可能显示 SmartScreen 提示；macOS 首次运行时可在 Finder 中右键选择“打开”，或在“系统设置 > 隐私与安全性”中允许启动。
