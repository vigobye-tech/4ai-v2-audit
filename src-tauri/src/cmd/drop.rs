use tauri::command;

#[command]
pub async fn process_dropped(paths: Vec<String>) -> Result<Vec<String>, String> {
    // zwróćmy tylko nazwy – reszta w Twoich rękach
    Ok(paths)
}
