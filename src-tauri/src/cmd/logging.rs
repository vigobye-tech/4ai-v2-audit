use tauri::command;
use crate::utils::{debug_log, get_recent_logs, clear_logs, get_log_file_path};

#[command]
pub async fn get_logs(lines: usize) -> Result<String, String> {
    match get_recent_logs(lines) {
        Ok(logs) => Ok(logs),
        Err(e) => Err(format!("Failed to get logs: {}", e))
    }
}

#[command]
pub async fn clear_log_file() -> Result<String, String> {
    match clear_logs() {
        Ok(_) => Ok("Log file cleared successfully".to_string()),
        Err(e) => Err(format!("Failed to clear logs: {}", e))
    }
}

#[command]
pub async fn get_log_file_location() -> Result<String, String> {
    match get_log_file_path() {
        Ok(path) => Ok(path.to_string_lossy().to_string()),
        Err(e) => Err(format!("Failed to get log file path: {}", e))
    }
}

#[command]
pub async fn write_debug_log(message: String) -> Result<String, String> {
    debug_log(&message);
    Ok("Log entry written".to_string())
}