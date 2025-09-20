#!/usr/bin/env node

/**
 * Cross-platform audit script for 4AI v2.0
 * Replaces PowerShell-specific scripts with Node.js implementation
 * Works on Windows, macOS, and Linux
 */

import fs from 'fs';
import { glob } from 'glob';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

// Audit functions
const audits = {
  selectors: () => {
    console.log(c('cyan', '\n🔍 AUDIT: WebAI Selector Patterns'));
    console.log(c('blue', '='.repeat(50)));
    
    const patterns = [
      'prompt-textarea',
      'ProseMirror', 
      'ql-editor',
      'searchbox',
      'contenteditable'
    ];
    
    const files = glob.sync('src/**/*.{ts,tsx,js,jsx}');
    let matches = 0;
    
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        patterns.forEach(pattern => {
          if (line.includes(pattern)) {
            console.log(`${c('green', file)}:${c('yellow', index + 1)} ${line.trim()}`);
            matches++;
          }
        });
      });
    });
    
    console.log(c('blue', `\nFound ${matches} selector patterns`));
    return matches;
  },

  security: () => {
    console.log(c('cyan', '\n🔒 AUDIT: Security Patterns'));
    console.log(c('blue', '='.repeat(50)));
    
    const securityPatterns = [
      { pattern: 'eval\\(', severity: 'HIGH', description: 'Direct eval() usage' },
      { pattern: 'innerHTML\\s*=', severity: 'MEDIUM', description: 'innerHTML assignment' },
      { pattern: 'document\\.write', severity: 'HIGH', description: 'document.write usage' },
      { pattern: 'localStorage\\.|sessionStorage\\.', severity: 'LOW', description: 'Local storage usage' },
      { pattern: 'console\\.log', severity: 'INFO', description: 'Debug console.log' }
    ];
    
    const files = glob.sync('src/**/*.{ts,tsx,js,jsx}');
    let findings = [];
    
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        securityPatterns.forEach(({ pattern, severity, description }) => {
          const regex = new RegExp(pattern, 'gi');
          if (regex.test(line)) {
            findings.push({
              file,
              line: index + 1,
              severity,
              description,
              code: line.trim()
            });
          }
        });
      });
    });
    
    // Group by severity
    const severityOrder = ['HIGH', 'MEDIUM', 'LOW', 'INFO'];
    const grouped = severityOrder.reduce((acc, sev) => {
      acc[sev] = findings.filter(f => f.severity === sev);
      return acc;
    }, {});
    
    Object.entries(grouped).forEach(([severity, items]) => {
      if (items.length > 0) {
        const color = severity === 'HIGH' ? 'red' : severity === 'MEDIUM' ? 'yellow' : 'blue';
        console.log(c(color, `\n${severity} (${items.length} findings):`));
        items.forEach(item => {
          console.log(`  ${c('green', item.file)}:${c('yellow', item.line)} - ${item.description}`);
          console.log(`    ${c('cyan', item.code)}`);
        });
      }
    });
    
    return findings.length;
  },

  resources: () => {
    console.log(c('cyan', '\n📦 AUDIT: Resource Management'));
    console.log(c('blue', '='.repeat(50)));
    
    const resourcePatterns = [
      { pattern: 'new\\s+WebView', description: 'WebView creation' },
      { pattern: '\\.destroy\\(\\)', description: 'Resource cleanup' },
      { pattern: '\\.close\\(\\)', description: 'Resource closing' },
      { pattern: 'addEventListener', description: 'Event listener registration' },
      { pattern: 'removeEventListener', description: 'Event listener cleanup' },
      { pattern: 'setTimeout|setInterval', description: 'Timer usage' },
      { pattern: 'clearTimeout|clearInterval', description: 'Timer cleanup' }
    ];
    
    const files = glob.sync('src/**/*.{ts,tsx,js,jsx}');
    let findings = [];
    
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        resourcePatterns.forEach(({ pattern, description }) => {
          const regex = new RegExp(pattern, 'gi');
          if (regex.test(line)) {
            findings.push({
              file,
              line: index + 1,
              description,
              code: line.trim()
            });
          }
        });
      });
    });
    
    console.log(`Found ${findings.length} resource management patterns:`);
    findings.forEach(item => {
      console.log(`  ${c('green', item.file)}:${c('yellow', item.line)} - ${item.description}`);
      console.log(`    ${c('cyan', item.code)}`);
    });
    
    return findings.length;
  },

  performance: () => {
    console.log(c('cyan', '\n⚡ AUDIT: Performance Patterns'));
    console.log(c('blue', '='.repeat(50)));
    
    const perfPatterns = [
      { pattern: 'for\\s*\\([^)]*\\.length', severity: 'MEDIUM', description: 'Loop with .length in condition' },
      { pattern: 'querySelector(?!All)', severity: 'LOW', description: 'Single querySelector usage' },
      { pattern: 'querySelectorAll', severity: 'INFO', description: 'QuerySelectorAll usage' },
      { pattern: '(?:await|Promise\\.all)', severity: 'INFO', description: 'Async operation' },
      { pattern: '\\.map\\([^)]*\\)\\.filter', severity: 'MEDIUM', description: 'Chained map().filter()' }
    ];
    
    const files = glob.sync('src/**/*.{ts,tsx,js,jsx}');
    let findings = [];
    
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        perfPatterns.forEach(({ pattern, severity, description }) => {
          const regex = new RegExp(pattern, 'gi');
          if (regex.test(line)) {
            findings.push({
              file,
              line: index + 1,
              severity,
              description,
              code: line.trim()
            });
          }
        });
      });
    });
    
    const severityOrder = ['HIGH', 'MEDIUM', 'LOW', 'INFO'];
    const grouped = severityOrder.reduce((acc, sev) => {
      acc[sev] = findings.filter(f => f.severity === sev);
      return acc;
    }, {});
    
    Object.entries(grouped).forEach(([severity, items]) => {
      if (items.length > 0) {
        const color = severity === 'MEDIUM' ? 'yellow' : 'blue';
        console.log(c(color, `\n${severity} (${items.length} findings):`));
        items.forEach(item => {
          console.log(`  ${c('green', item.file)}:${c('yellow', item.line)} - ${item.description}`);
        });
      }
    });
    
    return findings.length;
  },

  full: () => {
    console.log(c('bold', '\n🚀 FULL AUDIT REPORT'));
    console.log(c('blue', '='.repeat(60)));
    
    const results = {
      selectors: audits.selectors(),
      security: audits.security(), 
      resources: audits.resources(),
      performance: audits.performance()
    };
    
    console.log(c('bold', '\n📊 AUDIT SUMMARY'));
    console.log(c('blue', '='.repeat(30)));
    Object.entries(results).forEach(([audit, count]) => {
      console.log(`${c('cyan', audit.padEnd(12))}: ${c('green', count)} findings`);
    });
    
    const total = Object.values(results).reduce((sum, count) => sum + count, 0);
    console.log(c('bold', `${'TOTAL'.padEnd(12)}: ${total} findings`));
    
    return results;
  },

  lightning: () => {
    console.log(c('bold', '\n⚡ LIGHTNING AUDIT (Quick Check)'));
    console.log(c('blue', '='.repeat(50)));
    
    // Quick critical checks only
    const criticalPatterns = [
      'eval\\(',
      'innerHTML\\s*=', 
      'document\\.write',
      'prompt-textarea',
      'ProseMirror'
    ];
    
    const files = glob.sync('src/**/*.{ts,tsx,js,jsx}');
    let criticalFindings = 0;
    
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      criticalPatterns.forEach(pattern => {
        const regex = new RegExp(pattern, 'gi');
        const matches = content.match(regex);
        if (matches) {
          criticalFindings += matches.length;
        }
      });
    });
    
    console.log(`${c('green', '✓')} Checked ${files.length} files`);
    console.log(`${c('green', '✓')} Found ${criticalFindings} critical patterns`);
    console.log(`${c('green', '✓')} Lightning audit complete`);
    
    return criticalFindings;
  }
};

// CLI interface
const command = process.argv[2] || 'help';

if (command === 'help' || command === '--help' || command === '-h') {
  console.log(c('bold', '\n4AI v2.0 Cross-Platform Audit Tool'));
  console.log(c('blue', '='.repeat(40)));
  console.log('\nUsage: node scripts/audit.js [command]');
  console.log('\nCommands:');
  console.log('  selectors   - Check WebAI selector patterns');
  console.log('  security    - Security vulnerability scan');
  console.log('  resources   - Resource management analysis');
  console.log('  performance - Performance pattern analysis');
  console.log('  lightning   - Quick critical checks');
  console.log('  full        - Complete audit report');
  console.log('  help        - Show this help');
} else if (audits[command]) {
  const startTime = Date.now();
  const result = audits[command]();
  const duration = Date.now() - startTime;
  console.log(c('blue', `\n✓ Audit completed in ${duration}ms`));
  process.exit(0);
} else {
  console.error(c('red', `Unknown command: ${command}`));
  console.log('Run "node scripts/audit.js help" for available commands');
  process.exit(1);
}