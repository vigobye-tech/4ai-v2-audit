/**
 * Uproszczony monitor - używa tylko zmiany tytułu do komunikacji z backendem
 * Ten podejście omija problemy z console.log i postMessage w Tauri 1.x
 */

export function createSimpleMonitorScript(serviceId: string, selector: string): string {
  return `
(function() {
  // DUAL COMMUNICATION - Both DOM element AND title change for debugging
  document.title = 'JS_EXECUTING_' + Date.now();
  
  // Also create DOM element signal
  const signalElement = document.createElement('div');
  signalElement.id = '__4AI_SIGNAL_' + Date.now();
  signalElement.style.display = 'none';
  signalElement.setAttribute('data-status', 'JS_EXECUTING');
  document.body?.appendChild(signalElement);
  
  // Prevent multiple installations
  if (window.__SIMPLE_MONITOR_INSTALLED) {
    document.title = 'MONITOR_ALREADY_INSTALLED_' + Date.now();
    signalElement.setAttribute('data-status', 'MONITOR_ALREADY_INSTALLED');
    return;
  }
  window.__SIMPLE_MONITOR_INSTALLED = true;
  window.__4AI_MONITOR_INSTALLED = true;
  
  // Signal monitor installation via both title and DOM element
  document.title = 'MONITOR_INSTALLED_' + Date.now();
  console.log('[4AI MONITOR] 🚀 Script is running! Creating signal element...');
  signalElement.setAttribute('data-status', 'MONITOR_INSTALLED');
  signalElement.setAttribute('data-timestamp', Date.now().toString());
  console.log('[4AI MONITOR] ✅ Signal element created:', signalElement.id);
  
  let checkCount = 0;
  let lastLength = 0;
  let stableCount = 0;
  const MAX_CHECKS = 480; // 4 minutes at 500ms intervals (to match Rust polling)
  const STABLE_THRESHOLD = 3;
  
  function checkForResponse() {
    checkCount++;
    
    // Signal we're checking via DOM element instead of title  
    if (checkCount % 3 === 0) {
      signalElement.setAttribute('data-status', 'MONITOR_CHECKING_' + checkCount);
      signalElement.setAttribute('data-timestamp', Date.now().toString());
    }
    
    try {
      // Find response element
      const elements = document.querySelectorAll('${selector}');
      let bestElement = null;
      let maxLength = 0;
      
      // Find element with most content
      for (let i = 0; i < elements.length; i++) {
        const text = (elements[i].textContent || '').trim();
        if (text.length > maxLength) {
          maxLength = text.length;
          bestElement = elements[i];
        }
      }
      
      if (!bestElement) {
        // Try fallback selectors
        const fallbacks = [
          '.font-claude-message',
          '[data-testid="message-content"]',
          '.prose',
          '.markdown',
          '[data-message-author-role="assistant"]',
          '.model-response-text'
        ];
        
        for (const fallback of fallbacks) {
          const fallbackElements = document.querySelectorAll(fallback);
          for (let i = 0; i < fallbackElements.length; i++) {
            const text = (fallbackElements[i].textContent || '').trim();
            if (text.length > maxLength) {
              maxLength = text.length;
              bestElement = fallbackElements[i];
            }
          }
        }
      }
      
      if (bestElement && maxLength > 10) {
        const currentText = (bestElement.textContent || '').trim();
        const currentLength = currentText.length;
        
        // Check if response is stable
        if (currentLength === lastLength && currentLength > 20) {
          stableCount++;
          if (stableCount >= STABLE_THRESHOLD) {
            // Response is stable - signal completion
            window.__4AI_FINAL_RESPONSE = {
              text: currentText,
              completed: true,
              reason: 'stable_response',
              timestamp: Date.now(),
              serviceId: '${serviceId}'
            };
            
            // Signal completion via both title and DOM element
            document.title = '4AI_COMPLETE_' + currentLength + '_' + Date.now();
            signalElement.setAttribute('data-status', '4AI_COMPLETE_' + currentLength);
            signalElement.setAttribute('data-timestamp', Date.now().toString());
            return; // Stop checking
          }
        } else {
          stableCount = 0;
          lastLength = currentLength;
        }
        
        // Signal we found content but it's still changing MORE FREQUENTLY
        if (checkCount % 2 === 0) {
          signalElement.setAttribute('data-status', 'MONITOR_PROGRESS_' + currentLength);
          signalElement.setAttribute('data-timestamp', Date.now().toString());
        }
      } else {
        // No content found - signal MORE FREQUENTLY
        if (checkCount % 5 === 0) {
          signalElement.setAttribute('data-status', 'MONITOR_NO_CONTENT_' + checkCount);
          signalElement.setAttribute('data-timestamp', Date.now().toString());
        }
      }
      
      // Continue checking if not exceeded max - MATCH RUST POLLING INTERVAL
      if (checkCount < MAX_CHECKS) {
        setTimeout(checkForResponse, 500);  // Changed from 1000ms to 500ms to match Rust
      } else {
        // Timeout - signal with whatever we have
        const finalText = bestElement ? (bestElement.textContent || '').trim() : 'TIMEOUT_NO_CONTENT';
        window.__4AI_FINAL_RESPONSE = {
          text: finalText,
          completed: true,
          reason: 'timeout',
          timestamp: Date.now(),
          serviceId: '${serviceId}'
        };
        // Signal timeout completion via both title and DOM element
        document.title = '4AI_COMPLETE_timeout_' + Date.now();
        signalElement.setAttribute('data-status', '4AI_COMPLETE_timeout');
        signalElement.setAttribute('data-timestamp', Date.now().toString());
      }
      
    } catch (error) {
      signalElement.setAttribute('data-status', 'MONITOR_ERROR_' + error.message);
      signalElement.setAttribute('data-timestamp', Date.now().toString());
    }
  }
  
  // Start checking after a delay
  setTimeout(checkForResponse, 2000);
  
})();
`;
}