use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs::OpenOptions;
use std::io::Write;
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub action: String,
    pub details: String,
}

#[command]
pub async fn log_action(action: String, details: String) -> Result<String, String> {
    let entry = LogEntry {
        timestamp: Utc::now().to_rfc3339(),
        action,
        details,
    };
    
    let log_line = format!("{}\n", serde_json::to_string(&entry).map_err(|e| e.to_string())?);
    
    // Write to log file (create if doesn't exist) - now inside src-tauri/logs/
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open("src-tauri/logs/4ai-lab.log")
        .map_err(|e| format!("Failed to open log file: {}", e))?;
    
    file.write_all(log_line.as_bytes())
        .map_err(|e| format!("Failed to write to log: {}", e))?;
    
    println!("LOG: {}", log_line.trim());
    
    Ok("Logged successfully".to_string())
}
