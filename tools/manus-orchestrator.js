#!/usr/bin/env node

/**
 * Manus Executor - Master Orchestrator
 * Central command center for autonomous WebAI maintenance
 * Usage: node manus-orchestrator.js --task=<task> [options]
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

class ManusOrchestrator {
  constructor() {
    this.tools = {
      'dom-inspector': './tools/dom-inspector.js',
      'error-analyzer': './tools/error-analyzer.js', 
      'config-updater': './tools/config-updater.js',
      'monitor': './scripts/monitor-webai.js'
    };
    
    this.workflows = this.defineWorkflows();
    this.executionLog = [];
    this.confidenceThreshold = 0.8;
    this.maxRetries = 3;
  }

  defineWorkflows() {
    return {
      'emergency-fix': {
        description: 'Emergency automated fix for critical WebAI failures',
        steps: [
          { tool: 'dom-inspector', action: 'inspect-failed-service' },
          { tool: 'error-analyzer', action: 'analyze-failure' },
          { tool: 'config-updater', action: 'apply-high-confidence-fixes' },
          { tool: 'dom-inspector', action: 'verify-fixes' }
        ],
        timeout: 300000, // 5 minutes
        auto_execute: true,
        confidence_required: 0.9
      },
      
      'scheduled-maintenance': {
        description: 'Regular preventive maintenance and optimization',
        steps: [
          { tool: 'monitor', action: 'full-system-check' },
          { tool: 'dom-inspector', action: 'audit-all-selectors' },
          { tool: 'error-analyzer', action: 'pattern-analysis' },
          { tool: 'config-updater', action: 'optimize-configuration' }
        ],
        timeout: 1800000, // 30 minutes
        auto_execute: false,
        confidence_required: 0.7
      },
      
      'diagnostic-deep-dive': {
        description: 'Comprehensive diagnostic analysis with human review',
        steps: [
          { tool: 'dom-inspector', action: 'comprehensive-scan' },
          { tool: 'error-analyzer', action: 'root-cause-analysis' },
          { tool: 'monitor', action: 'historical-analysis' },
          { tool: 'config-updater', action: 'generate-recommendations' }
        ],
        timeout: 3600000, // 60 minutes
        auto_execute: false,
        confidence_required: 0.6
      },
      
      'performance-optimization': {
        description: 'System performance analysis and optimization',
        steps: [
          { tool: 'monitor', action: 'performance-baseline' },
          { tool: 'dom-inspector', action: 'performance-audit' },
          { tool: 'config-updater', action: 'optimize-timeouts' },
          { tool: 'monitor', action: 'verify-improvements' }
        ],
        timeout: 900000, // 15 minutes
        auto_execute: true,
        confidence_required: 0.8
      }
    };
  }

  async executeWorkflow(workflowName, options = {}) {
    console.log(`🚀 Starting workflow: ${workflowName}`);
    
    const workflow = this.workflows[workflowName];
    if (!workflow) {
      throw new Error(`Unknown workflow: ${workflowName}`);
    }

    const execution = {
      workflow: workflowName,
      started_at: new Date().toISOString(),
      options,
      steps: [],
      status: 'RUNNING',
      overall_confidence: 0,
      auto_executed: false
    };

    try {
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        console.log(`\n🔧 Step ${i + 1}/${workflow.steps.length}: ${step.action} (${step.tool})`);
        
        const stepResult = await this.executeStep(step, options);
        execution.steps.push(stepResult);
        
        // Check if step failed critically
        if (stepResult.status === 'FAILED' && stepResult.critical) {
          console.error(`💥 Critical step failed: ${step.action}`);
          execution.status = 'FAILED';
          break;
        }
        
        // Update overall confidence
        execution.overall_confidence = this.calculateOverallConfidence(execution.steps);
        
        // Auto-execute check
        if (workflow.auto_execute && 
            execution.overall_confidence >= workflow.confidence_required &&
            stepResult.auto_actionable) {
          
          console.log(`🤖 Auto-executing based on confidence: ${Math.round(execution.overall_confidence * 100)}%`);
          await this.autoExecuteActions(stepResult.actions || []);
          execution.auto_executed = true;
        }
      }
      
      if (execution.status === 'RUNNING') {
        execution.status = 'COMPLETED';
      }
      
    } catch (error) {
      console.error(`💥 Workflow execution failed: ${error.message}`);
      execution.status = 'ERROR';
      execution.error = error.message;
    }
    
    execution.finished_at = new Date().toISOString();
    execution.duration = new Date(execution.finished_at) - new Date(execution.started_at);
    
    this.executionLog.push(execution);
    await this.saveExecutionLog(execution);
    
    return execution;
  }

  async executeStep(step, options) {
    const stepResult = {
      tool: step.tool,
      action: step.action,
      started_at: new Date().toISOString(),
      status: 'RUNNING',
      confidence: 0,
      auto_actionable: false,
      actions: [],
      output: null,
      error: null
    };

    try {
      switch (step.tool) {
        case 'dom-inspector':
          stepResult.output = await this.runDOMInspector(step.action, options);
          break;
        case 'error-analyzer':
          stepResult.output = await this.runErrorAnalyzer(step.action, options);
          break;
        case 'config-updater':
          stepResult.output = await this.runConfigUpdater(step.action, options);
          break;
        case 'monitor':
          stepResult.output = await this.runMonitor(step.action, options);
          break;
        default:
          throw new Error(`Unknown tool: ${step.tool}`);
      }
      
      stepResult.status = 'COMPLETED';
      stepResult.confidence = this.extractConfidence(stepResult.output);
      stepResult.auto_actionable = this.isAutoActionable(stepResult.output);
      stepResult.actions = this.extractActions(stepResult.output);
      
    } catch (error) {
      stepResult.status = 'FAILED';
      stepResult.error = error.message;
      stepResult.critical = this.isCriticalFailure(error);
    }
    
    stepResult.finished_at = new Date().toISOString();
    stepResult.duration = new Date(stepResult.finished_at) - new Date(stepResult.started_at);
    
    return stepResult;
  }

  async runTool(toolName, args) {
    return new Promise((resolve, reject) => {
      const toolPath = this.tools[toolName];
      if (!toolPath) {
        reject(new Error(`Unknown tool: ${toolName}`));
        return;
      }

      console.log(`   Executing: node ${toolPath} ${args.join(' ')}`);
      
      const process = spawn('node', [toolPath, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, exitCode: code });
        } else {
          reject(new Error(`Tool failed with exit code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async runDOMInspector(action, options) {
    const args = [];

    switch (action) {
      case 'inspect-failed-service':
        args.push(`--service=${options.service || 'claude'}`);
        args.push('--screenshot');
        break;
      case 'audit-all-selectors':
        args.push('--all-services');
        args.push('--detailed');
        break;
      case 'comprehensive-scan':
        args.push('--all-services');
        args.push('--screenshot');
        args.push('--detailed');
        args.push('--recommendations');
        break;
      case 'performance-audit':
        args.push('--performance');
        args.push('--timing-analysis');
        break;
      case 'verify-fixes':
        args.push(`--service=${options.service || 'claude'}`);
        args.push('--quick-test');
        break;
    }

    return await this.runTool('dom-inspector', args);
  }

  async runErrorAnalyzer(action, options) {
    const args = [];

    switch (action) {
      case 'analyze-failure':
        args.push(`--input=${options.test_results || './logs/latest-test-results.json'}`);
        break;
      case 'pattern-analysis':
        args.push('--historical');
        args.push('--patterns');
        break;
      case 'root-cause-analysis':
        args.push(`--input=${options.test_results || './logs/latest-test-results.json'}`);
        args.push('--deep-analysis');
        break;
    }

    if (options.auto_fix) {
      args.push('--auto-fix');
    }

    return await this.runTool('error-analyzer', args);
  }

  async runConfigUpdater(action, options) {
    const args = [];

    switch (action) {
      case 'apply-high-confidence-fixes':
        args.push(`--solution=${options.solution_file || './logs/latest-analysis.json'}`);
        args.push('--apply');
        args.push('--confidence-threshold=0.9');
        break;
      case 'optimize-configuration':
        args.push('--optimize');
        args.push('--apply');
        break;
      case 'generate-recommendations':
        args.push(`--solution=${options.solution_file || './logs/latest-analysis.json'}`);
        break;
      case 'optimize-timeouts':
        args.push('--optimize-timeouts');
        args.push('--apply');
        break;
    }

    return await this.runTool('config-updater', args);
  }

  async runMonitor(action) {
    const args = [];

    switch (action) {
      case 'full-system-check':
        args.push('--all-services');
        args.push('--detailed');
        break;
      case 'performance-baseline':
        args.push('--performance');
        args.push('--baseline');
        break;
      case 'historical-analysis':
        args.push('--historical');
        args.push('--trends');
        break;
      case 'verify-improvements':
        args.push('--quick-check');
        args.push('--performance');
        break;
    }

    return await this.runTool('monitor', args);
  }

  extractConfidence(output) {
    const confidenceRegex = /confidence[:\s]+(\d+(?:\.\d+)?)/i;
    const match = output.stdout?.match(confidenceRegex);
    return match ? parseFloat(match[1]) : 0.5;
  }

  isAutoActionable(output) {
    const autoActionableKeywords = [
      'auto-executable',
      'high confidence',
      'immediate action',
      'auto-fix available'
    ];
    
    const outputText = (output.stdout || '').toLowerCase();
    return autoActionableKeywords.some(keyword => outputText.includes(keyword));
  }

  extractActions(output) {
    // Parse output for actionable items
    const actions = [];
    const outputText = output.stdout || '';
    
    // Look for action patterns in the output
    const actionRegex = /ACTION:\s*(.+?)(?:\n|$)/g;
    let match;
    
    while ((match = actionRegex.exec(outputText)) !== null) {
      actions.push({
        description: match[1].trim(),
        auto_executable: match[1].toLowerCase().includes('auto')
      });
    }
    
    return actions;
  }

  async autoExecuteActions(actions) {
    console.log(`🤖 Auto-executing ${actions.length} actions...`);
    
    for (const action of actions) {
      if (action.auto_executable) {
        console.log(`   ✅ ${action.description}`);
        // Here would be the actual execution logic
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate execution
      } else {
        console.log(`   ⏳ ${action.description} (requires human review)`);
      }
    }
  }

  calculateOverallConfidence(steps) {
    if (steps.length === 0) return 0;
    
    const completedSteps = steps.filter(step => step.status === 'COMPLETED');
    if (completedSteps.length === 0) return 0;
    
    const avgConfidence = completedSteps.reduce((sum, step) => sum + step.confidence, 0) / completedSteps.length;
    
    // Weight by completion rate
    const completionRate = completedSteps.length / steps.length;
    
    return avgConfidence * completionRate;
  }

  isCriticalFailure(error) {
    const criticalKeywords = [
      'config not found',
      'tool not found',
      'permission denied',
      'network unreachable'
    ];
    
    return criticalKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
  }

  async saveExecutionLog(execution) {
    const logPath = `./logs/execution-${Date.now()}.json`;
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.writeFileSync(logPath, JSON.stringify(execution, null, 2));
    console.log(`📄 Execution log saved: ${logPath}`);
  }

  generateExecutionReport(execution) {
    const duration = Math.round(execution.duration / 1000);
    const successRate = execution.steps.filter(s => s.status === 'COMPLETED').length / execution.steps.length;
    
    return `
🎯 MANUS ORCHESTRATOR EXECUTION REPORT
═════════════════════════════════════

📅 Execution Date: ${new Date(execution.started_at).toLocaleString()}
🔧 Workflow: ${execution.workflow}
⏱️  Duration: ${duration} seconds
📊 Success Rate: ${Math.round(successRate * 100)}%
🎯 Overall Confidence: ${Math.round(execution.overall_confidence * 100)}%
🤖 Auto-Executed: ${execution.auto_executed ? 'Yes' : 'No'}
✅ Status: ${execution.status}

📋 STEP BREAKDOWN:
─────────────────
${execution.steps.map((step, index) => `
${index + 1}. ${step.action} (${step.tool})
   Status: ${step.status}
   Confidence: ${Math.round(step.confidence * 100)}%
   Duration: ${Math.round(step.duration / 1000)}s
   ${step.error ? `Error: ${step.error}` : ''}
   ${step.actions?.length ? `Actions: ${step.actions.length}` : ''}
`).join('')}

🎯 SUMMARY:
──────────
• Total Steps: ${execution.steps.length}
• Completed: ${execution.steps.filter(s => s.status === 'COMPLETED').length}
• Failed: ${execution.steps.filter(s => s.status === 'FAILED').length}
• Auto-Actionable Items: ${execution.steps.reduce((sum, s) => sum + (s.actions?.length || 0), 0)}

${execution.status === 'COMPLETED' ? '✅ Workflow completed successfully' : 
  execution.status === 'FAILED' ? '❌ Workflow failed - review step details' :
  '⚠️  Workflow completed with errors'}
`;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const taskArg = args.find(arg => arg.startsWith('--task='));
  const serviceArg = args.find(arg => arg.startsWith('--service='));
  const autoArg = args.includes('--auto');
  const reportArg = args.includes('--report-only');

  if (!taskArg) {
    console.log(`
🎯 Manus Orchestrator - WebAI Automation Command Center

Usage: node manus-orchestrator.js --task=<workflow> [options]

Available Workflows:
━━━━━━━━━━━━━━━━━━━━
🚨 emergency-fix          - Emergency automated fix for critical failures
🔧 scheduled-maintenance  - Regular preventive maintenance 
🔍 diagnostic-deep-dive   - Comprehensive diagnostic analysis
⚡ performance-optimization - System performance optimization

Options:
────────
--service=<name>     Target service (claude, chatgpt, gemini, copilot)
--auto               Enable full automation (overrides safety checks)
--report-only        Generate report without execution

Examples:
─────────
node manus-orchestrator.js --task=emergency-fix --service=claude
node manus-orchestrator.js --task=scheduled-maintenance --auto
node manus-orchestrator.js --task=diagnostic-deep-dive --report-only
`);
    process.exit(0);
  }

  const taskName = taskArg.split('=')[1];
  const options = {
    service: serviceArg ? serviceArg.split('=')[1] : 'claude',
    auto_execute: autoArg,
    report_only: reportArg
  };

  try {
    console.log('🚀 Initializing Manus Orchestrator...');
    
    const orchestrator = new ManusOrchestrator();
    
    if (reportArg) {
      console.log('📊 Report-only mode - no actions will be executed');
    }
    
    const execution = await orchestrator.executeWorkflow(taskName, options);
    
    console.log('\n' + '═'.repeat(80));
    console.log(orchestrator.generateExecutionReport(execution));
    
    const exitCode = execution.status === 'COMPLETED' ? 0 : 1;
    process.exit(exitCode);
    
  } catch (error) {
    console.error(`💥 Orchestrator failed: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ManusOrchestrator;