import { runQuickDebate } from './lib/debateAuto';
import './ui/style.css';
import { runRealChain } from './lib/webviewChain';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <h1>4AI v2.0 – WebAI Debate</h1>
    <textarea id="promptInput" placeholder="Wpisz temat debaty..." rows="4" cols="60"></textarea><br>
    <button id="quickDebateBtn">💬 Quick Debate</button>
    <button id="creativeBtn">🎨 Creative</button>
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
    const out = await runRealChain(['claude', 'chatgpt', 'gemini'], prompt);
    results.innerHTML = `<pre>${out}</pre>`;
  };
});