export { runWebViewChain as runRealChain };
import * as ipc from './ipc';
import { createInjectionScript } from './injection';
import { logger } from './logger';
import { aiServices } from './types';
import type { AiServiceId } from './types';
import { createClaudeInjectionScript, createGeminiInjectionScript } from './injection';
import { stopWords as stop_words } from './relayPrompts';

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
    const label = `ai-${serviceId}-${Date.now()}`;
    // Zbuduj prompt dla tej usługi (z kontekstem debaty)
    const promptForThisService = buildChainPrompt(currentPrompt, serviceId, userPrompt);

    try {
      // 1. Create WebView
      await ipc.createWebview(label, service.url);
      logger.info('webview', `Opened ${service.name}`, { service: serviceId });

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
      // Always pass a non-empty array for stop_words to backend (even for Claude)
  const stop_words_arg: string[] = Array.isArray(stop_words) && stop_words.length > 0 ? stop_words : ['END'];
  let waitResult: unknown;
      try {
        waitResult = await ipc.waitForFullResponse(label, service.responseSelector, stop_words_arg, 30000);
      } catch (waitError) {
        logger.error('webview', `waitForFullResponse failed for ${serviceId}: ${waitError}`);
        throw new Error(`waitForFullResponse failed for ${serviceId}: ${waitError}`);
      }
      if (!waitResult || typeof waitResult !== 'string' || waitResult.toLowerCase().includes('error') || waitResult.toLowerCase().includes('fail')) {
        logger.error('webview', `waitForFullResponse did not return valid result for ${serviceId}: ${waitResult}`);
        throw new Error(`waitForFullResponse did not return valid result for ${serviceId}: ${waitResult}`);
      }
      currentPrompt = await ipc.getTextContent(label, service.responseSelector);
      logger.info('webview', `Extracted response`, { service: serviceId, length: currentPrompt.length });
      // Block chain if response is empty or whitespace
      if (!currentPrompt || !currentPrompt.trim()) {
        logger.error('webview', `Response from ${serviceId} is empty. Blocking chain.`);
        throw new Error(`Response from ${serviceId} is empty. Chain stopped.`);
      }


      if (!keepWebViewOpen) {
        console.log(`Closing ${service.name} WebView in 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        await ipc.closeWebview(label);
      } else {
        console.log(`WebView for ${service.name} will stay open for manual inspection`);
      }
    } catch (error) {
      logger.error('webview', `Chain step failed`, { service: serviceId, error: String(error) });
      if (!keepWebViewOpen) {
        try {
          await ipc.closeWebview(label);
        } catch (closeError) {
          logger.warn('webview', 'Failed to close webview on error', { error: String(closeError) });
        }
      } else {
        console.log(`WebView for ${service.name} staying open despite error for debugging`);
      }
      // Continue chain on error, append error message to currentPrompt
      currentPrompt += `\n❌ Chain failed at ${service.name}: ${error}`;
    }
  }
  return currentPrompt;
}

// Claude: inject prompt and send (universal send trigger)
export function buildChainPrompt(
  currentResponse: string, 
  nextServiceId: AiServiceId, 
  originalPrompt: string
): string {
  if (currentResponse === originalPrompt) {
    // First service in chain
    return originalPrompt;
  }

  // Subsequent services get context
  const instructions = {
    chatgpt: "Please improve and expand on this response:",
    claude: "Please refine and enhance this response with more detail:",
    gemini: "Please fact-check and verify this response, adding corrections if needed:",
    copilot: "Please debug and optimize this response:"
  };

  return `${instructions[nextServiceId]}\n\n${currentResponse}`;
}
