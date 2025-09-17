import { runWebViewChain } from './webviewChain';
import { logger } from './logger';
import type { AiServiceId } from './types';

const debateRoles: Record<AiServiceId, string> = {
  claude: 'Przedstaw swoją argumentację na temat tego pytania. Podaj maksymalnie 3 najważniejsze punkty z uzasadnieniem.',
  chatgpt: 'Przeanalizuj poprzednią argumentację i przedstaw kontr-argumenty. Podaj maksymalnie 3 punkty krytyczne z uzasadnieniem.',
  gemini: 'Przeanalizuj całą dyskusję powyżej i wypracuj zbalansowany kompromis lub wspólny wniosek. Podaj maksymalnie 3 kluczowe punkty syntezy.',
  copilot: 'Przedstaw techniczną perspektywę na tę dyskusję. Podaj maksymalnie 3 praktyczne aspekty implementacji.'
};

export async function runDebateChain(
  chain: AiServiceId[],
  userPrompt: string,
  keepWebViewOpen: boolean = true
): Promise<string> {
  logger.info('debate', 'Starting debate chain', { chain, promptLength: userPrompt.length });
  
  let debateContext = `🎯 TEMAT DEBATY: "${userPrompt}"\n\n`;
  let stepNumber = 1;

  for (const serviceId of chain) {
    const role = debateRoles[serviceId];
    let promptToSend: string;

    if (stepNumber === 1) {
      // Pierwszy AI - dostaje tylko pierwotne pytanie
      promptToSend = `${userPrompt}\n\n${role}`;
    } else {
      // Kolejne AI - dostają całą dotychczasową debatę
      promptToSend = `${debateContext}\n\n${role}`;
    }

    logger.info('debate', `Step ${stepNumber}: ${serviceId}`, { promptLength: promptToSend.length });
    
    try {
      const response = await runWebViewChain([serviceId], promptToSend, keepWebViewOpen);
      
      // Dodaj odpowiedź do kontekstu debaty
      debateContext += `📝 KROK ${stepNumber} - ${serviceId.toUpperCase()}:\n${response}\n\n`;
      stepNumber++;
      
      logger.info('debate', `${serviceId} completed`, { responseLength: response.length });
    } catch (error) {
      logger.error('debate', `${serviceId} failed in debate`, { error: String(error) });
      debateContext += `❌ KROK ${stepNumber} - ${serviceId.toUpperCase()} FAILED:\n${error}\n\n`;
      stepNumber++;
    }
  }

  // Dodaj podsumowanie
  debateContext += `\n🏁 KONIEC DEBATY - ${chain.length} ekspertów wypowiedziało się na temat: "${userPrompt}"`;
  
  logger.info('debate', 'Debate chain completed', { totalLength: debateContext.length, steps: stepNumber - 1 });
  return debateContext;
}

export const debateTemplates = [
  {
    name: '🎯 Classic Debate',
    chain: ['claude', 'chatgpt', 'gemini'] as AiServiceId[],
    description: 'Claude argumentuje → ChatGPT kontruje → Gemini syntetyzuje'
  },
  {
    name: '💻 Tech Debate',
    chain: ['chatgpt', 'copilot', 'claude'] as AiServiceId[],
    description: 'ChatGPT proponuje → Copilot analizuje tech → Claude syntetyzuje'
  },
  {
    name: '🌐 Global Perspective',
    chain: ['gemini', 'claude', 'chatgpt'] as AiServiceId[],
    description: 'Gemini globalne → Claude europejskie → ChatGPT amerykańskie'
  },
  {
    name: '🔄 Full Circle',
    chain: ['claude', 'chatgpt', 'gemini', 'copilot'] as AiServiceId[],
    description: 'Wszystkie 4 AI w debacie - pełna perspektywa'
  }
];
