use tauri::{command, AppHandle};

#[command]
pub async fn run_auto_debate(app: AppHandle, chain: Vec<String>, prompt: String) -> Result<String, String> {
    // TODO: Implement orchestration logic for async WebView queue
    // For now, just echo the input for scaffolding
    Ok(format!("Debate chain: {:?}, prompt: {}", chain, prompt))
}
