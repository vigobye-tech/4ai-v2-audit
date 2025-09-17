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
