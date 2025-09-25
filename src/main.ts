import { runQuickDebate } from './lib/debateAuto';
import './ui/style.css';
import { runRealChain } from './lib/webviewChain';

declare global {
  interface Window {
    titleOnlyTest?: () => Promise<void>;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');
  if (!app) return;

  // Add postMessage listener for WebView communication fallback
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'tauri-event') {
      console.log('[DEBUG] Received postMessage from WebView:', event.data);
      // Forward to Tauri event system if available
      try {
        if ((window as unknown as Record<string, unknown>).__TAURI__) {
          const tauri = (window as unknown as Record<string, unknown>).__TAURI__ as Record<string, unknown>;
          if (tauri.event && typeof tauri.event === 'object') {
            const eventApi = tauri.event as Record<string, (name: string, data: unknown) => void>;
            if (eventApi.emit) {
              eventApi.emit(event.data.event, event.data.data);
            }
          }
        }
      } catch (error) {
        console.warn('[DEBUG] Failed to forward postMessage to Tauri:', error);
      }
    }
  });

  // Check if running in desktop mode - Manus's timing fix implementation
  console.log('[DEBUG] Starting desktop mode detection...');
  
  // Import the waiting function
  const { waitForTauriEnvironment } = await import('./lib/ipc');
  
  // Use Manus's recommended polling mechanism
  const isDesktop = await waitForTauriEnvironment(3000); // 3 second timeout
  
  console.log('[DEBUG] Desktop mode detected after waiting:', isDesktop);
  if (isDesktop) {
    console.log('[DEBUG] ✅ Tauri API available - Desktop Mode enabled');
  } else {
    console.log('[DEBUG] ❌ Tauri API not detected - Falling back to Web Mode');
  }
  
  const modeIndicator = isDesktop ? 
    '<div class="mode-indicator desktop">🖥️ Desktop Mode</div>' : 
    '<div class="mode-indicator web">🌐 Web Mode - Limited functionality</div>';
  
  app.innerHTML = `
    <h1>4AI v2.0 – WebAI Debate</h1>
    ${modeIndicator}
    <textarea id="promptInput" placeholder="Wpisz temat debaty..." rows="4" cols="60"></textarea><br>
    <button id="quickDebateBtn">💬 Quick Debate</button>
    <button id="creativeBtn">🎨 Creative</button>
    ${isDesktop ? '<button id="titleTestBtn">🧪 Test Title Communication</button>' : ''}
    ${!isDesktop ? '<p class="info">⚠️ Creative chains require desktop app for WebView automation</p>' : ''}
    <div id="results"></div>
  `;

  const promptInput = document.getElementById('promptInput') as HTMLTextAreaElement;
  const results = document.getElementById('results')!;

  document.getElementById('quickDebateBtn')!.onclick = async () => {
    const prompt = promptInput.value.trim();
    if (!prompt) return alert('Wpisz prompt!');
    results.innerHTML = '⏳ Analizuję...';
    const out = await runQuickDebate(prompt);
    results.innerHTML = `<pre>${out}</pre>`;
  };

  document.getElementById('creativeBtn')!.onclick = async () => {
    const prompt = promptInput.value.trim();
    if (!prompt) return alert('Wpisz prompt!');
    results.innerHTML = '⏳ Łańcuch uruchomiony...';
    try {
      const out = await runRealChain(['claude', 'chatgpt', 'gemini'], prompt);
      results.innerHTML = `<pre>${out}</pre>`;
    } catch (error) {
      console.error('Creative chain execution failed:', error);
      results.innerHTML = `<pre class="error-message">❌ Chain execution failed:\n${error}</pre>`;
    }
  };

  // Add title test button handler if in desktop mode
  if (isDesktop) {
    const titleTestBtn = document.getElementById('titleTestBtn');
    if (titleTestBtn) {
      titleTestBtn.onclick = async () => {
        results.innerHTML = '🧪 Running title communication test...';
        try {
          if (window.titleOnlyTest) {
            // Redirect console to results
            const originalLog = console.log;
            let testOutput = '';
            console.log = (...args) => {
              testOutput += args.join(' ') + '\n';
              originalLog(...args);
            };
            
            await window.titleOnlyTest();
            
            // Restore console
            console.log = originalLog;
            
            results.innerHTML = `<pre>${testOutput}</pre>`;
          } else {
            results.innerHTML = '<pre>❌ Title test not available</pre>';
          }
        } catch (error) {
          results.innerHTML = `<pre>❌ Title test failed: ${error}</pre>`;
        }
      };
    }
  }
});