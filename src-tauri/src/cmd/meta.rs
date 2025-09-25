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
    
    // Write to log file using app data directory
    let app_data_dir = tauri::api::path::app_data_dir(&tauri::Config::default())
        .ok_or("Failed to get app data directory")?;
    
    // Create logs directory if it doesn't exist
    let logs_dir = app_data_dir.join("4ai-lab").join("logs");
    std::fs::create_dir_all(&logs_dir)
        .map_err(|e| format!("Failed to create logs directory: {}", e))?;
    
    let log_path = logs_dir.join("4ai-lab.log");
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| format!("Failed to open log file at {:?}: {}", log_path, e))?;
    
    file.write_all(log_line.as_bytes())
        .map_err(|e| format!("Failed to write to log: {}", e))?;
    
    println!("LOG: {}", log_line.trim());
    
    Ok("Logged successfully".to_string())
}
