#!/usr/bin/env node

/**
 * Simple test for Manus tools
 */

console.log('🚀 MANUS EXECUTOR TOOLS TEST');
console.log('===========================');

// Test imports
try {
  console.log('📦 Testing imports...');
  
  const configPath = './config/webai-selectors.json';
  const fs = await import('fs');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  
  console.log('✅ Config loaded successfully');
  console.log(`   Version: ${config.version}`);
  console.log(`   Services: ${Object.keys(config.services).join(', ')}`);
  
  // Test error analyzer class
  const { default: ErrorAnalyzer } = await import('./tools/error-analyzer.js');
  const analyzer = new ErrorAnalyzer();
  console.log('✅ Error Analyzer initialized');
  
  // Test with sample data
  const testData = JSON.parse(fs.readFileSync('./logs/test-claude-failure.json', 'utf-8'));
  const analysis = analyzer.analyzeError(testData);
  
  console.log('✅ Error analysis completed');
  console.log(`   Primary error: ${analysis.error_classification.primary_error}`);
  console.log(`   Confidence: ${Math.round(analysis.confidence_score * 100)}%`);
  console.log(`   Solutions: ${analysis.recommended_solutions.length}`);
  
  // Test config updater
  const { default: ConfigAutoUpdater } = await import('./tools/config-updater.js');
  const updater = new ConfigAutoUpdater();
  console.log('✅ Config Auto Updater initialized');
  
  const validation = updater.validateChanges();
  console.log(`✅ Config validation: ${validation.is_valid ? 'VALID' : 'INVALID'}`);
  if (validation.errors.length > 0) {
    console.log(`   Errors: ${validation.errors.length}`);
  }
  if (validation.warnings.length > 0) {
    console.log(`   Warnings: ${validation.warnings.length}`);
  }
  
  console.log('\n🎯 MANUS TOOLS TEST COMPLETED SUCCESSFULLY!');
  
} catch (error) {
  console.error('💥 Test failed:', error.message);
  process.exit(1);
}