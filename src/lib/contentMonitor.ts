// Content-based response monitoring for AI services
// This replaces signal-based monitoring that gets blocked by AI service restrictions

export function createContentStabilityMonitor(serviceId: string, primarySelector: string): string {
  return `
(function() {
  // ULTIMATE TEST - CHECK IF DOCUMENT EXISTS
  if (typeof document === 'undefined') {
    console.error('DOCUMENT UNDEFINED IN WEBVIEW FOR ${serviceId}');
    return 'DOCUMENT_UNDEFINED';
  }
  
  // Try to set title
  try {
    document.title = 'JS-WORKS-FOR-${serviceId}';
    console.log('🔥 TITLE SET SUCCESSFULLY FOR ${serviceId}');
  } catch (e) {
    console.error('TITLE SET FAILED FOR ${serviceId}:', e);
  }
  
  console.log('[CONTENT MONITOR] Starting content stability monitoring for ' + '${serviceId}');
  console.log('[CONTENT MONITOR] Primary selector for ' + '${serviceId}' + ':', '${primarySelector}');
  
  // Set monitor installation flag for Rust compatibility
  window.__4AI_MONITOR_INSTALLED = true;
  
  // Service-specific response selectors (with primary selector as first choice)
  const responseSelectors = {
    'claude': [
      'div[data-testid*="message"]',
      '.font-claude-message', 
      'div[class*="font-claude"]',
      '.ProseMirror[contenteditable="false"]',
      '[aria-label*="Claude"] .markdown'
    ],
    'chatgpt': [
      '[data-message-author-role="assistant"]',
      '.markdown.prose',
      '[data-testid*="conversation-turn"]',
      '.group .markdown'
    ],
    'gemini': [
      '.model-response-text',
      '[data-response-chunk]', 
      '.response-container',
      '.rich-text-formatted'
    ]
  };
  
  const selectors = responseSelectors['${serviceId}'] || [primarySelector];
  console.log('[CONTENT MONITOR] Using selectors:', selectors);
  
  let lastContent = '';
  let stableCount = 0;
  let contentLength = 0;
  const STABILITY_THRESHOLD = 2; // 2 checks without content change = stable (LASER FOCUS FIX)
  const CHECK_INTERVAL = 1000; // Check every 1 second
  
  function checkContent() {
    try {
      let currentContent = '';
      
      // Try each selector until we find content
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        console.log('[CONTENT MONITOR] Checking selector:', selector, 'found:', elements.length);
        
        for (const element of elements) {
          const text = (element.textContent || element.innerText || '').trim();
          if (text.length > currentContent.length) {
            currentContent = text;
            console.log('[CONTENT MONITOR] Found content:', text.length, 'chars');
          }
        }
        
        if (currentContent.length > 50) break; // Found substantial content
      }
      
      // Check if content has changed
      if (currentContent === lastContent && currentContent.length > 0) {
        stableCount++;
        console.log('[CONTENT MONITOR] Content stable for', stableCount, 'checks');
        
        if (stableCount >= STABILITY_THRESHOLD) {
          console.log('[CONTENT MONITOR] Content stability detected - response complete!');
          
          // Set monitor installed flag (for Rust compatibility)
          window.__4AI_MONITOR_INSTALLED = true;
          
          // Create final response object (for Rust compatibility)
          window.__4AI_FINAL_RESPONSE = {
            completed: true,
            text: currentContent,
            reason: 'content_stability',
            timestamp: Date.now()
          };
          
          // Store content in a way Rust can retrieve it
          window.__4AI_CONTENT_RESULT = currentContent;
          
          // Create DOM signal element compatible with check_dom_signal
          const signalElement = document.createElement('div');
          signalElement.id = '__4AI_SIGNAL_' + Date.now();
          signalElement.setAttribute('data-status', 'CONTENT_STABLE');
          signalElement.textContent = 'RESPONSE_READY';
          signalElement.style.display = 'none';
          document.body.appendChild(signalElement);
          
          console.log('[CONTENT MONITOR] Signal element created:', signalElement.id);
          
          // Set completion title (for Rust compatibility)
          document.title = '4AI_COMPLETE_content_stable_' + currentContent.length;
          
          console.log('[CONTENT MONITOR] Response ready:', currentContent.length, 'chars');
          return true; // Stop monitoring
        }
      } else {
        // Content changed, reset stability counter
        if (currentContent.length > lastContent.length) {
          console.log('[CONTENT MONITOR] Content growing:', lastContent.length, '->', currentContent.length);
          stableCount = 0;
          lastContent = currentContent;
          contentLength = currentContent.length;
        } else if (currentContent !== lastContent) {
          console.log('[CONTENT MONITOR] ⚠️ Content changed but not growing! Was:', lastContent.length, 'chars, now:', currentContent.length, 'chars');
          console.log('[CONTENT MONITOR] ⚠️ Reset stability counter. Old stable count was:', stableCount);
          console.log('[CONTENT MONITOR] Content changed but same length - resetting stability');
          stableCount = 0;
          lastContent = currentContent;
        }
      }
      
      // Continue monitoring
      setTimeout(checkContent, CHECK_INTERVAL);
      
    } catch (error) {
      console.error('[CONTENT MONITOR] Error:', error);
      // Continue monitoring even on error
      setTimeout(checkContent, CHECK_INTERVAL);
    }
  }
  
  // Start monitoring after a short delay to let page load
  setTimeout(checkContent, 2000);
  
  console.log('[CONTENT MONITOR] Content stability monitoring started');
  return 'CONTENT_MONITOR_STARTED';
})();
`;
}