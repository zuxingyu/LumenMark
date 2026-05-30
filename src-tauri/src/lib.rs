use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager};

type CommandResult<T> = Result<T, String>;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceInfo {
    pub root: String,
    pub name: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceEntry {
    pub name: String,
    pub relative_path: String,
    pub kind: String,
    pub children_loaded: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentContent {
    pub relative_path: String,
    pub content: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenedDocument {
    pub root: String,
    pub relative_path: String,
    pub name: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationResult {
    pub success: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSearchResult {
    pub kind: String,
    pub relative_path: String,
    pub name: String,
    pub line: Option<usize>,
    pub excerpt: String,
}

#[derive(Default)]
struct ExternalDocumentState {
    pending: Mutex<Vec<OpenedDocument>>,
    frontend_ready: AtomicBool,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "lowercase")]
enum MenuLocale {
    Zh,
    En,
}

impl MenuLocale {
    fn from_code(value: &str) -> Self {
        if value.eq_ignore_ascii_case("en") {
            Self::En
        } else {
            Self::Zh
        }
    }
}

#[derive(Clone, Copy)]
struct MenuText {
    zh: &'static str,
    en: &'static str,
}

impl MenuText {
    fn get(self, locale: MenuLocale) -> &'static str {
        match locale {
            MenuLocale::Zh => self.zh,
            MenuLocale::En => self.en,
        }
    }
}

const FORMAT_MENU_ITEMS: &[(&str, &str, MenuText, Option<&str>)] = &[
    ("format-paragraph", "paragraph", MenuText { zh: "段落", en: "Paragraph" }, Some("CmdOrCtrl+0")),
    ("format-heading-1", "heading-1", MenuText { zh: "标题 1", en: "Heading 1" }, Some("CmdOrCtrl+1")),
    ("format-heading-2", "heading-2", MenuText { zh: "标题 2", en: "Heading 2" }, Some("CmdOrCtrl+2")),
    ("format-heading-3", "heading-3", MenuText { zh: "标题 3", en: "Heading 3" }, Some("CmdOrCtrl+3")),
    ("format-heading-4", "heading-4", MenuText { zh: "标题 4", en: "Heading 4" }, Some("CmdOrCtrl+4")),
    ("format-heading-5", "heading-5", MenuText { zh: "标题 5", en: "Heading 5" }, Some("CmdOrCtrl+5")),
    ("format-heading-6", "heading-6", MenuText { zh: "标题 6", en: "Heading 6" }, Some("CmdOrCtrl+6")),
    ("format-blockquote", "blockquote", MenuText { zh: "引用", en: "Quote" }, Some("CmdOrCtrl+Shift+Q")),
    ("format-bullet-list", "bullet-list", MenuText { zh: "无序列表", en: "Bullet List" }, Some("CmdOrCtrl+Shift+8")),
    ("format-ordered-list", "ordered-list", MenuText { zh: "有序列表", en: "Ordered List" }, Some("CmdOrCtrl+Shift+7")),
    ("format-task-list", "task-list", MenuText { zh: "任务列表", en: "Task List" }, None),
    ("format-code-block", "code-block", MenuText { zh: "代码块", en: "Code Block" }, Some("CmdOrCtrl+Shift+K")),
    ("format-strong", "strong", MenuText { zh: "加粗", en: "Bold" }, Some("CmdOrCtrl+B")),
    ("format-emphasis", "emphasis", MenuText { zh: "斜体", en: "Italic" }, Some("CmdOrCtrl+I")),
    ("format-strikethrough", "strikethrough", MenuText { zh: "删除线", en: "Strikethrough" }, Some("CmdOrCtrl+Shift+X")),
    ("format-superscript", "superscript", MenuText { zh: "上标", en: "Superscript" }, None),
    ("format-subscript", "subscript", MenuText { zh: "下标", en: "Subscript" }, None),
    ("format-inline-code", "inline-code", MenuText { zh: "行内代码", en: "Inline Code" }, Some("CmdOrCtrl+Shift+C")),
    ("format-link", "link", MenuText { zh: "链接", en: "Link" }, Some("CmdOrCtrl+K")),
];

fn format_command_from_menu_id(id: &str) -> Option<&'static str> {
    FORMAT_MENU_ITEMS
        .iter()
        .find(|(menu_id, _, _, _)| *menu_id == id)
        .map(|(_, command, _, _)| *command)
}

fn localized_menu_label(locale: MenuLocale, key: &str) -> &'static str {
    match (locale, key) {
        (MenuLocale::Zh, "file") => "文件",
        (MenuLocale::En, "file") => "File",
        (MenuLocale::Zh, "edit") => "编辑",
        (MenuLocale::En, "edit") => "Edit",
        (MenuLocale::Zh, "format") => "格式",
        (MenuLocale::En, "format") => "Format",
        (MenuLocale::Zh, "view") => "显示",
        (MenuLocale::En, "view") => "View",
        _ => "",
    }
}

fn build_app_menu_for_locale<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    locale: MenuLocale,
) -> tauri::Result<Menu<R>> {
    let format_items = FORMAT_MENU_ITEMS
        .iter()
        .map(|(id, _, label, accelerator)| MenuItem::with_id(app, *id, label.get(locale), true, *accelerator))
        .collect::<tauri::Result<Vec<_>>>()?;

    Menu::with_items(
        app,
        &[
            #[cfg(target_os = "macos")]
            &Submenu::with_items(
                app,
                app.package_info().name.clone(),
                true,
                &[
                    &PredefinedMenuItem::about(app, None, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::services(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, None)?,
                    &PredefinedMenuItem::hide_others(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::quit(app, None)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                localized_menu_label(locale, "file"),
                true,
                &[
                    &PredefinedMenuItem::close_window(app, None)?,
                    #[cfg(not(target_os = "macos"))]
                    &PredefinedMenuItem::quit(app, None)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                localized_menu_label(locale, "edit"),
                true,
                &[
                    &PredefinedMenuItem::undo(app, None)?,
                    &PredefinedMenuItem::redo(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, None)?,
                    &PredefinedMenuItem::copy(app, None)?,
                    &PredefinedMenuItem::paste(app, None)?,
                    &PredefinedMenuItem::select_all(app, None)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                localized_menu_label(locale, "format"),
                true,
                &[
                    &format_items[0],
                    &PredefinedMenuItem::separator(app)?,
                    &format_items[1],
                    &format_items[2],
                    &format_items[3],
                    &format_items[4],
                    &format_items[5],
                    &format_items[6],
                    &PredefinedMenuItem::separator(app)?,
                    &format_items[7],
                    &format_items[8],
                    &format_items[9],
                    &format_items[10],
                    &format_items[11],
                    &PredefinedMenuItem::separator(app)?,
                    &format_items[12],
                    &format_items[13],
                    &format_items[14],
                    &format_items[15],
                    &format_items[16],
                    &format_items[17],
                    &format_items[18],
                ],
            )?,
            #[cfg(target_os = "macos")]
            &Submenu::with_items(
                app,
                localized_menu_label(locale, "view"),
                true,
                &[&PredefinedMenuItem::fullscreen(app, None)?],
            )?,
        ],
    )
}

fn build_app_menu<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<Menu<R>> {
    build_app_menu_for_locale(app, MenuLocale::Zh)
}

fn has_only_normal_components(path: &Path) -> bool {
    !path.as_os_str().is_empty()
        && path
            .components()
            .all(|part| matches!(part, Component::Normal(_)))
}

pub fn safe_workspace_path(
    root: &Path,
    relative_path: &str,
    must_exist: bool,
) -> CommandResult<PathBuf> {
    let relative = Path::new(relative_path);
    if !has_only_normal_components(relative) {
        return Err("Path must remain inside the selected workspace.".to_string());
    }

    let root = root
        .canonicalize()
        .map_err(|error| format!("Unable to open workspace: {error}"))?;
    let target = root.join(relative);
    let checked = if must_exist {
        target
            .canonicalize()
            .map_err(|error| format!("Unable to access entry: {error}"))?
    } else {
        let parent = target
            .parent()
            .ok_or_else(|| "Unable to determine destination folder.".to_string())?;
        let parent = parent
            .canonicalize()
            .map_err(|error| format!("Unable to access destination folder: {error}"))?;
        parent.join(
            target
                .file_name()
                .ok_or_else(|| "A file name is required.".to_string())?,
        )
    };

    if checked.starts_with(&root) {
        Ok(checked)
    } else {
        Err("Path must remain inside the selected workspace.".to_string())
    }
}

fn require_markdown(path: &Path) -> CommandResult<()> {
    match path.extension().and_then(|extension| extension.to_str()) {
        Some(extension) if extension.eq_ignore_ascii_case("md") => Ok(()),
        _ => Err("LumenMark only manages Markdown (.md) documents.".to_string()),
    }
}

fn is_hidden_path(path: &Path) -> bool {
    path.components().any(|part| {
        matches!(part, Component::Normal(name) if name.to_string_lossy().starts_with('.'))
    })
}

fn folder_contains_markdown(root: &Path, directory: &Path) -> CommandResult<bool> {
    for entry in fs::read_dir(directory).map_err(|error| format!("Unable to inspect folder: {error}"))? {
        let path = entry
            .map_err(|error| format!("Unable to inspect entry: {error}"))?
            .path();
        if path != root && is_hidden_path(path.strip_prefix(root).unwrap_or(&path)) {
            continue;
        }
        if path.is_dir() {
            if folder_contains_markdown(root, &path)? {
                return Ok(true);
            }
        } else if require_markdown(&path).is_ok() {
            return Ok(true);
        }
    }
    Ok(false)
}

pub fn read_asset_data_url(
    root: &Path,
    document_path: &str,
    source: &str,
) -> CommandResult<String> {
    let root = root
        .canonicalize()
        .map_err(|error| format!("Unable to access workspace: {error}"))?;
    let document = safe_workspace_path(&root, document_path, true)?;
    require_markdown(&document)?;
    let source_path = Path::new(source);
    if source_path.is_absolute()
        || source.contains("://")
        || source_path
            .components()
            .any(|part| matches!(part, Component::Prefix(_) | Component::RootDir))
    {
        return Err("Images must be relative workspace assets.".to_string());
    }
    let asset = document
        .parent()
        .ok_or_else(|| "Unable to resolve document folder.".to_string())?
        .join(source_path)
        .canonicalize()
        .map_err(|error| format!("Unable to access image: {error}"))?;
    if !asset.starts_with(&root) {
        return Err("Images must remain inside the selected workspace.".to_string());
    }
    let mime = match asset
        .extension()
        .and_then(|extension| extension.to_str())
        .map(str::to_lowercase)
        .as_deref()
    {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("svg") => "image/svg+xml",
        _ => return Err("Unsupported image type.".to_string()),
    };
    let bytes = fs::read(asset).map_err(|error| format!("Unable to read image: {error}"))?;
    Ok(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
}

fn relative_string(root: &Path, entry: &Path) -> CommandResult<String> {
    entry
        .strip_prefix(root)
        .map(|path| path.to_string_lossy().replace('\\', "/"))
        .map_err(|_| "Entry is not in the selected workspace.".to_string())
}

fn entry_from_path(root: &Path, path: &Path) -> CommandResult<WorkspaceEntry> {
    Ok(WorkspaceEntry {
        name: path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or_default()
            .to_string(),
        relative_path: relative_string(root, path)?,
        kind: if path.is_dir() {
            "directory"
        } else {
            "markdown"
        }
        .to_string(),
        children_loaded: false,
    })
}

#[tauri::command]
fn select_workspace() -> CommandResult<Option<WorkspaceInfo>> {
    let selected = rfd::FileDialog::new().pick_folder();
    selected
        .map(|root| {
            let root = root
                .canonicalize()
                .map_err(|error| format!("Unable to access selected workspace: {error}"))?;
            Ok(WorkspaceInfo {
                name: root
                    .file_name()
                    .and_then(|name| name.to_str())
                    .unwrap_or("Workspace")
                    .to_string(),
                root: root.to_string_lossy().to_string(),
            })
        })
        .transpose()
}

pub fn opened_document_from_path(path: &Path) -> CommandResult<OpenedDocument> {
    let path = path
        .canonicalize()
        .map_err(|error| format!("Unable to access selected document: {error}"))?;
    require_markdown(&path)?;
    let root = path
        .parent()
        .ok_or_else(|| "Unable to determine document folder.".to_string())?
        .canonicalize()
        .map_err(|error| format!("Unable to access document folder: {error}"))?;
    let relative_path = relative_string(&root, &path)?;
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Document.md")
        .to_string();
    let content = fs::read_to_string(&path)
        .map_err(|error| format!("Unable to read UTF-8 Markdown document: {error}"))?;
    Ok(OpenedDocument {
        root: root.to_string_lossy().to_string(),
        relative_path,
        name,
        content,
    })
}

#[tauri::command]
fn select_markdown_file() -> CommandResult<Option<OpenedDocument>> {
    rfd::FileDialog::new()
        .add_filter("Markdown", &["md"])
        .pick_file()
        .map(|path| opened_document_from_path(&path))
        .transpose()
}

#[tauri::command]
fn open_external_markdown_file(path: String) -> CommandResult<OpenedDocument> {
    opened_document_from_path(Path::new(&path))
}

#[tauri::command]
fn pending_external_documents(
    state: tauri::State<'_, ExternalDocumentState>,
) -> CommandResult<Vec<OpenedDocument>> {
    state.frontend_ready.store(true, Ordering::SeqCst);
    let mut pending = state
        .pending
        .lock()
        .map_err(|_| "Unable to access pending documents.".to_string())?;
    Ok(std::mem::take(&mut *pending))
}

pub fn write_new_document_at_path(path: &Path, content: &str) -> CommandResult<OpenedDocument> {
    require_markdown(path)?;
    fs::write(path, content).map_err(|error| format!("Unable to save document: {error}"))?;
    opened_document_from_path(path)
}

#[tauri::command]
fn save_export_text_file(default_name: String, content: String) -> CommandResult<Option<String>> {
    rfd::FileDialog::new()
        .set_file_name(default_name)
        .save_file()
        .map(|path| {
            fs::write(&path, content).map_err(|error| format!("Unable to export document: {error}"))?;
            Ok(path.to_string_lossy().to_string())
        })
        .transpose()
}

#[tauri::command]
fn save_export_binary_file(default_name: String, content_base64: String) -> CommandResult<Option<String>> {
    rfd::FileDialog::new()
        .set_file_name(default_name)
        .save_file()
        .map(|path| {
            let bytes = STANDARD
                .decode(content_base64.as_bytes())
                .map_err(|error| format!("Unable to decode exported document: {error}"))?;
            fs::write(&path, bytes).map_err(|error| format!("Unable to export document: {error}"))?;
            Ok(path.to_string_lossy().to_string())
        })
        .transpose()
}

#[tauri::command]
fn set_menu_locale(app: tauri::AppHandle, locale: String) -> CommandResult<OperationResult> {
    let menu = build_app_menu_for_locale(&app, MenuLocale::from_code(&locale))
        .map_err(|error| format!("Unable to build application menu: {error}"))?;
    app.set_menu(menu)
        .map_err(|error| format!("Unable to update application menu: {error}"))?;
    Ok(OperationResult { success: true })
}

#[tauri::command]
fn save_new_markdown_file(content: String) -> CommandResult<Option<OpenedDocument>> {
    rfd::FileDialog::new()
        .add_filter("Markdown", &["md"])
        .set_file_name("untitled.md")
        .save_file()
        .map(|path| write_new_document_at_path(&path, &content))
        .transpose()
}

#[tauri::command]
fn list_workspace_entries(
    root: String,
    relative_path: Option<String>,
) -> CommandResult<Vec<WorkspaceEntry>> {
    let root_path = Path::new(&root)
        .canonicalize()
        .map_err(|error| format!("Unable to access workspace: {error}"))?;
    let directory = match relative_path {
        Some(relative) if !relative.is_empty() => safe_workspace_path(&root_path, &relative, true)?,
        _ => root_path.clone(),
    };
    if !directory.is_dir() {
        return Err("The requested workspace entry is not a folder.".to_string());
    }

    let mut entries = fs::read_dir(&directory)
        .map_err(|error| format!("Unable to list folder: {error}"))?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            if path.is_dir() {
                folder_contains_markdown(&root_path, path).unwrap_or(false)
            } else {
                require_markdown(path).is_ok()
            }
        })
        .map(|path| entry_from_path(&root_path, &path))
        .collect::<CommandResult<Vec<_>>>()?;
    entries.sort_by_key(|entry| (entry.kind != "directory", entry.name.to_lowercase()));
    Ok(entries)
}

#[tauri::command]
fn read_markdown_file(root: String, relative_path: String) -> CommandResult<DocumentContent> {
    let path = safe_workspace_path(Path::new(&root), &relative_path, true)?;
    require_markdown(&path)?;
    let content = fs::read_to_string(&path)
        .map_err(|error| format!("Unable to read UTF-8 Markdown document: {error}"))?;
    Ok(DocumentContent {
        relative_path,
        content,
    })
}

const SEARCH_MAX_FILE_BYTES: u64 = 1_000_000;

fn collect_markdown_files(root: &Path, directory: &Path, files: &mut Vec<PathBuf>) -> CommandResult<()> {
    for entry in fs::read_dir(directory).map_err(|error| format!("Unable to search folder: {error}"))? {
        let path = entry
            .map_err(|error| format!("Unable to search entry: {error}"))?
            .path();
        if path != root && is_hidden_path(path.strip_prefix(root).unwrap_or(&path)) {
            continue;
        }
        if path.is_dir() {
            collect_markdown_files(root, &path, files)?;
        } else if require_markdown(&path).is_ok() {
            files.push(path);
        }
    }
    Ok(())
}

#[tauri::command]
fn search_workspace(root: String, query: String) -> CommandResult<Vec<WorkspaceSearchResult>> {
    let query = query.trim().to_lowercase();
    if query.is_empty() {
        return Ok(Vec::new());
    }
    let root_path = Path::new(&root)
        .canonicalize()
        .map_err(|error| format!("Unable to access workspace: {error}"))?;
    let mut files = Vec::new();
    collect_markdown_files(&root_path, &root_path, &mut files)?;
    files.sort();

    let mut results = Vec::new();
    for file in files {
        if fs::metadata(&file)
            .map(|metadata| metadata.len() > SEARCH_MAX_FILE_BYTES)
            .unwrap_or(true)
        {
            continue;
        }
        let content = match fs::read_to_string(&file) {
            Ok(content) => content,
            Err(_) => continue,
        };
        let name = file
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or_default()
            .to_string();
        let relative_path = relative_string(&root_path, &file)?;
        if name.to_lowercase().contains(&query) || relative_path.to_lowercase().contains(&query) {
            results.push(WorkspaceSearchResult {
                kind: "file".to_string(),
                relative_path: relative_path.clone(),
                name: name.clone(),
                line: None,
                excerpt: relative_path.clone(),
            });
        }
        for (index, line) in content.lines().enumerate() {
            if line.to_lowercase().contains(&query) {
                results.push(WorkspaceSearchResult {
                    kind: "content".to_string(),
                    relative_path: relative_path.clone(),
                    name: name.clone(),
                    line: Some(index + 1),
                    excerpt: line.trim().to_string(),
                });
            }
        }
    }
    Ok(results)
}

#[tauri::command]
fn read_workspace_asset(
    root: String,
    document_path: String,
    source: String,
) -> CommandResult<String> {
    read_asset_data_url(Path::new(&root), &document_path, &source)
}

#[tauri::command]
fn write_markdown_file(
    root: String,
    relative_path: String,
    content: String,
) -> CommandResult<OperationResult> {
    let path = safe_workspace_path(Path::new(&root), &relative_path, true)?;
    require_markdown(&path)?;
    fs::write(path, content).map_err(|error| format!("Unable to save document: {error}"))?;
    Ok(OperationResult { success: true })
}

#[tauri::command]
fn create_markdown_file(root: String, relative_path: String) -> CommandResult<WorkspaceEntry> {
    let root_path = Path::new(&root)
        .canonicalize()
        .map_err(|error| format!("Unable to access workspace: {error}"))?;
    let path = safe_workspace_path(&root_path, &relative_path, false)?;
    require_markdown(&path)?;
    if path.exists() {
        return Err("A document with that name already exists.".to_string());
    }
    fs::write(&path, "").map_err(|error| format!("Unable to create document: {error}"))?;
    entry_from_path(&root_path, &path)
}

#[tauri::command]
fn rename_markdown_entry(root: String, from: String, to: String) -> CommandResult<WorkspaceEntry> {
    let root_path = Path::new(&root)
        .canonicalize()
        .map_err(|error| format!("Unable to access workspace: {error}"))?;
    let source = safe_workspace_path(&root_path, &from, true)?;
    let destination = safe_workspace_path(&root_path, &to, false)?;
    if source.is_file() {
        require_markdown(&source)?;
        require_markdown(&destination)?;
    }
    if destination.exists() {
        return Err("An entry with that name already exists.".to_string());
    }
    fs::rename(&source, &destination)
        .map_err(|error| format!("Unable to rename entry: {error}"))?;
    entry_from_path(&root_path, &destination)
}

fn deliver_external_document(app: &tauri::AppHandle, path: &Path) {
    let Ok(document) = opened_document_from_path(path) else {
        return;
    };
    let state = app.state::<ExternalDocumentState>();
    if state.frontend_ready.load(Ordering::SeqCst) {
        let _ = app.emit("external-document-opened", document);
    } else if let Ok(mut pending) = state.pending.lock() {
        pending.push(document.clone());
    }
}

pub fn run() {
    let mut builder = tauri::Builder::default().manage(ExternalDocumentState::default());
    #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(path) = args
                .iter()
                .skip(1)
                .map(Path::new)
                .find(|path| require_markdown(path).is_ok())
            {
                deliver_external_document(app, path);
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_focus();
                }
            }
        }));
    }

    builder
        .menu(build_app_menu)
        .on_menu_event(|app, event| {
            if let Some(command) = format_command_from_menu_id(event.id().as_ref()) {
                let _ = app.emit("format-command", command);
            }
        })
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            #[cfg(target_os = "windows")]
            if let Some(path) = std::env::args()
                .skip(1)
                .map(PathBuf::from)
                .find(|path| require_markdown(path).is_ok())
            {
                deliver_external_document(&_app.handle(), &path);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            select_workspace,
            select_markdown_file,
            save_new_markdown_file,
            open_external_markdown_file,
            pending_external_documents,
            list_workspace_entries,
            read_markdown_file,
            read_workspace_asset,
            write_markdown_file,
            create_markdown_file,
            rename_markdown_entry,
            search_workspace,
            save_export_text_file,
            save_export_binary_file,
            set_menu_locale
        ])
        .build(tauri::generate_context!())
        .expect("error while building LumenMark")
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = event {
                for url in urls {
                    if let Ok(path) = url.to_file_path() {
                        deliver_external_document(app, &path);
                    }
                }
            }
            #[cfg(not(target_os = "macos"))]
            let _ = (app, event);
        });
}

#[cfg(test)]
mod tests {
    use super::{
        opened_document_from_path, read_asset_data_url, safe_workspace_path,
        write_new_document_at_path,
    };
    use std::fs;
    use std::path::Path;
    use tempfile::tempdir;

    #[test]
    fn resolves_markdown_files_only_inside_workspace() {
        let root = tempdir().expect("temp root");
        fs::write(root.path().join("notes.md"), "# Notes").expect("fixture");

        assert!(safe_workspace_path(root.path(), "notes.md", true).is_ok());
        assert!(safe_workspace_path(root.path(), "../escape.md", true).is_err());
        assert!(safe_workspace_path(root.path(), "/tmp/escape.md", true).is_err());
    }

    #[test]
    fn opens_a_single_markdown_document_with_its_parent_as_safety_root() {
        let root = tempdir().expect("temp document");
        let document_path = root.path().join("notes.md");
        fs::write(&document_path, "# Notes").expect("fixture");

        let opened = opened_document_from_path(&document_path).expect("opened document");
        assert_eq!(opened.relative_path, "notes.md");
        assert_eq!(opened.name, "notes.md");
        assert_eq!(opened.content, "# Notes");
        assert_eq!(
            Path::new(&opened.root),
            root.path().canonicalize().expect("canonical root")
        );

        let not_markdown = root.path().join("notes.txt");
        fs::write(&not_markdown, "text").expect("non markdown fixture");
        assert!(opened_document_from_path(&not_markdown).is_err());
    }

    #[test]
    fn reads_images_only_when_resolved_inside_workspace() {
        let root = tempdir().expect("temp root");
        fs::create_dir(root.path().join("docs")).expect("docs");
        fs::create_dir(root.path().join("assets")).expect("assets");
        fs::write(root.path().join("docs/guide.md"), "# Guide").expect("document");
        fs::write(root.path().join("assets/plot.png"), [137, 80, 78, 71]).expect("image");

        assert!(read_asset_data_url(root.path(), "docs/guide.md", "../assets/plot.png").is_ok());
        assert!(read_asset_data_url(root.path(), "docs/guide.md", "../../escape.png").is_err());
    }

    #[test]
    fn saves_new_documents_only_as_markdown_files() {
        let root = tempdir().expect("temp document");
        let document_path = root.path().join("draft.md");

        let saved = write_new_document_at_path(&document_path, "# Draft").expect("saved");
        assert_eq!(saved.relative_path, "draft.md");
        assert_eq!(saved.content, "# Draft");
        assert_eq!(
            fs::read_to_string(document_path).expect("content"),
            "# Draft"
        );

        assert!(write_new_document_at_path(&root.path().join("draft.txt"), "text").is_err());
    }

    #[test]
    fn external_open_accepts_only_existing_markdown_documents() {
        let root = tempdir().expect("temp external");
        let document = root.path().join("drop.md");
        fs::write(&document, "# Drop").expect("fixture");

        let opened = super::open_external_markdown_file(document.to_string_lossy().to_string())
            .expect("opened");
        assert_eq!(opened.name, "drop.md");
        assert!(super::open_external_markdown_file(
            root.path().join("missing.md").to_string_lossy().to_string()
        )
        .is_err());
    }

    #[test]
    fn release_windows_entrypoint_suppresses_console_window() {
        assert!(include_str!("main.rs").contains("windows_subsystem = \"windows\""));
    }

    #[test]
    fn guarded_close_has_permissions_for_request_and_final_destroy() {
        let capabilities = include_str!("../capabilities/default.json");
        assert!(capabilities.contains("core:window:allow-close"));
        assert!(capabilities.contains("core:window:allow-destroy"));
    }

    #[test]
    fn macos_bundle_uses_ad_hoc_signing_for_apple_silicon_distribution() {
        assert!(include_str!("../tauri.conf.json").contains("\"signingIdentity\": \"-\""));
    }

    #[test]
    fn desktop_bundle_declares_cross_platform_icons_and_macos_dmg() {
        let config = include_str!("../tauri.conf.json");
        assert!(config.contains("\"icon\""));
        assert!(config.contains("\"icons/icon.icns\""));
        assert!(config.contains("\"icons/icon.ico\""));
        assert!(config.contains("\"icons/icon.png\""));
        assert!(include_str!("../../.github/workflows/release.yml").contains("--bundles dmg"));
        assert!(include_str!("../../.github/workflows/release.yml")
            .contains("--target aarch64-apple-darwin"));
    }

    #[test]
    fn desktop_bundle_registers_markdown_file_associations_and_single_instance() {
        assert!(include_str!("../tauri.conf.json").contains("\"fileAssociations\""));
        assert!(include_str!("../Cargo.toml").contains("tauri-plugin-single-instance"));
    }

    #[test]
    fn windows_bundle_embeds_webview2_offline_installer() {
        let config = include_str!("../tauri.conf.json");
        assert!(config.contains("\"type\": \"offlineInstaller\""));
        assert!(!config.contains("\"type\": \"downloadBootstrapper\""));
    }

    #[test]
    fn searches_markdown_files_inside_workspace_only() {
        let root = tempdir().expect("temp search");
        fs::create_dir(root.path().join("docs")).expect("docs");
        fs::create_dir(root.path().join(".git")).expect("hidden");
        fs::write(root.path().join("docs/guide.md"), "first\nneedle here\nlast").expect("fixture");
        fs::write(root.path().join("notes.txt"), "needle").expect("ignored");
        fs::write(root.path().join(".git/hidden.md"), "needle").expect("hidden fixture");

        let results = super::search_workspace(
            root.path().to_string_lossy().to_string(),
            "needle".to_string(),
        )
        .expect("search results");

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].kind, "content");
        assert_eq!(results[0].relative_path, "docs/guide.md");
        assert_eq!(results[0].line, Some(2));
        assert_eq!(results[0].excerpt, "needle here");
    }

    #[test]
    fn searches_markdown_file_names_and_content_with_result_kinds() {
        let root = tempdir().expect("temp search");
        fs::create_dir(root.path().join("docs")).expect("docs");
        fs::write(root.path().join("docs/needle-guide.md"), "first\nneedle here").expect("fixture");
        fs::write(root.path().join("docs/other.md"), "needle elsewhere").expect("fixture");

        let results = super::search_workspace(
            root.path().to_string_lossy().to_string(),
            "needle".to_string(),
        )
        .expect("search results");

        assert!(results.iter().any(|result| {
            result.kind == "file"
                && result.relative_path == "docs/needle-guide.md"
                && result.line.is_none()
                && result.excerpt == "docs/needle-guide.md"
        }));
        assert!(results.iter().any(|result| {
            result.kind == "content"
                && result.relative_path == "docs/needle-guide.md"
                && result.line == Some(2)
                && result.excerpt == "needle here"
        }));
        assert!(results.iter().any(|result| {
            result.kind == "content"
                && result.relative_path == "docs/other.md"
                && result.line == Some(1)
                && result.excerpt == "needle elsewhere"
        }));
    }

    #[test]
    fn lists_only_folders_that_contain_markdown_files() {
        let root = tempdir().expect("temp tree");
        fs::create_dir(root.path().join("docs")).expect("docs");
        fs::create_dir(root.path().join("assets")).expect("assets");
        fs::create_dir(root.path().join("nested")).expect("nested");
        fs::create_dir(root.path().join("nested/child")).expect("child");
        fs::write(root.path().join("docs/guide.md"), "# Guide").expect("guide");
        fs::write(root.path().join("assets/logo.png"), "png").expect("asset");
        fs::write(root.path().join("nested/child/deep.md"), "# Deep").expect("deep");

        let entries = super::list_workspace_entries(root.path().to_string_lossy().to_string(), None)
            .expect("entries");
        let names = entries.iter().map(|entry| entry.name.as_str()).collect::<Vec<_>>();

        assert!(names.contains(&"docs"));
        assert!(names.contains(&"nested"));
        assert!(!names.contains(&"assets"));
    }

    #[test]
    fn desktop_menu_declares_typora_style_format_commands() {
        assert_eq!(super::format_command_from_menu_id("format-paragraph"), Some("paragraph"));
        assert_eq!(super::format_command_from_menu_id("format-heading-1"), Some("heading-1"));
        assert_eq!(super::format_command_from_menu_id("format-heading-6"), Some("heading-6"));
        assert_eq!(super::format_command_from_menu_id("format-superscript"), Some("superscript"));
        assert_eq!(super::format_command_from_menu_id("format-subscript"), Some("subscript"));
        assert_eq!(super::format_command_from_menu_id("format-link"), Some("link"));
        assert_eq!(super::format_command_from_menu_id("not-format-link"), None);
        let source = include_str!("lib.rs");
        assert!(source.contains(".menu("));
        assert!(source.contains(".on_menu_event("));
        assert!(source.contains("format-command"));
        assert!(super::FORMAT_MENU_ITEMS.iter().all(|(_, _, label, _)| {
            !label.get(super::MenuLocale::Zh).contains("Paragraph")
                && !label.get(super::MenuLocale::En).contains('段')
        }));
        assert_eq!(super::localized_menu_label(super::MenuLocale::Zh, "file"), "文件");
        assert_eq!(super::localized_menu_label(super::MenuLocale::En, "file"), "File");
    }
}
