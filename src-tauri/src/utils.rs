use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use chrono::{DateTime, Utc};

// Centralized logging system for 4AI Lab
pub fn debug_log(message: &str) {
    let timestamp = Utc::now().format("%Y-%m-%d %H:%M:%S%.3f UTC");
    let log_entry = format!("[{}] {}\n", timestamp, message);
    
    // Log to console (for development)
    println!("{}", log_entry.trim());
    
    // Log to file (for production debugging)
    if let Err(e) = write_to_log_file(&log_entry) {
        eprintln!("Failed to write to log file: {}", e);
    }
}

pub fn log_with_context(context: &str, message: &str) {
    debug_log(&format!("[{}] {}", context, message));
}

pub fn log_error(context: &str, error: &str) {
    debug_log(&format!("❌ [{}] ERROR: {}", context, error));
}

pub fn log_success(context: &str, message: &str) {
    debug_log(&format!("✅ [{}] SUCCESS: {}", context, message));
}

pub fn log_warning(context: &str, message: &str) {
    debug_log(&format!("⚠️ [{}] WARNING: {}", context, message));
}

fn write_to_log_file(log_entry: &str) -> Result<(), Box<dyn std::error::Error>> {
    // Get application data directory
    let log_dir = get_log_directory()?;
    
    // Ensure log directory exists
    std::fs::create_dir_all(&log_dir)?;
    
    // Create log file path
    let log_file_path = log_dir.join("4ai-lab.log");
    
    // Open/create log file in append mode
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_file_path)?;
    
    // Write log entry
    file.write_all(log_entry.as_bytes())?;
    file.flush()?;
    
    Ok(())
}

fn get_log_directory() -> Result<PathBuf, Box<dyn std::error::Error>> {
    // Try to get application data directory
    if let Some(data_dir) = dirs::data_dir() {
        return Ok(data_dir.join("4AI-Lab"));
    }
    
    // Fallback to current directory
    let current_dir = std::env::current_dir()?;
    Ok(current_dir.join("logs"))
}

// Get log file path for external access
pub fn get_log_file_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let log_dir = get_log_directory()?;
    Ok(log_dir.join("4ai-lab.log"))
}

// Read recent log entries
pub fn get_recent_logs(lines: usize) -> Result<String, Box<dyn std::error::Error>> {
    use std::io::{BufRead, BufReader};
    use std::fs::File;
    
    let log_file_path = get_log_file_path()?;
    
    if !log_file_path.exists() {
        return Ok("No log file found".to_string());
    }
    
    let file = File::open(log_file_path)?;
    let reader = BufReader::new(file);
    
    let log_lines: Vec<String> = reader.lines()
        .collect::<Result<Vec<_>, _>>()?
        .into_iter()
        .rev() // Reverse to get most recent first
        .take(lines)
        .collect::<Vec<_>>()
        .into_iter()
        .rev() // Reverse back to chronological order
        .collect();
    
    Ok(log_lines.join("\n"))
}

// Clear log file
pub fn clear_logs() -> Result<(), Box<dyn std::error::Error>> {
    let log_file_path = get_log_file_path()?;
    
    if log_file_path.exists() {
        std::fs::remove_file(log_file_path)?;
    }
    
    debug_log("Log file cleared");
    Ok(())
}