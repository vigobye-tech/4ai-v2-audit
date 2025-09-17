use tauri::command;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, serde::Serialize)]
pub struct DirTreeNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<DirTreeNode>>,
}

fn build_tree(path: &Path) -> Option<DirTreeNode> {
    let name = path.file_name()?.to_string_lossy().to_string();
    let path_str = path.to_string_lossy().to_string();
    let is_dir = path.is_dir();
    let children = if is_dir {
        let mut nodes = Vec::new();
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let child_path = entry.path();
                if let Some(child_node) = build_tree(&child_path) {
                    nodes.push(child_node);
                }
            }
        }
        Some(nodes)
    } else {
        None
    };
    Some(DirTreeNode {
        name,
        path: path_str,
        is_dir,
        children,
    })
}

#[command]
pub async fn get_dir_tree(root_path: String) -> Option<DirTreeNode> {
    let path = PathBuf::from(root_path);
    build_tree(&path)
}
