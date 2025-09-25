#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod cmd;
mod utils;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            cmd::chains::run_chain,
            cmd::clipboard::safe_copy,
            cmd::clipboard::safe_paste,
            cmd::meta::log_action,
            cmd::webview::create_webview,
            cmd::webview::inject_script,
            cmd::webview::wait_for_full_response,
            cmd::webview::wait_for_response_event,
            cmd::webview::extract_content_from_window,
            cmd::webview::extract_monitored_content,
            cmd::webview::get_full_content_chunks,
            cmd::webview::get_content_metadata,
            cmd::webview::get_text_content,
            cmd::webview::test_title_communication,
            cmd::webview::test_immediate_signal,
            cmd::webview::get_webview_title,
            cmd::webview::close_webview,
            cmd::debate::run_auto_debate,
            cmd::dialog::open_local_file,
            cmd::history::get_dir_tree,
            cmd::drop::process_dropped,
            cmd::logging::get_logs,
            cmd::logging::clear_log_file,
            cmd::logging::get_log_file_location,
            cmd::logging::write_debug_log,
            cmd::config::load_webai_selectors,
            cmd::config::save_webai_selectors,
            cmd::config::get_config_paths,
            cmd::config::load_model_profiles,
        ])
        .setup(|app| {
            println!("Tauri app setup starting...");
            
            // Try to get the main window
            match app.get_window("main") {
                Some(window) => {
                    println!("Main window found, attempting to show...");
                    
                    // Force window position and size
                    if let Err(e) = window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: 1200, height: 800 })) {
                        println!("Failed to set window size: {}", e);
                    }
                    
                    // Force position to center of primary monitor
                    if let Err(e) = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: 100, y: 100 })) {
                        println!("Failed to set window position: {}", e);
                    }
                    
                    // Force always on top temporarily
                    if let Err(e) = window.set_always_on_top(true) {
                        println!("Failed to set always on top: {}", e);
                    }
                    
                    if let Err(e) = window.show() {
                        println!("Failed to show window: {}", e);
                    }
                    if let Err(e) = window.unminimize() {
                        println!("Failed to unminimize window: {}", e);
                    }
                    if let Err(e) = window.set_focus() {
                        println!("Failed to focus window: {}", e);
                    }
                    
                    // Disable always on top after 2 seconds
                    let window_clone = window.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_secs(2));
                        let _ = window_clone.set_always_on_top(false);
                        println!("Always on top disabled");
                    });
                    
                    // Try to get window info
                    match window.is_visible() {
                        Ok(visible) => println!("Window visible state: {}", visible),
                        Err(e) => println!("Failed to get visibility: {}", e)
                    }
                    
                    println!("Window show/focus commands sent");
                }
                None => {
                    println!("Main window not found, creating new window...");
                    match tauri::WindowBuilder::new(
                        app,
                        "main",
                        tauri::WindowUrl::App("index.html".into())
                    )
                    .title("4-AI Lab v2.0")
                    .inner_size(1200.0, 800.0)
                    .center()
                    .visible(true)
                    .build() {
                        Ok(window) => {
                            println!("New window created successfully");
                            if let Err(e) = window.show() {
                                println!("Failed to show new window: {}", e);
                            }
                        }
                        Err(e) => println!("Failed to create window: {}", e)
                    }
                }
            }
            
            println!("Tauri app setup completed successfully!");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
