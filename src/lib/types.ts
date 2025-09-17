export type AiServiceId = 'chatgpt' | 'claude' | 'gemini' | 'copilot';

export interface AiService {
  name: string;
  url: string;
  selectors: string[];
  sendSelector?: string;
  responseSelector: string;
  loginSelectors?: string[];
}

export type ChainTag = 'creative' | 'coding' | 'research' | 'translation';

export interface ChainTemplate {
  tag: ChainTag;
  chain: AiServiceId[];
  description: string;
}

export const aiServices: Record<AiServiceId, AiService> = {
  chatgpt: {
    name: 'ChatGPT',
    url: 'https://chat.openai.com',
    selectors: [
      '#prompt-textarea', 
      '[data-id="root"] textarea',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="message"]',
      '.w-full textarea',
      'main textarea'
    ],
    sendSelector: '[data-testid="send-button"], button[aria-label="Send prompt"], button[type="submit"], .send-button, button:has(svg)',
    responseSelector: '[data-message-author-role="assistant"] .markdown, [data-message-author-role="assistant"], .assistant-message, .message.assistant, [role="assistant"], .response-message',
    loginSelectors: ['[data-testid="login-button"]'],
  },
  claude: {
    name: 'Claude',
    url: 'https://claude.ai',
    selectors: ['[contenteditable="true"]', '.ProseMirror'],
    sendSelector: '[aria-label="Send Message"]',
    responseSelector: '[data-is-streaming="false"] .font-claude-message',
    loginSelectors: ['[data-testid="login-button"]'],
  },
  gemini: {
    name: 'Gemini',
    url: 'https://gemini.google.com',
    selectors: ['.ql-editor', '[contenteditable="true"]'],
    sendSelector: '[aria-label="Send message"]',
    responseSelector: '[data-response-index] .markdown',
    loginSelectors: ['[data-action="sign-in"]'],
  },
  copilot: {
    name: 'Copilot',
    url: 'https://copilot.microsoft.com',
    selectors: ['#userInput', 'textarea[placeholder*="Ask me anything"]'],
    sendSelector: '[aria-label="Submit"]',
    responseSelector: '[data-content="copilot-response"] .ac-textBlock',
    loginSelectors: ['[data-testid="sign-in"]'],
  },
};
