#!/usr/bin/env node

/**
 * Manus Executor - Error Pattern Analyzer
 * Intelligent error analysis with auto-fix suggestions
 * Usage: node error-analyzer.js --input=test-results.json --auto-fix
 */

import fs from 'fs';
import path from 'path';

class ErrorAnalyzer {
  constructor() {
    this.patterns = this.loadErrorPatterns();
    this.confidenceThreshold = 0.8;
    this.solutionDatabase = this.loadSolutionDatabase();
  }

  loadErrorPatterns() {
    return {
      INPUT_SELECTOR_FAILURE: {
        keywords: ['NO_TARGET', 'input', 'contenteditable', 'textarea'],
        commonCauses: [
          'Primary selector changed',
          'Dynamic loading timing',
          'CSS class renamed',
          'Element structure modified'
        ],
        severity: 'HIGH'
      },
      SEND_BUTTON_FAILURE: {
        keywords: ['send', 'button', 'click', 'submit'],
        commonCauses: [
          'Button selector changed',
          'Button disabled state',
          'Form validation blocking',
          'JavaScript event handling changed'
        ],
        severity: 'HIGH'
      },
      RESPONSE_DETECTION_FAILURE: {
        keywords: ['response', 'timeout', 'wait', 'message'],
        commonCauses: [
          'Response selector changed',
          'Timeout too short',
          'Streaming response format changed',
          'Loading indicator confusion'
        ],
        severity: 'MEDIUM'
      },
      PERFORMANCE_DEGRADATION: {
        keywords: ['slow', 'timeout', 'performance', 'loading'],
        commonCauses: [
          'Network latency increase',
          'Page complexity increased',
          'Background processes',
          'Resource loading issues'
        ],
        severity: 'MEDIUM'
      }
    };
  }

  loadSolutionDatabase() {
    return {
      'Claude input selector changed': {
        solutions: [
          {
            action: 'UPDATE_SELECTOR',
            selector: '[contenteditable="true"]',
            confidence: 0.9,
            reasoning: 'Generic contenteditable works across Claude versions'
          },
          {
            action: 'ADD_FALLBACK',
            selector: 'div[role="textbox"]',
            confidence: 0.8,
            reasoning: 'Role-based selector more stable'
          }
        ]
      },
      'ChatGPT send button not found': {
        solutions: [
          {
            action: 'UPDATE_SELECTOR',
            selector: 'button[data-testid="send-button"]',
            confidence: 0.95,
            reasoning: 'OpenAI uses consistent testid attributes'
          },
          {
            action: 'ADD_FALLBACK', 
            selector: 'button:has(svg[data-icon="send"])',
            confidence: 0.7,
            reasoning: 'Icon-based detection as backup'
          }
        ]
      },
      'Gemini response timeout': {
        solutions: [
          {
            action: 'INCREASE_TIMEOUT',
            value: 45000,
            confidence: 0.8,
            reasoning: 'Gemini responses can be slower than other services'
          },
          {
            action: 'UPDATE_RESPONSE_SELECTOR',
            selector: '[data-response-index] .response-content',
            confidence: 0.7,
            reasoning: 'More specific response container selector'
          }
        ]
      }
    };
  }

  analyzeError(testResults) {
    console.log('🔍 Analyzing error patterns...');
    
    const analysis = {
      timestamp: new Date().toISOString(),
      service: testResults.service || 'unknown',
      error_classification: this.classifyError(testResults),
      root_cause_analysis: this.performRootCauseAnalysis(testResults),
      confidence_score: 0,
      recommended_solutions: [],
      immediate_actions: [],
      preventive_measures: []
    };

    // Perform deep analysis
    analysis.error_classification = this.classifyError(testResults);
    analysis.root_cause_analysis = this.performRootCauseAnalysis(testResults);
    analysis.confidence_score = this.calculateConfidence(analysis);
    analysis.recommended_solutions = this.generateSolutions(analysis);
    analysis.immediate_actions = this.prioritizeActions(analysis.recommended_solutions);

    return analysis;
  }

  classifyError(testResults) {
    const classification = {
      primary_error: null,
      secondary_errors: [],
      error_patterns: [],
      impact_assessment: 'LOW'
    };

    // Check for input failures
    if (testResults.phases?.input && !testResults.phases.input.success) {
      classification.primary_error = 'INPUT_SELECTOR_FAILURE';
      classification.impact_assessment = 'HIGH';
    }

    // Check for send button failures  
    if (testResults.phases?.send && !testResults.phases.send.success) {
      if (!classification.primary_error) {
        classification.primary_error = 'SEND_BUTTON_FAILURE';
        classification.impact_assessment = 'HIGH';
      } else {
        classification.secondary_errors.push('SEND_BUTTON_FAILURE');
      }
    }

    // Check for response detection failures
    if (testResults.phases?.response && !testResults.phases.response.success) {
      if (!classification.primary_error) {
        classification.primary_error = 'RESPONSE_DETECTION_FAILURE';
        classification.impact_assessment = 'MEDIUM';
      } else {
        classification.secondary_errors.push('RESPONSE_DETECTION_FAILURE');
      }
    }

    // Performance analysis
    if (testResults.performance) {
      const totalTime = Object.values(testResults.performance).reduce((a, b) => a + b, 0);
      if (totalTime > 30000) { // 30 seconds
        classification.secondary_errors.push('PERFORMANCE_DEGRADATION');
      }
    }

    return classification;
  }

  performRootCauseAnalysis(testResults) {
    const analysis = {
      likely_causes: [],
      evidence: [],
      confidence_by_cause: {},
      technical_details: {}
    };

    // Analyze input phase failures
    if (testResults.phases?.input) {
      const inputPhase = testResults.phases.input;
      if (!inputPhase.success) {
        if (inputPhase.selectors_tried) {
          const failureRate = inputPhase.selectors_tried.filter(s => !s.found).length / inputPhase.selectors_tried.length;
          
          if (failureRate === 1.0) {
            analysis.likely_causes.push('Complete UI restructure - all selectors invalid');
            analysis.confidence_by_cause['ui_restructure'] = 0.9;
          } else if (failureRate > 0.5) {
            analysis.likely_causes.push('Partial UI changes - primary selectors affected');
            analysis.confidence_by_cause['partial_ui_change'] = 0.8;
          }
        }
        
        if (inputPhase.timing_out) {
          analysis.likely_causes.push('Dynamic loading timing issue');
          analysis.confidence_by_cause['timing_issue'] = 0.7;
        }
      }
    }

    // Analyze send button failures
    if (testResults.phases?.send && !testResults.phases.send.success) {
      analysis.likely_causes.push('Send button implementation changed');
      analysis.confidence_by_cause['send_button_change'] = 0.8;
      
      if (testResults.phases.send.button_disabled) {
        analysis.likely_causes.push('Form validation preventing send');
        analysis.confidence_by_cause['validation_issue'] = 0.9;
      }
    }

    // Analyze response detection failures
    if (testResults.phases?.response && !testResults.phases.response.success) {
      if (testResults.phases.response.timeout) {
        analysis.likely_causes.push('Response taking longer than expected');
        analysis.confidence_by_cause['slow_response'] = 0.8;
      }
      
      if (testResults.phases.response.format_changed) {
        analysis.likely_causes.push('Response HTML structure modified');
        analysis.confidence_by_cause['response_format_change'] = 0.9;
      }
    }

    return analysis;
  }

  calculateConfidence(analysis) {
    if (!analysis.root_cause_analysis.confidence_by_cause) {
      return 0.5;
    }

    const confidences = Object.values(analysis.root_cause_analysis.confidence_by_cause);
    if (confidences.length === 0) return 0.5;

    // Take weighted average with highest confidence having more weight
    const sortedConfidences = confidences.sort((a, b) => b - a);
    const weights = [0.5, 0.3, 0.2]; // First cause 50%, second 30%, third 20%
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < Math.min(sortedConfidences.length, weights.length); i++) {
      weightedSum += sortedConfidences[i] * weights[i];
      totalWeight += weights[i];
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  generateSolutions(analysis) {
    const solutions = [];
    const errorType = analysis.error_classification.primary_error;
    
    // Use solution database
    for (const [problem, solutionSet] of Object.entries(this.solutionDatabase)) {
      const relevance = this.calculateRelevance(problem, analysis);
      if (relevance > 0.6) {
        solutionSet.solutions.forEach(solution => {
          solutions.push({
            ...solution,
            relevance_score: relevance,
            problem_match: problem,
            estimated_success_rate: solution.confidence * relevance
          });
        });
      }
    }

    // Generate dynamic solutions based on error patterns
    if (errorType === 'INPUT_SELECTOR_FAILURE') {
      solutions.push({
        action: 'DYNAMIC_SELECTOR_DISCOVERY',
        description: 'Scan page for input elements and suggest new selectors',
        confidence: 0.7,
        estimated_success_rate: 0.6,
        auto_executable: true
      });
    }

    if (errorType === 'RESPONSE_DETECTION_FAILURE') {
      solutions.push({
        action: 'ADAPTIVE_TIMEOUT',
        description: 'Implement progressive timeout with multiple detection attempts',
        confidence: 0.8,
        estimated_success_rate: 0.7,
        auto_executable: true
      });
    }

    // Sort by estimated success rate
    return solutions.sort((a, b) => b.estimated_success_rate - a.estimated_success_rate);
  }

  calculateRelevance(problem, analysis) {
    const problemWords = problem.toLowerCase().split(' ');
    const analysisText = JSON.stringify(analysis).toLowerCase();
    
    let matchCount = 0;
    problemWords.forEach(word => {
      if (analysisText.includes(word)) {
        matchCount++;
      }
    });
    
    return matchCount / problemWords.length;
  }

  prioritizeActions(solutions) {
    const actions = [];
    
    // High confidence, auto-executable actions first
    const autoFixes = solutions.filter(s => s.auto_executable && s.confidence > 0.8);
    autoFixes.forEach(fix => {
      actions.push({
        priority: 'IMMEDIATE',
        type: 'AUTO_FIX',
        action: fix.action,
        description: fix.description,
        confidence: fix.confidence,
        execution_time: '< 30 seconds'
      });
    });

    // Medium confidence actions requiring validation
    const validateActions = solutions.filter(s => s.confidence > 0.6 && s.confidence <= 0.8);
    validateActions.forEach(action => {
      actions.push({
        priority: 'HIGH',
        type: 'VALIDATE_THEN_EXECUTE',
        action: action.action,
        description: action.description,
        confidence: action.confidence,
        execution_time: '< 2 minutes'
      });
    });

    // Low confidence actions requiring human review
    const humanReview = solutions.filter(s => s.confidence <= 0.6);
    humanReview.forEach(action => {
      actions.push({
        priority: 'MEDIUM',
        type: 'HUMAN_REVIEW_REQUIRED',
        action: action.action,
        description: action.description,
        confidence: action.confidence,
        execution_time: 'Manual intervention'
      });
    });

    return actions;
  }

  generateExecutiveReport(analysis) {
    const report = `
🚨 ERROR ANALYSIS EXECUTIVE REPORT
═══════════════════════════════════

📅 Analysis Date: ${new Date(analysis.timestamp).toLocaleString()}
🎯 Service: ${analysis.service.toUpperCase()}
🏷️  Primary Error: ${analysis.error_classification.primary_error}
📊 Confidence Level: ${Math.round(analysis.confidence_score * 100)}%
⚠️  Impact: ${analysis.error_classification.impact_assessment}

🔍 ROOT CAUSE ANALYSIS:
─────────────────────
${analysis.root_cause_analysis.likely_causes.map(cause => `• ${cause}`).join('\n')}

🛠️  IMMEDIATE ACTIONS (Auto-Executable):
──────────────────────────────────────
${analysis.immediate_actions.filter(a => a.type === 'AUTO_FIX').map(action => 
  `✅ ${action.action} (${Math.round(action.confidence * 100)}% confidence)`
).join('\n') || 'None available'}

⚠️  VALIDATION REQUIRED:
──────────────────────
${analysis.immediate_actions.filter(a => a.type === 'VALIDATE_THEN_EXECUTE').map(action => 
  `🔍 ${action.action} (${Math.round(action.confidence * 100)}% confidence)`
).join('\n') || 'None required'}

👤 HUMAN REVIEW NEEDED:
────────────────────────
${analysis.immediate_actions.filter(a => a.type === 'HUMAN_REVIEW_REQUIRED').map(action => 
  `👁️  ${action.action} (${Math.round(action.confidence * 100)}% confidence)`
).join('\n') || 'None needed'}

📈 RECOMMENDED TIMELINE:
──────────────────────
• Immediate fixes: Execute within 5 minutes
• Validation required: Complete within 15 minutes  
• Human review: Schedule within 1 hour
• Total estimated resolution time: ${this.estimateResolutionTime(analysis)}

🎯 SUCCESS PROBABILITY: ${Math.round(this.calculateSuccessProbability(analysis) * 100)}%
`;

    return report;
  }

  estimateResolutionTime(analysis) {
    const autoFixes = analysis.immediate_actions.filter(a => a.type === 'AUTO_FIX').length;
    const validationActions = analysis.immediate_actions.filter(a => a.type === 'VALIDATE_THEN_EXECUTE').length;
    const humanReview = analysis.immediate_actions.filter(a => a.type === 'HUMAN_REVIEW_REQUIRED').length;

    let minutes = 0;
    minutes += autoFixes * 2; // 2 minutes per auto fix
    minutes += validationActions * 5; // 5 minutes per validation
    minutes += humanReview * 30; // 30 minutes per human review

    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      return `${Math.round(minutes / 60 * 10) / 10} hours`;
    }
  }

  calculateSuccessProbability(analysis) {
    const solutions = analysis.recommended_solutions;
    if (solutions.length === 0) return 0.3;

    // Take the best solution's estimated success rate
    const bestSolution = solutions[0];
    return bestSolution.estimated_success_rate || 0.5;
  }

  async saveAnalysis(analysis, outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    
    const fullReport = {
      ...analysis,
      executive_report: this.generateExecutiveReport(analysis),
      generated_by: 'Manus Error Analyzer v2.0',
      analysis_version: '2.0.0'
    };

    fs.writeFileSync(outputPath, JSON.stringify(fullReport, null, 2));
    console.log(`📄 Analysis saved to: ${outputPath}`);
    
    // Also save text report
    const textPath = outputPath.replace('.json', '_executive.txt');
    fs.writeFileSync(textPath, fullReport.executive_report);
    console.log(`📄 Executive report saved to: ${textPath}`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const inputArg = args.find(arg => arg.startsWith('--input='));
  const outputArg = args.find(arg => arg.startsWith('--output='));
  const autoFixArg = args.includes('--auto-fix');

  if (!inputArg) {
    console.error('❌ Usage: node error-analyzer.js --input=<test-results.json> [--output=<analysis.json>] [--auto-fix]');
    process.exit(1);
  }

  const inputPath = inputArg.split('=')[1];
  const outputPath = outputArg ? outputArg.split('=')[1] : `./logs/error-analysis-${Date.now()}.json`;

  try {
    console.log('🚀 Starting Error Analysis...');
    
    const testResults = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    const analyzer = new ErrorAnalyzer();
    
    const analysis = analyzer.analyzeError(testResults);
    
    console.log('\n' + '═'.repeat(60));
    console.log(analyzer.generateExecutiveReport(analysis));
    
    await analyzer.saveAnalysis(analysis, outputPath);
    
    if (autoFixArg && analysis.confidence_score > analyzer.confidenceThreshold) {
      console.log('🤖 Auto-fix mode enabled and confidence sufficient - executing fixes...');
      // Here would be the auto-fix execution logic
      console.log('⚠️  Auto-fix execution not implemented in this demo');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error(`💥 Analysis failed: ${error.message}`);
    process.exit(1);
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

export default ErrorAnalyzer;