import type { AiServiceId } from './types';

// Check if we're running in Tauri environment - with polling mechanism per Manus recommendation
async function waitForTauriApi(timeout = 5000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
      console.log('[DEBUG] Tauri API detected after waiting');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 50)); // Check every 50ms
  }
  console.log('[DEBUG] Tauri API not detected within timeout');
  return false;
}

// Initial synchronous check for immediate availability
const isTauriSync = typeof window !== 'undefined' && (
  '__TAURI_INTERNALS__' in window || 
  '__TAURI__' in window
);

// Export async function for components to use
export const waitForTauriEnvironment = waitForTauriApi;

console.log('[DEBUG] ipc.ts - isTauri (sync):', isTauriSync);

// Dynamic import for Tauri API (only available in desktop mode)
let invoke: ((cmd: string, args?: Record<string, unknown>) => Promise<any>) | null = null;

// Initialize Tauri invoke function asynchronously
if (isTauriSync) {
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

// Enhanced functions with Manus's timing fix - wait for Tauri API before use
export const runChain = async (chain: AiServiceId[], prompt: string): Promise<string> => {
  const isTauri = await waitForTauriApi();
  return isTauri && invoke ? invoke('run_chain', { chain, prompt }) : webFallback.runChain(chain, prompt);
};

export const copy = async (text: string): Promise<void> => {
  const isTauri = await waitForTauriApi();
  if (isTauri && invoke) {
    return invoke('safe_copy', { text });
  } else {
    await webFallback.copy(text);
    return;
  }
};

export const paste = async (): Promise<string> => {
  const isTauri = await waitForTauriApi();
  return isTauri && invoke ? invoke('safe_paste') : webFallback.paste();
};

export const log = async (action: string, details: string): Promise<string> => {
  const isTauri = await waitForTauriApi();
  if (isTauri && invoke) {
    await invoke('log_action', { action, details });
    return 'OK';
  } else {
    return webFallback.log(action, details);
  }
};

export const testSelector = async (serviceId: AiServiceId): Promise<boolean> => {
  const isTauri = await waitForTauriApi();
  return isTauri && invoke ? invoke('test_selector', { serviceId }) : webFallback.testSelector(serviceId);
};

// WebView automation - CRITICAL: These need desktop environment
export const createWebview = async (label: string, url: string): Promise<string> => {
  const isTauri = await waitForTauriApi();
  console.log('[DEBUG] createWebview - Tauri detected:', isTauri);
  return isTauri && invoke ? invoke('create_webview', { label, url }) : webFallback.createWebview(label, url);
};

export const injectScript = async (label: string, script: string): Promise<boolean> => {
  const isTauri = await waitForTauriApi();
  return isTauri && invoke ? invoke('inject_script', { label, script }) : webFallback.injectScript(label, script);
};

export const waitForSelector = async (label: string, selector: string, timeoutMs: number): Promise<string> => {
  const isTauri = await waitForTauriApi();
  return isTauri && invoke ? invoke('wait_for_selector', { label, selector, timeout_ms: timeoutMs }) : webFallback.waitForSelector(label, selector, timeoutMs);
};

export const waitForFullResponse = async (label: string, selector: string, stopWords: string[], timeoutMs: number): Promise<string> => {
  const isTauri = await waitForTauriApi();
  return isTauri && invoke ? invoke('wait_for_full_response', { label, selector, stopWords, timeoutMs }) : webFallback.waitForFullResponse(label, selector, stopWords, timeoutMs);
};

export const getTextContent = async (label: string, selector: string): Promise<string> => {
  const isTauri = await waitForTauriApi();
  return isTauri && invoke ? invoke('get_text_content', { label, selector }) : webFallback.getTextContent(label, selector);
};

export const closeWebview = async (label: string): Promise<boolean> => {
  const isTauri = await waitForTauriApi();
  return isTauri && invoke ? invoke('close_webview', { label }) : webFallback.closeWebview(label);
};

export const waitForResponseEvent = async (label: string, timeoutMs: number): Promise<string> => {
  const isTauri = await waitForTauriApi();
  if (isTauri && invoke) {
    return invoke('wait_for_response_event', { label, timeoutMs });
  } else {
    console.warn('Web mode: waitForResponseEvent not available - requires desktop app');
    return Promise.resolve('Web mode not supported');
  }
};

export const extractContentFromWindow = async (label: string, serviceId: string): Promise<string> => {
  const isTauri = await waitForTauriApi();
  if (isTauri && invoke) {
    return invoke('extract_content_from_window', { label, serviceId });
  } else {
    console.warn('Web mode: extractContentFromWindow not available - requires desktop app');
    return Promise.resolve('EXTRACTION_NOT_SUPPORTED');
  }
};

export const extractMonitoredContent = async (label: string): Promise<string> => {
  const isTauri = await waitForTauriApi();
  if (isTauri && invoke) {
    return invoke('extract_monitored_content', { label });
  } else {
    console.warn('Web mode: extractMonitoredContent not available - requires desktop app');
    return Promise.resolve('EXTRACTION_NOT_SUPPORTED');
  }
};


