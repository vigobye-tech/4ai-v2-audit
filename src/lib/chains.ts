import type { AiServiceId, ChainTag, ChainTemplate } from './types';

export const chainTemplates: Record<ChainTag, ChainTemplate> = {
  creative: {
    tag: 'creative',
    chain: ['claude', 'chatgpt'],
    description: 'Creative → Polish',
  },
  coding: {
    tag: 'coding',
    chain: ['chatgpt', 'copilot'],
    description: 'Generate → Debug',
  },
  research: {
    tag: 'research',
    chain: ['chatgpt', 'gemini'],
    description: 'Generate → Verify',
  },
  translation: {
    tag: 'translation',
    chain: ['gemini', 'claude'],
    description: 'Translate → Refine',
  },
};

export function suggestChainTag(prompt: string): ChainTag | null {
  const p = prompt.toLowerCase();
  if (p.includes('translate') || p.includes('tłumacz')) return 'translation';
  if (p.includes('code') || p.includes('debug') || p.includes('program')) return 'coding';
  if (p.includes('research') || p.includes('fact') || p.includes('analysis')) return 'research';
  if (p.includes('story') || p.includes('creative') || p.includes('novel')) return 'creative';
  return null;
}

export function buildChain(prompt: string): AiServiceId[] {
  const tag = suggestChainTag(prompt);
  return tag ? chainTemplates[tag].chain : ['chatgpt']; // fallback
}
