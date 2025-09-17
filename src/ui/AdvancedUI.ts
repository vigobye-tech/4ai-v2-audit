// ...existing code...
import { buildChain } from '../lib/chains';
import { runWebViewChain } from '../lib/webviewChain';
import { runDebateChain, debateTemplates } from '../lib/debate';
import { runQuickDebate, runFullDebate } from '../lib/debateAuto';
import { history } from '../lib/history';
import { settings } from '../lib/settings';
import { logger } from '../lib/logger';
import type { AiServiceId } from '../lib/types';

export function renderAdvancedUI(rootId: string): void {
  const root = document.getElementById(rootId);
  if (!root) return;

  // Global function for history item clicking - define first
  (globalThis as unknown as { loadHistoryPrompt: (encodedPrompt: string) => void }).loadHistoryPrompt = (encodedPrompt: string): void => {
    const prompt = decodeURIComponent(encodedPrompt);
    const promptInput = document.getElementById('prompt') as HTMLTextAreaElement;
    if (promptInput) {
      promptInput.value = prompt;
    }
    
    // Close panel
    const sidePanel = document.getElementById('sidePanel') as HTMLElement;
    if (sidePanel) {
      sidePanel.classList.add('hidden');
    }
  };

  root.innerHTML = `
    <header class="top-bar">
      <h1>4-AI Lab v2.0</h1>
      <div class="controls">
        <button id="darkToggle">🌙</button>
        <button id="historyBtn">📜</button>
        <button id="settingsBtn">⚙️</button>
      </div>
    </header>

    <section class="quick-actions" id="quickActions"></section>

    <section class="input-area">
      <textarea id="prompt" placeholder="Enter your prompt..."></textarea>
      <div class="actions">
        <button id="sendBtn">▶ Run Real Chain</button>
        <button id="randomBtn">🎲 Random Chain</button>
        <button id="debateBtn">💬 Debate Mode</button>
        <label style="margin-left: 10px;">
          <input type="checkbox" id="keepWebViewOpen" checked> Keep WebViews Open
        </label>
      </div>
    </section>

    <section class="output-area">
      <textarea id="output" placeholder="Chain results will appear here..." readonly></textarea>
    </section>

    <aside id="sidePanel" class="side-panel hidden">
      <div class="panel-header">
        <span id="panelTitle">History</span>
        <button id="closePanel">✖</button>
      </div>
      <div id="panelContent"></div>
    </aside>

    <footer class="status-bar">
      <span id="status">Ready</span>
      <span id="chainInfo"></span>
    </footer>
  `;

  setupEventHandlers();
  applySettings();
}

function setupEventHandlers(): void {
  const promptInput = document.getElementById('prompt') as HTMLTextAreaElement;
  const outputArea = document.getElementById('output') as HTMLTextAreaElement;
  const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
  const randomBtn = document.getElementById('randomBtn') as HTMLButtonElement;
  const debateBtn = document.getElementById('debateBtn') as HTMLButtonElement;
  const darkToggle = document.getElementById('darkToggle') as HTMLButtonElement;
  const historyBtn = document.getElementById('historyBtn') as HTMLButtonElement;
  const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;
  const sidePanel = document.getElementById('sidePanel') as HTMLElement;
  const closePanel = document.getElementById('closePanel') as HTMLButtonElement;
  const status = document.getElementById('status') as HTMLElement;
  const chainInfo = document.getElementById('chainInfo') as HTMLElement;

  // Quick actions
  const qaBar = document.getElementById('quickActions') as HTMLElement;
  const templates = [
    { label: '✨ Creative', chain: ['claude', 'chatgpt'] as AiServiceId[] },
    { label: '💻 Code', chain: ['chatgpt', 'copilot'] as AiServiceId[] },
    { label: '🔍 Research', chain: ['chatgpt', 'gemini'] as AiServiceId[] },
    { label: '🌐 Translate', chain: ['gemini', 'claude'] as AiServiceId[] },
  ];
  templates.forEach(({ label, chain }) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.onclick = async () => {
      // For Creative, always run a simple chain, not debate
      if (label === '✨ Creative') {
        const prompt = promptInput.value.trim();
        if (!prompt) {
          status.textContent = 'Please enter a prompt';
          return;
        }
        const keepOpenCheckbox = document.getElementById('keepWebViewOpen') as HTMLInputElement;
        const keepOpen = keepOpenCheckbox ? keepOpenCheckbox.checked : true;
        status.textContent = 'Opening WebViews...';
        chainInfo.textContent = chain.join(' → ') + (keepOpen ? ' (keeping open)' : ' (auto-close)');
        sendBtn.disabled = true;
        randomBtn.disabled = true;
        history.add(prompt, chain);
        logger.chain(chain, prompt);
        try {
          outputArea.value = 'Starting chain execution...\n';
          const result = await runWebViewChain(chain, prompt, keepOpen);
          outputArea.value = result;
          status.textContent = keepOpen ? 'Chain completed - WebViews kept open' : 'Chain completed successfully';
          logger.info('ui', 'Chain finished', { result: result.slice(0, 100) });
        } catch (error) {
          const errorMsg = `Chain failed: ${error}`;
          outputArea.value = errorMsg;
          status.textContent = 'Error occurred';
          logger.error('ui', 'Chain failed', { error: String(error) });
        } finally {
          sendBtn.disabled = false;
          randomBtn.disabled = false;
        }
      } else {
        runRealChain(chain);
      }
    };
    qaBar.appendChild(btn);
  });

  // Auto Debate buttons
  const autoDebateQuickBtn = document.createElement('button');
  autoDebateQuickBtn.textContent = '🚀 Quick Debate (500w)';
  autoDebateQuickBtn.style.background = '#ff6b35';
  autoDebateQuickBtn.style.color = 'white';
  autoDebateQuickBtn.onclick = async () => {
    const prompt = promptInput.value.trim();
    if (!prompt) {
      alert('Wprowadź pytanie dla debaty');
      return;
    }
    
    status.textContent = '🚀 Starting Quick Auto Debate...';
    chainInfo.textContent = 'QUICK DEBATE: Claude → ChatGPT → Gemini (500w each)';
    
    try {
      const result = await runQuickDebate(prompt);
      outputArea.value = result;
      status.textContent = '✅ Quick Debate completed';
      logger.info('ui', 'Quick auto debate finished', { resultLength: result.length });
    } catch (error) {
      status.textContent = '❌ Quick Debate failed';
      logger.error('ui', 'Quick auto debate error', { error: String(error) });
      alert('Błąd podczas Quick Debate: ' + error);
    }
  };
  qaBar.appendChild(autoDebateQuickBtn);

  const autoDebateFullBtn = document.createElement('button');
  autoDebateFullBtn.textContent = '🎯 Full Debate (300w)';
  autoDebateFullBtn.style.background = '#2d5a87';
  autoDebateFullBtn.style.color = 'white';
  autoDebateFullBtn.onclick = async () => {
    const prompt = promptInput.value.trim();
    if (!prompt) {
      alert('Wprowadź pytanie dla debaty');
      return;
    }
    
    status.textContent = '🎯 Starting Full Auto Debate...';
    chainInfo.textContent = 'FULL DEBATE: Claude → ChatGPT → Gemini → Copilot (300w each)';
    
    try {
      const result = await runFullDebate(prompt);
      outputArea.value = result;
      status.textContent = '✅ Full Debate completed';
      logger.info('ui', 'Full auto debate finished', { resultLength: result.length });
    } catch (error) {
      status.textContent = '❌ Full Debate failed';
      logger.error('ui', 'Full auto debate error', { error: String(error) });
      alert('Błąd podczas Full Debate: ' + error);
    }
  };
  qaBar.appendChild(autoDebateFullBtn);

  // Debate templates
  debateTemplates.forEach((template) => {
    const btn = document.createElement('button');
    btn.textContent = template.name;
    btn.title = template.description;
    btn.onclick = () => runDebateMode(template.chain);
    btn.style.backgroundColor = '#4a5568';
    btn.style.border = '2px solid #e2e8f0';
    qaBar.appendChild(btn);
  });

  // Real WebAI chain execution
  async function runRealChain(chain: AiServiceId[]) {
    const prompt = promptInput.value.trim();
    if (!prompt) {
      status.textContent = 'Please enter a prompt';
      return;
    }
    
    // Check if we should keep WebViews open
    const keepOpenCheckbox = document.getElementById('keepWebViewOpen') as HTMLInputElement;
    const keepOpen = keepOpenCheckbox ? keepOpenCheckbox.checked : true;
    
    status.textContent = 'Opening WebViews...';
    chainInfo.textContent = chain.join(' → ') + (keepOpen ? ' (keeping open)' : ' (auto-close)');
    sendBtn.disabled = true;
    randomBtn.disabled = true;
    
    history.add(prompt, chain);
    logger.chain(chain, prompt);

    try {
      outputArea.value = 'Starting chain execution...\n';
      const result = await runWebViewChain(chain, prompt, keepOpen);
      outputArea.value = result;
      status.textContent = keepOpen ? 'Chain completed - WebViews kept open' : 'Chain completed successfully';
      logger.info('ui', 'Chain finished', { result: result.slice(0, 100) });
    } catch (error) {
      const errorMsg = `Chain failed: ${error}`;
      outputArea.value = errorMsg;
      status.textContent = 'Error occurred';
      logger.error('ui', 'Chain failed', { error: String(error) });
    } finally {
      sendBtn.disabled = false;
      randomBtn.disabled = false;
    }
  }

  // Debate Mode execution
  async function runDebateMode(chain: AiServiceId[]) {
    const prompt = promptInput.value.trim();
    if (!prompt) {
      status.textContent = 'Please enter a debate topic';
      return;
    }
    
    // Check if we should keep WebViews open
    const keepOpenCheckbox = document.getElementById('keepWebViewOpen') as HTMLInputElement;
    const keepOpen = keepOpenCheckbox ? keepOpenCheckbox.checked : true;
    
    status.textContent = '💬 Starting debate...';
    chainInfo.textContent = `DEBATE: ${chain.join(' → ')} ${keepOpen ? '(keeping open)' : '(auto-close)'}`;
    sendBtn.disabled = true;
    randomBtn.disabled = true;
    
    history.add(prompt, chain);
    logger.info('ui', 'Debate started', { chain, prompt: prompt.slice(0, 50) });

    try {
      outputArea.value = 'Starting debate between AI experts...\n';
      const result = await runDebateChain(chain, prompt, keepOpen);
      outputArea.value = result;
      status.textContent = keepOpen ? 'Debate completed - WebViews kept open' : 'Debate completed successfully';
      logger.info('ui', 'Debate finished', { result: result.slice(0, 100) });
    } catch (error) {
      const errorMsg = `Debate failed: ${error}`;
      outputArea.value = errorMsg;
      status.textContent = 'Debate error occurred';
      logger.error('ui', 'Debate failed', { error: String(error) });
    } finally {
      sendBtn.disabled = false;
      randomBtn.disabled = false;
    }
  }

  // Send button handler
  sendBtn.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    const chain = buildChain(prompt);
    await runRealChain(chain);
  });

  // Random chain button
  randomBtn.addEventListener('click', () => {
    const allServices: AiServiceId[] = ['chatgpt', 'claude', 'gemini', 'copilot'];
    const shuffled = [...allServices].sort(() => Math.random() - 0.5).slice(0, 2) as AiServiceId[];
    runRealChain(shuffled);
  });

  // Dark mode toggle
  darkToggle.addEventListener('click', () => {
    settings.toggle('darkMode');
    applySettings();
  });

  // Debate Mode button
  debateBtn?.addEventListener('click', async () => {
    const prompt = (document.getElementById('prompt') as HTMLTextAreaElement)?.value;
    
    if (!prompt.trim()) {
      alert('Wprowadź pytanie dla debaty');
      return;
    }

    // Użyj domyślnego łańcucha debaty: wszystkie 4 AI
    const debateChain: AiServiceId[] = ['chatgpt', 'claude', 'gemini', 'copilot'];

    try {
      status.textContent = '💬 Starting debate mode...';
      await runDebateChain(debateChain, prompt, true);
      status.textContent = '✅ Debate completed';
      console.log('Debate chain completed');
    } catch (error) {
      console.error('Error running debate chain:', error);
      status.textContent = '❌ Debate failed';
      alert('Błąd podczas uruchamiania debaty');
    }
  });

  // History panel
  historyBtn.addEventListener('click', () => {
    showPanel('History', renderHistory());
  });

  // Settings panel
  settingsBtn.addEventListener('click', () => {
    showPanel('Settings', renderSettings());
  });

  // Close panel
  closePanel.addEventListener('click', () => {
    sidePanel.classList.add('hidden');
  });

  // Keyboard shortcuts
  promptInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      sendBtn.click();
    }
  });

  function showPanel(title: string, content: string): void {
    const panelTitle = document.getElementById('panelTitle') as HTMLElement;
    const panelContent = document.getElementById('panelContent') as HTMLElement;
    
    panelTitle.textContent = title;
    panelContent.innerHTML = content;
    sidePanel.classList.remove('hidden');
  }
}

function renderHistory(): string {
  const items = history.getAll();
  if (items.length === 0) {
    return '<p class="empty">No history yet</p>';
  }

  return `
    <div class="history-search">
      <input type="text" placeholder="Search history..." id="historySearch">
    </div>
    <div class="history-list">
      ${items.map(item => `
        <div class="history-item" data-prompt="${encodeURIComponent(item.prompt)}" onclick="loadHistoryPrompt('${encodeURIComponent(item.prompt)}')">
          <div class="history-prompt">${item.prompt}</div>
          <div class="history-meta">
            <span class="chain">${item.chain.join(' → ')}</span>
            <span class="time">${new Date(item.timestamp).toLocaleString()}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSettings(): string {
  const current = settings.load();
  
  return `
    <div class="settings-list">
      <div class="setting-item">
        <label>
          <input type="checkbox" id="autoChain" ${current.autoChain ? 'checked' : ''}>
          Auto Chain Detection
        </label>
      </div>
      <div class="setting-item">
        <label>
          <input type="checkbox" id="darkMode" ${current.darkMode ? 'checked' : ''}>
          Dark Mode
        </label>
      </div>
      <div class="setting-item">
        <label>
          <input type="checkbox" id="strictInjection" ${current.strictInjection ? 'checked' : ''}>
          Strict Injection
        </label>
      </div>
      <div class="setting-actions">
        <button id="clearHistory">Clear History</button>
        <button id="exportSettings">Export Settings</button>
      </div>
    </div>
  `;
}

function applySettings(): void {
  const current = settings.load();
  const html = document.documentElement;
  
  if (current.darkMode) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}
