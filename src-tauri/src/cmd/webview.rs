use tauri::{command, Manager, WindowBuilder, WindowUrl};
use serde_json;
use tokio::time::sleep;
use std::time::Duration;

#[command]
pub async fn create_webview(
    app: tauri::AppHandle,
    label: String, 
    url: String
) -> Result<String, String> {
    let window_url = WindowUrl::External(url.parse().map_err(|e| format!("Invalid URL: {}", e))?);
    
    WindowBuilder::new(&app, &label, window_url)
        .title(&format!("AI-{}", label))
        .inner_size(900.0, 700.0)
        .visible(true)
        .build()
        .map_err(|e| format!("Failed to create window: {}", e))?;
    
    Ok(format!("Window '{}' created successfully", label))
}

#[command]  
pub async fn close_webview(app: tauri::AppHandle, label: String) -> Result<String, String> {
    let window = app
        .get_window(&label)
        .ok_or_else(|| "Window not found".to_string())?;
    
    window.close().map_err(|e| format!("Failed to close window: {}", e))?;
    Ok(format!("Window '{}' closed successfully", label))
}

#[command]
pub async fn inject_script(
    app: tauri::AppHandle,
    label: String,
    script: String,
) -> Result<String, String> {
    println!("[DEBUG] inject_script called: label={}, script_length={}", label, script.len());
    println!("[DEBUG] Script content: {}", script.chars().take(200).collect::<String>());
    
    let window = app
        .get_window(&label)
        .ok_or_else(|| "Window not found".to_string())?;

    let result = window.eval(&script).map_err(|e| format!("Script execution failed: {}", e))?;
    println!("[DEBUG] Script executed successfully, result: {:?}", result);
    
    // Check title immediately after script injection
    if let Ok(title_after) = window.title() {
        println!("[DEBUG] 📋 Title after script injection: {:?}", title_after);
    }
    
    Ok("Script injected successfully".to_string())
}

#[command]
pub async fn extract_monitored_content(
    app: tauri::AppHandle,
    label: String,
) -> Result<String, String> {
    println!("[DEBUG] ========== COMPREHENSIVE CONTENT EXTRACTION ==========");
    println!("[DEBUG] WebView Label: {:?}", label);
    
    let window = app
        .get_window(&label)
        .ok_or_else(|| "Window not found".to_string())?;

    // COMPREHENSIVE content extraction with multiple fallback strategies  
    let extract_script = r#"
        (function() {
            let extractedContent = '';
            let extractionMethod = 'none';
            let contentMetadata = {};
            
            console.log('[4AI EXTRACT] ========== STARTING COMPREHENSIVE EXTRACTION ==========');
            
            // Strategy 1: Monitor-based extraction (highest priority)
            if (window.__4AI_FINAL_RESPONSE && window.__4AI_FINAL_RESPONSE.completed) {
                const response = window.__4AI_FINAL_RESPONSE;
                console.log('[4AI EXTRACT] ✅ PRIORITY 1: Monitor-based extraction');
                console.log('[4AI EXTRACT] Response details:', {
                    length: response.text.length,
                    serviceId: response.serviceId,
                    reason: response.reason,
                    stable: response.stable
                });
                
                extractedContent = response.text;
                extractionMethod = 'monitor_' + (response.serviceId || 'unknown');
                contentMetadata = {
                    serviceId: response.serviceId,
                    reason: response.reason,
                    stable: response.stable,
                    detectionTime: response.detectionTime,
                    source: 'monitor'
                };
                
                // Clear to prevent reuse
                window.__4AI_FINAL_RESPONSE = null;
            }
            
            // Strategy 2: Cached extraction content
            else if (window.__4AI_EXTRACTED_CONTENT) {
                const content = window.__4AI_EXTRACTED_CONTENT;
                console.log('[4AI EXTRACT] ✅ PRIORITY 2: Cache-based extraction:', content.length, 'chars');
                extractedContent = content;
                extractionMethod = 'cache';
                contentMetadata.source = 'cache';
                window.__4AI_EXTRACTED_CONTENT = null;
            }
            
            // Strategy 3: Fallback content from timeout scenarios
            else if (window.__4AI_FALLBACK_CONTENT) {
                const content = window.__4AI_FALLBACK_CONTENT;
                console.log('[4AI EXTRACT] ✅ PRIORITY 3: Fallback extraction:', content.length, 'chars');
                extractedContent = content;
                extractionMethod = 'fallback';
                contentMetadata.source = 'fallback';
                window.__4AI_FALLBACK_CONTENT = null;
            }
            
            // Strategy 4: Advanced service-specific DOM extraction
            else {
                console.log('[4AI EXTRACT] ⚠️ PRIORITY 4: Advanced DOM extraction required');
                
                // Claude-specific advanced selectors
                const claudeSelectors = [
                    // Streaming and completed message selectors
                    '[data-is-streaming="false"] .font-claude-message:last-child',
                    '.font-claude-message:last-of-type',
                    '[aria-label*="Claude"] .ProseMirror[contenteditable="false"]:last-child',
                    '.ProseMirror[contenteditable="false"]:not([data-is-streaming="true"]):last-child',
                    // Conversation thread selectors
                    '[data-testid*="message"]:last-child .font-claude-message',
                    '.claude-chat-message:last-child .font-claude-message',
                    // Generic fallbacks for Claude
                    '.font-claude-message'
                ];
                
                // ChatGPT-specific advanced selectors
                const chatgptSelectors = [
                    // Latest assistant message
                    '[data-message-author-role="assistant"]:last-child .markdown.prose',
                    '[data-message-author-role="assistant"]:last-child .whitespace-pre-wrap',
                    '.group\\/conversation-turn:last-child [data-message-author-role="assistant"] .markdown',
                    // Conversation structure
                    '[data-testid*="conversation-turn"]:last-child .markdown',
                    '.prose:last-child',
                    // Generic ChatGPT fallbacks
                    '[data-message-author-role="assistant"] .markdown'
                ];
                
                // Gemini-specific advanced selectors
                const geminiSelectors = [
                    // Response containers
                    '.model-response-text:last-child',
                    '[data-response-chunk]:last-child .rich-text-formatted',
                    '.response-container:last-child .formatted-text',
                    '.bard-response:last-child .response-text',
                    // Generic Gemini structures
                    '.rich-text-formatted:last-child',
                    '.model-response-text'
                ];
                
                // Universal advanced selectors (last resort)
                const universalSelectors = [
                    '[role="assistant"]:last-child',
                    '.assistant-response:last-child .content',
                    '.ai-response:last-child .text',
                    '[data-role="assistant"]:last-child',
                    '.response:last-child .body',
                    '.message:last-child .content',
                    // Very generic fallbacks
                    '.message-content:last-child',
                    '.response-text:last-child'
                ];
                
                // Combine all selectors with priority order
                const allSelectors = [
                    ...claudeSelectors,
                    ...chatgptSelectors,
                    ...geminiSelectors,
                    ...universalSelectors
                ];
                
                console.log('[4AI EXTRACT] Trying', allSelectors.length, 'advanced selectors...');
                
                for (let i = 0; i < allSelectors.length; i++) {
                    const selector = allSelectors[i];
                    try {
                        const elements = document.querySelectorAll(selector);
                        console.log('[4AI EXTRACT] Selector', i + 1, ':', selector, '→', elements.length, 'elements');
                        
                        for (let j = 0; j < elements.length; j++) {
                            const elem = elements[j];
                            if (elem && elem.textContent) {
                                const rawContent = elem.textContent.trim();
                                
                                // Advanced content quality validation
                                const contentChecks = {
                                    hasMinLength: rawContent.length >= 50,
                                    hasMaxLength: rawContent.length <= 100000,
                                    hasPunctuation: /[.!?]/.test(rawContent),
                                    hasWords: rawContent.split(/\s+/).length >= 5,
                                    notUIText: !(/^(send|submit|copy|share|like|dislike|regenerate)$/i.test(rawContent.toLowerCase())),
                                    hasStructure: rawContent.includes('\n') || /[.!?]\s+[A-Z]/.test(rawContent),
                                    notErrorMessage: !/(error|failed|loading|please wait)/i.test(rawContent.substring(0, 50))
                                };
                                
                                const qualityScore = Object.values(contentChecks).filter(Boolean).length;
                                const isHighQuality = qualityScore >= 5;
                                
                                console.log('[4AI EXTRACT] Element', j + 1, 'quality check:', {
                                    length: rawContent.length,
                                    score: qualityScore + '/7',
                                    preview: rawContent.substring(0, 100) + '...',
                                    checks: contentChecks
                                });
                                
                                if (isHighQuality) {
                                    extractedContent = rawContent;
                                    extractionMethod = 'advanced_dom_' + (i + 1);
                                    contentMetadata = {
                                        selector: selector,
                                        elementIndex: j,
                                        qualityScore: qualityScore,
                                        element: elem.tagName + (elem.className ? '.' + elem.className.split(' ').slice(0, 2).join('.') : ''),
                                        source: 'advanced_dom'
                                    };
                                    
                                    console.log('[4AI EXTRACT] ✅ HIGH QUALITY CONTENT FOUND:', {
                                        method: extractionMethod,
                                        length: rawContent.length,
                                        selector: selector.substring(0, 50)
                                    });
                                    break;
                                }
                            }
                        }
                        if (extractedContent) break;
                    } catch (error) {
                        console.warn('[4AI EXTRACT] Selector error:', selector, error.message);
                    }
                }
            }
            
            // Strategy 5: Content processing and optimization
            if (extractedContent && extractedContent.length > 0) {
                console.log('[4AI EXTRACT] ========== CONTENT PROCESSING ==========');
                
                // Advanced content cleanup
                let processedContent = extractedContent
                    // Remove AI service name prefixes
                    .replace(/^(Claude|ChatGPT|Gemini|Bard|Assistant)[\s:]+/i, '')
                    // Normalize whitespace
                    .replace(/\n\s*\n\s*\n/g, '\n\n')
                    .replace(/^\s+|\s+$/g, '')
                    // Replace special characters
                    .replace(/\u00A0/g, ' ') // Non-breaking spaces
                    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
                    .replace(/\u2026/g, '...') // Ellipsis
                    // Remove common UI artifacts
                    .replace(/^(Copy|Share|Like|Dislike|Regenerate)\s*/gm, '')
                    // Clean up markdown artifacts if needed
                    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
                    .replace(/\*(.*?)\*/g, '$1'); // Italic
                
                // Advanced content analysis
                const analysis = {
                    originalLength: extractedContent.length,
                    processedLength: processedContent.length,
                    wordCount: processedContent.split(/\s+/).length,
                    sentenceCount: (processedContent.match(/[.!?]+/g) || []).length,
                    paragraphCount: processedContent.split(/\n\s*\n/).length,
                    hasCodeBlocks: /```/.test(processedContent),
                    hasLists: /^\s*[-*+•]\s/m.test(processedContent),
                    hasNumbers: /\d+/.test(processedContent),
                    language: /[ąćęłńóśźż]/i.test(processedContent) ? 'polish' : 'english',
                    complexity: processedContent.split(/\s+/).length > 100 ? 'high' : 
                               processedContent.split(/\s+/).length > 30 ? 'medium' : 'low'
                };
                
                // Content quality assessment
                const qualityIndicators = {
                    hasGoodLength: analysis.processedLength >= 30 && analysis.processedLength <= 50000,
                    hasStructure: analysis.sentenceCount >= 2 || analysis.paragraphCount >= 2,
                    hasVariety: analysis.hasCodeBlocks || analysis.hasLists || analysis.hasNumbers,
                    isComplete: !processedContent.endsWith('...') && !processedContent.toLowerCase().includes('loading'),
                    isCoherent: analysis.wordCount >= 10 && analysis.sentenceCount >= 1
                };
                
                const qualityScore = Object.values(qualityIndicators).filter(Boolean).length;
                const overallQuality = qualityScore >= 4 ? 'excellent' : qualityScore >= 3 ? 'good' : 'acceptable';
                
                // Combine metadata
                contentMetadata = {
                    ...contentMetadata,
                    ...analysis,
                    qualityIndicators,
                    qualityScore,
                    overallQuality,
                    extractionMethod,
                    timestamp: Date.now()
                };
                
                extractedContent = processedContent;
                
                console.log('[4AI EXTRACT] ========== EXTRACTION COMPLETE ==========');
                console.log('[4AI EXTRACT] Final analysis:', {
                    method: extractionMethod,
                    length: processedContent.length,
                    words: analysis.wordCount,
                    quality: overallQuality,
                    language: analysis.language
                });
            
            // ========== RESULT PREPARATION AND CHUNKING ==========
            if (extractedContent && extractedContent.length > 0) {
                console.log('[4AI EXTRACT] ========== PREPARING RESULTS ==========');
                
                // Smart chunking based on content size and structure
                const maxChunkSize = extractedContent.length <= 5000 ? 800 : 
                                   extractedContent.length <= 20000 ? 1000 : 1200;
                
                const chunks = [];
                let currentPosition = 0;
                
                // Try to chunk at natural boundaries (paragraphs, sentences)
                while (currentPosition < extractedContent.length) {
                    let chunkEnd = Math.min(currentPosition + maxChunkSize, extractedContent.length);
                    
                    // Look for natural break points within reasonable distance
                    if (chunkEnd < extractedContent.length) {
                        const searchStart = Math.max(chunkEnd - 100, currentPosition + maxChunkSize - 200);
                        
                        // Try paragraph break first
                        let breakPoint = extractedContent.lastIndexOf('\n\n', chunkEnd);
                        if (breakPoint > searchStart) {
                            chunkEnd = breakPoint + 2;
                        }
                        // Try sentence break
                        else {
                            breakPoint = extractedContent.search(/[.!?]\s+/g);
                            let lastSentenceEnd = -1;
                            while (breakPoint !== -1 && breakPoint <= chunkEnd) {
                                lastSentenceEnd = breakPoint + extractedContent.match(/[.!?]\s+/g)[0].length;
                                breakPoint = extractedContent.indexOf(breakPoint + 1);
                            }
                            if (lastSentenceEnd > searchStart && lastSentenceEnd <= chunkEnd) {
                                chunkEnd = lastSentenceEnd;
                            }
                        }
                    }
                    
                    const chunk = extractedContent.substring(currentPosition, chunkEnd);
                    chunks.push(chunk);
                    currentPosition = chunkEnd;
                }
                
                // Store comprehensive results
                window.__4AI_CONTENT_RESULT = extractedContent;
                window.__4AI_CONTENT_CHUNKS = chunks;
                window.__4AI_CHUNK_COUNT = chunks.length;
                window.__4AI_CONTENT_METADATA = contentMetadata;
                
                // Prepare success signal with rich metadata
                const signalData = {
                    length: extractedContent.length,
                    chunks: chunks.length,
                    method: extractionMethod,
                    quality: contentMetadata.overallQuality || 'unknown',
                    words: contentMetadata.wordCount || 0,
                    language: contentMetadata.language || 'unknown',
                    timestamp: Date.now()
                };
                
                console.log('[4AI EXTRACT] ✅ EXTRACTION SUCCESSFUL:', signalData);
                console.log('[4AI EXTRACT] Content preview:', extractedContent.substring(0, 200) + '...');
                console.log('[4AI EXTRACT] Metadata:', contentMetadata);
                
                // Enhanced success signal
                document.title = '[4AI_EXTRACT_SUCCESS]' + 
                    signalData.length + '_' + 
                    signalData.chunks + '_' + 
                    signalData.method + '_' + 
                    signalData.quality + '_' + 
                    signalData.timestamp;
                
                return true;
            } else {
                console.log('[4AI EXTRACT] ❌ NO CONTENT EXTRACTED');
                console.log('[4AI EXTRACT] Available window properties:', Object.keys(window).filter(k => k.includes('4AI')));
                
                // Enhanced failure signal
                document.title = '[4AI_EXTRACT_EMPTY]' + extractionMethod + '_' + Date.now();
                return false;
            }
        })();
    "#;

    // Execute comprehensive extraction script
    window.eval(extract_script)
        .map_err(|e| format!("Content extraction script failed: {}", e))?;

    // Wait for extraction to complete
    sleep(Duration::from_millis(300)).await;
    
    if let Ok(current_title) = window.title() {
        if current_title.contains("[4AI_EXTRACT_SUCCESS]") {
            // Parse metadata from title
            if let Some(metadata) = current_title.split("[4AI_EXTRACT_SUCCESS]").nth(1) {
                let parts: Vec<&str> = metadata.split('_').collect();
                if parts.len() >= 3 {
                    if let (Ok(content_length), Ok(chunk_count)) = 
                        (parts[0].parse::<usize>(), parts[1].parse::<usize>()) {
                        
                        println!("[DEBUG] Content extraction successful - Length: {}, Chunks: {}, Method: {}", 
                                content_length, chunk_count, parts.get(2).unwrap_or(&"unknown"));
                        
                        // If content is reasonably small, try to retrieve it in one go
                        if content_length < 2000 && chunk_count == 1 {
                            let retrieve_script = r#"
                                (function() {
                                    const content = window.__4AI_CONTENT_RESULT || '';
                                    const safeContent = content.substring(0, 1500); // Safe limit for Rust return
                                    
                                    // Clear the stored content
                                    window.__4AI_CONTENT_RESULT = null;
                                    window.__4AI_CONTENT_CHUNKS = null;
                                    window.__4AI_CHUNK_COUNT = null;
                                    
                                    // Store in title for Rust to parse (limited length)
                                    if (safeContent.length < 500) {
                                        document.title = '[4AI_CONTENT]' + btoa(safeContent) + '[/4AI_CONTENT]';
                                    }
                                    
                                    console.log('[4AI EXTRACT] Content prepared for Rust:', safeContent.length, 'chars');
                                    return safeContent.length;
                                })();
                            "#;
                            
                            window.eval(retrieve_script)
                                .map_err(|e| format!("Content retrieval failed: {}", e))?;
                            
                            sleep(Duration::from_millis(100)).await;
                            
                            // Try to parse content from title
                            if let Ok(title_with_content) = window.title() {
                                if let Some(encoded_content) = title_with_content
                                    .split("[4AI_CONTENT]").nth(1)
                                    .and_then(|s| s.split("[/4AI_CONTENT]").next()) {
                                    
                                    // Decode base64 content
                                    if let Ok(decoded_bytes) = base64::decode(encoded_content) {
                                        if let Ok(decoded_content) = String::from_utf8(decoded_bytes) {
                                            println!("[DEBUG] Successfully decoded content from title: {} chars", decoded_content.len());
                                            return Ok(decoded_content);
                                        }
                                    }
                                }
                            }
                        }
                        
                        // For larger content or if title method failed, return an indicator
                        return Ok(format!("CONTENT_READY_{}_{}", content_length, chunk_count));
                    }
                }
            }
        } else if current_title.contains("[4AI_EXTRACT_EMPTY]") {
            println!("[DEBUG] Content extraction returned empty");
            return Ok("".to_string());
        }
    }
    
    Err("Failed to extract monitored content".to_string())
}

// Simplified version for Tauri 1.x - returns simple status instead of trying to extract content
#[command]
pub async fn wait_for_full_response(
    app: tauri::AppHandle,
    label: String,
    selector: String,
    stop_words: Vec<String>,
    timeout_ms: u64,
) -> Result<String, String> {
    println!("[DEBUG] wait_for_full_response args: label={:?}, selector={:?}, stop_words={:?}, timeout_ms={:?}", label, selector, stop_words, timeout_ms);
    
    let window = app
        .get_window(&label)
        .ok_or_else(|| "Window not found".to_string())?;

    let poll_interval = 1000; // Longer interval since we're just signaling
    let max_iterations = (timeout_ms / poll_interval as u64) as usize;

    // Install monitoring script that signals completion
    let monitor_script = format!(
        r#"
        (function() {{
            if (window.__4AI_MONITOR_INSTALLED) return;
            window.__4AI_MONITOR_INSTALLED = true;
            
            console.log('[4AI MONITOR] Installing response monitor for selector:', {selector});
            
            let lastLength = 0;
            let stableCount = 0;
            const STABLE_THRESHOLD = 3;
            
            const checkResponse = () => {{
                try {{
                    const elements = document.querySelectorAll({selector});
                    let content = '';
                    
                    // Try multiple elements if available
                    for (let element of elements) {{
                        const text = element.textContent || element.innerText || '';
                        if (text.trim().length > content.length) {{
                            content = text.trim();
                        }}
                    }}
                    
                    console.log('[4AI MONITOR] Check - Content length:', content.length);
                    
                    if (content.length > 10) {{ // Minimum content threshold
                        if (content.length === lastLength) {{
                            stableCount++;
                            console.log('[4AI MONITOR] Stable count:', stableCount);
                            
                            if (stableCount >= STABLE_THRESHOLD) {{
                                console.log('[4AI MONITOR] Response is stable, signaling completion');
                                window.__4AI_RESPONSE_READY = true;
                                document.title = '[4AI_READY]' + Date.now();
                                return;
                            }}
                        }} else {{
                            stableCount = 0;
                            lastLength = content.length;
                        }}
                    }}
                    
                    // Continue monitoring
                    setTimeout(checkResponse, 500);
                }} catch (error) {{
                    console.error('[4AI MONITOR] Error:', error);
                }}
            }};
            
            // Start monitoring after a delay
            setTimeout(checkResponse, 1000);
        }})();
        "#,
        selector = serde_json::to_string(&selector).unwrap()
    );

    // Install monitor
    window.eval(&monitor_script)
        .map_err(|e| format!("Monitor script failed: {}", e))?;

    // Wait for completion signal
    for i in 0..max_iterations {
        sleep(Duration::from_millis(poll_interval)).await;
        
        // Check if monitor signaled completion
        let check_ready_script = r#"
            (function() {
                if (window.__4AI_RESPONSE_READY === true) {
                    console.log('[4AI RUST] Response ready signal detected');
                    return 'READY';
                }
                
                // Also check title for ready signal
                if (document.title.includes('[4AI_READY]')) {
                    console.log('[4AI RUST] Title ready signal detected');
                    return 'READY';
                }
                
                return 'NOT_READY';
            })();
        "#;
        
        window.eval(check_ready_script)
            .map_err(|e| format!("Ready check script failed: {}", e))?;
        
        // Check for ready signal and extract content directly
        if let Ok(current_title) = window.title() {
            if current_title.contains("[4AI_READY]") {
                println!("[DEBUG] Detected ready signal in title: {}", current_title);
                
                // Try to extract content from monitor result
                let extract_content_script = r#"
                    (function() {
                        if (window.__4AI_FINAL_RESPONSE && window.__4AI_FINAL_RESPONSE.completed) {
                            const response = window.__4AI_FINAL_RESPONSE;
                            console.log('[4AI RUST] Extracting monitored content:', response.text.length, 'chars');
                            
                            // Store content for retrieval
                            window.__4AI_EXTRACTED_CONTENT = response.text;
                            document.title = '[4AI_CONTENT_READY]' + Date.now();
                            return true;
                        }
                        
                        console.log('[4AI RUST] No monitored content found, trying direct extraction');
                        return false;
                    })();
                "#;
                
                window.eval(extract_content_script)
                    .map_err(|e| format!("Content extraction script failed: {}", e))?;
                
                sleep(Duration::from_millis(100)).await;
                
                return Ok("EVENT_RESPONSE_READY".to_string());
            }
        }
    }

    println!("[DEBUG] Timeout reached without ready signal");
    Ok("CONTENT_READY_IN_WINDOW".to_string()) // Default to content ready for compatibility
}

async fn check_dom_signal(window: &tauri::Window) -> Result<String, String> {
    // ENHANCED HYBRID APPROACH: Script sets title based on what it finds
    let script = r#"
    (function() {
        try {
            console.log('[SIGNAL CHECK] Starting DOM signal check...');
            
            // Check DOM elements - look for both signal patterns
            const signalElements = document.querySelectorAll('[id^="__4AI_SIGNAL_"]');
            console.log('[SIGNAL CHECK] Found __4AI_SIGNAL_ elements:', signalElements.length);
            
            if (signalElements.length > 0) {
                const element = signalElements[signalElements.length - 1];
                const status = element.getAttribute('data-status') || 'UNKNOWN';
                const response = element.getAttribute('data-response') || 'NO_RESPONSE';
                document.title = 'DOM_FOUND_' + element.id + '_' + status + '_' + response;
                console.log('[SIGNAL CHECK] Found __4AI_SIGNAL_:', element.id, status, response);
                return true;
            }
            
            // Also check for ai-response-monitor elements (our test pattern)
            const monitorElements = document.querySelectorAll('#ai-response-monitor[data-status]');
            console.log('[SIGNAL CHECK] Found ai-response-monitor elements:', monitorElements.length);
            
            if (monitorElements.length > 0) {
                const element = monitorElements[0];
                const status = element.getAttribute('data-status') || 'UNKNOWN';
                const response = element.getAttribute('data-response') || 'NO_RESPONSE';
                document.title = 'DOM_FOUND_ai-response-monitor_' + status + '_' + response;
                console.log('[SIGNAL CHECK] Found ai-response-monitor:', status, response);
                return true;
            }
            
            // Check if our monitoring script left signals in title
            const title = document.title;
            console.log('[SIGNAL CHECK] Current title:', title);
            
            if (title.includes("JS_EXECUTING_") || title.includes("MONITOR_INSTALLED_") || title.includes("4AI_COMPLETE_") || title.includes("SIGNAL_COMPLETE")) {
                document.title = 'TITLE_SIGNAL_' + title.replace(/[^a-zA-Z0-9_:]/g, '_');
                console.log('[SIGNAL CHECK] Found title signal:', title);
                return true;
            }
            
            // No signals found
            console.log('[SIGNAL CHECK] No signals detected');
            document.title = 'NO_SIGNALS_' + Date.now();
            return false;
        } catch (error) {
            document.title = 'SIGNAL_ERROR_' + error.message + '_' + Date.now();
            return false;
        }
    })();
    "#;

    // Execute script and check title for results
    let _ = window.eval(script);
    
    // Give script time to execute
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    
    // Check title for script results
    if let Ok(title) = window.title() {
        if title.contains("DOM_FOUND_") {
            return Ok(format!("DOM_ELEMENT_DETECTED: {}", title));
        }
        if title.contains("TITLE_SIGNAL_") {
            return Ok(format!("TITLE_SIGNAL_DETECTED: {}", title));
        }
        if title.contains("SIGNAL_ERROR_") {
            return Ok(format!("SIGNAL_CHECK_ERROR: {}", title));
        }
        if title.contains("NO_SIGNALS_") {
            return Ok("NO_SIGNALS_DETECTED".to_string());
        }
        
        // Fallback: check for original signals
        if title.contains("JS_EXECUTING_") {
            return Ok("ORIGINAL_JS_EXECUTING_DETECTED".to_string());
        }
        if title.contains("MONITOR_INSTALLED_") {
            return Ok("ORIGINAL_MONITOR_INSTALLED_DETECTED".to_string());
        }
        if title.contains("4AI_COMPLETE_") {
            return Ok("ORIGINAL_COMPLETION_DETECTED".to_string());
        }
    }
    
    Ok("DOM_SIGNAL_CHECKED_NO_RESPONSE".to_string())
}

#[command]
pub async fn wait_for_response_event(
    app: tauri::AppHandle,
    label: String,
    timeout_ms: u64,
) -> Result<String, String> {
    println!("[DEBUG] ========== COMPREHENSIVE RESPONSE MONITORING ==========");
    println!("[DEBUG] WebView Label: {:?}", label);
    println!("[DEBUG] Timeout: {} ms ({:.1} minutes)", timeout_ms, timeout_ms as f64 / 60000.0);
    
    let window = app
        .get_window(&label)
        .ok_or_else(|| "Window not found".to_string())?;

    let poll_interval = 500; // Faster polling for production use  
    let max_iterations = (timeout_ms / poll_interval as u64) as usize;
    
    println!("[DEBUG] Poll interval: {} ms", poll_interval);
    println!("[DEBUG] Max iterations: {}", max_iterations);

    // Track monitoring state
    let mut monitor_installed = false;
    let mut response_detected = false;
    let mut content_stable_iterations = 0;
    let mut last_content_length = 0;

    for i in 0..max_iterations {
        println!("[DEBUG] Iteration {}/{}", i + 1, max_iterations);
        
        // 🎯 CRITICAL: Check DOM signal FIRST, before any script execution
        if let Ok(signal_result) = check_dom_signal(&window).await {
            if i % 10 == 0 {
                println!("[DEBUG] 🔍 DOM signal check {}: {:?}", i + 1, signal_result);
            }
            
            // Also check title for backwards compatibility
            if let Ok(current_title) = window.title() {
                if i % 10 == 0 && (current_title.contains("MONITOR_") || current_title.contains("4AI_")) {
                    println!("[DEBUG] 📋 Title check {}: {:?}", i + 1, current_title);
                }
                
                // Early completion check
                if current_title.contains("4AI_COMPLETE_") {
                    println!("[DEBUG] 🎉 EARLY COMPLETION DETECTED: {:?}", current_title);
                    return Ok("SUCCESS_EARLY".to_string());
                }
            }
        }
        
        // Comprehensive monitoring check
        let monitor_status_script = r#"
            (function() {
                const title = document.title;
                console.log('[4AI MONITOR] Current title:', title);
                console.log('[4AI MONITOR] Monitor installed:', !!window.__4AI_MONITOR_INSTALLED);
                console.log('[4AI MONITOR] Final response exists:', !!window.__4AI_FINAL_RESPONSE);
                
                // Check monitor installation
                if (window.__4AI_MONITOR_INSTALLED) {
                    console.log('[4AI MONITOR] ✅ Monitor is active');
                    
                    // Check for response object
                    const response = window.__4AI_FINAL_RESPONSE;
                    if (response) {
                        console.log('[4AI MONITOR] Response status:', {
                            completed: response.completed,
                            textLength: response.text ? response.text.length : 0,
                            reason: response.reason,
                            serviceId: response.serviceId,
                            stable: response.stable
                        });
                        
                        // Check completion conditions
                        if (response.completed && response.text && response.text.length > 10) {
                            console.log('[4AI MONITOR] ✅ RESPONSE COMPLETED AND READY!');
                            window.__4AI_RESPONSE_READY = true;
                            document.title = '4AI_COMPLETE_' + response.serviceId + '_' + response.text.length + '_' + Date.now();
                            return {
                                status: 'COMPLETED',
                                length: response.text.length, 
                                reason: response.reason,
                                serviceId: response.serviceId
                            };
                        }
                        
                        // Check progress indicators
                        if (response.text && response.text.length > 0) {
                            console.log('[4AI MONITOR] Response in progress:', response.text.length, 'chars');
                            document.title = '4AI_PROGRESS_' + response.serviceId + '_' + response.text.length + '_' + Date.now();
                            return {
                                status: 'IN_PROGRESS',
                                length: response.text.length,
                                stable: response.stable
                            };
                        }
                    }
                    
                    return { status: 'MONITORING', monitor: true };
                }
                
                // Check for completion signals in title (fallback)
                if (title.includes('4AI_COMPLETE_')) {
                    console.log('[4AI MONITOR] ✅ Title completion signal detected:', title);
                    window.__4AI_TITLE_COMPLETION = true;
                    return { status: 'TITLE_COMPLETION', title: title };
                }
                
                // Test mode fallback
                if (title.includes('SCRIPT_INJECTED_TEST_') || window.__4AI_TEST_RESULT === 'ULTRA_SIMPLE_SUCCESS') {
                    console.log('[4AI MONITOR] Test mode completion detected');
                    return { status: 'TEST_MODE_SUCCESS' };
                }
                
                return { status: 'WAITING', monitor: !!window.__4AI_MONITOR_INSTALLED };
            })();
        "#;
        
        window.eval(monitor_status_script)
            .map_err(|e| format!("Monitor status check failed: {}", e))?;

        // 🎯 CRITICAL: Check title after EVERY script execution
        if let Ok(current_title) = window.title() {
            // Check for completion signals
            if current_title.contains("4AI_COMPLETE_") {
                println!("[DEBUG] 🎉 COMPLETION SIGNAL DETECTED: {:?}", current_title);
                
                // Parse completion details
                if let Some(parts) = current_title.split("4AI_COMPLETE_").nth(1) {
                    let details: Vec<&str> = parts.split('_').collect();
                    if details.len() >= 2 {
                        let length = details[0].parse::<usize>().unwrap_or(0);
                        println!("[DEBUG] ✅ SUCCESS: Response completed with {} chars", length);
                        return Ok(format!("SUCCESS_{}", length));
                    }
                }
                return Ok("SUCCESS_DETECTED".to_string());
            }
            
            // Check for monitor status signals
            if current_title.contains("MONITOR_INSTALLED_") {
                if i <= 5 { // Log monitor installation early
                    println!("[DEBUG] 🔧 Monitor installed: {:?}", current_title);
                }
            }
            
            if current_title.contains("MONITOR_CHECKING_") {
                if i % 20 == 0 { // Log checking status every 20 iterations
                    println!("[DEBUG] � Monitor checking: {:?}", current_title);
                }
            }
            
            if current_title.contains("MONITOR_PROGRESS_") {
                if i % 5 == 0 { // Log progress more frequently
                    println!("[DEBUG] 📈 Content progress: {:?}", current_title);
                }
            }
            
            if current_title.contains("MONITOR_NO_CONTENT_") {
                if i % 10 == 0 { // Log no-content status
                    println!("[DEBUG] ⚠️ No content detected: {:?}", current_title);
                }
            }
            
            if current_title.contains("MONITOR_ERROR_") {
                println!("[DEBUG] ❌ Monitor error detected: {:?}", current_title);
            }
        }

        // Check for content stability (multiple iterations with same length = stable)
        let stability_check_script = r#"
            (function() {
                const response = window.__4AI_FINAL_RESPONSE;
                if (response && response.text) {
                    const currentLength = response.text.length;
                    
                    // Store length for stability tracking
                    if (!window.__4AI_LENGTH_HISTORY) {
                        window.__4AI_LENGTH_HISTORY = [];
                    }
                    
                    window.__4AI_LENGTH_HISTORY.push(currentLength);
                    
                    // Keep only last 5 measurements
                    if (window.__4AI_LENGTH_HISTORY.length > 5) {
                        window.__4AI_LENGTH_HISTORY = window.__4AI_LENGTH_HISTORY.slice(-5);
                    }
                    
                    // Check stability (same length for last 3+ measurements)
                    if (window.__4AI_LENGTH_HISTORY.length >= 3) {
                        const lastThree = window.__4AI_LENGTH_HISTORY.slice(-3);
                        const allSame = lastThree.every(len => len === lastThree[0]);
                        const minLength = lastThree[0];
                        
                        if (allSame && minLength > 50) { // Minimum reasonable response length
                            console.log('[4AI MONITOR] ✅ CONTENT STABLE:', minLength, 'chars for 3+ iterations');
                            response.stable = true;
                            response.completed = true;
                            response.reason = 'Content length stable for multiple iterations';
                            document.title = '4AI_COMPLETE_STABLE_' + response.serviceId + '_' + currentLength + '_' + Date.now();
                            return { status: 'STABLE', length: currentLength };
                        }
                    }
                    
                    return { status: 'CHECKING_STABILITY', length: currentLength, history: window.__4AI_LENGTH_HISTORY };
                }
                
                return { status: 'NO_CONTENT' };
            })();
        "#;
        
        window.eval(stability_check_script)
            .map_err(|e| format!("Stability check failed: {}", e))?;

        // 🎯 CRITICAL: Check title again after stability check
        if let Ok(current_title) = window.title() {
            if current_title.contains("4AI_COMPLETE_STABLE_") {
                println!("[DEBUG] 🎉 STABLE COMPLETION DETECTED: {:?}", current_title);
                if let Some(parts) = current_title.split("4AI_COMPLETE_STABLE_").nth(1) {
                    let details: Vec<&str> = parts.split('_').collect();
                    if details.len() >= 3 {
                        let service = details[1];
                        let length = details[2].parse::<usize>().unwrap_or(0);
                        println!("[DEBUG] ✅ STABLE SUCCESS: {} response stable with {} chars", service, length);
                        return Ok(format!("STABLE_SUCCESS_{}_{}", service, length));
                    }
                }
                return Ok("STABLE_SUCCESS_DETECTED".to_string());
            }
        }

        sleep(Duration::from_millis(poll_interval)).await;
        
        // Early completion check after initial monitoring setup
        if i >= 3 { // Allow time for monitor installation and initial detection
            let completion_check_script = r#"
                (function() {
                    // Priority 1: Monitor-based completion
                    if (window.__4AI_RESPONSE_READY === true || 
                        (window.__4AI_FINAL_RESPONSE && window.__4AI_FINAL_RESPONSE.completed)) {
                        console.log('[4AI COMPLETION] ✅ MONITOR-BASED COMPLETION DETECTED');
                        return 'MONITOR_COMPLETION';
                    }
                    
                    // Priority 2: Title-based completion  
                    if (window.__4AI_TITLE_COMPLETION === true || document.title.includes('4AI_COMPLETE_')) {
                        console.log('[4AI COMPLETION] ✅ TITLE-BASED COMPLETION DETECTED');
                        return 'TITLE_COMPLETION';
                    }
                    
                    // Priority 3: Test mode completion
                    if (window.__4AI_TEST_RESULT === 'ULTRA_SIMPLE_SUCCESS') {
                        console.log('[4AI COMPLETION] ✅ TEST MODE COMPLETION');
                        return 'TEST_COMPLETION';
                    }
                    
                    return 'WAITING';
                })();
            "#;
            
            window.eval(completion_check_script)
                .map_err(|e| format!("Completion check failed: {}", e))?;
            
            // 🎯 CRITICAL: Check title after completion check
            if let Ok(current_title) = window.title() {
                if current_title.contains("4AI_COMPLETE_") {
                    println!("[DEBUG] 🎉 COMPLETION CHECK DETECTED: {:?}", current_title);
                    if let Some(parts) = current_title.split("4AI_COMPLETE_").nth(1) {
                        let details: Vec<&str> = parts.split('_').collect();
                        if details.len() >= 3 {
                            let service = details[1];
                            let length = details[2].parse::<usize>().unwrap_or(0);
                            println!("[DEBUG] ✅ COMPLETION SUCCESS: {} response with {} chars", service, length);
                            return Ok(format!("COMPLETION_SUCCESS_{}_{}", service, length));
                        }
                    }
                    return Ok("COMPLETION_SUCCESS_DETECTED".to_string());
                }
            }
        }
        
        // Extended monitoring for longer responses (up to timeout)
        if i > max_iterations / 2 { // After 50% of timeout
            println!("[DEBUG] Extended monitoring phase - checking for long-form responses");
            
            let extended_check_script = r#"
                (function() {
                    const response = window.__4AI_FINAL_RESPONSE;
                    if (response && response.text && response.text.length > 100) {
                        console.log('[4AI EXTENDED] Long response detected:', response.text.length, 'chars');
                        
                        // For very long responses, check for natural completion indicators
                        const text = response.text.toLowerCase();
                        const completionIndicators = [
                            'podsumowanie', 'conclusion', 'w skrócie', 'finally', 'na koniec',
                            'reasumując', 'in summary', 'overall', 'ostatecznie'
                        ];
                        
                        const hasCompletionIndicator = completionIndicators.some(indicator => 
                            text.includes(indicator) && text.indexOf(indicator) > text.length * 0.7
                        );
                        
                        if (hasCompletionIndicator) {
                            console.log('[4AI EXTENDED] ✅ Natural completion indicator found');
                            response.completed = true;
                            response.reason = 'Natural completion indicator detected';
                            document.title = '4AI_COMPLETE_NATURAL_' + response.serviceId + '_' + response.text.length + '_' + Date.now();
                            return 'NATURAL_COMPLETION';
                        }
                    }
                    
                    return 'CONTINUE_MONITORING';
                })();
            "#;
            
            window.eval(extended_check_script)
                .map_err(|e| format!("Extended check failed: {}", e))?;
            
            // 🎯 CRITICAL: Check title after extended check
            if let Ok(current_title) = window.title() {
                if current_title.contains("4AI_COMPLETE_NATURAL_") {
                    println!("[DEBUG] 🎉 NATURAL COMPLETION DETECTED: {:?}", current_title);
                    if let Some(parts) = current_title.split("4AI_COMPLETE_NATURAL_").nth(1) {
                        let details: Vec<&str> = parts.split('_').collect();
                        if details.len() >= 3 {
                            let service = details[1];
                            let length = details[2].parse::<usize>().unwrap_or(0);
                            println!("[DEBUG] ✅ NATURAL SUCCESS: {} response with {} chars", service, length);
                            return Ok(format!("NATURAL_SUCCESS_{}_{}", service, length));
                        }
                    }
                    return Ok("NATURAL_SUCCESS_DETECTED".to_string());
                }
            }
        }
    }

    // Final attempt to extract any available content before timeout
    println!("[DEBUG] Timeout approaching - attempting final content extraction");
    let final_extraction_script = r#"
        (function() {
            console.log('[4AI FINAL] Performing final content extraction attempt');
            
            const response = window.__4AI_FINAL_RESPONSE;
            if (response && response.text && response.text.length > 20) {
                console.log('[4AI FINAL] Found partial response:', response.text.length, 'chars');
                response.completed = true;
                response.reason = 'Timeout - extracting partial content';
                document.title = '4AI_COMPLETE_TIMEOUT_' + (response.serviceId || 'unknown') + '_' + response.text.length + '_' + Date.now();
                return response.text;
            }
            
            // Last resort: check for any text content in common selectors
            const fallbackSelectors = [
                '.ProseMirror', '[data-message-author-role="assistant"]', '.model-response-text',
                '.markdown', '.response-container', '[data-testid*="message"]'
            ];
            
            for (const selector of fallbackSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    if (el.textContent && el.textContent.length > 50) {
                        console.log('[4AI FINAL] Fallback extraction from:', selector, el.textContent.length, 'chars');
                        window.__4AI_FALLBACK_CONTENT = el.textContent;
                        document.title = '4AI_COMPLETE_FALLBACK_' + selector.replace(/[^a-zA-Z0-9]/g, '') + '_' + el.textContent.length + '_' + Date.now();
                        return el.textContent;
                    }
                }
            }
            
            return 'NO_CONTENT_FOUND';
        })();
    "#;
    
    window.eval(final_extraction_script)
        .map_err(|e| format!("Final extraction failed: {}", e))?;

    Err("Comprehensive monitoring timeout - no response detected".to_string())
}

#[command]
pub async fn get_text_content(
    app: tauri::AppHandle,
    label: String,
    selector: String,
) -> Result<String, String> {
    let window = app
        .get_window(&label)
        .ok_or_else(|| "Window not found".to_string())?;

    let script = format!(
        r#"
        (function() {{
            try {{
                const element = document.querySelector({selector});
                if (!element) {{
                    console.log('[4AI] Element not found for selector: {selector}');
                    return '';
                }}
                
                let text = element.textContent || element.innerText || '';
                text = text.trim();
                
                // For debugging
                console.log('[4AI] Extracted text length:', text.length);
                console.log('[4AI] First 100 chars:', text.substring(0, 100));
                
                // Store result globally for retrieval
                window.__4AI_EXTRACTED_TEXT = text;
                return text;
            }} catch (error) {{
                console.error('[4AI] Error extracting text:', error);
                window.__4AI_EXTRACTED_TEXT = '';
                return '';
            }}
        }})();
        "#,
        selector = serde_json::to_string(&selector).unwrap()
    );

    // Execute the script and get result directly
    let result = window.eval(&script).map_err(|e| format!("Script execution failed: {}", e))?;
    
    // The result should be the extracted text
    // However, Tauri eval might not return the value directly, so let's use a different approach
    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
    
    // Try to get the stored result
    let get_stored_script = r#"window.__4AI_EXTRACTED_TEXT || ''"#;
    match window.eval(get_stored_script) {
        Ok(_) => {
            // We can't reliably get the return value, so let's use the console debug info
            // and return empty for now - this will be handled by the higher level logic
            println!("Text extraction script executed, check browser console for debug info");
            Ok("".to_string())
        }
        Err(e) => Err(format!("Failed to retrieve extracted text: {}", e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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

#[command]
pub async fn extract_content_from_window(
    app: tauri::AppHandle,
    label: String,
    service_id: String,
) -> Result<String, String> {
    println!("[DEBUG] extract_content_from_window args: label={:?}, service_id={:?}", label, service_id);
    
    let window = app
        .get_window(&label)
        .ok_or_else(|| "Window not found".to_string())?;

    let extraction_script = format!(
        r#"
        (function() {{
            try {{
                console.log('[EXTRACTION] Starting content extraction for {}');
                
                // Enhanced selectors for each service
                const serviceSelectors = {{
                  'claude': [
                    'div[class*="font-claude"]',
                    '[data-testid="conversation"] div[data-testid*="message"] div:last-child',
                    '.font-claude-message',
                    '[role="presentation"] div:last-child p',
                    '[data-is-streaming="false"] .font-claude-message'
                  ],
                  'chatgpt': [
                    '[data-message-author-role="assistant"] .markdown',
                    '.prose',
                    '[data-testid*="conversation"] div:last-child',
                    '[role="assistant"] .markdown'
                  ],
                  'gemini': [
                    '[data-response-index] .markdown',
                    '.model-response-text',
                    '.response-container',
                    '.model-response'
                  ]
                }};
                
                const selectors = serviceSelectors['{}'] || [];
                let bestContent = '';
                
                for (const selector of selectors) {{
                    console.log('[EXTRACTION] Trying selector:', selector);
                    const elements = document.querySelectorAll(selector);
                    
                    for (const element of elements) {{
                        const text = (element.textContent || element.innerText || '').trim();
                        if (text.length > bestContent.length && text.length > 10) {{
                            bestContent = text;
                            console.log('[EXTRACTION] Found better content:', selector, 'length:', text.length);
                        }}
                    }}
                }}
                
                if (bestContent.length > 0) {{
                    console.log('[EXTRACTION] Final content length:', bestContent.length);
                    window.__4AI_EXTRACTED_FINAL = bestContent;
                    document.title = '[EXTRACTED]' + bestContent.length;
                    return bestContent;
                }} else {{
                    console.log('[EXTRACTION] No content found with any selector');
                    document.title = '[NO_CONTENT]';
                    return '';
                }}
                
            }} catch (error) {{
                console.error('[EXTRACTION] Error:', error);
                document.title = '[EXTRACTION_ERROR]';
                return '';
            }}
        }})();
        "#,
        service_id, service_id
    );

    // Execute extraction script
    let _result = window.eval(&extraction_script)
        .map_err(|e| format!("Script execution failed: {}", e))?;

    // Wait for processing
    sleep(Duration::from_millis(1000)).await;

    // Check title for result signal and return the result
    if let Ok(title) = window.title() {
        if title.contains("[EXTRACTED]") {
            if let Some(start) = title.find("[EXTRACTED]") {
                let length_str = &title[start + 11..];
                if let Ok(length) = length_str.parse::<usize>() {
                    if length > 0 {
                        return Ok(format!("EXTRACTED:{}", length));
                    }
                }
            }
        } else if title.contains("[NO_CONTENT]") {
            return Ok("NO_CONTENT".to_string());
        } else if title.contains("[EXTRACTION_ERROR]") {
            return Ok("EXTRACTION_ERROR".to_string());
        }
    }

    Ok("EXTRACTION_TIMEOUT".to_string())
}

#[command]
pub async fn test_title_communication(
    app: tauri::AppHandle,
    label: String,
) -> Result<String, String> {
    println!("[DEBUG] 🧪 Testing title communication for WebView: {}", label);
    
    let window = app
        .get_window(&label)
        .ok_or_else(|| "Window not found".to_string())?;

    // Test 1: Get current title
    let current_title = window.title().unwrap_or_else(|_| "TITLE_READ_ERROR".to_string());
    println!("[DEBUG] Current title: {:?}", current_title);
    
    // Test 2: Set a test title via JavaScript
    let test_script = r#"
        (function() {
            console.log('[TITLE TEST] Before:', document.title);
            document.title = 'RUST_TITLE_TEST_' + Date.now();
            console.log('[TITLE TEST] After:', document.title);
            return document.title;
        })();
    "#;
    
    window.eval(test_script)
        .map_err(|e| format!("Test script failed: {}", e))?;
    
    // Wait a moment for title to update
    sleep(Duration::from_millis(500)).await;
    
    // Test 3: Read title again
    let new_title = window.title().unwrap_or_else(|_| "TITLE_READ_ERROR".to_string());
    println!("[DEBUG] New title: {:?}", new_title);
    
    // Test 4: Set completion signal and test detection
    let completion_script = r#"
        (function() {
            console.log('[TITLE TEST] Setting completion signal...');
            document.title = '4AI_COMPLETE_RUST_TEST_test_9999_' + Date.now();
            console.log('[TITLE TEST] Completion signal set:', document.title);
            return 'COMPLETION_SIGNAL_SET';
        })();
    "#;
    
    window.eval(completion_script)
        .map_err(|e| format!("Completion script failed: {}", e))?;
    
    sleep(Duration::from_millis(500)).await;
    
    // Test 5: Check for completion signal
    let final_title = window.title().unwrap_or_else(|_| "TITLE_READ_ERROR".to_string());
    println!("[DEBUG] Final title: {:?}", final_title);
    
    let has_completion_signal = final_title.contains("4AI_COMPLETE_");
    println!("[DEBUG] Has completion signal: {}", has_completion_signal);
    
    // Return test results
    Ok(format!("TITLE_TEST_RESULTS|CURRENT:{}|NEW:{}|FINAL:{}|HAS_SIGNAL:{}", 
        current_title, new_title, final_title, has_completion_signal))
}

#[command]
pub async fn test_immediate_signal(app: tauri::AppHandle) -> Result<String, String> {
    println!("[DEBUG] test_immediate_signal called");
    
    // Create simple test WebView
    let test_label = format!("immediate_test_{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis());
    
    let url = "data:text/html,<html><head><title>Immediate Test</title></head><body><div id=\"ai-response-monitor\" data-status=\"monitoring\"></div><script>console.log('[IMMEDIATE TEST] Starting...');const monitor=document.getElementById('ai-response-monitor');if(monitor){monitor.setAttribute('data-status','complete');monitor.setAttribute('data-response','TEST_SUCCESS');console.log('[IMMEDIATE TEST] DOM element updated');}setTimeout(()=>{document.title='SIGNAL_COMPLETE:true';console.log('[IMMEDIATE TEST] Title signal set');},100);</script><h1>Immediate Signal Test</h1></body></html>".to_string();
    
    println!("[DEBUG] Creating test WebView: {}", test_label);
    
    // Create WebView
    let window_url = tauri::WindowUrl::External(url.parse()
        .map_err(|e| format!("Invalid URL: {}", e))?);
        
    let window = tauri::WindowBuilder::new(&app, &test_label, window_url)
        .title("Immediate Signal Test")
        .inner_size(800.0, 600.0)
        .visible(false)  // Hidden test window
        .build()
        .map_err(|e| format!("Failed to create test window: {}", e))?;

    // Wait for page load
    tokio::time::sleep(Duration::from_millis(1000)).await;
    
    // Test enhanced DOM signal checking
    let signal_result = check_dom_signal(&window).await?;
    
    // Cleanup
    let _ = window.close();
    
    Ok(format!("IMMEDIATE_TEST_RESULT: {}", signal_result))
}

#[command] 
pub async fn get_webview_title(app: tauri::AppHandle, label: String) -> Result<String, String> {
    let window = app.get_window(&label)
        .ok_or_else(|| format!("Window '{}' not found", label))?;
        
    let title = window.title()
        .unwrap_or_else(|_| "TITLE_READ_ERROR".to_string());
        
    Ok(title)
}