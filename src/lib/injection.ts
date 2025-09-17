// Generic AI injection: set prompt, dispatch input, click send button or send Enter
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { AiService } from './types';
export function createInjectionScript(service: AiService, prompt: string, delay = 500): string {
  return `
    (function(){
      console.log('[4AI] Starting injection for ${service.name}');
      const prompt = "${prompt}";
      const selectors = [
        'div#prompt-textarea.ProseMirror',
        ...${JSON.stringify(service.selectors)}
      ];
      const sendSelectors = [
        'button[aria-label="Send message"]',
        ...${JSON.stringify(service.sendSelector)}.split(', ')
      ];

      function findSendButton() {
        console.log('[4AI] Looking for send button with selectors:', sendSelectors);
        for (const sel of sendSelectors) {
          const btn = document.querySelector(sel.trim());
          console.log('[4AI] Send selector', sel, 'found button:', btn);
          if (btn && !btn.disabled) {
            return btn;
          }
        }
        // Fallback: find any button near textarea
        const textarea = document.querySelector('textarea');
        if (textarea) {
          const parent = textarea.closest('form, div');
          if (parent) {
            const buttons = parent.querySelectorAll('button[type="submit"], button:not([disabled])');
            console.log('[4AI] Fallback found buttons:', buttons.length);
            return buttons[buttons.length - 1];
          }
        }
        return null;
      }

      function tryDirectValue() {
        let injected = false;
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          console.log('[4AI] Selector', sel, 'found element:', el);
          if (el) {
            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
              el.value = prompt;
              console.log('[4AI] Set value to textarea/input:', el.value);
            } else {
              el.textContent = prompt;
              console.log('[4AI] Set textContent to element:', el.textContent);
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.focus();
            console.log('[4AI] Injection successful with selector:', sel);
            injected = true;
          }
        }
        if (!injected) console.log('[4AI] No suitable element found for injection');
        return injected;
      }

      function tryTyping() {
        const el = document.querySelector(selectors[0]);
        if (!el) {
          console.log('[4AI] Typing failed: no element found for selector', selectors[0]);
          return false;
        }
        el.focus();
        if (el.select) el.select();
        document.execCommand('insertText', false, prompt);
        console.log('[4AI] Typing prompt using execCommand');
        return true;
      }

      setTimeout(() => {
        const ok = tryDirectValue() || tryTyping();
        if (ok) {
          console.log('[4AI] Text injection successful, looking for send button...');
          setTimeout(() => {
            const sendBtn = findSendButton();
            if (sendBtn) {
              console.log('[4AI] Found send button, clicking:', sendBtn);
              sendBtn.click();
              console.log('[4AI] Send button clicked!');
            } else {
              console.log('[4AI] No send button found, trying Enter key...');
              const textarea = document.querySelector('textarea');
              if (textarea) {
                textarea.focus();
                let enterEvent = new KeyboardEvent('keydown', {
                  key: 'Enter',
                  code: 'Enter',
                  keyCode: 13,
                  which: 13,
                  bubbles: true
                });
                textarea.dispatchEvent(enterEvent);
                console.log('[4AI] Enter key sent to textarea');
                setTimeout(() => {
                  const ctrlEnterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    ctrlKey: true,
                    bubbles: true
                  });
                  textarea.dispatchEvent(ctrlEnterEvent);
                  console.log('[4AI] Ctrl+Enter sent to textarea');
                }, 100);
              }
            }
          }, ${delay});
        } else {
          console.log('[4AI] Text injection failed');
        }
      }, ${delay});
    })();
  `;
}
// Universal Gemini injection: set prompt, dispatch input, send Enter (twice)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createGeminiInjectionScript(prompt: string): string {
  return `
    (function() {
      console.log('[4AI Gemini] Injection started');
      const target = document.querySelector('.ql-editor[contenteditable="true"]');
      console.log('[4AI Gemini] Target element:', target);
      if (!target) { console.log('[4AI Gemini] NO_TARGET'); return 'NO_TARGET'; }

      target.textContent = "${prompt}";
      console.log('[4AI Gemini] Set prompt:', target.textContent);
      target.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('[4AI Gemini] Dispatched input event');

      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(enterEvent);
      console.log('[4AI Gemini] Sent Enter');
      setTimeout(() => { target.dispatchEvent(enterEvent); console.log('[4AI Gemini] Sent Enter (delayed)'); }, 200);

      return 'SENT_ENTER';
    })();
  `;
}

// Universal Claude injection: set prompt, dispatch input, send Enter
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createClaudeInjectionScript(prompt: string): string {
  return `
    (function() {
      console.log('[4AI Claude] Injection started');
      const allProseMirrors = document.querySelectorAll('.ProseMirror');
      allProseMirrors.forEach((el, idx) => {
        console.log(`[4AI Claude] .ProseMirror[${idx}]:`, el, 'contenteditable:', el.getAttribute('contenteditable'));
      });
      const target = document.querySelector('.ProseMirror[contenteditable="true"]');
      console.log('[4AI Claude] Target element:', target);
      if (!target) { console.log('[4AI Claude] NO_TARGET'); return 'NO_TARGET'; }

      target.textContent = "${prompt}";
      console.log('[4AI Claude] Set prompt:', target.textContent);
      target.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('[4AI Claude] Dispatched input event');

      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(enterEvent);
      console.log('[4AI Claude] Sent Enter');
      setTimeout(() => { target.dispatchEvent(enterEvent); console.log('[4AI Claude] Sent Enter (delayed)'); }, 200);

      return 'SENT_ENTER';
    })();
  `;
}