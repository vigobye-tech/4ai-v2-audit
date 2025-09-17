// Stop words do detekcji końca generowania przez LLM
export const stopWords = ['…', 'continue', 'generating', 'Read more', 'Show more'];
import type { AiServiceId } from './types';

export function buildRelayPrompt(
  previousAnswer: string,
  serviceId: AiServiceId,
  userPrompt: string,
  maxWords: number = 500
): string {
  const instructions: Record<AiServiceId, string> = {
    claude: `Oto pytanie: "${userPrompt}". Przedstaw swoją argumentację – maksymalnie ${maxWords} słów.`,
    chatgpt: `Oto argumentacja: "${previousAnswer}". Przedstaw kontr-argumenty – maksymalnie ${maxWords} słów.`,
    gemini: `Oto argumentacja i kontr-argumenty: "${previousAnswer}". Wypracuj zbalansowany kompromis – maksymalnie ${maxWords} słów.`,
    copilot: `Oto cała dyskusja: "${previousAnswer}". Podsumuj i podaj 3 kluczowe wnioski – maksymalnie ${maxWords} słów.`,
  };
  
  return instructions[serviceId] || userPrompt;
}

export function buildChainPrompt(
  context: string,
  serviceId: AiServiceId,
  originalPrompt: string,
  maxWords: number = 500
): string {
  const role = getRoleForService(serviceId);
  
  if (!context || context === originalPrompt) {
    // Pierwszy w łańcuchu
    return `${role} Odpowiedz na: "${originalPrompt}" - maksymalnie ${maxWords} słów.`;
  } else {
    // Kolejny w łańcuchu
    return `${role} Kontekst poprzednich odpowiedzi: "${context.slice(-1000)}" 
    
Teraz odpowiedz na: "${originalPrompt}" - biorąc pod uwagę powyższy kontekst. Maksymalnie ${maxWords} słów.`;
  }
}

function getRoleForService(serviceId: AiServiceId): string {
  const roles: Record<AiServiceId, string> = {
    claude: 'Jako analityk i krytyk:',
    chatgpt: 'Jako ekspert i doradca:',
    gemini: 'Jako mediator i synteza:',
    copilot: 'Jako praktyk i implementator:',
  };
  
  return roles[serviceId] || '';
}
