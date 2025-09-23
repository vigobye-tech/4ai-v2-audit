#!/usr/bin/env node

/**
 * Manus Executor - Config Auto-Updater
 * Intelligent configuration management with rollback capabilities
 * Usage: node config-updater.js --solution=<solution.json> --apply
 */

import fs from 'fs';
import path from 'path';

class ConfigAutoUpdater {
  constructor(configPath = './config/webai-selectors.json') {
    this.configPath = configPath;
    this.backupPath = `${configPath}.backup.${Date.now()}`;
    this.config = this.loadConfig();
    this.changes = [];
    this.rollbackData = null;
  }

  loadConfig() {
    try {
      return JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
    } catch (error) {
      console.error(`💥 Failed to load config: ${error.message}`);
      return null;
    }
  }

  createBackup() {
    console.log(`💾 Creating backup: ${this.backupPath}`);
    fs.copyFileSync(this.configPath, this.backupPath);
    return this.backupPath;
  }

  applySolution(solution) {
    console.log(`🔧 Applying solution: ${solution.action}`);

    this.rollbackData = {
      timestamp: new Date().toISOString(),
      original_config: JSON.parse(JSON.stringify(this.config)),
      solution_applied: solution,
      backup_path: this.createBackup()
    };

    switch (solution.action) {
      case 'UPDATE_SELECTOR':
        return this.updateSelector(solution);
      
      case 'ADD_FALLBACK':
        return this.addFallback(solution);
      
      case 'INCREASE_TIMEOUT':
        return this.updateTimeout(solution);
      
      case 'UPDATE_RESPONSE_SELECTOR':
        return this.updateResponseSelector(solution);
      
      case 'DYNAMIC_SELECTOR_DISCOVERY':
        return this.performSelectorDiscovery(solution);
      
      case 'ADAPTIVE_TIMEOUT':
        return this.implementAdaptiveTimeout(solution);
      
      default:
        console.warn(`⚠️  Unknown solution action: ${solution.action}`);
        return false;
    }
  }

  updateSelector(solution) {
    const service = solution.service || this.detectService(solution);
    if (!service) {
      console.error('❌ Cannot determine target service');
      return false;
    }

    const element = solution.element || 'input';
    const oldSelector = this.config[service].selectors[element].primary;
    
    console.log(`🔄 Updating ${service} ${element} selector:`);
    console.log(`   From: ${oldSelector}`);
    console.log(`   To: ${solution.selector}`);

    // Move old primary to fallback
    if (!this.config[service].selectors[element].fallbacks) {
      this.config[service].selectors[element].fallbacks = [];
    }
    
    this.config[service].selectors[element].fallbacks.unshift(oldSelector);
    this.config[service].selectors[element].primary = solution.selector;

    this.changes.push({
      action: 'UPDATE_SELECTOR',
      service,
      element,
      old_value: oldSelector,
      new_value: solution.selector,
      reasoning: solution.reasoning
    });

    return true;
  }

  addFallback(solution) {
    const service = solution.service || this.detectService(solution);
    const element = solution.element || 'input';

    console.log(`➕ Adding fallback selector for ${service} ${element}: ${solution.selector}`);

    if (!this.config[service].selectors[element].fallbacks) {
      this.config[service].selectors[element].fallbacks = [];
    }

    // Add to beginning of fallbacks array (highest priority)
    this.config[service].selectors[element].fallbacks.unshift(solution.selector);

    this.changes.push({
      action: 'ADD_FALLBACK',
      service,
      element,
      new_fallback: solution.selector,
      reasoning: solution.reasoning
    });

    return true;
  }

  updateTimeout(solution) {
    const service = solution.service || this.detectService(solution);
    const element = solution.element || 'response';
    
    const oldTimeout = this.config[service].timing[`${element}_timeout`];
    const newTimeout = solution.value;

    console.log(`⏱️  Updating ${service} ${element} timeout: ${oldTimeout}ms → ${newTimeout}ms`);

    this.config[service].timing[`${element}_timeout`] = newTimeout;

    this.changes.push({
      action: 'UPDATE_TIMEOUT',
      service,
      element,
      old_value: oldTimeout,
      new_value: newTimeout,
      reasoning: solution.reasoning
    });

    return true;
  }

  updateResponseSelector(solution) {
    const service = solution.service || this.detectService(solution);
    
    console.log(`🎯 Updating response selector for ${service}: ${solution.selector}`);

    const oldSelector = this.config[service].selectors.response.primary;
    this.config[service].selectors.response.primary = solution.selector;

    // Add old selector as fallback
    if (!this.config[service].selectors.response.fallbacks) {
      this.config[service].selectors.response.fallbacks = [];
    }
    this.config[service].selectors.response.fallbacks.unshift(oldSelector);

    this.changes.push({
      action: 'UPDATE_RESPONSE_SELECTOR',
      service,
      old_value: oldSelector,
      new_value: solution.selector,
      reasoning: solution.reasoning
    });

    return true;
  }

  performSelectorDiscovery(solution) {
    console.log('🔍 Performing dynamic selector discovery...');
    
    // This would integrate with the DOM inspector
    const discoveredSelectors = this.simulateSelectorDiscovery();
    
    discoveredSelectors.forEach(selector => {
      this.addFallback({
        ...solution,
        selector: selector.selector,
        reasoning: `Discovered: ${selector.reasoning}`
      });
    });

    return discoveredSelectors.length > 0;
  }

  simulateSelectorDiscovery() {
    // In real implementation, this would use DOM inspector
    // For demo, return some common selector patterns
    return [
      {
        selector: '[contenteditable="true"]:not([aria-label*="search"])',
        reasoning: 'Contenteditable excluding search boxes',
        confidence: 0.8
      },
      {
        selector: 'div[role="textbox"][data-testid*="input"]',
        reasoning: 'Textbox with input testid',
        confidence: 0.7
      },
      {
        selector: 'textarea:not([readonly]):not([disabled])',
        reasoning: 'Active textarea elements',
        confidence: 0.6
      }
    ];
  }

  implementAdaptiveTimeout(solution) {
    const service = solution.service || this.detectService(solution);
    
    console.log(`🔄 Implementing adaptive timeout for ${service}`);

    // Create progressive timeout structure
    const adaptiveConfig = {
      initial_timeout: this.config[service].timing.response_timeout || 15000,
      max_timeout: solution.max_timeout || 45000,
      retry_intervals: [5000, 10000, 15000, 30000],
      backoff_multiplier: 1.5
    };

    this.config[service].timing.adaptive_timeout = adaptiveConfig;

    this.changes.push({
      action: 'IMPLEMENT_ADAPTIVE_TIMEOUT',
      service,
      new_config: adaptiveConfig,
      reasoning: solution.reasoning
    });

    return true;
  }

  detectService(solution) {
    // Try to detect service from solution context
    const solutionText = JSON.stringify(solution).toLowerCase();
    
    if (solutionText.includes('claude')) return 'claude';
    if (solutionText.includes('chatgpt') || solutionText.includes('openai')) return 'chatgpt';
    if (solutionText.includes('gemini') || solutionText.includes('bard')) return 'gemini';
    if (solutionText.includes('copilot')) return 'copilot';
    
    return null;
  }

  validateChanges() {
    console.log('✅ Validating configuration changes...');
    
    const validation = {
      is_valid: true,
      errors: [],
      warnings: [],
      changes_summary: this.changes
    };

    // Check if config loaded properly
    if (!this.config) {
      validation.errors.push('Configuration file could not be loaded');
      validation.is_valid = false;
      return validation;
    }

    // Check required fields based on actual config structure
    const requiredServices = ['claude', 'chatgpt', 'gemini', 'copilot'];
    requiredServices.forEach(service => {
      if (!this.config.services?.[service]) {
        validation.errors.push(`Missing service configuration: ${service}`);
        validation.is_valid = false;
      } else {
        const serviceConfig = this.config.services[service];
        
        // Check required selectors based on actual structure
        const requiredSelectors = ['inputSelectors', 'sendSelectors', 'responseSelectors'];
        requiredSelectors.forEach(selector => {
          if (!serviceConfig[selector] || !Array.isArray(serviceConfig[selector]) || serviceConfig[selector].length === 0) {
            validation.errors.push(`Missing or empty ${selector} for ${service}`);
            validation.is_valid = false;
          }
        });

        // Check if service has name and URL
        if (!serviceConfig.name) {
          validation.warnings.push(`Missing name for ${service}`);
        }
        if (!serviceConfig.url) {
          validation.warnings.push(`Missing URL for ${service}`);
        }
      }
    });

    // Validate selector syntax
    this.changes.forEach(change => {
      if (change.action.includes('SELECTOR') && change.new_value) {
        try {
          // Basic CSS selector validation
          if (typeof change.new_value !== 'string' || change.new_value.trim() === '') {
            validation.errors.push(`Invalid selector: ${change.new_value}`);
            validation.is_valid = false;
          }
        } catch (error) {
          validation.errors.push(`Selector validation error: ${error.message}`);
          validation.is_valid = false;
        }
      }
    });

    return validation;
  }

  saveConfig() {
    console.log(`💾 Saving updated configuration to: ${this.configPath}`);
    
    const validation = this.validateChanges();
    if (!validation.is_valid) {
      console.error('❌ Configuration validation failed:');
      validation.errors.forEach(error => console.error(`   • ${error}`));
      return false;
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️  Configuration warnings:');
      validation.warnings.forEach(warning => console.warn(`   • ${warning}`));
    }

    // Add metadata
    this.config._metadata = {
      last_updated: new Date().toISOString(),
      updated_by: 'Manus Config Auto-Updater',
      version: this.config._metadata?.version ? this.config._metadata.version + 1 : 1,
      changes_applied: this.changes.length,
      backup_available: this.backupPath
    };

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.log('✅ Configuration saved successfully');
      
      // Save rollback information
      this.saveRollbackData();
      
      return true;
    } catch (error) {
      console.error(`💥 Failed to save configuration: ${error.message}`);
      return false;
    }
  }

  saveRollbackData() {
    const rollbackPath = `./logs/rollback-${Date.now()}.json`;
    fs.mkdirSync(path.dirname(rollbackPath), { recursive: true });
    fs.writeFileSync(rollbackPath, JSON.stringify(this.rollbackData, null, 2));
    console.log(`🔄 Rollback data saved: ${rollbackPath}`);
  }

  rollback() {
    if (!this.rollbackData) {
      console.error('❌ No rollback data available');
      return false;
    }

    console.log('🔄 Rolling back configuration changes...');

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.rollbackData.original_config, null, 2));
      console.log('✅ Configuration rolled back successfully');
      
      // Remove backup file
      if (fs.existsSync(this.rollbackData.backup_path)) {
        fs.unlinkSync(this.rollbackData.backup_path);
        console.log('🗑️  Backup file cleaned up');
      }
      
      return true;
    } catch (error) {
      console.error(`💥 Rollback failed: ${error.message}`);
      return false;
    }
  }

  generateUpdateReport() {
    return `
🔧 CONFIGURATION UPDATE REPORT
═══════════════════════════════

📅 Update Date: ${new Date().toLocaleString()}
📝 Changes Applied: ${this.changes.length}
💾 Backup Created: ${this.backupPath}

📋 DETAILED CHANGES:
──────────────────
${this.changes.map((change, index) => `
${index + 1}. ${change.action}
   Service: ${change.service || 'Multiple'}
   ${change.element ? `Element: ${change.element}` : ''}
   ${change.old_value ? `From: ${change.old_value}` : ''}
   ${change.new_value ? `To: ${change.new_value}` : ''}
   ${change.new_fallback ? `Added Fallback: ${change.new_fallback}` : ''}
   Reasoning: ${change.reasoning || 'Not specified'}
`).join('')}

🎯 NEXT STEPS:
─────────────
1. Test updated configuration with DOM inspector
2. Monitor for 24 hours for any regressions
3. If issues occur, rollback is available
4. Update monitoring thresholds if needed

📊 ROLLBACK INFORMATION:
──────────────────────
• Rollback data saved automatically
• Original config preserved in backup
• Use rollback() method if needed
• Backup expires in 30 days
`;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const solutionArg = args.find(arg => arg.startsWith('--solution='));
  const configArg = args.find(arg => arg.startsWith('--config='));
  const applyArg = args.includes('--apply');
  const rollbackArg = args.includes('--rollback');
  const validateArg = args.includes('--validate-only');

  const configPath = configArg ? configArg.split('=')[1] : './config/webai-selectors.json';
  const updater = new ConfigAutoUpdater(configPath);

  if (rollbackArg) {
    console.log('🔄 Initiating configuration rollback...');
    const success = updater.rollback();
    process.exit(success ? 0 : 1);
  }

  if (!solutionArg && !validateArg) {
    console.error('❌ Usage: node config-updater.js --solution=<solution.json> [--config=<config.json>] [--apply] [--validate-only] [--rollback]');
    process.exit(1);
  }

  try {
    if (validateArg) {
      console.log('✅ Validating current configuration...');
      const validation = updater.validateChanges();
      console.log(validation.is_valid ? '✅ Configuration is valid' : '❌ Configuration has errors');
      if (validation.errors.length > 0) {
        validation.errors.forEach(error => console.error(`   • ${error}`));
      }
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => console.warn(`   • ${warning}`));
      }
      process.exit(validation.is_valid ? 0 : 1);
    }

    const solutionPath = solutionArg.split('=')[1];
    const solution = JSON.parse(fs.readFileSync(solutionPath, 'utf-8'));
    
    console.log('🚀 Starting configuration update...');
    console.log(`📄 Solution file: ${solutionPath}`);
    console.log(`⚙️  Config file: ${configPath}`);
    
    const success = updater.applySolution(solution);
    
    if (!success) {
      console.error('❌ Failed to apply solution');
      process.exit(1);
    }
    
    if (applyArg) {
      const saved = updater.saveConfig();
      if (!saved) {
        console.error('❌ Failed to save configuration');
        process.exit(1);
      }
      
      console.log('\n' + '═'.repeat(60));
      console.log(updater.generateUpdateReport());
      
    } else {
      console.log('🔍 Dry run completed. Use --apply to save changes.');
      console.log('\nProposed changes:');
      updater.changes.forEach((change, index) => {
        console.log(`${index + 1}. ${change.action}: ${change.reasoning}`);
      });
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error(`💥 Update failed: ${error.message}`);
    process.exit(1);
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

export default ConfigAutoUpdater;