import * as ipc from './ipc';
import { runWebViewChain } from './webviewChain';
import { test, expect, vi } from 'vitest';

vi.mock('./ipc');

test('runWebViewChain calls waitForFullResponse and getTextContent', async () => {
  (ipc.createWebview as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('ok');
  (ipc.closeWebview as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  (ipc.waitForFullResponse as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('OK');
  (ipc.getTextContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('AI answer');
  const result = await runWebViewChain(['chatgpt'], 'prompt', false);
  expect(ipc.createWebview).toHaveBeenCalled();
  expect(ipc.waitForFullResponse).toHaveBeenCalled();
  expect(ipc.getTextContent).toHaveBeenCalled();
  expect(ipc.closeWebview).toHaveBeenCalled();
  expect(result).toContain('AI answer');
}, 15000);
