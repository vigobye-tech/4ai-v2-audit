use tauri::command;
use std::path::Path;

#[command]
pub async fn open_local_file(path: String) -> Result<String, String> {
    // Bezpieczeństwo: tylko pliki w projekcie
    let path = Path::new(&path);
    if !path.starts_with("src") && !path.starts_with("src-tauri") {
        return Err("Access denied -- only project files".to_string());
    }

    std::fs::read_to_string(path)
        .map_err(|e| format!("Cannot read file: {}", e))
}
