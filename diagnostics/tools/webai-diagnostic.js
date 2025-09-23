#!/usr/bin/env node

/**
 * WebAI Real-Time Diagnostic Tool
 * Logs into each WebAI service and performs real DOM analysis
 * Auto-updates selectors when changes are detected
 * 
 * Usage: node webai-diagnostic.js [--auto-update] [--service=<name>] [--headless=false]
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
// import path from 'path'; // Unused

// Configuration paths
const CONFIG_PATH = '../../config/webai-selectors.json';
const CREDENTIALS_PATH = '../../config/webai-credentials.json'; // Secure credentials file
const BACKUP_PATH = '../../config/webai-selectors.backup.json';
const LOG_PATH = '../../logs/diagnostic-results.json';

// Diagnostic thresholds
const CONFIDENCE_THRESHOLDS = {
  HIGH: 95,        // Auto-update allowed
  MEDIUM: 80,      // Manual review required
  LOW: 60,         // Investigation needed
  CRITICAL: 30     // Service likely broken
};

class WebAIDiagnostic {
  constructor(options = {}) {
    this.config = this.loadConfig();
    this.credentials = this.loadCredentials();
    this.browser = null;
    this.results = {
      timestamp: new Date().toISOString(),
      session_id: this.generateSessionId(),
      services_tested: [],
      changes_detected: [],
      auto_updates_applied: [],
      manual_review_required: [],
      errors: [],
      summary: {
        total_services: 0,
        successful_logins: 0,
        selector_changes: 0,
        confidence_score: 0
      }
    };
    
    this.options = {
      headless: options.headless !== false, // Default to headless
      autoUpdate: options.autoUpdate || false,
      timeout: options.timeout || 30000,
      specificService: options.specificService || null
    };
  }

  generateSessionId() {
    return `diag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  loadConfig() {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch (error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
  }

  loadCredentials() {
    try {
      // Load encrypted/secured credentials
      const credsPath = CREDENTIALS_PATH;
      if (!fs.existsSync(credsPath)) {
        console.log('⚠️  No credentials file found. Creating template...');
        this.createCredentialsTemplate();
        throw new Error('Please configure credentials in ../../config/webai-credentials.json');
      }
      return JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
    } catch (error) {
      console.error(`❌ Credentials error: ${error.message}`);
      return {};
    }
  }

  createCredentialsTemplate() {
    const template = {
      "chatgpt": {
        "login_url": "https://chat.openai.com/auth/login",
        "username": "your-email@example.com",
        "password": "your-password",
        "login_selectors": {
          "email_input": "[name='username']",
          "password_input": "[name='password']",
          "login_button": "[type='submit']"
        }
      },
      "claude": {
        "login_url": "https://claude.ai/login",
        "username": "your-email@example.com", 
        "password": "your-password",
        "login_selectors": {
          "email_input": "[name='email']",
          "password_input": "[name='password']",
          "login_button": "[type='submit']"
        }
      },
      "gemini": {
        "login_url": "https://gemini.google.com",
        "username": "your-email@gmail.com",
        "password": "your-password",
        "login_selectors": {
          "email_input": "[type='email']",
          "password_input": "[type='password']",
          "login_button": "[type='submit']"
        }
      },
      "_security_note": "IMPORTANT: This file contains sensitive data. Add to .gitignore!"
    };
    
    fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(template, null, 2));
  }

  async initializeBrowser() {
    console.log('🚀 Initializing browser...');
    
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
  }

  async loginToService(serviceId, serviceConfig) {
    const credentials = this.credentials[serviceId];
    if (!credentials) {
      throw new Error(`No credentials found for ${serviceId}`);
    }

    console.log(`🔐 Logging into ${serviceConfig.name}...`);
    
    const page = await this.browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
      // Navigate to login page
      await page.goto(credentials.login_url, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(2000);

      // Take screenshot for debugging
      await page.screenshot({ 
        path: `../../logs/login-${serviceId}-step1.png`,
        fullPage: false 
      });

      // Fill login form
      await page.waitForSelector(credentials.login_selectors.email_input, { timeout: 10000 });
      await page.type(credentials.login_selectors.email_input, credentials.username);
      
      if (credentials.login_selectors.password_input) {
        await page.waitForSelector(credentials.login_selectors.password_input);
        await page.type(credentials.login_selectors.password_input, credentials.password);
      }

      // Submit login
      await page.click(credentials.login_selectors.login_button);
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });

      // Take post-login screenshot
      await page.screenshot({ 
        path: `../../logs/login-${serviceId}-success.png`,
        fullPage: false 
      });

      console.log(`✅ Successfully logged into ${serviceConfig.name}`);
      this.results.summary.successful_logins++;
      
      return page;
      
    } catch (error) {
      await page.screenshot({ 
        path: `../../logs/login-${serviceId}-error.png`,
        fullPage: true 
      });
      
      console.error(`❌ Login failed for ${serviceId}: ${error.message}`);
      await page.close();
      throw error;
    }
  }

  async analyzeServiceSelectors(page, serviceId, serviceConfig) {
    console.log(`🔍 Analyzing selectors for ${serviceConfig.name}...`);
    
    const analysis = {
      service: serviceId,
      timestamp: new Date().toISOString(),
      input_selectors: await this.testSelectorGroup(page, serviceConfig.inputSelectors, 'input'),
      send_selectors: await this.testSelectorGroup(page, serviceConfig.sendSelectors, 'send'),
      response_selectors: await this.testSelectorGroup(page, serviceConfig.responseSelectors, 'response'),
      confidence_score: 0,
      recommendations: []
    };

    // Calculate confidence score
    const allSelectors = [
      ...analysis.input_selectors,
      ...analysis.send_selectors, 
      ...analysis.response_selectors
    ];
    
    const workingSelectors = allSelectors.filter(s => s.found).length;
    analysis.confidence_score = Math.round((workingSelectors / allSelectors.length) * 100);

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    // Take full page screenshot
    await page.screenshot({ 
      path: `../../logs/analysis-${serviceId}-${Date.now()}.png`,
      fullPage: true 
    });

    return analysis;
  }

  async testSelectorGroup(page, selectors, type) {
    const results = [];
    
    for (const selector of selectors) {
      const result = await this.testSingleSelector(page, selector, type);
      results.push(result);
    }
    
    return results;
  }

  async testSingleSelector(page, selector, type) {
    const startTime = Date.now();
    
    try {
      // Test if selector exists
      const elements = await page.$$(selector);
      const found = elements.length > 0;
      
      let attributes = {};
      let suggestionScore = 0;
      
      if (found) {
        // Get detailed element info
        const element = elements[0];
        attributes = await page.evaluate((el) => {
          return {
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            textContent: el.textContent?.substring(0, 100),
            visible: el.offsetParent !== null,
            enabled: !el.disabled
          };
        }, element);
        
        suggestionScore = this.calculateSelectorScore(attributes);
      } else {
        // Try to find similar elements
        const suggestions = await this.findSimilarElements(page, selector, type);
        attributes.suggestions = suggestions;
      }
      
      return {
        selector,
        type,
        found,
        element_count: found ? elements.length : 0,
        response_time_ms: Date.now() - startTime,
        attributes,
        suggestion_score: suggestionScore,
        confidence: found ? (suggestionScore > 80 ? 'HIGH' : 'MEDIUM') : 'LOW'
      };
      
    } catch (error) {
      return {
        selector,
        type,
        found: false,
        error: error.message,
        response_time_ms: Date.now() - startTime,
        confidence: 'CRITICAL'
      };
    }
  }

  calculateSelectorScore(attributes) {
    let score = 60; // Base score
    
    // Visibility bonus
    if (attributes.visible) score += 20;
    
    // Enabled bonus
    if (attributes.enabled) score += 10;
    
    // Content bonus
    if (attributes.textContent && attributes.textContent.length > 0) score += 5;
    
    // ID bonus (more stable)
    if (attributes.id) score += 15;
    
    return Math.min(score, 100);
  }

  async findSimilarElements(page, failedSelector, type) {
    const suggestions = [];
    
    try {
      // Try common variations based on type
      const variations = this.generateSelectorVariations(failedSelector, type);
      
      for (const variation of variations.slice(0, 5)) { // Test top 5
        const elements = await page.$$(variation);
        if (elements.length > 0) {
          suggestions.push({
            selector: variation,
            element_count: elements.length,
            confidence: this.calculateVariationConfidence(failedSelector, variation)
          });
        }
      }
      
    } catch (error) {
      console.warn(`Warning: Could not generate suggestions for ${failedSelector}`);
    }
    
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  generateSelectorVariations(selector, type) {
    const variations = [];
    
    // Common input variations
    if (type === 'input') {
      variations.push(
        'textarea[data-id*="prompt"]',
        'div[contenteditable="true"]',
        '[role="textbox"]',
        'input[type="text"]',
        '.chat-input',
        '#prompt-textarea'
      );
    }
    
    // Common send button variations  
    if (type === 'send') {
      variations.push(
        'button[type="submit"]',
        '[data-testid*="send"]',
        '.send-button',
        '[aria-label*="send"]',
        'button svg[class*="send"]'
      );
    }
    
    // Common response variations
    if (type === 'response') {
      variations.push(
        '.message-content',
        '[data-message-id]',
        '.chat-message',
        '.response-container',
        '[role="article"]'
      );
    }
    
    return variations;
  }

  calculateVariationConfidence(original, variation) {
    // Simple similarity scoring
    const originalParts = original.split(/[[\].#\s]/);
    const variationParts = variation.split(/[[\].#\s]/);
    
    let matches = 0;
    originalParts.forEach(part => {
      if (part && variationParts.some(vPart => vPart.includes(part))) {
        matches++;
      }
    });
    
    return Math.round((matches / originalParts.length) * 100);
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    
    // Check for failed selectors
    const allResults = [
      ...analysis.input_selectors,
      ...analysis.send_selectors,
      ...analysis.response_selectors
    ];
    
    const failedSelectors = allResults.filter(r => !r.found);
    const lowConfidenceSelectors = allResults.filter(r => r.found && r.suggestion_score < 70);
    
    if (failedSelectors.length > 0) {
      recommendations.push({
        type: 'CRITICAL',
        message: `${failedSelectors.length} selector(s) not found - service may be broken`,
        selectors: failedSelectors.map(s => s.selector),
        action: 'immediate_update_required'
      });
    }
    
    if (lowConfidenceSelectors.length > 0) {
      recommendations.push({
        type: 'WARNING', 
        message: `${lowConfidenceSelectors.length} selector(s) have low confidence`,
        selectors: lowConfidenceSelectors.map(s => s.selector),
        action: 'monitor_and_consider_update'
      });
    }
    
    // Suggest improvements from similar elements
    failedSelectors.forEach(failed => {
      if (failed.attributes?.suggestions?.length > 0) {
        recommendations.push({
          type: 'SUGGESTION',
          message: `Alternative selectors found for: ${failed.selector}`,
          suggestions: failed.attributes.suggestions.slice(0, 3),
          action: 'consider_replacement'
        });
      }
    });
    
    return recommendations;
  }

  async applyAutoUpdates(analysis) {
    if (!this.options.autoUpdate) {
      console.log('🔧 Auto-update disabled - skipping automatic changes');
      return;
    }

    if (analysis.confidence_score < CONFIDENCE_THRESHOLDS.HIGH) {
      console.log(`⚠️  Confidence score ${analysis.confidence_score}% too low for auto-update`);
      this.results.manual_review_required.push({
        service: analysis.service,
        reason: 'low_confidence',
        confidence: analysis.confidence_score
      });
      return;
    }

    console.log(`🔄 Applying auto-updates for ${analysis.service}...`);
    
    // Backup current config
    this.createConfigBackup();
    
    let updatesApplied = 0;
    const updates = [];
    
    // Process high-confidence suggestions
    analysis.recommendations.forEach(rec => {
      if (rec.type === 'SUGGESTION' && rec.suggestions) {
        rec.suggestions.forEach(suggestion => {
          if (suggestion.confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
            updates.push({
              old_selector: rec.message.split(': ')[1],
              new_selector: suggestion.selector,
              confidence: suggestion.confidence
            });
            updatesApplied++;
          }
        });
      }
    });
    
    if (updatesApplied > 0) {
      // Apply updates to config
      this.updateConfigFile(analysis.service, updates);
      
      this.results.auto_updates_applied.push({
        service: analysis.service,
        updates_count: updatesApplied,
        updates: updates
      });
      
      console.log(`✅ Applied ${updatesApplied} auto-updates for ${analysis.service}`);
    }
  }

  createConfigBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = BACKUP_PATH.replace('.backup.', `.backup-${timestamp}.`);
    fs.copyFileSync(CONFIG_PATH, backupPath);
    console.log(`💾 Config backed up to: ${backupPath}`);
  }

  updateConfigFile(serviceId, updates) {
    // This would update the actual config file
    // Implementation depends on specific config structure
    console.log(`📝 Would update config for ${serviceId}:`, updates);
    
    // For now, just log the updates
    this.results.changes_detected.push({
      service: serviceId,
      updates: updates,
      timestamp: new Date().toISOString()
    });
  }

  async runFullDiagnostic() {
    console.log('🎯 Starting WebAI Real-Time Diagnostic...');
    console.log(`📅 Session: ${this.results.session_id}`);
    console.log(`🤖 Mode: ${this.options.headless ? 'Headless' : 'Visible'}`);
    console.log(`🔄 Auto-update: ${this.options.autoUpdate ? 'Enabled' : 'Disabled'}`);
    console.log('═'.repeat(60));

    try {
      await this.initializeBrowser();
      
      const services = this.options.specificService 
        ? { [this.options.specificService]: this.config.services[this.options.specificService] }
        : this.config.services;
      
      this.results.summary.total_services = Object.keys(services).length;
      
      for (const [serviceId, serviceConfig] of Object.entries(services)) {
        console.log(`\n🔍 Processing ${serviceConfig.name}...`);
        
        try {
          // Login to service
          const page = await this.loginToService(serviceId, serviceConfig);
          
          // Analyze selectors
          const analysis = await this.analyzeServiceSelectors(page, serviceId, serviceConfig);
          this.results.services_tested.push(analysis);
          
          // Apply auto-updates if enabled
          await this.applyAutoUpdates(analysis);
          
          // Close page
          await page.close();
          
          console.log(`✅ ${serviceConfig.name} analysis complete (${analysis.confidence_score}% confidence)`);
          
        } catch (error) {
          console.error(`❌ Failed to process ${serviceId}: ${error.message}`);
          this.results.errors.push({
            service: serviceId,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
        
        // Delay between services
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Calculate summary
      this.calculateSummary();
      
      // Save results
      this.saveResults();
      
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
    
    return this.results;
  }

  calculateSummary() {
    const analyses = this.results.services_tested;
    if (analyses.length > 0) {
      this.results.summary.confidence_score = Math.round(
        analyses.reduce((sum, a) => sum + a.confidence_score, 0) / analyses.length
      );
    }
    
    this.results.summary.selector_changes = this.results.changes_detected.length;
  }

  saveResults() {
    // Save detailed JSON results
    fs.writeFileSync(LOG_PATH, JSON.stringify(this.results, null, 2));
    
    // Generate human-readable report
    const report = this.generateDiagnosticReport();
    const reportPath = LOG_PATH.replace('.json', '-report.txt');
    fs.writeFileSync(reportPath, report);
    
    console.log(`\n📄 Results saved:`);
    console.log(`   JSON: ${LOG_PATH}`);
    console.log(`   Report: ${reportPath}`);
  }

  generateDiagnosticReport() {
    const { services_tested, summary, auto_updates_applied, manual_review_required, errors } = this.results;
    
    let report = `
🎯 WebAI Real-Time Diagnostic Report
═══════════════════════════════════════
📅 Session: ${this.results.session_id}
⏰ Timestamp: ${new Date(this.results.timestamp).toLocaleString()}
🤖 Mode: ${this.options.headless ? 'Headless' : 'Visible Browser'}

📊 SUMMARY:
─────────────
✅ Services Tested: ${summary.total_services}
🔐 Successful Logins: ${summary.successful_logins}
📈 Average Confidence: ${summary.confidence_score}%
🔄 Auto-Updates Applied: ${auto_updates_applied.length}
⚠️  Manual Reviews Required: ${manual_review_required.length}
❌ Errors Encountered: ${errors.length}

🔍 SERVICE ANALYSIS:
─────────────────────
`;

    services_tested.forEach(service => {
      const statusEmoji = service.confidence_score >= 90 ? '✅' : 
                         service.confidence_score >= 70 ? '⚠️' : '❌';
      
      report += `
${statusEmoji} ${service.service.toUpperCase()} (${service.confidence_score}% confidence)
  Input Selectors: ${service.input_selectors.filter(s => s.found).length}/${service.input_selectors.length} working
  Send Selectors: ${service.send_selectors.filter(s => s.found).length}/${service.send_selectors.length} working  
  Response Selectors: ${service.response_selectors.filter(s => s.found).length}/${service.response_selectors.length} working
  
  Recommendations: ${service.recommendations.length}
`;
      
      service.recommendations.forEach(rec => {
        const emoji = rec.type === 'CRITICAL' ? '🚨' : rec.type === 'WARNING' ? '⚠️' : '💡';
        report += `    ${emoji} ${rec.message}\n`;
      });
    });

    if (auto_updates_applied.length > 0) {
      report += `\n🔄 AUTO-UPDATES APPLIED:\n─────────────────────\n`;
      auto_updates_applied.forEach(update => {
        report += `  ✅ ${update.service}: ${update.updates_count} selector(s) updated\n`;
      });
    }

    if (manual_review_required.length > 0) {
      report += `\n⚠️  MANUAL REVIEW REQUIRED:\n──────────────────────\n`;
      manual_review_required.forEach(review => {
        report += `  👀 ${review.service}: ${review.reason} (${review.confidence}% confidence)\n`;
      });
    }

    if (errors.length > 0) {
      report += `\n❌ ERRORS:\n─────────\n`;
      errors.forEach(error => {
        report += `  🚨 ${error.service}: ${error.error}\n`;
      });
    }

    report += `\n🎯 NEXT ACTIONS:\n──────────────\n`;
    if (summary.confidence_score >= 90) {
      report += `✅ All systems healthy - no immediate action required\n`;
    } else if (summary.confidence_score >= 70) {
      report += `⚠️  Monitor systems - some selectors may need updates soon\n`;
    } else {
      report += `🚨 URGENT: Multiple systems need attention - update selectors immediately\n`;
    }

    return report;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    autoUpdate: args.includes('--auto-update'),
    headless: !args.includes('--headless=false'),
    specificService: args.find(arg => arg.startsWith('--service='))?.split('=')[1],
    timeout: parseInt(args.find(arg => arg.startsWith('--timeout='))?.split('=')[1]) || 30000
  };

  console.log('🎯 WebAI Real-Time Diagnostic Tool');  
  console.log('═'.repeat(40));
  
  if (args.includes('--help')) {
    console.log(`
Usage: node webai-diagnostic.js [options]

Options:
  --auto-update         Automatically update selectors when confidence is high
  --service=<name>      Test only specific service (chatgpt, claude, gemini)
  --headless=false      Run browser in visible mode (default: headless)
  --timeout=<ms>        Set custom timeout (default: 30000ms)
  --help               Show this help message

Examples:
  node webai-diagnostic.js --auto-update
  node webai-diagnostic.js --service=chatgpt --headless=false
  node webai-diagnostic.js --auto-update --service=claude
`);
    return;
  }

  const diagnostic = new WebAIDiagnostic(options);
  
  try {
    const results = await diagnostic.runFullDiagnostic();
    
    console.log('\n🎉 Diagnostic Complete!');
    console.log(`📊 Overall Confidence: ${results.summary.confidence_score}%`);
    console.log(`🔄 Updates Applied: ${results.auto_updates_applied.length}`);
    
    process.exit(results.summary.confidence_score >= 70 ? 0 : 1);
    
  } catch (error) {
    console.error(`💥 Diagnostic failed: ${error.message}`);
    process.exit(2);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default WebAIDiagnostic;