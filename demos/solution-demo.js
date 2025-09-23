#!/usr/bin/env node

/**
 * Manus Executor - Solution Generation Demo
 */

console.log(`
🔧 MANUS SOLUTION GENERATOR DEMO
═══════════════════════════════

Demonstracja autonomicznego generowania rozwiązań...
`);

try {
  const { default: ErrorAnalyzer } = await import('./tools/error-analyzer.js');
  const analyzer = new ErrorAnalyzer();
  
  const fs = await import('fs');
  const testData = JSON.parse(fs.readFileSync('./logs/test-claude-failure.json', 'utf-8'));
  
  console.log('📊 ANALIZA BŁĘDU:');
  console.log(`   Service: ${testData.service}`);
  console.log(`   Input Phase: ${testData.phases.input.success ? '✅' : '❌'} ${testData.phases.input.error || 'OK'}`);
  console.log(`   Send Phase: ${testData.phases.send.success ? '✅' : '❌'} ${testData.phases.send.error || 'OK'}`);
  console.log(`   Response Phase: ${testData.phases.response.success ? '✅' : '❌'} ${testData.phases.response.timeout ? 'TIMEOUT' : 'OK'}`);
  
  const analysis = analyzer.analyzeError(testData);
  
  console.log('\n🎯 ZIDENTYFIKOWANE ROZWIĄZANIA:');
  analysis.recommended_solutions.forEach((solution, index) => {
    console.log(`\n${index + 1}. ${solution.action}`);
    console.log(`   📊 Confidence: ${Math.round(solution.confidence * 100)}%`);
    console.log(`   🎯 Success Rate: ${Math.round(solution.estimated_success_rate * 100)}%`);
    console.log(`   📝 Reasoning: ${solution.reasoning}`);
    if (solution.auto_executable) {
      console.log(`   🤖 AUTO-EXECUTABLE: Yes`);
    }
  });
  
  console.log('\n⚡ IMMEDIATE ACTIONS:');
  analysis.immediate_actions.forEach((action, index) => {
    const priorityEmoji = { 'IMMEDIATE': '🚨', 'HIGH': '⚠️', 'MEDIUM': '💡' }[action.priority] || '📝';
    console.log(`${priorityEmoji} ${action.action}`);
    console.log(`   Type: ${action.type}`);
    console.log(`   Time: ${action.execution_time}`);
    console.log(`   Confidence: ${Math.round(action.confidence * 100)}%`);
  });
  
  // Simulate solution application
  const { default: ConfigAutoUpdater } = await import('./tools/config-updater.js');
  const updater = new ConfigAutoUpdater();
  
  console.log('\n🔄 SIMULATING AUTO-FIX...');
  
  // Create mock solution for demonstration
  const mockSolution = {
    action: 'UPDATE_SELECTOR',
    service: 'claude',
    element: 'input',
    selector: 'div[contenteditable="true"]:not([aria-label*="search"])',
    reasoning: 'More specific contenteditable selector to avoid search boxes',
    confidence: 0.85
  };
  
  console.log(`   🔧 Applying: ${mockSolution.action}`);
  console.log(`   🎯 Target: ${mockSolution.service}.${mockSolution.element}`);
  console.log(`   📝 New Selector: ${mockSolution.selector}`);
  console.log(`   💭 Reasoning: ${mockSolution.reasoning}`);
  console.log(`   📊 Confidence: ${Math.round(mockSolution.confidence * 100)}%`);
  
  console.log('\n   ✅ Solution would be applied automatically (confidence > 80%)');
  console.log('   💾 Backup would be created before changes');
  console.log('   🔄 Rollback available if needed');
  
  console.log(`
🎯 AUTONOMICZNY SYSTEM NAPRAWY
════════════════════════════

✅ Błąd zidentyfikowany automatycznie
✅ Rozwiązania wygenerowane z oceną pewności  
✅ Najlepsze rozwiązanie wybrane (85% confidence)
✅ Auto-fix gotowy do wykonania
✅ Mechanizmy bezpieczeństwa aktywne

🤖 MANUS MOŻE NAPRAWIĆ TEN PROBLEM AUTONOMICZNIE!
`);

} catch (error) {
  console.error('💥 Demo failed:', error.message);
  process.exit(1);
}

process.exit(0);