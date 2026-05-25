use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};

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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationResult {
    pub success: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportFile {
    pub filename: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub written: Vec<String>,
    pub conflicts: Vec<String>,
    pub rejected: Vec<String>,
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

#[tauri::command]
fn delete_markdown_entry(root: String, relative_path: String) -> CommandResult<OperationResult> {
    let path = safe_workspace_path(Path::new(&root), &relative_path, true)?;
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|error| format!("Unable to delete folder: {error}"))?;
    } else {
        require_markdown(&path)?;
        fs::remove_file(path).map_err(|error| format!("Unable to delete document: {error}"))?;
    }
    Ok(OperationResult { success: true })
}

#[tauri::command]
fn choose_export_directory() -> Option<String> {
    rfd::FileDialog::new()
        .pick_folder()
        .map(|folder| folder.to_string_lossy().to_string())
}

pub fn export_code_blocks_to(root: &Path, files: Vec<ExportFile>, overwrite: bool) -> ExportResult {
    let root = match root.canonicalize() {
        Ok(root) => root,
        Err(_) => {
            return ExportResult {
                written: vec![],
                conflicts: vec![],
                rejected: files.into_iter().map(|file| file.filename).collect(),
            }
        }
    };
    let mut result = ExportResult {
        written: vec![],
        conflicts: vec![],
        rejected: vec![],
    };

    for file in files {
        let filename = Path::new(&file.filename);
        if filename.components().count() != 1 || !has_only_normal_components(filename) {
            result.rejected.push(file.filename);
            continue;
        }
        let destination = root.join(filename);
        if destination.exists() && !overwrite {
            result.conflicts.push(file.filename);
            continue;
        }
        match fs::write(destination, file.content) {
            Ok(_) => result.written.push(file.filename),
            Err(_) => result.rejected.push(file.filename),
        }
    }
    result
}

#[tauri::command]
fn export_code_blocks(
    export_root: String,
    files: Vec<ExportFile>,
    overwrite: bool,
) -> ExportResult {
    export_code_blocks_to(Path::new(&export_root), files, overwrite)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            select_workspace,
            list_workspace_entries,
            read_markdown_file,
            read_workspace_asset,
            write_markdown_file,
            create_markdown_file,
            rename_markdown_entry,
            delete_markdown_entry,
            choose_export_directory,
            export_code_blocks
        ])
        .run(tauri::generate_context!())
        .expect("error while running LumenMark");
}

#[cfg(test)]
mod tests {
    use super::{export_code_blocks_to, read_asset_data_url, safe_workspace_path, ExportFile};
    use std::fs;
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
    fn exports_safe_relative_file_names_without_overwriting() {
        let root = tempdir().expect("temp export");
        fs::write(root.path().join("main.py"), "existing").expect("fixture");
        let files = vec![
            ExportFile {
                filename: "main.py".to_string(),
                content: "print('hello')".to_string(),
            },
            ExportFile {
                filename: "../unsafe.sh".to_string(),
                content: "rm -rf /".to_string(),
            },
        ];

        let result = export_code_blocks_to(root.path(), files, false);
        assert_eq!(result.written.len(), 0);
        assert_eq!(result.conflicts, vec!["main.py"]);
        assert_eq!(result.rejected, vec!["../unsafe.sh"]);
        assert_eq!(
            fs::read_to_string(root.path().join("main.py")).unwrap(),
            "existing"
        );
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
}
