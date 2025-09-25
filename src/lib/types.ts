export type AiServiceId = 'chatgpt' | 'claude' | 'gemini' | 'copilot';

// Tauri API declarations
declare global {
  interface Window {
    __TAURI__: {
      invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
    };
  }
}

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

// Embedded config as fallback (Manus suggestion for robustness)
function getEmbeddedSelectorConfig(): WebAiSelectorsConfig {
  return {
    version: "1.0.0",
    lastUpdated: "2025-09-24",
    services: {
      chatgpt: {
        name: "ChatGPT",
        url: "https://chat.openai.com",
        inputSelectors: [
          "#prompt-textarea",
          "textarea[placeholder*='Message']",
          "[contenteditable='true']"
        ],
        sendSelectors: [
          "[data-testid='send-button']",
          "button[aria-label*='Send']",
          "button[type='submit']"
        ],
        responseSelectors: [
          "[data-message-author-role='assistant'] .markdown",
          "[data-message-author-role='assistant']",
          ".prose",
          "[data-testid='conversation-turn']"
        ],
        version: "2024-09-24",
        fallbackStrategy: "try_all_selectors"
      },
      claude: {
        name: "Claude",
        url: "https://claude.ai",
        inputSelectors: [
          ".ProseMirror[contenteditable='true']",
          "[contenteditable='true']",
          "textarea"
        ],
        sendSelectors: [
          "button[aria-label='Send Message']",
          "button[aria-label*='Send']",
          "[data-testid='send-button']"
        ],
        responseSelectors: [
          "[data-testid='message-content']",
          ".font-claude-message",
          ".prose",
          "[role='presentation'] div:last-child",
          ".conversation-content div:last-child"
        ],
        version: "2024-09-24", 
        fallbackStrategy: "try_all_selectors"
      },
      gemini: {
        name: "Gemini",
        url: "https://gemini.google.com",
        inputSelectors: [
          "textarea[placeholder*='Enter a prompt']",
          ".ql-editor[contenteditable='true']",
          "textarea"
        ],
        sendSelectors: [
          "button[aria-label='Send message']",
          "button[data-testid='send-button']"
        ],
        responseSelectors: [
          ".model-response-text",
          ".response-container-content",
          ".markdown-content"
        ],
        version: "2024-09-24",
        fallbackStrategy: "try_all_selectors"
      },
      copilot: {
        name: "GitHub Copilot Chat",
        url: "https://github.com/copilot",
        inputSelectors: [
          "textarea[placeholder*='Ask Copilot']",
          ".copilot-input",
          "textarea"
        ],
        sendSelectors: [
          "button[aria-label='Send']",
          ".send-button"
        ],
        responseSelectors: [
          ".copilot-response",
          ".markdown-body",
          ".response-content"
        ],
        version: "2024-09-24",
        fallbackStrategy: "try_all_selectors"
      }
    }
  };
}

// Config loading function
async function loadSelectorConfig(): Promise<Record<AiServiceId, AiService>> {
  try {
    // Try to load from config file (different approach for different environments)
    let configData: WebAiSelectorsConfig | undefined;
    
    // Check if we're in Node.js environment (tests) vs browser environment
    if (typeof window === 'undefined') {
      // Node.js environment - use dynamic import
      const fs = await import(/* @vite-ignore */ 'fs');
      const path = await import(/* @vite-ignore */ 'path');
      const configPath = path.resolve('./config/webai-selectors.json');
      const configContent = fs.readFileSync(configPath, 'utf-8');
      configData = JSON.parse(configContent);
    } else {
      // Browser/Tauri environment - implement Manus's robust fallback strategy
      const isTauri = typeof window !== 'undefined' && (
        '__TAURI_INTERNALS__' in window || 
        '__TAURI__' in window ||
        ('__TAURI_INTERNALS__' in window) ||
        ('__TAURI__' in window)
      );
      
      if (isTauri) {
        // Tauri environment - multiple fallback strategies
        const strategies = [
          // Strategy 1: Try resource resolution
          async (): Promise<WebAiSelectorsConfig> => {
            const { readTextFile } = await import('@tauri-apps/api/fs');
            const { resolveResource } = await import('@tauri-apps/api/path');
            const configPath = await resolveResource('config/webai-selectors.json');
            const configContent = await readTextFile(configPath);
            return JSON.parse(configContent);
          },
          // Strategy 2: Try app directory
          async (): Promise<WebAiSelectorsConfig> => {
            const { readTextFile } = await import('@tauri-apps/api/fs');
            const { appDataDir } = await import('@tauri-apps/api/path');
            const appDataDirectory = await appDataDir();
            const configPath = `${appDataDirectory}config/webai-selectors.json`;
            const configContent = await readTextFile(configPath);
            return JSON.parse(configContent);
          },
          // Strategy 3: Use embedded config (always succeeds)
          async (): Promise<WebAiSelectorsConfig> => {
            console.log('Using embedded selector configuration as robust fallback');
            return getEmbeddedSelectorConfig();
          }
        ];
        
        for (let i = 0; i < strategies.length; i++) {
          try {
            configData = await strategies[i]();
            if (i < strategies.length - 1) {
              console.log(`Config loaded successfully using Tauri strategy ${i + 1}`);
            }
            break;
          } catch (error) {
            console.warn(`Config loading strategy ${i + 1} failed:`, error);
            // Continue to next strategy
          }
        }
      } else {
        // Web browser environment - use fetch with embedded fallback
        try {
          const configPaths = [
            './config/webai-selectors.json',
            '/config/webai-selectors.json'
          ];
          
          let lastError: Error | null = null;
          for (const configPath of configPaths) {
            try {
              const response = await fetch(configPath);
              if (response.ok) {
                configData = await response.json();
                break;
              }
            } catch (error) {
              lastError = error as Error;
            }
          }
          
          if (!configData) {
            throw lastError || new Error('All web config paths failed');
          }
        } catch (error) {
          console.warn('Web config loading failed, using embedded config:', error);
          configData = getEmbeddedSelectorConfig();
        }
      }
    }
    
    // Ensure we have config data (fallback if all strategies failed)
    if (!configData) {
      console.warn('No config data available, using embedded fallback');
      configData = getEmbeddedSelectorConfig();
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
