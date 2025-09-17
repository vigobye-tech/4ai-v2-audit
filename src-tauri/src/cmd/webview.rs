#[cfg(test)]
mod tests {
    use super::*;
    use tauri::AppHandle;

    #[tokio::test]
    async fn test_wait_for_full_response_window_not_found() {
        let app = tauri::test::mock_app();
        let result = wait_for_full_response(
            app.handle(),
            "nonexistent".to_string(),
            "#selector".to_string(),
            vec!["stop".to_string()],
            1000,
        ).await;
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Window not found");
    }

    #[tokio::test]
    async fn test_get_text_content_window_not_found() {
        let app = tauri::test::mock_app();
        let result = get_text_content(
            app.handle(),
            "nonexistent".to_string(),
            "#selector".to_string(),
        ).await;
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Window not found");
    }
}
use tauri::{command, Manager, WebviewWindowBuilder, WebviewUrl};
use serde_json;
use tauri::Listener;
use tokio::time::sleep;
use std::time::Duration;

#[command]
pub async fn create_webview(
    app: tauri::AppHandle,
    label: String, 
    url: String
) -> Result<String, String> {
    let webview_url = WebviewUrl::External(url.parse().map_err(|e| format!("Invalid URL: {}", e))?);
    
    WebviewWindowBuilder::new(&app, &label, webview_url)
        .title(&format!("AI-{}", label))
        .inner_size(900.0, 700.0)
        .visible(true)
        .build()
        .map_err(|e| format!("Failed to create webview: {}", e))?;

    Ok(label)
}

#[command]
pub async fn inject_script(
    app: tauri::AppHandle,
    label: String, 
    script: String
) -> Result<bool, String> {
    let window = app
        .get_webview_window(&label)
        .ok_or_else(|| "Window not found".to_string())?;
    
    window.eval(&script).map_err(|e| format!("Script injection failed: {}", e))?;
    Ok(true)
}

#[command]
pub async fn wait_for_selector(
    app: tauri::AppHandle,
    label: String, 
    selector: String, 
    timeout_ms: u64
) -> Result<String, String> {
    let window = app
        .get_webview_window(&label)
        .ok_or_else(|| "Window not found".to_string())?;

    let script = format!(
        r#"
        new Promise((resolve, reject) => {{
            const timeout = setTimeout(() => reject('Timeout after {}ms'), {});
            const check = () => {{
                const el = document.querySelector({});
                if (el && el.textContent && el.textContent.trim()) {{
                    clearTimeout(timeout);
                    resolve(el.textContent.trim());
                }} else {{
                    setTimeout(check, 500);
                }}
            }};
            check();
        }});
        "#,
        timeout_ms,
        timeout_ms,
        serde_json::to_string(&selector).unwrap()
    );

    window
        .eval(&script)
        .map_err(|e| format!("Selector wait failed: {}", e))?;
    
    Ok(format!("Selector wait completed"))
}

#[command]
pub async fn close_webview(
    app: tauri::AppHandle,
    label: String
) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| format!("Failed to close webview: {}", e))?;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[command]
pub async fn wait_for_full_response(
    app: tauri::AppHandle,
    label: String,
    selector: String,
    stop_words: Vec<String>,
    timeout_ms: u64,
) -> Result<String, String> {
    println!("[DEBUG] wait_for_full_response args: label={:?}, selector={:?}, stop_words={:?}, timeout_ms={:?}", label, selector, stop_words, timeout_ms);
    use std::sync::Arc;
    use tokio::sync::Mutex;

    let window = app
        .get_webview_window(&label)
        .ok_or_else(|| "Window not found".to_string())?;

    // Unique event name for this wait
    let event_name = format!("wait_for_full_response_{}", label);
    let result = Arc::new(Mutex::new(None::<String>));
    let result_clone = result.clone();

    // Listen for the event from JS
    let handler = app.listen(event_name.as_str(), move |event| {
        let payload = event.payload();
        if !payload.is_empty() {
            let result_clone = result_clone.clone();
            let payload = payload.to_string();
            tauri::async_runtime::spawn(async move {
                let mut lock = result_clone.lock().await;
                *lock = Some(payload);
            });
        }
    });

    let script = format!(
        r#"
        (function() {{
            const emitResult = (status, value) => {{
                window.__TAURI__.event.emit('{event}', {{ status, value }});
            }};
            const timeout = setTimeout(() => emitResult('timeout', 'Timeout after {timeout_ms}ms'), {timeout_ms});
            let lastText = '';
            let stableCount = 0;
            const check = () => {{
                const el = document.querySelector({selector});
                if (!el) return setTimeout(check, 500);
                const currentText = el.textContent.trim();
                const isStable = currentText === lastText;
                const hasStopWord = {stop_words}.some(w => currentText.includes(w));
                const isLongEnough = currentText.split(/\\s+/).length > 10;
                if (isStable && !hasStopWord && isLongEnough) {{
                    stableCount++;
                    if (stableCount > 3) {{
                        clearTimeout(timeout);
                        emitResult('ok', currentText);
                        return;
                    }}
                }} else {{
                    stableCount = 0;
                }}
                lastText = currentText;
                setTimeout(check, 500);
            }};
            check();
        }})();
        "#,
        event = event_name,
        timeout_ms = timeout_ms,
        selector = serde_json::to_string(&selector).unwrap(),
        stop_words = serde_json::to_string(&stop_words).unwrap()
    );

    window.eval(&script).map_err(|e| format!("Eval failed: {}", e))?;

    // Wait for the event or timeout
    let mut waited = 0;
    let poll_interval = 100;
    let max_wait = timeout_ms + 1000;
    loop {
        {
            let lock = result.lock().await;
            if let Some(payload) = &*lock {
                app.unlisten(handler);
                return Ok(payload.clone());
            }
        }
        if waited > max_wait {
            app.unlisten(handler);
            return Err("Timeout waiting for JS event".to_string());
        }
        sleep(Duration::from_millis(poll_interval)).await;
        waited += poll_interval;
    }
}

#[command]
pub async fn get_text_content(
    app: tauri::AppHandle,
    label: String,
    selector: String,
) -> Result<String, String> {
    let window = app
        .get_webview_window(&label)
        .ok_or_else(|| "Window not found".to_string())?;

    let script = format!(
        r#"document.querySelector({})?.textContent?.trim() || '';"#,
        serde_json::to_string(&selector).unwrap()
    );

    // Nie pobieramy wyniku, tylko potwierdzamy wykonanie
    window.eval(&script).map_err(|e| format!("Eval failed: {}", e))?;
    Ok("OK".to_string())
}
