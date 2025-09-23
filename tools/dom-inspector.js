#!/usr/bin/env node

/**
 * Manus Executor - Live DOM Inspector
 * Real-time DOM selector validation using Puppeteer
 * Usage: node dom-inspector.js --service=claude --mode=live
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

class LiveDOMInspector {
  constructor() {
    this.browser = null;
    this.page = null;
    this.config = this.loadConfig();
  }

  loadConfig() {
    const configPath = '../config/webai-selectors.json';
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (error) {
      console.error(`❌ Failed to load config: ${error.message}`);
      process.exit(1);
    }
  }

  async initialize() {
    console.log('🚀 Initializing Live DOM Inspector...');
    this.browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Set viewport and user agent
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  }

  async inspectService(serviceName) {
    const service = this.config.services[serviceName];
    if (!service) {
      throw new Error(`Service ${serviceName} not found in config`);
    }

    console.log(`🔍 Inspecting ${service.name} at ${service.url}`);
    
    const results = {
      timestamp: new Date().toISOString(),
      service: serviceName,
      url: service.url,
      status: 'SUCCESS',
      selectors: {
        input: await this.testSelectorGroup('input', service.inputSelectors),
        send: await this.testSelectorGroup('send', service.sendSelectors),
        response: await this.testSelectorGroup('response', service.responseSelectors)
      },
      recommendations: [],
      confidence_score: 0
    };

    // Navigate to service
    try {
      await this.page.goto(service.url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      console.log(`✅ Successfully loaded ${service.name}`);
    } catch (error) {
      results.status = 'FAILED';
      results.error = `Navigation failed: ${error.message}`;
      return results;
    }

    // Test all selector groups
    for (const [type, selectors] of Object.entries({
      input: service.inputSelectors,
      send: service.sendSelectors,
      response: service.responseSelectors
    })) {
      console.log(`\n🎯 Testing ${type} selectors...`);
      results.selectors[type] = await this.testSelectorGroup(type, selectors);
    }

    // Calculate confidence and generate recommendations
    results.confidence_score = this.calculateConfidence(results.selectors);
    results.recommendations = this.generateRecommendations(results.selectors);
    
    if (results.confidence_score < 70) {
      results.status = 'WARNING';
    }
    if (results.confidence_score < 50) {
      results.status = 'FAILED';
    }

    return results;
  }

  async testSelectorGroup(type, selectors) {
    const groupResults = {
      type,
      selectors: [],
      primary_found: false,
      best_selector: null,
      fallback_needed: false
    };

    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      console.log(`  Testing: ${selector}`);
      
      const result = await this.testSingleSelector(selector);
      result.is_primary = i === 0;
      result.priority = i;
      
      groupResults.selectors.push(result);
      
      if (i === 0 && result.found) {
        groupResults.primary_found = true;
      }
      
      if (result.found && !groupResults.best_selector) {
        groupResults.best_selector = selector;
      }
    }

    groupResults.fallback_needed = !groupResults.primary_found && groupResults.best_selector;
    
    return groupResults;
  }

  async testSingleSelector(selector) {
    const startTime = Date.now();
    
    try {
      // Wait for potential dynamic loading
      await this.page.waitForTimeout(1000);
      
      const elements = await this.page.$$(selector);
      const elementCount = elements.length;
      
      let isVisible = false;
      let position = null;
      let attributes = null;
      
      if (elementCount > 0) {
        // Test visibility of first element
        isVisible = await this.page.evaluate((el) => {
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return rect.width > 0 && 
                 rect.height > 0 && 
                 style.visibility !== 'hidden' && 
                 style.display !== 'none';
        }, elements[0]);
        
        // Get position and attributes
        position = await this.page.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          };
        }, elements[0]);
        
        attributes = await this.page.evaluate((el) => {
          const attrs = {};
          for (const attr of el.attributes) {
            attrs[attr.name] = attr.value;
          }
          return {
            tagName: el.tagName.toLowerCase(),
            id: el.id,
            className: el.className,
            attributes: attrs
          };
        }, elements[0]);
      }
      
      return {
        selector,
        found: elementCount > 0,
        count: elementCount,
        visible: isVisible,
        position,
        attributes,
        response_time_ms: Date.now() - startTime,
        screenshot_path: await this.takeElementScreenshot(selector, elements[0])
      };
      
    } catch (error) {
      return {
        selector,
        found: false,
        count: 0,
        visible: false,
        error: error.message,
        response_time_ms: Date.now() - startTime
      };
    }
  }

  async takeElementScreenshot(selector, element) {
    if (!element) return null;
    
    try {
      const timestamp = Date.now();
      const filename = `element_${selector.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.png`;
      const filepath = path.join('./logs/screenshots', filename);
      
      // Ensure directory exists
      fs.mkdirSync('./logs/screenshots', { recursive: true });
      
      await element.screenshot({ path: filepath });
      return filepath;
    } catch (error) {
      console.log(`⚠️  Screenshot failed for ${selector}: ${error.message}`);
      return null;
    }
  }

  calculateConfidence(selectorsResult) {
    let totalScore = 0;
    let maxScore = 0;
    
    for (const [type, group] of Object.entries(selectorsResult)) {
      const typeWeight = { input: 40, send: 30, response: 30 }[type] || 30;
      maxScore += typeWeight;
      
      if (group.primary_found) {
        totalScore += typeWeight; // Full score for primary working
      } else if (group.best_selector) {
        totalScore += typeWeight * 0.7; // 70% score for fallback working
      }
    }
    
    return Math.round((totalScore / maxScore) * 100);
  }

  generateRecommendations(selectorsResult) {
    const recommendations = [];
    
    for (const [type, group] of Object.entries(selectorsResult)) {
      if (!group.primary_found && group.best_selector) {
        recommendations.push({
          type: 'UPDATE_PRIMARY_SELECTOR',
          category: type,
          current: group.selectors[0]?.selector,
          recommended: group.best_selector,
          reason: 'Primary selector not found, but fallback works',
          priority: 'HIGH',
          confidence: 85
        });
      }
      
      if (!group.best_selector) {
        recommendations.push({
          type: 'ADD_NEW_SELECTORS',
          category: type,
          reason: 'No working selectors found',
          priority: 'CRITICAL',
          confidence: 95,
          suggested_patterns: this.getSuggestedPatterns(type)
        });
      }
      
      if (group.selectors.length < 3) {
        recommendations.push({
          type: 'ADD_FALLBACK_SELECTORS',
          category: type,
          reason: 'Insufficient fallback options',
          priority: 'MEDIUM',
          confidence: 70
        });
      }
    }
    
    return recommendations;
  }

  getSuggestedPatterns(type) {
    const patterns = {
      input: [
        '[contenteditable="true"]',
        'textarea',
        'input[type="text"]',
        '[role="textbox"]',
        '.input-field',
        '[data-testid*="input"]'
      ],
      send: [
        'button[type="submit"]',
        '[aria-label*="Send"]',
        '[aria-label*="send"]',
        'button:has(svg)',
        '[data-testid*="send"]',
        '.send-button'
      ],
      response: [
        '[role="article"]',
        '.message',
        '.response',
        '[data-message]',
        '.assistant-message',
        '[data-testid*="message"]'
      ]
    };
    
    return patterns[type] || [];
  }

  generateReport(results, format = 'text') {
    if (format === 'json') {
      return JSON.stringify(results, null, 2);
    }
    
    // Text format
    let report = `
🔍 DOM INSPECTION REPORT
═══════════════════════════
📅 Timestamp: ${new Date(results.timestamp).toLocaleString()}
🎯 Service: ${results.service}
🌐 URL: ${results.url}
📊 Status: ${this.getStatusEmoji(results.status)} ${results.status}
💯 Confidence: ${results.confidence_score}%

📋 SELECTOR ANALYSIS:
────────────────────
`;

    for (const [type, group] of Object.entries(results.selectors)) {
      report += `\n${type.toUpperCase()} SELECTORS:\n`;
      report += `Primary Working: ${group.primary_found ? '✅' : '❌'}\n`;
      report += `Best Selector: ${group.best_selector || 'None found'}\n`;
      report += `Fallback Needed: ${group.fallback_needed ? '⚠️ YES' : '✅ NO'}\n`;
      
      group.selectors.forEach((sel) => {
        const status = sel.found ? (sel.visible ? '✅' : '👻') : '❌';
        const primary = sel.is_primary ? ' (PRIMARY)' : '';
        report += `  ${status} ${sel.selector}${primary}\n`;
        if (sel.found) {
          report += `    Count: ${sel.count}, Visible: ${sel.visible}, Time: ${sel.response_time_ms}ms\n`;
        }
        if (sel.error) {
          report += `    Error: ${sel.error}\n`;
        }
      });
    }

    if (results.recommendations.length > 0) {
      report += `\n🔧 RECOMMENDATIONS:\n`;
      report += `──────────────────\n`;
      
      results.recommendations.forEach((rec) => {
        const priority = { CRITICAL: '🚨', HIGH: '⚠️', MEDIUM: '💡', LOW: 'ℹ️' }[rec.priority];
        report += `${priority} ${rec.type} (${rec.priority})\n`;
        report += `   Category: ${rec.category}\n`;
        report += `   Reason: ${rec.reason}\n`;
        if (rec.current && rec.recommended) {
          report += `   Current: ${rec.current}\n`;
          report += `   Recommended: ${rec.recommended}\n`;
        }
        report += `   Confidence: ${rec.confidence}%\n\n`;
      });
    }

    return report;
  }

  getStatusEmoji(status) {
    const emojis = {
      'SUCCESS': '✅',
      'WARNING': '⚠️',
      'FAILED': '❌'
    };
    return emojis[status] || '❓';
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const serviceArg = args.find(arg => arg.startsWith('--service='));
  const formatArg = args.find(arg => arg.startsWith('--format='));
  const modeArg = args.find(arg => arg.startsWith('--mode='));
  
  const serviceName = serviceArg ? serviceArg.split('=')[1] : null;
  const format = formatArg ? formatArg.split('=')[1] : 'text';
  const mode = modeArg ? modeArg.split('=')[1] : 'inspect';
  
  if (!serviceName) {
    console.error('❌ Usage: node dom-inspector.js --service=<name> [--format=text|json] [--mode=inspect|live]');
    process.exit(1);
  }
  
  const inspector = new LiveDOMInspector();
  
  try {
    await inspector.initialize();
    console.log(`🎯 Running ${mode} inspection for ${serviceName}...`);
    
    const results = await inspector.inspectService(serviceName);
    const report = inspector.generateReport(results, format);
    
    console.log('\n' + '═'.repeat(60));
    console.log(report);
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `dom-inspection-${serviceName}-${timestamp}.${format}`;
    fs.writeFileSync(`./logs/${filename}`, format === 'json' ? JSON.stringify(results, null, 2) : report);
    console.log(`\n📄 Report saved: ./logs/${filename}`);
    
    // Exit with appropriate code
    process.exit(results.status === 'SUCCESS' ? 0 : 1);
    
  } catch (error) {
    console.error(`💥 Inspection failed: ${error.message}`);
    process.exit(2);
  } finally {
    await inspector.cleanup();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default LiveDOMInspector;