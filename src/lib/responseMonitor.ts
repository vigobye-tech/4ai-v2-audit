/**
 * Event-Driven Response Monitor - Implementacja sugestii Manusa
 * 
 * Zamiast polegać na polling CSS selectors, używamy MutationObserver
 * do aktywnego monitorowania zmian w DOM i wykrywania zakończenia odpowiedzi
 */

export interface ResponseMonitorConfig {
  containerSelector: string;
  serviceId: string;
  stopWords: string[];
  maxWaitTime: number; // maksymalny czas oczekiwania
  stabilityTime: number; // czas bez zmian oznaczający koniec
}

/**
 * Generuje skrypt MutationObserver do wstrzyknięcia w WebView
 * Ten skrypt będzie działał asynchronicznie i wysyłał sygnały do Tauri
 */
export function createResponseMonitorScript(config: ResponseMonitorConfig): string {
  return `
(function() {
  console.log('[4AI MONITOR] Initializing response monitor for ${config.serviceId}');
  
  const config = ${JSON.stringify(config)};
  let monitorActive = true;
  let observer = null;
  let stabilityTimer = null;
  let maxWaitTimer = null;
  let lastResponseLength = 0;
  
  // Funkcja do wysyłania sygnału do Tauri backend
  function signalCompletion(responseText, reason) {
    if (!monitorActive) return;
    
    monitorActive = false;
    console.log('[4AI MONITOR] ========== RESPONSE COMPLETED ==========');
    console.log('[4AI MONITOR] Service:', config.serviceId);
    console.log('[4AI MONITOR] Reason:', reason);
    console.log('[4AI MONITOR] Response length:', responseText.length);
    console.log('[4AI MONITOR] First 200 chars:', responseText.substring(0, 200));
    console.log('[4AI MONITOR] Last 200 chars:', responseText.substring(Math.max(0, responseText.length - 200)));
    
    // Cleanup timers and observer
    if (observer) observer.disconnect();
    if (stabilityTimer) clearTimeout(stabilityTimer);
    if (maxWaitTimer) clearTimeout(maxWaitTimer);
    
    // Store response globally for Tauri to retrieve
    const finalResponse = {
      text: responseText,
      completed: true,
      reason: reason,
      timestamp: Date.now(),
      serviceId: config.serviceId
    };
    
    window.__4AI_FINAL_RESPONSE = finalResponse;
    console.log('[4AI MONITOR] Stored response in window.__4AI_FINAL_RESPONSE:', !!window.__4AI_FINAL_RESPONSE);
    
    // Try multiple ways to signal completion to Tauri
    try {
      console.log('[4AI MONITOR] Attempting to signal completion via multiple methods...');
      
      // Method 1: PostMessage (if available)
      if (window.postMessage) {
        console.log('[4AI MONITOR] Sending postMessage...');
        window.postMessage({
          type: '4AI_RESPONSE_COMPLETE',
          serviceId: config.serviceId,
          response: responseText,
          reason: reason
        }, '*');
        console.log('[4AI MONITOR] PostMessage sent successfully');
      } else {
        console.log('[4AI MONITOR] PostMessage not available');
      }
      
      // Method 2: Custom event
      console.log('[4AI MONITOR] Dispatching custom event...');
      const event = new CustomEvent('4ai-response-complete', {
        detail: {
          serviceId: config.serviceId,
          response: responseText,
          reason: reason
        }
      });
      document.dispatchEvent(event);
      console.log('[4AI MONITOR] Custom event dispatched successfully');
      
      // Method 3: Title change (fallback) - MOST IMPORTANT FOR TAURI 1.x
      const originalTitle = document.title;
      const newTitle = '4AI_COMPLETE_' + config.serviceId + '_' + Date.now();
      console.log('[4AI MONITOR] Changing title from:', originalTitle);
      console.log('[4AI MONITOR] Changing title to:', newTitle);
      document.title = newTitle;
      
      // Verify title change
      setTimeout(() => {
        console.log('[4AI MONITOR] Title after change:', document.title);
        console.log('[4AI MONITOR] Title contains 4AI_COMPLETE_:', document.title.includes('4AI_COMPLETE_'));
      }, 100);
      
      setTimeout(() => {
        if (document.title === newTitle) {
          console.log('[4AI MONITOR] Restoring original title:', originalTitle);
          document.title = originalTitle;
        }
      }, 5000); // Increased from 1000ms to 5000ms for debugging
      
    } catch (error) {
      console.error('[4AI MONITOR] Failed to signal completion:', error);
    }
    
    console.log('[4AI MONITOR] ========== COMPLETION SIGNALING FINISHED ==========');
  }
  
  // Funkcja do znajdowania kontenera odpowiedzi
  function findResponseContainer() {
    // Próbuj główny selector
    let container = document.querySelector(config.containerSelector);
    if (container) return container;
    
    // Fallback selectors per service
    const fallbackSelectors = {
      'claude': [
        '[data-testid="message-content"]',
        '.font-claude-message',
        '[role="presentation"] div:last-child',
        '.conversation-content div:last-child'
      ],
      'chatgpt': [
        '[data-message-author-role="assistant"]',
        '.markdown',
        '.prose',
        '[data-testid*="conversation"] div:last-child'
      ],
      'gemini': [
        '.model-response-text',
        '.response-container-content',
        '.markdown-content',
        '.conversation-container div:last-child'
      ]
    };
    
    const selectors = fallbackSelectors[config.serviceId] || [];
    for (const selector of selectors) {
      container = document.querySelector(selector);
      if (container) {
        console.log('[4AI MONITOR] Found container with fallback selector:', selector);
        return container;
      }
    }
    
    return null;
  }
  
  // Funkcja do sprawdzania czy odpowiedź jest kompletna
  function checkCompletion(container) {
    if (!container) return false;
    
    const currentText = container.textContent || container.innerText || '';
    const currentLength = currentText.trim().length;
    
    // Sprawdź czy text zawiera stop words
    const hasStopWord = config.stopWords.some(word => 
      currentText.toLowerCase().includes(word.toLowerCase())
    );
    
    // Sprawdź czy długość się nie zmieniła (stabilność)
    const isStable = currentLength === lastResponseLength && currentLength > 20;
    lastResponseLength = currentLength;
    
    // Sprawdź atrybuty wskazujące na zakończenie
    const streamingAttribute = container.getAttribute('data-is-streaming');
    const isNotStreaming = streamingAttribute === 'false' || streamingAttribute === null;
    
    console.log('[4AI MONITOR] Check:', {
      length: currentLength,
      stable: isStable,
      hasStopWord: hasStopWord,
      notStreaming: isNotStreaming
    });
    
    return {
      text: currentText,
      shouldComplete: (hasStopWord || (isStable && isNotStreaming)) && currentLength > 10
    };
  }
  
  // Reset stability timer
  function resetStabilityTimer(container) {
    if (stabilityTimer) clearTimeout(stabilityTimer);
    
    stabilityTimer = setTimeout(() => {
      const result = checkCompletion(container);
      if (result.text.length > 10) {
        signalCompletion(result.text, 'stability_timeout');
      }
    }, config.stabilityTime);
  }
  
  // Inicjalizacja monitorowania
  function initializeMonitor() {
    console.log('[4AI MONITOR] ========== INITIALIZING MONITOR ==========');
    console.log('[4AI MONITOR] Service:', config.serviceId);
    console.log('[4AI MONITOR] Container selector:', config.containerSelector);
    console.log('[4AI MONITOR] Max wait time:', config.maxWaitTime);
    console.log('[4AI MONITOR] Stability time:', config.stabilityTime);
    console.log('[4AI MONITOR] Stop words:', config.stopWords);
    
    const container = findResponseContainer();
    if (!container) {
      console.log('[4AI MONITOR] ❌ Container not found with primary selector');
      console.log('[4AI MONITOR] Available elements on page:');
      
      // Debug: pokaż dostępne elementy
      const allSelectors = [
        config.containerSelector,
        '[data-testid="message-content"]',
        '.font-claude-message',
        '[role="presentation"] div:last-child',
        '.conversation-content div:last-child',
        '[data-message-author-role="assistant"]',
        '.markdown',
        '.prose',
        '[data-testid*="conversation"] div:last-child',
        '.model-response-text',
        '.response-container-content'
      ];
      
      allSelectors.forEach(sel => {
        const found = document.querySelectorAll(sel);
        if (found.length > 0) {
          console.log('[4AI MONITOR] Found ' + found.length + ' elements with selector: ' + sel);
          found.forEach((el, i) => {
            const text = (el.textContent || '').trim();
            if (text.length > 0) {
              console.log('[4AI MONITOR]   Element ' + i + ': ' + text.substring(0, 100) + '...');
            }
          });
        }
      });
      
      console.log('[4AI MONITOR] Retrying in 2s...');
      setTimeout(initializeMonitor, 2000);
      return;
    }
    
    console.log('[4AI MONITOR] ✅ Container found!');
    console.log('[4AI MONITOR] Container tagName:', container.tagName);
    console.log('[4AI MONITOR] Container classes:', container.className);
    console.log('[4AI MONITOR] Container initial text length:', (container.textContent || '').length);
    console.log('[4AI MONITOR] Container initial text preview:', (container.textContent || '').substring(0, 200));
    
    // Ustawmy maksymalny czas oczekiwania
    console.log('[4AI MONITOR] Setting max wait timer for', config.maxWaitTime, 'ms');
    maxWaitTimer = setTimeout(() => {
      console.log('[4AI MONITOR] ⏰ MAX WAIT TIME EXCEEDED');
      const result = checkCompletion(container);
      signalCompletion(result.text || 'TIMEOUT', 'max_wait_exceeded');
    }, config.maxWaitTime);
    
    // Utwórz MutationObserver
    observer = new MutationObserver((mutations) => {
      if (!monitorActive) return;
      
      let hasContentChanges = false;
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          hasContentChanges = true;
        }
      });
      
      if (hasContentChanges) {
        console.log('[4AI MONITOR] Content changed, checking completion...');
        const result = checkCompletion(container);
        
        if (result.shouldComplete) {
          signalCompletion(result.text, 'content_complete');
        } else {
          resetStabilityTimer(container);
        }
      }
    });
    
    // Rozpocznij obserwację
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-is-streaming', 'class']
    });
    
    // Rozpocznij timer stabilności
    resetStabilityTimer(container);
    
    console.log('[4AI MONITOR] Monitor initialized successfully');
  }
  
  // Rozpocznij monitoring po krótkim opóźnieniu
  setTimeout(initializeMonitor, 1000);
  
  // Cleanup function dla window
  window.__4AI_CLEANUP_MONITOR = function() {
    monitorActive = false;
    if (observer) observer.disconnect();
    if (stabilityTimer) clearTimeout(stabilityTimer);
    if (maxWaitTimer) clearTimeout(maxWaitTimer);
    console.log('[4AI MONITOR] Monitor cleaned up');
  };
  
})();
  `;
}

/**
 * Generuje skrypt do pobrania kompletnej odpowiedzi z WebView
 */
export function createResponseRetrievalScript(): string {
  return `
(function() {
  const response = window.__4AI_FINAL_RESPONSE;
  if (response && response.completed) {
    console.log('[4AI RETRIEVAL] Found completed response:', response.text.length, 'chars');
    return response.text;
  }
  
  console.log('[4AI RETRIEVAL] No completed response found');
  return null;
})();
  `;
}

export default {
  createResponseMonitorScript,
  createResponseRetrievalScript
};