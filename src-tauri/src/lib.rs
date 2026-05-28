use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};
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

#[derive(Default)]
struct ExternalDocumentState {
    pending: Mutex<Vec<OpenedDocument>>,
    frontend_ready: AtomicBool,
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
        .filter(|path| path.is_dir() || require_markdown(path).is_ok())
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
            rename_markdown_entry
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
}
