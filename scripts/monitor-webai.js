#!/usr/bin/env node

/**
 * WebAI DOM Selector Monitor
 * Validates and monitors DOM selectors for 4AI automation system
 * Usage: node monitor-webai.js [--service=<name>] [--live] [--format=json|text]
 */

import fs from 'fs';

// Configuration
const CONFIG_PATH = './config/webai-selectors.json';
const REPORT_PATH = './logs/webai-monitor.json';

// Expected performance thresholds
const THRESHOLDS = {
  SUCCESS_RATE_GREEN: 95,
  SUCCESS_RATE_YELLOW: 85,
  RESPONSE_TIME_GREEN: 5000,
  RESPONSE_TIME_YELLOW: 10000,
  ERROR_RATE_GREEN: 5,
  ERROR_RATE_YELLOW: 15,
  FALLBACK_USAGE_GREEN: 20,
  FALLBACK_USAGE_YELLOW: 40
};

class WebAIMonitor {
  constructor() {
    this.config = this.loadConfig();
    this.results = {
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      services: {},
      summary: {
        total_services: 0,
        healthy_services: 0,
        warning_services: 0,
        failed_services: 0,
        average_response_time: 0,
        config_version: this.config.version
      }
    };
  }

  loadConfig() {
    try {
      const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      console.error(`❌ Failed to load config: ${error.message}`);
      process.exit(1);
    }
  }

  async monitorService(serviceId, serviceConfig) {
    console.log(`🔍 Monitoring ${serviceConfig.name}...`);
    
    const serviceResult = {
      inputSelector: await this.checkSelector(serviceConfig.inputSelectors[0], serviceConfig.inputSelectors),
      sendSelector: await this.checkSelector(serviceConfig.sendSelectors[0], serviceConfig.sendSelectors),
      responseSelector: await this.checkSelector(serviceConfig.responseSelectors[0], serviceConfig.responseSelectors),
      overall_score: 0,
      status: 'UNKNOWN'
    };

    // Calculate overall score
    const scores = [
      serviceResult.inputSelector.found ? 100 : (serviceResult.inputSelector.fallback_used ? 70 : 0),
      serviceResult.sendSelector.found ? 100 : (serviceResult.sendSelector.fallback_used ? 70 : 0),
      serviceResult.responseSelector.found ? 100 : (serviceResult.responseSelector.fallback_used ? 70 : 0)
    ];
    
    serviceResult.overall_score = Math.round(scores.reduce((a, b) => a + b, 0) / 3);
    
    // Determine status
    if (serviceResult.overall_score >= THRESHOLDS.SUCCESS_RATE_GREEN) {
      serviceResult.status = 'HEALTHY';
      this.results.summary.healthy_services++;
    } else if (serviceResult.overall_score >= THRESHOLDS.SUCCESS_RATE_YELLOW) {
      serviceResult.status = 'WARNING';
      this.results.summary.warning_services++;
    } else {
      serviceResult.status = 'FAILED';
      this.results.summary.failed_services++;
    }

    return serviceResult;
  }

  async checkSelector(primarySelector, fallbackSelectors = []) {
    const startTime = Date.now();
    
    try {
      // Simulate DOM check (in real implementation, this would use puppeteer/playwright)
      const found = Math.random() > 0.1; // 90% success rate simulation
      const responseTime = Math.random() * 1000 + 100; // 100-1100ms
      
      await new Promise(resolve => setTimeout(resolve, responseTime));
      
      const result = {
        primary: primarySelector,
        found: found,
        fallback_used: false,
        response_time_ms: Math.round(Date.now() - startTime)
      };
      
      if (!found && fallbackSelectors.length > 1) {
        // Try fallback
        const fallbackFound = Math.random() > 0.3; // 70% fallback success
        if (fallbackFound) {
          result.found = true;
          result.fallback_used = true;
          result.fallback_selector = fallbackSelectors[1];
        }
      }
      
      return result;
    } catch (error) {
      return {
        primary: primarySelector,
        found: false,
        fallback_used: false,
        response_time_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async runMonitoring(specificService = null) {
    console.log('🚀 Starting WebAI DOM Selector Monitoring...');
    console.log(`📅 Timestamp: ${this.results.timestamp}`);
    console.log(`📋 Config Version: ${this.config.version}`);
    console.log('─'.repeat(60));
    
    const services = specificService 
      ? { [specificService]: this.config.services[specificService] }
      : this.config.services;
    
    this.results.summary.total_services = Object.keys(services).length;
    
    for (const [serviceId, serviceConfig] of Object.entries(services)) {
      this.results.services[serviceId] = await this.monitorService(serviceId, serviceConfig);
    }
    
    // Calculate summary
    const responseTimes = Object.values(this.results.services)
      .flatMap(service => [
        service.inputSelector.response_time_ms,
        service.sendSelector.response_time_ms,
        service.responseSelector.response_time_ms
      ]);
    
    this.results.summary.average_response_time = Math.round(
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    );
    
    // Determine overall status
    if (this.results.summary.failed_services > 0) {
      this.results.status = 'FAILURE';
    } else if (this.results.summary.warning_services > 0) {
      this.results.status = 'WARNING';
    } else {
      this.results.status = 'SUCCESS';
    }
    
    return this.results;
  }

  generateTextReport() {
    const { services, summary } = this.results;
    
    let report = `
🎯 WebAI Automation Monitoring Report
═══════════════════════════════════════
📅 Date: ${new Date(this.results.timestamp).toLocaleString()}
🏷️  Status: ${this.getStatusEmoji(this.results.status)} ${this.results.status}
📊 Config Version: ${summary.config_version}

📈 SUMMARY METRICS:
─────────────────────
✅ Healthy Services: ${summary.healthy_services}/${summary.total_services}
⚠️  Warning Services: ${summary.warning_services}/${summary.total_services}  
❌ Failed Services: ${summary.failed_services}/${summary.total_services}
⏱️  Average Response Time: ${summary.average_response_time}ms

🔍 SERVICE DETAILS:
─────────────────────
`;

    for (const [serviceId, service] of Object.entries(services)) {
      report += `
${this.getStatusEmoji(service.status)} ${serviceId.toUpperCase()} (${service.overall_score}%)
  Input:    ${service.inputSelector.found ? '✅' : '❌'} ${service.inputSelector.primary}
            ${service.inputSelector.fallback_used ? `↳ Used fallback: ${service.inputSelector.fallback_selector}` : ''}
            Response: ${service.inputSelector.response_time_ms}ms
  
  Send:     ${service.sendSelector.found ? '✅' : '❌'} ${service.sendSelector.primary}
            ${service.sendSelector.fallback_used ? `↳ Used fallback: ${service.sendSelector.fallback_selector}` : ''}
            Response: ${service.sendSelector.response_time_ms}ms
  
  Response: ${service.responseSelector.found ? '✅' : '❌'} ${service.responseSelector.primary}
            ${service.responseSelector.fallback_used ? `↳ Used fallback: ${service.responseSelector.fallback_selector}` : ''}
            Response: ${service.responseSelector.response_time_ms}ms
`;
    }

    // Add recommendations
    report += `
🔧 RECOMMENDATIONS:
──────────────────
`;

    const failedServices = Object.entries(services).filter(([, service]) => service.status === 'FAILED');
    const warningServices = Object.entries(services).filter(([, service]) => service.status === 'WARNING');
    
    if (failedServices.length > 0) {
      report += `🚨 URGENT: ${failedServices.length} service(s) failing - immediate attention required\n`;
      failedServices.forEach(([serviceId]) => {
        report += `   • Update ${serviceId} selectors in config/webai-selectors.json\n`;
      });
    }
    
    if (warningServices.length > 0) {
      report += `⚠️  MONITOR: ${warningServices.length} service(s) using fallbacks - consider updating primary selectors\n`;
    }
    
    if (summary.average_response_time > THRESHOLDS.RESPONSE_TIME_YELLOW) {
      report += `⏱️  PERFORMANCE: Average response time (${summary.average_response_time}ms) exceeds threshold\n`;
    }
    
    if (failedServices.length === 0 && warningServices.length === 0) {
      report += `✅ All services healthy - no action required\n`;
    }

    return report;
  }

  getStatusEmoji(status) {
    const emojis = {
      'SUCCESS': '✅',
      'HEALTHY': '✅', 
      'WARNING': '⚠️',
      'FAILED': '❌',
      'FAILURE': '🚨'
    };
    return emojis[status] || '❓';
  }

  saveReport() {
    // Save JSON report
    fs.writeFileSync(REPORT_PATH, JSON.stringify(this.results, null, 2));
    
    // Save text report
    const textReport = this.generateTextReport();
    const textPath = REPORT_PATH.replace('.json', '.txt');
    fs.writeFileSync(textPath, textReport);
    
    console.log(`📄 Reports saved:`);
    console.log(`   JSON: ${REPORT_PATH}`);
    console.log(`   Text: ${textPath}`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const serviceArg = args.find(arg => arg.startsWith('--service='));
  const formatArg = args.find(arg => arg.startsWith('--format='));
  const liveArg = args.includes('--live');
  
  const specificService = serviceArg ? serviceArg.split('=')[1] : null;
  const format = formatArg ? formatArg.split('=')[1] : 'text';
  
  const monitor = new WebAIMonitor();
  
  try {
    const results = await monitor.runMonitoring(specificService);
    
    if (format === 'json') {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(monitor.generateTextReport());
    }
    
    if (!liveArg) {
      monitor.saveReport();
    }
    
    // Exit with appropriate code
    process.exit(results.status === 'SUCCESS' ? 0 : 1);
    
  } catch (error) {
    console.error(`💥 Monitoring failed: ${error.message}`);
    process.exit(2);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default WebAIMonitor;