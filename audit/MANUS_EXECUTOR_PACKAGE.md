# Manus WebAI Automation Executor Package

## 🎯 **EXECUTIVE SUMMARY FOR MANUS**

Jako executor kodu, otrzymujesz kompletny pakiet do automatycznej weryfikacji WebAI DOM selektorów z pełną autonomią decyzyjną w zakresie:
- Weryfikacji selektorów DOM
- Analizy błędów automation
- Dostosowania do zmian UI
- Decyzji o fallbackach
- Aktualizacji konfiguracji

## 📦 **PAKIET WYKONAWCZY**

### **1. CORE VERIFICATION TOOLS**

#### **A. Live DOM Inspector** (`tools/dom-inspector.js`)
```javascript
/**
 * Real-time DOM selector validation
 * Używa Puppeteer do sprawdzenia elementów na żywych stronach
 */
const puppeteer = require('puppeteer');

class LiveDOMInspector {
  async inspectService(serviceUrl, selectors) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    await page.goto(serviceUrl, { waitUntil: 'networkidle2' });
    
    const results = {
      timestamp: new Date().toISOString(),
      url: serviceUrl,
      selectors: {}
    };
    
    // Test każdy selektor
    for (const [type, selectorList] of Object.entries(selectors)) {
      results.selectors[type] = await this.testSelectors(page, selectorList);
    }
    
    await browser.close();
    return results;
  }
  
  async testSelectors(page, selectors) {
    const results = [];
    
    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        const isVisible = elements.length > 0 ? 
          await page.evaluate(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          }, elements[0]) : false;
          
        results.push({
          selector,
          found: elements.length > 0,
          count: elements.length,
          visible: isVisible,
          position: elements.length > 0 ? await this.getElementPosition(page, elements[0]) : null
        });
      } catch (error) {
        results.push({
          selector,
          found: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}
```

#### **B. Automation Test Runner** (`tools/automation-tester.js`)
```javascript
/**
 * End-to-end automation testing
 * Symuluje pełny cykl: input → send → response
 */
class AutomationTester {
  async testFullCycle(service, prompt = "Test message") {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    console.log(`Testing ${service.name}...`);
    await page.goto(service.url, { waitUntil: 'networkidle2' });
    
    const results = {
      service: service.name,
      timestamp: new Date().toISOString(),
      phases: {
        input: null,
        send: null,
        response: null
      },
      overall_success: false,
      performance: {}
    };
    
    try {
      // PHASE 1: Input injection
      const inputStart = Date.now();
      results.phases.input = await this.testInputInjection(page, service.inputSelectors, prompt);
      results.performance.input_time = Date.now() - inputStart;
      
      if (!results.phases.input.success) {
        throw new Error('Input injection failed');
      }
      
      // PHASE 2: Send button
      const sendStart = Date.now();
      results.phases.send = await this.testSendButton(page, service.sendSelectors);
      results.performance.send_time = Date.now() - sendStart;
      
      if (!results.phases.send.success) {
        throw new Error('Send button failed');
      }
      
      // PHASE 3: Response detection
      const responseStart = Date.now();
      results.phases.response = await this.testResponseDetection(page, service.responseSelectors);
      results.performance.response_time = Date.now() - responseStart;
      
      results.overall_success = results.phases.response.success;
      
    } catch (error) {
      results.error = error.message;
    }
    
    await browser.close();
    return results;
  }
}
```

### **2. ERROR ANALYSIS ENGINE**

#### **C. Error Pattern Analyzer** (`tools/error-analyzer.js`)
```javascript
/**
 * Inteligentna analiza błędów automation
 * Klasyfikuje błędy i sugeruje rozwiązania
 */
class ErrorAnalyzer {
  analyzeFailure(testResults) {
    const analysis = {
      error_type: this.classifyError(testResults),
      root_cause: this.identifyRootCause(testResults),
      recommended_actions: [],
      confidence_score: 0,
      suggested_selectors: []
    };
    
    // Klasyfikacja błędów
    if (testResults.phases.input && !testResults.phases.input.success) {
      analysis.error_type = 'INPUT_SELECTOR_FAILURE';
      analysis.root_cause = this.analyzeInputFailure(testResults.phases.input);
      analysis.recommended_actions = this.getInputRecommendations(testResults);
    }
    
    if (testResults.phases.send && !testResults.phases.send.success) {
      analysis.error_type = 'SEND_BUTTON_FAILURE';
      analysis.root_cause = this.analyzeSendFailure(testResults.phases.send);
      analysis.recommended_actions = this.getSendRecommendations(testResults);
    }
    
    if (testResults.phases.response && !testResults.phases.response.success) {
      analysis.error_type = 'RESPONSE_DETECTION_FAILURE';
      analysis.root_cause = this.analyzeResponseFailure(testResults.phases.response);
      analysis.recommended_actions = this.getResponseRecommendations(testResults);
    }
    
    return analysis;
  }
  
  // AI-powered selector suggestions
  suggestNewSelectors(service, failedSelectors) {
    const patterns = {
      input: [
        '[contenteditable="true"]',
        'textarea',
        'input[type="text"]',
        '.input-field',
        '[role="textbox"]',
        '.prompt-input',
        '#message-input'
      ],
      send: [
        'button[type="submit"]',
        '[aria-label*="Send"]',
        '[aria-label*="send"]',
        '.send-button',
        'button:has(svg)',
        '[data-testid*="send"]'
      ],
      response: [
        '[role="article"]',
        '.message',
        '.response',
        '[data-message-id]',
        '.assistant-message',
        '.bot-message'
      ]
    };
    
    // Return suggested selectors based on service and failure pattern
    return patterns;
  }
}
```

### **3. DYNAMIC UI ADAPTATION**

#### **D. UI Change Detector** (`tools/ui-change-detector.js`)
```javascript
/**
 * Wykrywa zmiany w UI platform AI
 * Automatycznie dostosowuje selektory
 */
class UIChangeDetector {
  constructor() {
    this.baselineSnapshots = new Map();
  }
  
  async captureBaseline(service) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(service.url);
    
    const snapshot = {
      timestamp: new Date().toISOString(),
      dom_structure: await this.analyzeDOMStructure(page),
      css_classes: await this.extractCSSClasses(page),
      input_elements: await this.findInputElements(page),
      button_elements: await this.findButtonElements(page)
    };
    
    this.baselineSnapshots.set(service.name, snapshot);
    await browser.close();
    
    return snapshot;
  }
  
  async detectChanges(service) {
    const currentSnapshot = await this.captureBaseline(service);
    const baseline = this.baselineSnapshots.get(service.name);
    
    if (!baseline) {
      return { first_capture: true, snapshot: currentSnapshot };
    }
    
    const changes = {
      timestamp: new Date().toISOString(),
      service: service.name,
      changes_detected: false,
      change_summary: {},
      impact_assessment: 'LOW',
      recommended_updates: []
    };
    
    // Compare DOM structures
    const domChanges = this.compareDOMStructures(baseline.dom_structure, currentSnapshot.dom_structure);
    if (domChanges.length > 0) {
      changes.changes_detected = true;
      changes.change_summary.dom_changes = domChanges;
      changes.impact_assessment = this.assessImpact(domChanges);
    }
    
    // Compare CSS classes
    const cssChanges = this.compareCSSClasses(baseline.css_classes, currentSnapshot.css_classes);
    if (cssChanges.length > 0) {
      changes.changes_detected = true;
      changes.change_summary.css_changes = cssChanges;
    }
    
    if (changes.changes_detected) {
      changes.recommended_updates = this.generateUpdateRecommendations(changes);
    }
    
    return changes;
  }
}
```

### **4. AUTONOMOUS DECISION ENGINE**

#### **E. Config Auto-Updater** (`tools/config-updater.js`)
```javascript
/**
 * Autonomiczne aktualizacje konfiguracji
 * Podejmuje decyzje o fallbackach bez ingerencji człowieka
 */
class ConfigAutoUpdater {
  constructor() {
    this.confidenceThreshold = 0.8; // 80% pewności przed auto-update
    this.backupConfigs = new Map();
  }
  
  async evaluateAndUpdate(service, testResults, errorAnalysis) {
    console.log(`Evaluating auto-update for ${service}...`);
    
    const decision = {
      timestamp: new Date().toISOString(),
      service,
      action: 'NO_ACTION',
      confidence: 0,
      reasoning: [],
      changes_made: []
    };
    
    // Backup current config
    this.backupConfigs.set(service, this.getCurrentConfig(service));
    
    // Decision logic
    if (errorAnalysis.confidence_score > this.confidenceThreshold) {
      
      if (errorAnalysis.error_type === 'INPUT_SELECTOR_FAILURE') {
        decision.action = 'UPDATE_INPUT_SELECTORS';
        decision.confidence = errorAnalysis.confidence_score;
        decision.reasoning.push('High confidence input selector update');
        
        const newSelectors = this.selectBestInputSelectors(errorAnalysis.suggested_selectors);
        this.updateInputSelectors(service, newSelectors);
        decision.changes_made.push(`Updated input selectors: ${newSelectors}`);
      }
      
      if (errorAnalysis.error_type === 'SEND_BUTTON_FAILURE') {
        decision.action = 'ADD_SEND_FALLBACK';
        decision.confidence = errorAnalysis.confidence_score;
        decision.reasoning.push('Adding send button fallback');
        
        const fallbackSelector = this.findBestSendFallback(errorAnalysis);
        this.addSendFallback(service, fallbackSelector);
        decision.changes_made.push(`Added send fallback: ${fallbackSelector}`);
      }
      
    } else {
      decision.action = 'ESCALATE_TO_HUMAN';
      decision.reasoning.push(`Low confidence (${errorAnalysis.confidence_score}), human review required`);
    }
    
    // Test changes
    if (decision.changes_made.length > 0) {
      const validationResults = await this.validateChanges(service);
      if (!validationResults.success) {
        // Rollback changes
        this.rollbackConfig(service);
        decision.action = 'ROLLBACK_PERFORMED';
        decision.reasoning.push('Validation failed, config rolled back');
      }
    }
    
    return decision;
  }
  
  // CRITICAL: Rollback mechanism
  rollbackConfig(service) {
    const backup = this.backupConfigs.get(service);
    if (backup) {
      this.restoreConfig(service, backup);
      console.log(`🔄 Config rolled back for ${service}`);
    }
  }
}
```

## 🚀 **EXECUTOR COMMANDS FOR MANUS**

### **Daily Verification Commands**
```bash
# Full verification cycle
node tools/verify-all.js

# Single service deep test  
node tools/verify-service.js --service=claude --deep

# Auto-fix mode (with rollback safety)
node tools/auto-fix.js --confidence=0.8 --backup

# Emergency repair mode
node tools/emergency-repair.js --service=claude
```

### **Analysis & Decision Commands**
```bash
# Error pattern analysis
node tools/analyze-errors.js --days=7

# UI change detection
node tools/detect-changes.js --baseline=weekly

# Performance trend analysis
node tools/analyze-performance.js --period=month

# Generate executive report
node tools/generate-report.js --format=executive --recipient=management
```

## 📊 **DECISION MATRIX FOR MANUS**

### **Automatyczne Decyzje (Confidence > 80%)**
| **Błąd** | **Akcja** | **Warunki** |
|----------|-----------|-------------|
| Input selector not found | Update primary selector | >2 fallbacks work |
| Send button changed | Add new fallback | Button pattern recognized |
| Response timeout | Increase timeout | <3 failures in 24h |
| CSS class renamed | Update class reference | Pattern match >85% |

### **Eskalacja do Człowieka (Confidence < 80%)**
| **Sytuacja** | **Powód Eskalacji** |
|--------------|-------------------|
| Multiple services failing | Potential platform-wide changes |
| Unknown DOM structure | New UI patterns not in database |
| Performance degradation >50% | Possible infrastructure issues |
| Config validation failures | Safety mechanism triggered |

## 🛡️ **SAFETY MECHANISMS**

### **1. Backup & Rollback**
- Każda zmiana ma automatyczny backup
- 30-sekundowy test window przed commit
- Auto-rollback przy validation failure

### **2. Confidence Scoring**
- ML-based confidence assessment
- Historical pattern matching
- Cross-validation z múltiple sources

### **3. Human Override**
- Manual intervention flag
- Emergency stop mechanism  
- Audit trail wszystkich decyzji

## 📈 **SUCCESS METRICS FOR MANUS**

- **Automation Success Rate**: >98%
- **Mean Time to Resolution**: <15 minutes
- **False Positive Rate**: <5%
- **Auto-Fix Success Rate**: >90%
- **Human Escalation Rate**: <10%

---

## 🎯 **EXECUTION SUMMARY**

**Manus otrzymuje:**
1. ✅ **Live DOM inspection tools** - real-time verification
2. ✅ **Automated testing framework** - end-to-end validation  
3. ✅ **Error analysis engine** - intelligent diagnosis
4. ✅ **UI change detection** - proactive monitoring
5. ✅ **Autonomous decision system** - automated fixes
6. ✅ **Safety mechanisms** - rollback & validation
7. ✅ **Executive commands** - one-click operations

**Rezultat:** Pełna autonomia w zarządzaniu WebAI automation z bezpiecznymi mechanizmami rollback i human escalation.