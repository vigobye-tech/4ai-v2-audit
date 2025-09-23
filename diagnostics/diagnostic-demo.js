#!/usr/bin/env node

/**
 * Demo: WebAI Real-Time Diagnostic System
 * Demonstrates the full capability of the diagnostic system
 */

import WebAIMonitor from '../scripts/monitor-webai.js';
import fs from 'fs';

console.log(`
🎯 WebAI Real-Time Diagnostic System Demo
═══════════════════════════════════════════
`);

async function demoQuickHealthCheck() {
  console.log(`
📊 DEMO 1: Quick Health Check (No Login Required)
─────────────────────────────────────────────────
`);
  
  try {
    const monitor = new WebAIMonitor();
    const results = await monitor.runMonitoring();
    
    console.log('✅ Quick health check completed!');
    console.log(`📈 Overall Status: ${results.status}`);
    console.log(`🎯 Services: ${results.summary.healthy_services}/${results.summary.total_services} healthy`);
    console.log(`⏱️  Average Response: ${results.summary.average_response_time}ms`);
    
    // Show service breakdown
    Object.entries(results.services).forEach(([serviceId, service]) => {
      const emoji = service.status === 'HEALTHY' ? '✅' : service.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`   ${emoji} ${serviceId.toUpperCase()}: ${service.overall_score}%`);
    });
    
    return results;
    
  } catch (error) {
    console.error('❌ Quick health check failed:', error.message);
    return null;
  }
}

async function demoCredentialsSetup() {
  console.log(`
🔐 DEMO 2: Credentials Setup Check
──────────────────────────────────
`);
  
  try {
    const templatePath = './config/webai-credentials.template.json';
    const credentialsPath = '../config/webai-credentials.json';
    
    if (!fs.existsSync(credentialsPath)) {
      console.log('⚠️  No credentials file found');
      console.log('📋 Creating template...');
      
      if (fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, credentialsPath);
        console.log('✅ Template copied to webai-credentials.json');
        console.log('📝 Please edit the file with your real credentials:');
        console.log(`   notepad ${credentialsPath}`);
      } else {
        console.log('❌ Template file not found');
      }
      
      return false;
    } else {
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
      const services = Object.keys(credentials).filter(key => !key.startsWith('_'));
      
      console.log('✅ Credentials file found');
      console.log(`📊 Configured services: ${services.length}`);
      
      services.forEach(service => {
        const config = credentials[service];
        const hasRealCreds = config.username && !config.username.includes('example.com');
        const emoji = config.enabled ? (hasRealCreds ? '✅' : '⚠️') : '🔒';
        const status = config.enabled ? (hasRealCreds ? 'Ready' : 'Needs real credentials') : 'Disabled';
        
        console.log(`   ${emoji} ${service.toUpperCase()}: ${status}`);
      });
      
      return true;
    }
    
  } catch (error) {
    console.error('❌ Credentials setup failed:', error.message);
    return false;
  }
}

async function demoSimulatedDiagnostic() {
  console.log(`
🤖 DEMO 3: Simulated Full Diagnostic
───────────────────────────────────────
`);
  
  try {
    console.log('🚀 Initializing diagnostic system...');
    console.log('🔍 Note: This is a simulation - no real logins performed');
    
    // Simulate diagnostic results
    const simulatedResults = {
      timestamp: new Date().toISOString(),
      session_id: `demo_${Date.now()}`,
      services_tested: [
        {
          service: 'chatgpt',
          confidence_score: 95,
          input_selectors: [
            { found: true, selector: '#prompt-textarea', response_time_ms: 234, confidence: 'HIGH' }
          ],
          send_selectors: [
            { found: true, selector: '[data-testid="send-button"]', response_time_ms: 156, confidence: 'HIGH' }
          ],
          response_selectors: [
            { found: true, selector: '[data-message-author-role="assistant"]', response_time_ms: 189, confidence: 'HIGH' }
          ],
          recommendations: []
        },
        {
          service: 'claude',
          confidence_score: 78,
          input_selectors: [
            { found: false, selector: '.old-input-selector', response_time_ms: 5000, confidence: 'LOW',
              attributes: { suggestions: [
                { selector: 'div[contenteditable="true"]', confidence: 85 }
              ]}
            }
          ],
          send_selectors: [
            { found: true, selector: '[data-testid="send-button"]', response_time_ms: 167, confidence: 'MEDIUM' }
          ],
          response_selectors: [
            { found: true, selector: '.chat-message', response_time_ms: 203, confidence: 'HIGH' }
          ],
          recommendations: [
            { type: 'SUGGESTION', message: 'Alternative selectors found for: .old-input-selector',
              suggestions: [{ selector: 'div[contenteditable="true"]', confidence: 85 }],
              action: 'consider_replacement' }
          ]
        },
        {
          service: 'gemini',
          confidence_score: 45,
          input_selectors: [
            { found: false, selector: '.broken-selector', response_time_ms: 10000, confidence: 'CRITICAL' }
          ],
          send_selectors: [
            { found: false, selector: '.also-broken', response_time_ms: 10000, confidence: 'CRITICAL' }
          ],
          response_selectors: [
            { found: true, selector: '.conversation-container', response_time_ms: 234, confidence: 'HIGH' }
          ],
          recommendations: [
            { type: 'CRITICAL', message: '2 selector(s) not found - service may be broken',
              action: 'immediate_update_required' }
          ]
        }
      ],
      auto_updates_applied: [
        { service: 'claude', updates_count: 1, updates: [
          { old_selector: '.old-input-selector', new_selector: 'div[contenteditable="true"]', confidence: 85 }
        ]}
      ],
      manual_review_required: [
        { service: 'gemini', reason: 'low_confidence', confidence: 45 }
      ],
      errors: [],
      summary: {
        total_services: 3,
        successful_logins: 2,
        confidence_score: 73,
        selector_changes: 1
      }
    };
    
    // Simulate progress
    const steps = [
      'Launching browser...',
      'Logging into ChatGPT...',
      'Analyzing ChatGPT selectors...',
      'Logging into Claude...',
      'Analyzing Claude selectors...',
      'Applying auto-updates...',
      'Logging into Gemini...',
      'Analyzing Gemini selectors...',
      'Generating recommendations...',
      'Saving results...'
    ];
    
    for (let i = 0; i < steps.length; i++) {
      console.log(`📈 Progress: ${Math.round((i / steps.length) * 100)}% - ${steps[i]}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n🎉 Diagnostic Complete!');
    console.log('═'.repeat(50));
    
    // Display results
    console.log('📊 SUMMARY:');
    console.log(`✅ Services Tested: ${simulatedResults.summary.total_services}`);
    console.log(`🔐 Successful Logins: ${simulatedResults.summary.successful_logins}`);
    console.log(`📈 Average Confidence: ${simulatedResults.summary.confidence_score}%`);
    console.log(`🔄 Auto-Updates Applied: ${simulatedResults.auto_updates_applied.length}`);
    console.log(`⚠️  Manual Reviews Required: ${simulatedResults.manual_review_required.length}`);
    
    console.log('\n🔍 SERVICE DETAILS:');
    simulatedResults.services_tested.forEach(service => {
      const emoji = service.confidence_score >= 90 ? '✅' : 
                   service.confidence_score >= 70 ? '⚠️' : '❌';
      
      console.log(`${emoji} ${service.service.toUpperCase()} (${service.confidence_score}% confidence)`);
      
      const inputWorking = service.input_selectors.filter(s => s.found).length;
      const sendWorking = service.send_selectors.filter(s => s.found).length;
      const responseWorking = service.response_selectors.filter(s => s.found).length;
      
      console.log(`  Input: ${inputWorking}/${service.input_selectors.length} | Send: ${sendWorking}/${service.send_selectors.length} | Response: ${responseWorking}/${service.response_selectors.length}`);
      
      if (service.recommendations.length > 0) {
        service.recommendations.forEach(rec => {
          const recEmoji = rec.type === 'CRITICAL' ? '🚨' : rec.type === 'WARNING' ? '⚠️' : '💡';
          console.log(`    ${recEmoji} ${rec.message}`);
        });
      }
    });
    
    if (simulatedResults.auto_updates_applied.length > 0) {
      console.log('\n🔄 AUTO-UPDATES APPLIED:');
      simulatedResults.auto_updates_applied.forEach(update => {
        console.log(`  ✅ ${update.service}: ${update.updates_count} selector(s) updated`);
        update.updates.forEach(u => {
          console.log(`     ${u.old_selector} → ${u.new_selector} (${u.confidence}% confidence)`);
        });
      });
    }
    
    if (simulatedResults.manual_review_required.length > 0) {
      console.log('\n⚠️  MANUAL REVIEW REQUIRED:');
      simulatedResults.manual_review_required.forEach(review => {
        console.log(`  👀 ${review.service}: ${review.reason} (${review.confidence}% confidence)`);
      });
    }
    
    console.log('\n🎯 NEXT ACTIONS:');
    if (simulatedResults.summary.confidence_score >= 90) {
      console.log('✅ All systems healthy - no immediate action required');
    } else if (simulatedResults.summary.confidence_score >= 70) {
      console.log('⚠️  Monitor systems - some selectors may need updates soon');
    } else {
      console.log('🚨 URGENT: Multiple systems need attention - update selectors immediately');
    }
    
    // Save demo results
    fs.writeFileSync('../logs/demo-diagnostic-results.json', JSON.stringify(simulatedResults, null, 2));
    console.log('\n📄 Demo results saved to: ../logs/demo-diagnostic-results.json');
    
    return simulatedResults;
    
  } catch (error) {
    console.error('❌ Simulated diagnostic failed:', error.message);
    return null;
  }
}

async function demoAPIEndpoints() {
  console.log(`
🌐 DEMO 4: API Endpoints Overview
─────────────────────────────────
`);
  
  console.log('📋 Available REST API Endpoints:');
  console.log('   GET  /health                    - Server health check');
  console.log('   GET  /api/monitor              - Quick health check (no login)');
  console.log('   POST /api/diagnostic           - Full diagnostic (with login)');
  console.log('   POST /api/diagnostic/:service  - Service-specific diagnostic');
  console.log('   GET  /api/results             - Latest results');
  console.log('   GET  /api/history             - Results history');
  console.log('   GET  /api/config              - Current selector config');
  console.log('   POST /api/config/update       - Update selectors');

  console.log('\n🔌 WebSocket Events:');
  console.log('   Client → Server:');
  console.log('     start_diagnostic - Start real-time diagnostic');
  console.log('   Server → Client:');
  console.log('     diagnostic_progress - Progress updates');
  console.log('     diagnostic_complete - Final results');
  console.log('     diagnostic_error - Error notifications');

  console.log('\n🚀 To start API server:');
  console.log('   node tools/diagnostic-api.js');
  console.log('   Server will run on: http://localhost:3001');

  console.log('\n🎮 To use GUI Panel:');
  console.log('   1. Start API server');
  console.log('   2. Open browser to your app');
  console.log('   3. Diagnostic panel auto-loads');
  console.log('   4. Click "🚀 Run Full Diagnostic"');
}

async function demoCommandLineUsage() {
  console.log(`
💻 DEMO 5: Command Line Usage Examples
─────────────────────────────────────
`);
  
  console.log('📋 Basic Commands:');
  console.log('');
  console.log('   # Quick health check (no login)');
  console.log('   node scripts/monitor-webai.js');
  console.log('');
  console.log('   # Full diagnostic with auto-update');
  console.log('   node tools/webai-diagnostic.js --auto-update');
  console.log('');
  console.log('   # Test specific service (visible browser)');
  console.log('   node tools/webai-diagnostic.js --service=chatgpt --headless=false');
  console.log('');
  console.log('   # Claude only with custom timeout');
  console.log('   node tools/webai-diagnostic.js --service=claude --timeout=60000');
  console.log('');
  console.log('   # All services, visible browser, auto-update');
  console.log('   node tools/webai-diagnostic.js --auto-update --headless=false');

  console.log('\n🎯 Recommended Workflow:');
  console.log('   1. Setup credentials: copy template → edit with real data');
  console.log('   2. Test one service: --service=chatgpt --headless=false');
  console.log('   3. If working, test all: --auto-update');
  console.log('   4. Schedule daily: add to cron/task scheduler');
  console.log('   5. Monitor results: check /logs/ folder');

  console.log('\n🔧 Troubleshooting:');
  console.log('   • Login fails? → Use --headless=false to see browser');
  console.log('   • Selectors not found? → Check screenshots in /logs/');
  console.log('   • Auto-update too aggressive? → Remove --auto-update flag');
  console.log('   • Browser crashes? → Check Chrome installation');
}

// Main demo execution
async function runFullDemo() {
  console.log('Starting comprehensive demo...\n');
  
  // Demo 1: Quick Health Check
  const healthResults = await demoQuickHealthCheck();
  
  // Demo 2: Credentials Setup
  const credentialsReady = await demoCredentialsSetup(); 
  
  // Demo 3: Simulated Full Diagnostic
  await demoSimulatedDiagnostic();
  
  // Demo 4: API Overview
  await demoAPIEndpoints();
  
  // Demo 5: Command Line Usage
  await demoCommandLineUsage();
  
  // Final summary
  console.log(`
🎉 DEMO COMPLETE!
═══════════════════════════════════════════
📊 System Status: ${healthResults ? 'Ready for quick checks' : 'Needs configuration'}
🔐 Credentials: ${credentialsReady ? 'Configured' : 'Need setup'}
🎯 Full Diagnostic: Simulated successfully
🌐 API Server: Ready to start
💻 CLI Tools: All commands demonstrated

🚀 NEXT STEPS:
1. Configure real credentials in config/webai-credentials.json
2. Test with one service: node tools/webai-diagnostic.js --service=chatgpt --headless=false
3. Run full diagnostic: node tools/webai-diagnostic.js --auto-update
4. Start API server: node tools/diagnostic-api.js
5. Integrate with your workflow!

🎯 The WebAI Real-Time Diagnostic System is ready for production use!
`);
}

// Run the demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullDemo().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

export default {
  demoQuickHealthCheck,
  demoCredentialsSetup,
  demoSimulatedDiagnostic,
  demoAPIEndpoints,
  demoCommandLineUsage,
  runFullDemo
};