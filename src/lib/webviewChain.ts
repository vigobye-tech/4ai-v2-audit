export { runWebViewChain as runRealChain };
import * as ipc from './ipc';
import { createInjectionScript } from './injection';
import { logger } from './logger';
import { aiServices } from './types';
import type { AiServiceId } from './types';
import { createClaudeInjectionScript, createGeminiInjectionScript } from './injection';

import { webViewPool } from './webviewPool'; // Manus's pooling strategy
import { createSimpleMonitorScript } from './simpleMonitor'; // Re-enabled for production use
import { createContentStabilityMonitor } from './contentMonitor'; // Content-based monitoring for AI services

export async function runWebViewChain(
  chain: AiServiceId[],
  userPrompt: string,
  keepWebViewOpen: boolean = true // Domyślnie NIE zamykaj
): Promise<string> {
  logger.info('webview', 'Starting chain execution', { chain, promptLength: userPrompt.length });
  
  let currentPrompt = userPrompt;

  for (let i = 0; i < chain.length; i++) {
    const serviceId = chain[i];
    const service = aiServices[serviceId];
    let label: string | null = null;
    
    console.log(`[CHAIN DEBUG] === PROCESSING SERVICE ${i + 1}/${chain.length}: ${service.name} ===`);
    console.log(`[CHAIN DEBUG] currentPrompt length before service:`, currentPrompt.length);
    console.log(`[CHAIN DEBUG] Is currentPrompt same as userPrompt?`, currentPrompt === userPrompt);
    
    // Zbuduj prompt dla tej usługi (z kontekstem debaty)
    const promptForThisService = buildChainPrompt(currentPrompt, serviceId, userPrompt);
    console.log(`[CHAIN DEBUG] Prompt for ${service.name}:`, promptForThisService.slice(0, 300));
    
    if (i > 0 && currentPrompt === userPrompt) {
      console.log(`[CHAIN ERROR] WARNING: Service ${i + 1} is receiving original user prompt instead of previous AI response!`);
      console.log(`[CHAIN ERROR] This means the previous service (${chain[i-1]}) failed to provide a response.`);
    }

    try {
      // 1. Use WebView pool for efficient resource management (Manus's suggestion)
      label = await webViewPool.getWebView(serviceId, service.url);
      logger.info('webview', `Using ${service.name} WebView`, { service: serviceId, label });

      // 2. Wait for page load - longer delay for complex sites
      console.log(`Waiting for ${service.name} to load...`);
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 3. Inject prompt (Claude/Gemini/other)
      if (serviceId === 'claude') {
        const script = createClaudeInjectionScript(promptForThisService);
        console.log(`Injecting Claude universal script...`);
        await ipc.injectScript(label, script);
        logger.info('webview', `Injected Claude prompt`, { service: serviceId, prompt: promptForThisService.slice(0, 50) });
      } else if (serviceId === 'gemini') {
        const script = createGeminiInjectionScript(promptForThisService);
        console.log(`Injecting Gemini universal script...`);
        await ipc.injectScript(label, script);
        logger.info('webview', `Injected Gemini prompt`, { service: serviceId, prompt: promptForThisService.slice(0, 50) });
      } else {
        const script = createInjectionScript(service, promptForThisService);
        console.log(`Injecting script to ${service.name}...`);
        await ipc.injectScript(label, script);
        logger.info('webview', `Injected prompt`, { service: serviceId, prompt: promptForThisService.slice(0, 50) });
      }

    // 4. Czekaj na pełną odpowiedź (wait_for_full_response + get_text_content)
    console.log(`Czekam na pełną odpowiedź w ${service.name}...`);
      // Defensive: always pass a valid array for stop_words
      let waitResult: unknown;
      try {
        console.log(`[CHAIN DEBUG] Starting FULL response monitoring for ${serviceId}...`);
        
        // Use comprehensive selectors for each AI service
        let primarySelector = '';
        if (serviceId === 'claude') {
          // Claude uses ProseMirror editor for responses
          primarySelector = '[aria-label*="Claude"] .ProseMirror, .ProseMirror[contenteditable="false"], [data-testid*="message"], .font-claude-message';
        } else if (serviceId === 'chatgpt') {
          // ChatGPT uses various response containers
          primarySelector = '[data-message-author-role="assistant"], .markdown.prose, [data-testid*="conversation-turn"], .group';
        } else if (serviceId === 'gemini') {
          // Gemini uses rich text containers
          primarySelector = '.model-response-text, [data-response-chunk], .response-container, .rich-text-formatted';
        }
        
        console.log(`[CHAIN DEBUG] Using primary selector: ${primarySelector}`);
        
        // Use content-based monitoring for AI services that block signal-based communication
        let monitorScript: string;
        if (serviceId === 'claude' || serviceId === 'chatgpt' || serviceId === 'gemini') {
          console.log(`[CHAIN DEBUG] Using content stability monitoring for ${serviceId}`);
          monitorScript = createContentStabilityMonitor(serviceId, primarySelector);
        } else {
          console.log(`[CHAIN DEBUG] Using signal-based monitoring for ${serviceId}`);
          monitorScript = createSimpleMonitorScript(serviceId, primarySelector);
        }
        
        await ipc.injectScript(label, monitorScript);
        console.log(`[CHAIN DEBUG] Response monitor script injected for ${service.name}`);
        
        // Wait for completion event instead of polling
        waitResult = await ipc.waitForResponseEvent(label, 60000); // 60 seconds = 120 iterations
        console.log(`[CHAIN DEBUG] Event-driven response completed: "${waitResult}"`);
      } catch (waitError) {
        logger.error('webview', `waitForFullResponse failed for ${serviceId}: ${waitError}`);
        console.error(`[CHAIN DEBUG] waitForFullResponse error:`, waitError);
        throw new Error(`waitForFullResponse failed for ${serviceId}: ${waitError}`);
      }
      if (!waitResult || typeof waitResult !== 'string' || waitResult.toLowerCase().includes('error') || waitResult.toLowerCase().includes('fail')) {
        logger.error('webview', `waitForFullResponse did not return valid result for ${serviceId}: ${waitResult}`);
        throw new Error(`waitForFullResponse did not return valid result for ${serviceId}: ${waitResult}`);
      }
      // Check for new SUCCESS_CONTENT and SUCCESS_EARLY results with embedded content
      if (typeof waitResult === 'string' && (waitResult.startsWith("SUCCESS_CONTENT:") || waitResult.startsWith("SUCCESS_EARLY:"))) {
        console.log(`[CHAIN DEBUG] Got success result with content embedded!`);
        
        const contentStart = waitResult.indexOf(':') + 1;
        if (contentStart > 0 && contentStart < waitResult.length) {
          currentPrompt = waitResult.substring(contentStart);
          console.log(`[CHAIN DEBUG] Extracted embedded content:`, currentPrompt.length, 'chars');
          console.log(`[CHAIN DEBUG] Content preview:`, currentPrompt.substring(0, 100));
          
          if (currentPrompt.trim().length === 0) {
            throw new Error('Embedded content is empty');
          }
        } else {
          throw new Error('Could not extract content from success result');
        }
        
      // Check for event-driven completion signal (fallback)
      } else if (waitResult === "EVENT_RESPONSE_READY") {
        console.log(`[CHAIN DEBUG] Got event-driven completion signal, retrieving response...`);
        
        // Use new monitored content extraction
        try {
          const extractResult = await ipc.extractMonitoredContent(label);
          console.log(`[CHAIN DEBUG] Monitor extraction result:`, extractResult);
          
          if (extractResult.startsWith("CONTENT_READY_")) {
            // Content is ready but stored in window, retrieve with getTextContent
            console.log(`[CHAIN DEBUG] Content ready indicator received, retrieving...`);
            
            // Try to get content from the stored location
            try {
              currentPrompt = await ipc.getTextContent(label, '__4AI_CONTENT_RESULT');
              if (!currentPrompt || currentPrompt.trim().length === 0) {
                // Fallback to standard selector
                currentPrompt = await ipc.getTextContent(label, service.responseSelector);
              }
              console.log(`[CHAIN DEBUG] Retrieved stored content:`, currentPrompt.length, 'chars');
            } catch (retrievalError) {
              console.error(`[CHAIN DEBUG] Failed to retrieve stored content:`, retrievalError);
              throw new Error('Failed to retrieve stored content');
            }
            
          } else if (extractResult && extractResult.length > 0 && !extractResult.startsWith("CONTENT_")) {
            // Direct content returned (small content that fit in response)
            currentPrompt = extractResult;
            console.log(`[CHAIN DEBUG] Got direct monitored content:`, currentPrompt.length, 'chars');
            
          } else {
            throw new Error(`No usable content from monitor extraction: ${extractResult}`);
          }
          
          if (!currentPrompt || currentPrompt.trim().length === 0) {
            throw new Error('Monitored content is empty');
          }
          
        } catch (retrievalError) {
          console.error(`[CHAIN DEBUG] Monitored retrieval failed:`, retrievalError);
          
          // Fallback to traditional extraction
          console.log(`[CHAIN DEBUG] Falling back to traditional extraction...`);
          try {
            currentPrompt = await ipc.getTextContent(label, service.responseSelector);
            if (!currentPrompt || currentPrompt.trim().length === 0) {
              throw new Error('Fallback extraction also failed');
            }
            console.log(`[CHAIN DEBUG] Fallback extraction success:`, currentPrompt.length, 'chars');
          } catch (fallbackError) {
            console.error(`[CHAIN DEBUG] Fallback extraction failed:`, fallbackError);
            currentPrompt = "Event-driven response retrieval failed";
          }
        }
      } else if (waitResult === "CONTENT_READY_IN_WINDOW") {
        console.log(`[CHAIN DEBUG] Got signal that content is ready, attempting to extract from window...`);
        
        // Wait a bit more to ensure content is fully loaded
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log(`[CHAIN DEBUG] Attempting content extraction after ready signal...`);
        
        // Use new direct extraction function from Rust
        try {
          const extractionResult = await ipc.extractContentFromWindow(label, serviceId);
          console.log(`[CHAIN DEBUG] Rust extraction result:`, extractionResult);
          
          if (extractionResult.startsWith('EXTRACTED:')) {
            const length = parseInt(extractionResult.split(':')[1], 10);
            console.log(`[CHAIN DEBUG] Content extracted successfully, length: ${length}`);
            
            // Now get the actual content using JavaScript
            const getContentScript = `
              (function() {
                const content = window.__4AI_EXTRACTED_FINAL;
                if (content && content.length > 0) {
                  console.log('[RETRIEVAL] Retrieved content length:', content.length);
                  return content;
                }
                
                // Fallback: try to find the content again
                const fallbackSelectors = {
                  'claude': ['div[class*="font-claude"]', '.font-claude-message'],
                  'chatgpt': ['[data-message-author-role="assistant"] .markdown', '.prose'],
                  'gemini': ['[data-response-index] .markdown', '.model-response-text']
                };
                
                const selectors = fallbackSelectors['${serviceId}'] || [];
                for (const selector of selectors) {
                  const elements = document.querySelectorAll(selector);
                  for (const element of elements) {
                    const text = (element.textContent || element.innerText || '').trim();
                    if (text.length > 10) {
                      console.log('[RETRIEVAL] Fallback found content:', text.length);
                      return text;
                    }
                  }
                }
                
                return '';
              })();
            `;
            
            await ipc.injectScript(label, getContentScript);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Try to get content using getTextContent with 'body' selector
            currentPrompt = await ipc.getTextContent(label, 'body');
            
            // If that fails, try with service-specific selectors
            if (!currentPrompt || currentPrompt.trim().length === 0) {
              console.log(`[CHAIN DEBUG] Body extraction failed, trying service selectors...`);
              currentPrompt = await ipc.getTextContent(label, service.responseSelector);
            }
            
          } else if (extractionResult === 'NO_CONTENT') {
            console.log(`[CHAIN DEBUG] Rust extraction found no content`);
            currentPrompt = "";
          } else {
            console.log(`[CHAIN DEBUG] Rust extraction failed:`, extractionResult);
            // Fallback to old method
            currentPrompt = await ipc.getTextContent(label, service.responseSelector);
          }
          
        } catch (extractError) {
          console.error(`[CHAIN DEBUG] Enhanced extraction failed:`, extractError);
          // Final fallback
          try {
            currentPrompt = await ipc.getTextContent(label, service.responseSelector);
          } catch (fallbackError) {
            console.error(`[CHAIN DEBUG] Fallback extraction also failed:`, fallbackError);
            currentPrompt = "";
          }
        }
      } else {
        // Use the result directly if it's not the special signal
        currentPrompt = waitResult;
        console.log(`[CHAIN DEBUG] Using direct result from waitForFullResponse`);
      }
      
      logger.info('webview', `Extracted response`, { service: serviceId, length: currentPrompt.length, preview: currentPrompt.slice(0, 100) });
      console.log(`[CHAIN DEBUG] ${service.name} response (${currentPrompt.length} chars):`, currentPrompt.slice(0, 200));
      console.log(`[CHAIN DEBUG] === SERVICE ${i + 1} COMPLETED SUCCESSFULLY ===`);
      console.log(`[CHAIN DEBUG] currentPrompt updated for next service:`, currentPrompt !== userPrompt ? 'YES (contains AI response)' : 'NO (still original prompt)');
      
      // Block chain if response is empty or whitespace
      if (!currentPrompt || !currentPrompt.trim()) {
        logger.error('webview', `Response from ${serviceId} is empty. Blocking chain.`);
        throw new Error(`Response from ${serviceId} is empty. Chain stopped.`);
      }


      if (!keepWebViewOpen) {
        console.log(`Releasing ${service.name} WebView back to pool in 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        await webViewPool.releaseWebView(label);
      } else {
        console.log(`WebView for ${service.name} will stay active for manual inspection`);
        // Don't release to pool if we want to keep it open
      }
    } catch (error) {
      console.log(`[CHAIN ERROR] === SERVICE ${i + 1} FAILED: ${service.name} ===`);
      console.log(`[CHAIN ERROR] Error:`, error);
      console.log(`[CHAIN ERROR] currentPrompt remains unchanged:`, currentPrompt.length, 'chars');
      console.log(`[CHAIN ERROR] Next service will receive:`, currentPrompt === userPrompt ? 'ORIGINAL USER PROMPT' : 'PARTIAL AI RESPONSE');
      
      logger.error('webview', `Chain step failed`, { service: serviceId, error: String(error) });
      if (label !== null) {
        if (!keepWebViewOpen) {
          try {
            await webViewPool.closeWebView(label); // Force close on error
          } catch (closeError) {
            logger.warn('webview', 'Failed to close webview on error', { error: String(closeError) });
          }
        } else {
          console.log(`WebView for ${service.name} staying open despite error for debugging`);
        }
      }
      // Stop chain execution on error instead of continuing with corrupted data
      throw new Error(`Chain failed at ${service.name}: ${error}`);
    }
  }
  
  console.log(`[CHAIN DEBUG] === CHAIN COMPLETED ===`);
  console.log(`[CHAIN DEBUG] Final result length:`, currentPrompt.length);
  console.log(`[CHAIN DEBUG] Final result preview:`, currentPrompt.slice(0, 300));
  console.log(`[CHAIN DEBUG] Services processed:`, chain.length);
  
  return currentPrompt;
}

// Claude: inject prompt and send (universal send trigger)
export function buildChainPrompt(
  currentResponse: string, 
  nextServiceId: AiServiceId, 
  originalPrompt: string
): string {
  if (currentResponse === originalPrompt) {
    // First service in chain OR previous service failed
    console.log(`[CHAIN DEBUG] buildChainPrompt: Using original prompt for ${nextServiceId}`);
    return originalPrompt;
  }

  // Subsequent services get context
  const instructions = {
    chatgpt: "Please improve and expand on this response:",
    claude: "Please refine and enhance this response with more detail:",
    gemini: "Please fact-check and verify this response, adding corrections if needed:",
    copilot: "Please debug and optimize this response:"
  };

  console.log(`[CHAIN DEBUG] buildChainPrompt: Building context prompt for ${nextServiceId} with ${currentResponse.length} chars of previous response`);
  return `${instructions[nextServiceId]}\n\n${currentResponse}`;
}
