use tauri::command;
use serde_json::Value;
use std::path::PathBuf;
use crate::utils::{log_with_context, log_error, log_success};

#[command]
pub async fn load_webai_selectors() -> Result<String, String> {
    log_with_context("CONFIG", "Loading WebAI selectors configuration");
    
    // Try multiple paths to find the config file
    let config_paths = vec![
        PathBuf::from("./config/webai-selectors.json"),
        PathBuf::from("../config/webai-selectors.json"),
        PathBuf::from("config/webai-selectors.json"),
    ];
    
    for path in config_paths {
        log_with_context("CONFIG", &format!("Trying config path: {:?}", path));
        
        match std::fs::read_to_string(&path) {
            Ok(content) => {
                log_success("CONFIG", &format!("Successfully loaded config from: {:?}", path));
                
                // Validate JSON
                match serde_json::from_str::<Value>(&content) {
                    Ok(_) => {
                        log_success("CONFIG", "Config JSON is valid");
                        return Ok(content);
                    }
                    Err(e) => {
                        log_error("CONFIG", &format!("Invalid JSON in config file: {}", e));
                        return Err(format!("Invalid JSON in config file: {}", e));
                    }
                }
            }
            Err(e) => {
                log_with_context("CONFIG", &format!("Failed to read {:?}: {}", path, e));
                continue;
            }
        }
    }
    
    log_error("CONFIG", "No valid config file found");
    
    // Return default configuration if no file found
    let default_config = r#"{
        "version": "1.0.0",
        "lastUpdated": "2025-09-25",
        "services": {
            "chatgpt": {
                "name": "ChatGPT",
                "url": "https://chatgpt.com",
                "responseSelectors": [
                    "[data-message-author-role='assistant'] .markdown",
                    ".prose",
                    "[data-testid='conversation-turn']"
                ]
            },
            "claude": {
                "name": "Claude", 
                "url": "https://claude.ai",
                "responseSelectors": [
                    ".font-claude-message",
                    ".ProseMirror[contenteditable='false']",
                    "[aria-label*='Claude'] .markdown"
                ]
            },
            "gemini": {
                "name": "Gemini",
                "url": "https://gemini.google.com",
                "responseSelectors": [
                    ".model-response-text",
                    "[data-response-chunk]",
                    ".response-container"
                ]
            }
        }
    }"#;
    
    log_with_context("CONFIG", "Using default configuration");
    Ok(default_config.to_string())
}

#[command]
pub async fn save_webai_selectors(config_json: String) -> Result<String, String> {
    log_with_context("CONFIG", "Saving WebAI selectors configuration");
    
    // Validate JSON first
    match serde_json::from_str::<Value>(&config_json) {
        Ok(_) => {
            log_success("CONFIG", "Config JSON validation passed");
        }
        Err(e) => {
            log_error("CONFIG", &format!("Invalid JSON provided: {}", e));
            return Err(format!("Invalid JSON: {}", e));
        }
    }
    
    // Try to save to config directory
    let config_path = PathBuf::from("./config/webai-selectors.json");
    
    // Ensure config directory exists
    if let Some(parent_dir) = config_path.parent() {
        if let Err(e) = std::fs::create_dir_all(parent_dir) {
            log_error("CONFIG", &format!("Failed to create config directory: {}", e));
            return Err(format!("Failed to create config directory: {}", e));
        }
    }
    
    // Write config file
    match std::fs::write(&config_path, &config_json) {
        Ok(_) => {
            log_success("CONFIG", &format!("Config saved to: {:?}", config_path));
            Ok("Configuration saved successfully".to_string())
        }
        Err(e) => {
            log_error("CONFIG", &format!("Failed to save config: {}", e));
            Err(format!("Failed to save config: {}", e))
        }
    }
}

#[command]
pub async fn get_config_paths() -> Result<String, String> {
    log_with_context("CONFIG", "Getting configuration paths");
    
    let paths = vec![
        ("Current directory", "./config/webai-selectors.json"),
        ("Parent directory", "../config/webai-selectors.json"),
        ("Relative", "config/webai-selectors.json"),
    ];
    
    let mut results = Vec::new();
    
    for (description, path_str) in paths {
        let path = PathBuf::from(path_str);
        let exists = path.exists();
        results.push(format!("{}: {} (exists: {})", description, path_str, exists));
        log_with_context("CONFIG", &format!("{}: {} (exists: {})", description, path_str, exists));
    }
    
    Ok(results.join("\n"))
}

#[command]
pub async fn load_model_profiles() -> Result<String, String> {
    log_with_context("CONFIG", "Loading model profiles configuration");
    
    // Try multiple paths to find the model profiles file
    let config_paths = vec![
        PathBuf::from("./config/model-profiles.json"),
        PathBuf::from("../config/model-profiles.json"),
        PathBuf::from("config/model-profiles.json"),
    ];
    
    for path in config_paths {
        log_with_context("CONFIG", &format!("Trying model profiles path: {:?}", path));
        
        match std::fs::read_to_string(&path) {
            Ok(content) => {
                log_success("CONFIG", &format!("Successfully loaded model profiles from: {:?}", path));
                
                // Validate JSON
                match serde_json::from_str::<Value>(&content) {
                    Ok(_) => {
                        log_success("CONFIG", "Model profiles JSON is valid");
                        return Ok(content);
                    }
                    Err(e) => {
                        log_error("CONFIG", &format!("Invalid JSON in model profiles file: {}", e));
                        return Err(format!("Invalid JSON in model profiles file: {}", e));
                    }
                }
            }
            Err(e) => {
                log_with_context("CONFIG", &format!("Failed to read {:?}: {}", path, e));
                continue;
            }
        }
    }
    
    log_error("CONFIG", "No valid model profiles file found");
    
    // Return default model profiles configuration if no file found
    let default_profiles = r#"{
        "version": "1.0.0",
        "lastUpdated": "2025-09-25",
        "models": {
            "chatgpt": {
                "name": "ChatGPT (OpenAI)",
                "url": "https://chatgpt.com",
                "capabilities": {
                    "reasoning": 8,
                    "creativity": 9,
                    "coding": 9,
                    "analysis": 8,
                    "writing": 8,
                    "multilingual": 8
                },
                "contextWindow": 128000,
                "strengths": ["Code generation", "Creative content", "Problem-solving"],
                "weaknesses": ["Real-time information", "Factual accuracy"],
                "optimalFor": ["coding", "creative_tasks"],
                "specializations": {
                    "code_generation": 9,
                    "creative_writing": 9,
                    "conversation": 9
                }
            },
            "claude": {
                "name": "Claude (Anthropic)",
                "url": "https://claude.ai",
                "capabilities": {
                    "reasoning": 9,
                    "creativity": 8,
                    "coding": 8,
                    "analysis": 9,
                    "writing": 9,
                    "multilingual": 7
                },
                "contextWindow": 200000,
                "strengths": ["Analysis", "Writing", "Reasoning"],
                "weaknesses": ["Real-time information"],
                "optimalFor": ["analysis", "writing"],
                "specializations": {
                    "academic_writing": 9,
                    "code_explanation": 8,
                    "analysis": 9
                }
            },
            "gemini": {
                "name": "Gemini (Google)",
                "url": "https://gemini.google.com",
                "capabilities": {
                    "reasoning": 8,
                    "creativity": 7,
                    "coding": 8,
                    "analysis": 8,
                    "writing": 7,
                    "multilingual": 9
                },
                "contextWindow": 1000000,
                "strengths": ["Large context", "Multilingual", "Document processing"],
                "weaknesses": ["Creativity"],
                "optimalFor": ["document_processing", "translation"],
                "specializations": {
                    "translation": 9,
                    "large_context": 10,
                    "multilingual": 9
                }
            }
        },
        "taskTypes": {
            "creative_writing": {
                "name": "Creative Writing",
                "optimalModel": "chatgpt",
                "alternativeModels": ["claude"],
                "chainStrategy": "single_best"
            },
            "coding": {
                "name": "Coding",
                "optimalModel": "chatgpt",
                "alternativeModels": ["claude"],
                "chainStrategy": "generate_then_review"
            },
            "analysis": {
                "name": "Analysis",
                "optimalModel": "claude",
                "alternativeModels": ["gemini"],
                "chainStrategy": "single_best"
            }
        },
        "chainStrategies": {
            "single_best": {
                "description": "Use single best model",
                "steps": 1
            },
            "generate_then_review": {
                "description": "Generate then review",
                "steps": 2,
                "roles": ["generator", "reviewer"]
            }
        }
    }"#;
    
    log_with_context("CONFIG", "Using default model profiles configuration");
    Ok(default_profiles.to_string())
}