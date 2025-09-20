# 🎯 FIRST TO DO FOR MANUS - PRIORITY TASK LIST

> **Context**: Hybrid AI Development - Claude (Architecture) + Manus (Execution)  
> **Project**: 4AI v2.0 Audit & Enhancement  
> **Date**: 2025-09-19  
> **Status**: Ready for Manus execution  

---

## 🚀 **IMMEDIATE TASK #1: EXTERNAL SELECTOR CONFIG IMPLEMENTATION**

**ZADANIE**: External Selector Configuration System  
**PRIORITY**: **HIGH** ⚡  
**ESTIMATED TIME**: 2-3 godziny  
**ASSIGNED TO**: Manus  

### **📋 CONTEXT & WHY IT'S CRITICAL:**
Current WebAI selectors są hardcoded w `src/lib/types.ts`, co czyni system **extremely fragile** na UI changes from AI services. Każda zmiana w ChatGPT/Claude/Gemini UI requires code changes and redeployment. Need **external, versioned configuration** system.

### **🎯 DELIVERABLES:**

#### **1. Config File Creation** 📄
Create: `config/webai-selectors.json`
```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-09-19",
  "services": {
    "chatgpt": {
      "name": "ChatGPT",
      "url": "https://chat.openai.com",
      "inputSelectors": [
        "#prompt-textarea",
        "textarea[placeholder*='Message']",
        "[contenteditable='true']"
      ],
      "sendSelectors": [
        "[data-testid='send-button']",
        "button[aria-label*='Send']",
        "button[type='submit']"
      ],
      "responseSelectors": [
        "[data-message-author-role='assistant'] .markdown",
        ".prose",
        "[data-testid='conversation-turn']"
      ],
      "version": "2024-09-19",
      "fallbackStrategy": "try_all_selectors"
    },
    "claude": {
      "name": "Claude",
      "url": "https://claude.ai",
      "inputSelectors": [
        ".ProseMirror[contenteditable='true']",
        "[contenteditable='true']",
        "textarea"
      ],
      "sendSelectors": [
        "button[aria-label='Send Message']",
        "button[aria-label*='Send']",
        "[data-testid='send-button']"
      ],
      "responseSelectors": [
        ".font-claude-message",
        "[data-testid='message-content']",
        ".prose"
      ],
      "version": "2024-09-19",
      "fallbackStrategy": "try_all_selectors"
    },
    "gemini": {
      "name": "Gemini",
      "url": "https://gemini.google.com",
      "inputSelectors": [
        ".ql-editor[contenteditable='true']",
        "[contenteditable='true']",
        "textarea"
      ],
      "sendSelectors": [
        "button[aria-label='Send message']",
        "[data-testid='send-button']",
        "button[type='submit']"
      ],
      "responseSelectors": [
        "[data-response-id] .markdown",
        ".model-response-text",
        ".response-container"
      ],
      "version": "2024-09-19",
      "fallbackStrategy": "try_all_selectors"
    },
    "copilot": {
      "name": "Microsoft Copilot",
      "url": "https://copilot.microsoft.com",
      "inputSelectors": [
        "#searchbox",
        "textarea[placeholder*='Ask']",
        "[contenteditable='true']"
      ],
      "sendSelectors": [
        "#search_icon",
        "button[aria-label*='Send']",
        "[data-testid='send-button']"
      ],
      "responseSelectors": [
        "cib-message-group[source='bot'] .ac-textBlock",
        ".response-message",
        "[data-testid='bot-message']"
      ],
      "version": "2024-09-19",
      "fallbackStrategy": "try_all_selectors"
    }
  }
}
```

#### **2. Config Loading System** ⚙️
Modify: `src/lib/types.ts`
- Add config loading function
- Replace hardcoded selectors with config-based ones
- Add fallback mechanism when config loading fails
- Maintain backward compatibility

#### **3. Validation & Testing** ✅
- Config schema validation on load
- Test że każdy service loads selectors correctly
- Verify fallback selectors work when primary fails
- Update `npm run audit:selectors` to work with new system

### **🏁 ACCEPTANCE CRITERIA:**

- [ ] **Config file created** w `config/webai-selectors.json` with all 4 services
- [ ] **Config loading implemented** w types.ts without breaking existing code
- [ ] **All 4 AI services** use selectors from config instead of hardcoded values
- [ ] **Fallback mechanism** works - gdy primary selector fails, tries alternatives
- [ ] **Validation works** - invalid config files are caught with helpful errors
- [ ] **Audit script compatibility** - `npm run audit:selectors` finds config-based patterns
- [ ] **Tests pass** - `npm test` continues to work without regressions
- [ ] **Documentation updated** - README explains how to update selectors via config

### **🔧 TECHNICAL IMPLEMENTATION NOTES:**

#### **Config Loading Pattern**:
```typescript
// New in types.ts
interface SelectorConfig {
  inputSelectors: string[];
  sendSelectors: string[];
  responseSelectors: string[];
  version: string;
  fallbackStrategy: 'try_all_selectors' | 'fail_fast';
}

async function loadSelectorConfig(): Promise<Record<AiServiceId, SelectorConfig>> {
  try {
    const configPath = './config/webai-selectors.json';
    const config = await import(configPath);
    return config.services;
  } catch (error) {
    console.warn('Failed to load selector config, using defaults');
    return getDefaultSelectors(); // Fallback to current hardcoded values
  }
}
```

#### **Backward Compatibility**:
- Current `aiServices` object structure maintained
- Config loading is additive, not breaking
- If config load fails, fall back to current hardcoded selectors
- No changes needed in existing webviewChain.ts or injection.ts initially

---

## 🔄 **TASK #2: RUNTIME VALIDATION** (After Task #1)

**ZADANIE**: Test Audit Scripts in Real Environment  
**PRIORITY**: **MEDIUM** 🔶  
**ESTIMATED TIME**: 1-2 godziny  

### **DELIVERABLES:**
- [ ] Run `npm run audit:full` and document results
- [ ] Test each audit script individually and verify outputs
- [ ] Check for any Windows-specific issues with PowerShell commands
- [ ] Validate that audit scripts catch real issues (create test problems)
- [ ] Document performance of each audit mode (lightning/focused/full)

---

## 📋 **COLLABORATION WORKFLOW:**

### **🔄 EXECUTION PROCESS:**
1. **Manus picks up task** - comment in GitHub issue when starting
2. **Implementation phase** - work in feature branch `feature/external-selectors`
3. **Testing phase** - verify all acceptance criteria met
4. **Documentation phase** - update relevant docs
5. **Code review request** - tag Claude for architecture review
6. **Merge & deploy** - after approval, merge to main

### **📞 COMMUNICATION:**
- **Status updates**: Comment progress in GitHub issue
- **Questions/blockers**: Create discussion thread
- **Code review**: Request review when ready
- **Completion**: Close issue with summary of changes

### **🏆 SUCCESS METRICS:**
- Configuration system works across all 4 AI services
- System is more resilient to UI changes
- Audit scripts validate the new configuration
- No regressions in existing functionality
- Clear documentation for future maintenance

---

## 🚀 **NEXT TASKS IN PIPELINE:**

After successful completion of Task #1 & #2:

### **Task #3**: WebView Pool Optimization (Week 2)
### **Task #4**: Retry Logic with Exponential Backoff (Week 2)  
### **Task #5**: UI Integration Testing Framework (Week 3)

---

**READY TO START?** 🎯

**This external selector config is the foundation** for making 4AI resilient to WebAI UI changes. Success here unlocks the next level of system robustness.

**Let's build something amazing together!** 💪

---

**Utworzono**: 2025-09-19  
**Status**: **ACTIVE** - Waiting for Manus pickup  
**Ostatnia aktualizacja**: 2025-09-19  
**Contact**: GitHub issue comments lub project discussion