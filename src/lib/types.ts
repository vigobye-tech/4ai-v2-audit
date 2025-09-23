export type AiServiceId = 'chatgpt' | 'claude' | 'gemini' | 'copilot';

export interface AiService {
  name: string;
  url: string;
  selectors: string[];
  sendSelector?: string;
  responseSelector: string;
  loginSelectors?: string[];
}

// New config-based interfaces
export interface SelectorConfig {
  inputSelectors: string[];
  sendSelectors: string[];
  responseSelectors: string[];
  version: string;
  fallbackStrategy: 'try_all_selectors' | 'fail_fast';
}

// Unified service interface for backward compatibility
export interface UnifiedAiService {
  name: string;
  url: string;
  // Legacy format
  selectors?: string[];
  sendSelector?: string;
  responseSelector?: string;
  // New format  
  inputSelectors?: string[];
  sendSelectors?: string[];
  responseSelectors?: string[];
}

export interface WebAiSelectorsConfig {
  version: string;
  lastUpdated: string;
  services: Record<AiServiceId, SelectorConfig & { name: string; url: string; }>;
}

export type ChainTag = 'creative' | 'coding' | 'research' | 'translation';

export interface ChainTemplate {
  tag: ChainTag;
  chain: AiServiceId[];
  description: string;
}

// Default services as fallback when config loading fails
const defaultAiServices: Record<AiServiceId, AiService> = {
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
    responseSelector: '[data-is-streaming="false"] .font-claude-message, .font-claude-message, [data-role="assistant"], .assistant-response, .claude-response, .response-content',
    loginSelectors: ['[data-testid="login-button"]'],
  },
  gemini: {
    name: 'Gemini',
    url: 'https://gemini.google.com',
    selectors: ['.ql-editor', '[contenteditable="true"]'],
    sendSelector: '[aria-label="Send message"]',
    responseSelector: '[data-response-index] .markdown, .model-response-text, [data-response-index], .response-content .markdown, .bard-response, .gemini-response, .model-response .markdown, [role="presentation"] .markdown',
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

// Config loading function
async function loadSelectorConfig(): Promise<Record<AiServiceId, AiService>> {
  try {
    // Try to load from config file (different approach for different environments)
    let configData: WebAiSelectorsConfig;
    
    // Check if we're in Node.js environment (tests) vs browser environment
    if (typeof window === 'undefined') {
      // Node.js environment - use dynamic import
      const fs = await import(/* @vite-ignore */ 'fs');
      const path = await import(/* @vite-ignore */ 'path');
      const configPath = path.resolve('./config/webai-selectors.json');
      const configContent = fs.readFileSync(configPath, 'utf-8');
      configData = JSON.parse(configContent);
    } else {
      // Browser environment - use fetch
      const configPath = './config/webai-selectors.json';
      const response = await fetch(configPath);
      if (!response.ok) {
        throw new Error(`Config not found: ${configPath}`);
      }
      configData = await response.json();
    }
    
    // Validate config structure
    if (!configData.services || typeof configData.services !== 'object') {
      console.warn('Invalid config structure, using defaults');
      return defaultAiServices;
    }
    
    // Transform config to AiService format
    const services: Record<AiServiceId, AiService> = {} as Record<AiServiceId, AiService>;
    
    for (const [serviceId, serviceConfig] of Object.entries(configData.services)) {
      if (serviceId in defaultAiServices) {
        const config = serviceConfig as SelectorConfig & { name: string; url: string; };
        services[serviceId as AiServiceId] = {
          name: config.name,
          url: config.url,
          selectors: config.inputSelectors || [],
          sendSelector: config.sendSelectors?.[0] || defaultAiServices[serviceId as AiServiceId].sendSelector,
          responseSelector: config.responseSelectors?.[0] || defaultAiServices[serviceId as AiServiceId].responseSelector,
          loginSelectors: defaultAiServices[serviceId as AiServiceId].loginSelectors,
        };
      }
    }
    
    return services;
  } catch (error) {
    console.warn('Failed to load selector config, using defaults:', error);
    return defaultAiServices;
  }
}

// Export a promise that resolves to the loaded services
export const aiServicesPromise = loadSelectorConfig();

// Export the default services for immediate use (backward compatibility)
export const aiServices = defaultAiServices;
