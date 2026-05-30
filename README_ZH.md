# LumenMark

[English](./README.md)

LumenMark 是一款面向 Windows 10/11 x64 与 macOS Apple Silicon 的本地 Markdown 阅读和编辑软件，基于 Tauri 2、React、TypeScript 与 Rust 构建。

## 功能

- 启动后直接进入未命名空白文档；使用 `Ctrl+S`（Windows）或 `Cmd+S`（macOS）首次另存为 `.md`。
- 通过 Milkdown Crepe 直接编辑排版后的 Markdown；可打开文件、打开工作区、拖入 `.md`，或使用系统“打开方式”。
- 从系统剪贴板粘贴 Markdown 源文本时，标题、列表、引用、表格、代码围栏、数学公式和 Mermaid 块会解析成对应的排版内容。
- 直接编辑 GFM 表格与任务列表、KaTeX 数学公式、Mermaid 流程图，以及具有高对比高亮的 JSON、Java、JavaScript、TypeScript、Go、Python、HTML、CSS、Rust、C/C++、PHP、XML、Shell、SQL、YAML、Markdown、Mermaid、Text 代码块。
- 输入三个反引号后继续输入字母可检索代码块语言，例如输入 ```` ```j ```` 会显示 `json`、`java` 与 `javascript`，可用上下键、回车或鼠标创建对应代码块。
- 使用 macOS 与 Windows 原生格式菜单手动应用段落、H1-H6、引用、列表、代码块、链接和行内文本格式；菜单会跟随当前界面语言显示。
- 使用实时大纲定位标题，在文档内执行查找和替换，并在左侧工作区顶部搜索文件名与 Markdown 正文。
- 重启或异常退出后可恢复本地草稿；草稿恢复不会在用户保存前覆盖原始文件。
- 代码块可复制、可独立切换自动换行，并可将当前文档渲染结果导出为 HTML、PDF 或 PNG；软件不会执行代码块。
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

推送 `v0.3.7` 版本标签后，GitHub Release 会生成：

- Windows x64 的 `LumenMark_<version>_x64-setup.exe`（NSIS 用户级安装，包含 WebView2 离线安装器）。
- macOS Apple Silicon 的 `LumenMark_<version>_aarch64.dmg`。

`v0.3.7` 以稳定性修复为主：新增 Typora 风格上标/下标语法，恢复手动输入无序列表和有序列表的转换规则，HTML/PDF/PNG 导出改为基于只读预览 DOM，Mermaid 流程图会以渲染结果导出而不是代码块，代码块复制成功后会短暂显示成功状态。该版本仍为测试版本。Windows 安装包未签名，并内置 WebView2 离线安装器，安装时不需要联网下载 WebView2。macOS 使用系统 WebKit，因此 `.dmg` 体积明显小于 Windows 安装包是正常结果；安装和启动不需要下载额外运行时。macOS 应用包已进行 ad-hoc 签名以保证 Apple Silicon 能校验应用包结构，但尚未经过 Apple 公证。Windows 首次运行时可能显示 SmartScreen 提示；macOS 首次运行时可在 Finder 中右键选择“打开”，或在“系统设置 > 隐私与安全性”中允许启动。

## 后续路线

- `v0.3.8`：稳定性维护、导出边界问题修复与回归测试覆盖增强。
- `v0.3.9`：在编辑器稳定性验证后，再推进主题、字体、阅读宽度与代码主题设置。
- `v0.4.0`：签名、公证、自动更新、安装包校验与面向公开发行的质量加固。

## 图标

应用图标由项目内生成资产创建，源文件位于 `assets/lumenmark-icon.svg`，不依赖外部版权图标。Tauri 打包会使用同一套 `icns`、`ico` 与 PNG 图标资源。
