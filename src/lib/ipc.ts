import type { AiServiceId } from './types';

// Check if we're running in Tauri environment - enhanced detection
const isTauri = typeof window !== 'undefined' && (
  '__TAURI_INTERNALS__' in window || 
  '__TAURI__' in window ||
  (window as Record<string, unknown>).__TAURI_INTERNALS__ ||
  (window as Record<string, unknown>).__TAURI__
);

console.log('[DEBUG] ipc.ts - isTauri:', isTauri);

// Dynamic import for Tauri API (only available in desktop mode)
let invoke: ((cmd: string, args?: Record<string, unknown>) => Promise<any>) | null = null;

// Initialize Tauri invoke function asynchronously
if (isTauri) {
  (async () => {
    try {
      const tauriCore = await import('@tauri-apps/api/tauri');
      invoke = tauriCore.invoke;
    } catch (error) {
      console.warn('Failed to load Tauri API:', error);
    }
  })();
}

// Web fallback functions
const webFallback = {
  runChain: async (_chain: AiServiceId[], _prompt: string): Promise<string> => {
    console.warn('Web mode: runChain not available - requires desktop app');
    return `❌ Desktop-only feature: Chain execution requires Tauri desktop app`;
  },
  copy: async (text: string): Promise<string> => {
    try {
      await navigator.clipboard.writeText(text);
      return 'OK';
    } catch (error) {
      console.warn('Copy failed:', error);
      return 'FAILED';
    }
  },
  paste: async (): Promise<string> => {
    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      console.warn('Paste failed:', error);
      return '';
    }
  },
  log: async (action: string, details: string): Promise<string> => {
    console.log(`[Web Log] ${action}:`, details);
    return 'OK';
  },
  testSelector: async (_serviceId: AiServiceId): Promise<boolean> => {
    console.warn('Web mode: testSelector not available - requires desktop app');
    return false;
  },
  createWebview: async (_label: string, _url: string): Promise<string> => {
    console.warn('Web mode: createWebview not available - requires desktop app');
    throw new Error('WebView creation requires desktop app environment');
  },
  injectScript: async (_label: string, _script: string): Promise<boolean> => {
    console.warn('Web mode: injectScript not available - requires desktop app');
    return false;
  },
  waitForSelector: async (_label: string, _selector: string, _timeoutMs: number): Promise<string> => {
    console.warn('Web mode: waitForSelector not available - requires desktop app');
    throw new Error('Selector waiting requires desktop app environment');
  },
  waitForFullResponse: async (_label: string, _selector: string, _stopWords: string[], _timeoutMs: number): Promise<string> => {
    console.warn('Web mode: waitForFullResponse not available - requires desktop app');
    throw new Error('Response waiting requires desktop app environment');
  },
  getTextContent: async (_label: string, _selector: string): Promise<string> => {
    console.warn('Web mode: getTextContent not available - requires desktop app');
    throw new Error('Text extraction requires desktop app environment');
  },
  closeWebview: async (_label: string): Promise<boolean> => {
    console.warn('Web mode: closeWebview not available - requires desktop app');
    return false;
  }
};

// Export functions with fallbacks
export const runChain = (chain: AiServiceId[], prompt: string) =>
  isTauri && invoke ? invoke('run_chain', { chain, prompt }) : webFallback.runChain(chain, prompt);

export const copy = (text: string) =>
  isTauri && invoke ? invoke('safe_copy', { text }) : webFallback.copy(text);

export const paste = () =>
  isTauri && invoke ? invoke('safe_paste') : webFallback.paste();

export const log = (action: string, details: string) =>
  isTauri && invoke ? invoke('log_action', { action, details }) : webFallback.log(action, details);

export const testSelector = (serviceId: AiServiceId) =>
  isTauri && invoke ? invoke('test_selector', { serviceId }) : webFallback.testSelector(serviceId);

// WebView automation
export const createWebview = (label: string, url: string) =>
  isTauri && invoke ? invoke('create_webview', { label, url }) : webFallback.createWebview(label, url);

export const injectScript = (label: string, script: string) =>
  isTauri && invoke ? invoke('inject_script', { label, script }) : webFallback.injectScript(label, script);

export const waitForSelector = (label: string, selector: string, timeoutMs: number) =>
  isTauri && invoke ? invoke('wait_for_selector', { label, selector, timeout_ms: timeoutMs }) : webFallback.waitForSelector(label, selector, timeoutMs);

export const waitForFullResponse = (label: string, selector: string, stopWords: string[], timeoutMs: number) =>
  isTauri && invoke ? invoke('wait_for_full_response', { label, selector, stopWords, timeoutMs }) : webFallback.waitForFullResponse(label, selector, stopWords, timeoutMs);

export const getTextContent = (label: string, selector: string) =>
  isTauri && invoke ? invoke('get_text_content', { label, selector }) : webFallback.getTextContent(label, selector);

export const closeWebview = (label: string) =>
  isTauri && invoke ? invoke('close_webview', { label }) : webFallback.closeWebview(label);
