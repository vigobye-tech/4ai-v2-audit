import { invoke } from '@tauri-apps/api/core';
import { buildChainPrompt } from './relayPrompts';
import { cleanResponse } from './smartExtract';
import { logger } from './logger';
import type { AiServiceId } from './types';

const AI_SERVICES: Record<AiServiceId, { url: string; selector: string; inputSelector: string; submitSelector: string }> = {
  chatgpt: {
    url: 'https://chat.openai.com',
    selector: '[data-message-author-role="assistant"] .markdown',
    inputSelector: '#prompt-textarea',
    submitSelector: '[data-testid="send-button"]'
  },
  claude: {
    url: 'https://claude.ai',
    selector: '.font-claude-message',
    inputSelector: '.ProseMirror',
    submitSelector: 'button[aria-label="Send Message"]'
  },
  gemini: {
    url: 'https://gemini.google.com',
    selector: '[data-response-id] .markdown',
    inputSelector: '.ql-editor',
    submitSelector: 'button[aria-label="Send message"]'
  },
  copilot: {
    url: 'https://copilot.microsoft.com',
    selector: 'cib-message-group[source="bot"] .ac-textBlock',
    inputSelector: '#searchbox',
    submitSelector: '#search_icon'
  }
};

export async function runAutoDebate(
  chain: AiServiceId[],
  userPrompt: string,
  maxWords: number = 500
): Promise<string> {
  logger.info('auto-debate', 'Starting automated debate', { 
    chain, 
    promptLength: userPrompt.length, 
    maxWords 
  });

  let context = userPrompt;
  let fullDebate = `🎯 AUTOMATED DEBATE: "${userPrompt}"\n\n`;

  for (let i = 0; i < chain.length; i++) {
    const serviceId = chain[i];
    const service = AI_SERVICES[serviceId];
    
    logger.info('auto-debate', `Starting ${serviceId}`, { step: i + 1, total: chain.length });

    try {
      // 1. Utwórz WebView
      const label = `auto-${serviceId}-${Date.now()}`;
      await invoke('create_webview', { label, url: service.url });
      
      // 2. Poczekaj na załadowanie i wstrzyknij prompt
      await new Promise(resolve => setTimeout(resolve, 3000)); // Poczekaj na załadowanie
      
      const promptToSend = buildChainPrompt(context, serviceId, userPrompt, maxWords);
      
      const injectionScript = `
        (function() {
          const input = document.querySelector('${service.inputSelector}');
          const submit = document.querySelector('${service.submitSelector}');
          
          if (input && submit) {
            input.focus();
            input.value = '';
            input.textContent = '';
            
            // Różne metody wstawiania tekstu
            if (input.value !== undefined) {
              input.value = \`${promptToSend.replace(/`/g, '\\`')}\`;
            }
            if (input.textContent !== undefined) {
              input.textContent = \`${promptToSend.replace(/`/g, '\\`')}\`;
            }
            if (input.innerHTML !== undefined) {
              input.innerHTML = \`${promptToSend.replace(/`/g, '\\`')}\`;
            }
            
            // Symuluj wydarzenia
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Poczekaj i kliknij submit
            setTimeout(() => {
              submit.click();
              // Backup: Enter key
              setTimeout(() => {
                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
              }, 500);
            }, 1000);
            
            return 'Prompt injected and submitted';
          }
          return 'Error: Input or submit button not found';
        })();
      `;
      
      await invoke('inject_script', { label, script: injectionScript });
      
      // 3. Poczekaj na odpowiedź (proste oczekiwanie)
      await new Promise(resolve => setTimeout(resolve, 15000)); // 15 sekund na odpowiedź
      
      // Spróbuj pobrać odpowiedź
      const response = await invoke('wait_for_selector', {
        label,
        selector: service.selector,
        timeoutMs: 5000
      }) as string;
      
      // 4. Wyczyść odpowiedź
      const cleanedResponse = cleanResponse(response, maxWords);
      
      // 5. Dodaj do kontekstu
      context += `\n\n[${serviceId.toUpperCase()}]: ${cleanedResponse}`;
      fullDebate += `🤖 **${serviceId.toUpperCase()}** (${cleanedResponse.split(' ').length} słów):\n${cleanedResponse}\n\n`;
      
      logger.info('auto-debate', `${serviceId} completed`, { 
        responseLength: cleanedResponse.length,
        wordCount: cleanedResponse.split(' ').length
      });
      
      // 6. Zamknij WebView (opcjonalnie)
      // await invoke('close_webview', { label });
      
    } catch (error) {
      const errorMessage = `❌ ${serviceId.toUpperCase()} FAILED: ${error}`;
      context += `\n\n${errorMessage}`;
      fullDebate += `${errorMessage}\n\n`;
      
      logger.error('auto-debate', `${serviceId} failed`, { error: String(error) });
    }
  }

  fullDebate += `\n✅ **AUTOMATED DEBATE COMPLETED**\nTotal responses: ${chain.length}\nMax words per response: ${maxWords}`;
  
  logger.info('auto-debate', 'Debate completed', { 
    totalLength: fullDebate.length,
    servicesUsed: chain.length
  });

  return fullDebate;
}


import { runWebViewChain } from './webviewChain';

export async function runQuickDebate(userPrompt: string): Promise<string> {
  // Szybka debata: Claude -> ChatGPT -> Gemini (500 słów każdy)
  const quickChain: AiServiceId[] = ['claude', 'chatgpt', 'gemini'];
  let currentPrompt = userPrompt;
  let debateLog = `🚀 QUICK DEBATE: "${userPrompt}"
\n`;
  for (const serviceId of quickChain) {
    try {
      const response = await runWebViewChain([serviceId], currentPrompt, false);
      debateLog += `\n🤖 ${serviceId.toUpperCase()}:\n${response}\n`;
      currentPrompt = response;
    } catch (error) {
      debateLog += `\n❌ ${serviceId.toUpperCase()} FAILED: ${error}\n`;
    }
  }
  debateLog += `\n✅ QUICK DEBATE COMPLETED`;
  return debateLog;
}

export async function runFullDebate(userPrompt: string): Promise<string> {
  // Pełna debata: wszystkie 4 AI (300 słów każdy)
  const fullChain: AiServiceId[] = ['claude', 'chatgpt', 'gemini', 'copilot'];
  return runAutoDebate(fullChain, userPrompt, 300);
}
