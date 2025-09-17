
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cmd;

fn main() {
        tauri::Builder::default()
                .plugin(tauri_plugin_dialog::init())
                .invoke_handler(tauri::generate_handler![
                            cmd::chains::run_chain,
                            cmd::clipboard::safe_copy,
                            cmd::clipboard::safe_paste,
                            cmd::meta::log_action,
                            cmd::webview::create_webview,
                            cmd::webview::inject_script,
                            cmd::webview::wait_for_selector,
                            cmd::webview::wait_for_full_response,
                            cmd::webview::get_text_content,
                            cmd::webview::close_webview,
                            cmd::debate::run_auto_debate,
                            cmd::dialog::open_local_file,
                            cmd::history::get_dir_tree,
                            cmd::drop::process_dropped,
                ])
                .run(tauri::generate_context!())
                .expect("error while running tauri application");
}
