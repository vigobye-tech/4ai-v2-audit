import { invoke } from '@tauri-apps/api/core';
import type { AiServiceId } from './types';

export const runChain = (chain: AiServiceId[], prompt: string) =>
  invoke<string>('run_chain', { chain, prompt });

export const copy = (text: string) => invoke<string>('safe_copy', { text });
export const paste = () => invoke<string>('safe_paste');

export const log = (action: string, details: string) =>
  invoke<string>('log_action', { action, details });

export const testSelector = (serviceId: AiServiceId) =>
  invoke<boolean>('test_selector', { serviceId });

// WebView automation
export const createWebview = (label: string, url: string) =>
  invoke<string>('create_webview', { label, url });

export const injectScript = (label: string, script: string) =>
  invoke<boolean>('inject_script', { label, script });

export const waitForSelector = (label: string, selector: string, timeoutMs: number) =>
  invoke<string>('wait_for_selector', { label, selector, timeout_ms: timeoutMs });

export const waitForFullResponse = (label: string, selector: string, stopWords: string[], timeoutMs: number) =>
  invoke<string>('wait_for_full_response', { label, selector, stopWords, timeoutMs });

export const getTextContent = (label: string, selector: string) =>
  invoke<string>('get_text_content', { label, selector });

export const closeWebview = (label: string) =>
  invoke<boolean>('close_webview', { label });
