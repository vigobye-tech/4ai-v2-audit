/**
 * Integration example for 4AI main UI
 * Shows how to add diagnostic button to existing interface
 */

// Add diagnostic button to existing UI
function addDiagnosticButton() {
  // Find existing control panel or create new one
  let controlPanel = document.querySelector('.control-panel, .toolbar, .main-nav');
  
  if (!controlPanel) {
    controlPanel = document.createElement('div');
    controlPanel.className = 'diagnostic-controls';
    controlPanel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 9999;
      background: white;
      border: 2px solid #007acc;
      border-radius: 8px;
      padding: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    document.body.appendChild(controlPanel);
  }

  // Create diagnostic button
  const diagnosticBtn = document.createElement('button');
  diagnosticBtn.innerHTML = '🎯 WebAI Diagnostic';
  diagnosticBtn.className = 'diagnostic-trigger-btn';
  diagnosticBtn.style.cssText = `
    background: linear-gradient(135deg, #007acc, #0099ff);
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    margin: 5px;
    transition: all 0.2s;
  `;

  // Add hover effect
  diagnosticBtn.addEventListener('mouseover', () => {
    diagnosticBtn.style.transform = 'scale(1.05)';
    diagnosticBtn.style.boxShadow = '0 4px 15px rgba(0,122,204,0.3)';
  });

  diagnosticBtn.addEventListener('mouseout', () => {
    diagnosticBtn.style.transform = 'scale(1)';
    diagnosticBtn.style.boxShadow = 'none';
  });

  // Add click handler
  diagnosticBtn.addEventListener('click', () => {
    showDiagnosticModal();
  });

  controlPanel.appendChild(diagnosticBtn);
}

// Create diagnostic modal
function showDiagnosticModal() {
  // Remove existing modal if present
  const existingModal = document.getElementById('diagnostic-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal
  const modal = document.createElement('div');
  modal.id = 'diagnostic-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 30px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  `;

  modalContent.innerHTML = `
    <div class="modal-header" style="margin-bottom: 20px;">
      <h2 style="margin: 0; color: #333; display: flex; align-items: center;">
        🎯 WebAI Diagnostic Center
        <button id="close-modal" style="margin-left: auto; background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
      </h2>
    </div>

    <div class="diagnostic-options" style="margin-bottom: 25px;">
      <h3 style="color: #555; margin-bottom: 15px;">Choose Diagnostic Type:</h3>
      
      <div class="option-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; cursor: pointer; transition: all 0.2s;" onclick="runQuickDiagnostic()">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 24px; margin-right: 10px;">⚡</span>
          <strong style="color: #007acc;">Quick Health Check</strong>
          <span style="margin-left: auto; background: #28a745; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px;">SAFE</span>
        </div>
        <div style="color: #666; font-size: 14px;">
          Fast selector validation (5-10 seconds) • No login required • Read-only
        </div>
      </div>

      <div class="option-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; cursor: pointer; transition: all 0.2s;" onclick="runFullDiagnostic()">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 24px; margin-right: 10px;">🎯</span>
          <strong style="color: #007acc;">Full Real-Time Diagnostic</strong>
          <span style="margin-left: auto; background: #ffc107; color: #000; padding: 2px 8px; border-radius: 10px; font-size: 12px;">POWERFUL</span>
        </div>
        <div style="color: #666; font-size: 14px;">
          Complete analysis with login (2-5 minutes) • Auto-update capable • Live DOM testing
        </div>
      </div>

      <div class="option-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; cursor: pointer; transition: all 0.2s;" onclick="showServiceSelector()">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 24px; margin-right: 10px;">🔍</span>
          <strong style="color: #007acc;">Single Service Test</strong>
          <span style="margin-left: auto; background: #17a2b8; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px;">FOCUSED</span>
        </div>
        <div style="color: #666; font-size: 14px;">
          Test specific WebAI service • Visible browser for debugging • Perfect for troubleshooting
        </div>
      </div>
    </div>

    <div class="progress-section" id="progress-section" style="display: none; margin-bottom: 20px;">
      <div style="background: #f8f9fa; border-radius: 8px; padding: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span id="progress-text">Initializing...</span>
          <span id="progress-percent">0%</span>
        </div>
        <div style="width: 100%; height: 6px; background: #e9ecef; border-radius: 3px; overflow: hidden;">
          <div id="progress-bar" style="height: 100%; background: linear-gradient(90deg, #007acc, #0099ff); width: 0%; transition: width 0.3s;"></div>
        </div>
      </div>
    </div>

    <div class="results-section" id="results-section" style="display: none;">
      <h3 style="color: #555; margin-bottom: 15px;">Results:</h3>
      <div id="results-content" style="background: #f8f9fa; border-radius: 8px; padding: 15px; max-height: 300px; overflow-y: auto; font-family: monospace; font-size: 13px; white-space: pre-wrap;"></div>
    </div>

    <div class="action-buttons" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
      <button onclick="closeDiagnosticModal()" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">
        Cancel
      </button>
      <button onclick="openDiagnosticAPI()" style="padding: 8px 16px; border: none; background: #6c757d; color: white; border-radius: 4px; cursor: pointer;">
        🌐 Open API Server
      </button>
    </div>
  `;

  // Add hover effects to option cards
  modalContent.querySelectorAll('.option-card').forEach(card => {
    card.addEventListener('mouseover', () => {
      card.style.borderColor = '#007acc';
      card.style.boxShadow = '0 2px 8px rgba(0,122,204,0.1)';
    });
    card.addEventListener('mouseout', () => {
      card.style.borderColor = '#ddd';
      card.style.boxShadow = 'none';
    });
  });

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Close modal handlers
  document.getElementById('close-modal').addEventListener('click', closeDiagnosticModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeDiagnosticModal();
  });
}

function closeDiagnosticModal() {
  const modal = document.getElementById('diagnostic-modal');
  if (modal) {
    modal.remove();
  }
}

async function runQuickDiagnostic() {
  showProgress(true);
  updateProgress(10, 'Starting quick health check...');

  try {
    const response = await fetch('/api/monitor', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    updateProgress(50, 'Analyzing selectors...');

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();
    updateProgress(100, 'Complete!');

    setTimeout(() => {
      showResults(formatQuickResults(result.data));
    }, 500);

  } catch (error) {
    updateProgress(100, 'Error occurred');
    setTimeout(() => {
      showResults(`❌ Error: ${error.message}\n\nTip: Make sure API server is running:\n  npm run diagnostic:api`);
    }, 500);
  }
}

async function runFullDiagnostic() {
  showProgress(true);
  updateProgress(5, 'Initializing full diagnostic...');

  try {
    const response = await fetch('/api/diagnostic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'full',
        options: {
          autoUpdate: true,
          headless: true
        }
      })
    });

    updateProgress(20, 'Launching browsers...');
    
    // Simulate progress updates (in real implementation, use WebSocket)
    const progressSteps = [
      { percent: 30, text: 'Logging into services...' },
      { percent: 50, text: 'Analyzing DOM selectors...' },
      { percent: 70, text: 'Generating recommendations...' },
      { percent: 90, text: 'Applying auto-updates...' }
    ];

    for (let i = 0; i < progressSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateProgress(progressSteps[i].percent, progressSteps[i].text);
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();
    updateProgress(100, 'Full diagnostic complete!');

    setTimeout(() => {
      showResults(formatFullResults(result.data));
    }, 500);

  } catch (error) {
    updateProgress(100, 'Error occurred');
    setTimeout(() => {
      showResults(`❌ Error: ${error.message}\n\nTip: Make sure:\n1. API server is running: npm run diagnostic:api\n2. Credentials are configured: config/webai-credentials.json\n3. Browser dependencies installed: npm install puppeteer`);
    }, 500);
  }
}

// Used by onclick handlers in generated HTML
// eslint-disable-next-line no-unused-vars
function showServiceSelector() {
  const modalContent = document.querySelector('#diagnostic-modal .modal-content, #diagnostic-modal > div');
  
  modalContent.innerHTML = `
    <div class="modal-header" style="margin-bottom: 20px;">
      <h2 style="margin: 0; color: #333; display: flex; align-items: center;">
        🔍 Single Service Test
        <button onclick="showDiagnosticModal()" style="margin-left: auto; background: none; border: none; font-size: 18px; cursor: pointer; color: #666;">← Back</button>
        <button onclick="closeDiagnosticModal()" style="margin-left: 10px; background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
      </h2>
    </div>

    <div class="service-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
      <div class="service-card" onclick="runServiceTest('chatgpt')" style="border: 2px solid #00a67e; border-radius: 8px; padding: 20px; cursor: pointer; text-align: center; transition: all 0.2s;">
        <div style="font-size: 36px; margin-bottom: 10px;">🤖</div>
        <h3 style="margin: 0 0 8px 0; color: #00a67e;">ChatGPT</h3>
        <div style="color: #666; font-size: 14px;">OpenAI GPT-4</div>
      </div>

      <div class="service-card" onclick="runServiceTest('claude')" style="border: 2px solid #ff6b35; border-radius: 8px; padding: 20px; cursor: pointer; text-align: center; transition: all 0.2s;">
        <div style="font-size: 36px; margin-bottom: 10px;">🧠</div>
        <h3 style="margin: 0 0 8px 0; color: #ff6b35;">Claude</h3>
        <div style="color: #666; font-size: 14px;">Anthropic AI</div>
      </div>

      <div class="service-card" onclick="runServiceTest('gemini')" style="border: 2px solid #4285f4; border-radius: 8px; padding: 20px; cursor: pointer; text-align: center; transition: all 0.2s;">
        <div style="font-size: 36px; margin-bottom: 10px;">💎</div>
        <h3 style="margin: 0 0 8px 0; color: #4285f4;">Gemini</h3>
        <div style="color: #666; font-size: 14px;">Google AI</div>
      </div>

      <div class="service-card" onclick="runServiceTest('copilot')" style="border: 2px solid #333; border-radius: 8px; padding: 20px; cursor: pointer; text-align: center; transition: all 0.2s;">
        <div style="font-size: 36px; margin-bottom: 10px;">👨‍💻</div>
        <h3 style="margin: 0 0 8px 0; color: #333;">Copilot</h3>
        <div style="color: #666; font-size: 14px;">GitHub AI</div>
      </div>
    </div>

    <div class="test-options" style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
      <h4 style="margin: 0 0 10px 0; color: #555;">Test Options:</h4>
      <label style="display: block; margin-bottom: 8px;">
        <input type="checkbox" id="visible-browser" checked> 
        Show browser (for debugging)
      </label>
      <label style="display: block; margin-bottom: 8px;">
        <input type="checkbox" id="auto-update-single"> 
        Auto-update if confidence > 95%
      </label>
    </div>

    <div class="progress-section" id="progress-section" style="display: none; margin-bottom: 20px;"></div>
    <div class="results-section" id="results-section" style="display: none;"></div>
  `;

  // Add hover effects
  document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('mouseover', () => {
      card.style.transform = 'scale(1.05)';
      card.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
    });
    card.addEventListener('mouseout', () => {
      card.style.transform = 'scale(1)';
      card.style.boxShadow = 'none';
    });
  });
}

// Used by onclick handlers in generated HTML
// eslint-disable-next-line no-unused-vars
async function runServiceTest(service) {
  showProgress(true);
  updateProgress(10, `Initializing ${service} test...`);

  const visibleBrowser = document.getElementById('visible-browser').checked;
  const autoUpdate = document.getElementById('auto-update-single').checked;

  try {
    const response = await fetch(`/api/diagnostic/${service}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        options: {
          headless: !visibleBrowser,
          autoUpdate: autoUpdate
        }
      })
    });

    updateProgress(30, `Logging into ${service}...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    updateProgress(60, `Analyzing ${service} selectors...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    updateProgress(90, 'Generating report...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();
    updateProgress(100, `${service} test complete!`);

    setTimeout(() => {
      showResults(formatServiceResults(result.data, service));
    }, 500);

  } catch (error) {
    updateProgress(100, 'Error occurred');
    setTimeout(() => {
      showResults(`❌ Error testing ${service}: ${error.message}\n\nTroubleshooting:\n1. Check credentials for ${service}\n2. Ensure API server running\n3. Try with visible browser to debug`);
    }, 500);
  }
}

function showProgress(show) {
  const progressSection = document.getElementById('progress-section');
  if (show) {
    progressSection.style.display = 'block';
    progressSection.innerHTML = `
      <div style="background: #f8f9fa; border-radius: 8px; padding: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span id="progress-text">Initializing...</span>
          <span id="progress-percent">0%</span>
        </div>
        <div style="width: 100%; height: 6px; background: #e9ecef; border-radius: 3px; overflow: hidden;">
          <div id="progress-bar" style="height: 100%; background: linear-gradient(90deg, #007acc, #0099ff); width: 0%; transition: width 0.3s;"></div>
        </div>
      </div>
    `;
  } else {
    progressSection.style.display = 'none';
  }
}

function updateProgress(percent, text) {
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const progressPercent = document.getElementById('progress-percent');

  if (progressBar) progressBar.style.width = `${percent}%`;
  if (progressText) progressText.textContent = text;
  if (progressPercent) progressPercent.textContent = `${percent}%`;
}

function showResults(content) {
  showProgress(false);
  
  const resultsSection = document.getElementById('results-section');
  resultsSection.style.display = 'block';
  resultsSection.innerHTML = `
    <h3 style="color: #555; margin-bottom: 15px;">Results:</h3>
    <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; max-height: 300px; overflow-y: auto; font-family: monospace; font-size: 13px; white-space: pre-wrap;">${content}</div>
  `;
}

function formatQuickResults(data) {
  if (!data) return 'No data received';
  
  return `🎯 Quick Health Check Results
═══════════════════════════════════

📊 SUMMARY:
Status: ${data.status}
Services: ${data.summary.healthy_services}/${data.summary.total_services} healthy
Average Response: ${data.summary.average_response_time}ms

🔍 SERVICE BREAKDOWN:
${Object.entries(data.services).map(([serviceId, service]) => {
  const emoji = service.status === 'HEALTHY' ? '✅' : service.status === 'WARNING' ? '⚠️' : '❌';
  return `${emoji} ${serviceId.toUpperCase()}: ${service.overall_score}%
  Input: ${service.inputSelector.found ? '✅' : '❌'} | Send: ${service.sendSelector.found ? '✅' : '❌'} | Response: ${service.responseSelector.found ? '✅' : '❌'}`;
}).join('\n')}

💡 RECOMMENDATION:
${data.summary.failed_services > 0 ? '🚨 Run full diagnostic - some services need attention' : 
  data.summary.warning_services > 0 ? '⚠️ Monitor closely - fallbacks in use' : 
  '✅ All systems healthy - no action needed'}`;
}

function formatFullResults(data) {
  if (!data) return 'No data received';
  
  return `🎯 Full Real-Time Diagnostic Results
═══════════════════════════════════════

📊 SUMMARY:
Session: ${data.session_id}
Services Tested: ${data.summary.total_services}
Successful Logins: ${data.summary.successful_logins}
Average Confidence: ${data.summary.confidence_score}%
Auto-Updates Applied: ${data.auto_updates_applied.length}

🔍 SERVICE DETAILS:
${data.services_tested.map(service => {
  const emoji = service.confidence_score >= 90 ? '✅' : service.confidence_score >= 70 ? '⚠️' : '❌';
  return `${emoji} ${service.service.toUpperCase()} (${service.confidence_score}% confidence)
  Recommendations: ${service.recommendations.length}`;
}).join('\n')}

${data.auto_updates_applied.length > 0 ? `
🔄 AUTO-UPDATES APPLIED:
${data.auto_updates_applied.map(update => 
  `✅ ${update.service}: ${update.updates_count} selector(s) updated`
).join('\n')}` : ''}

${data.manual_review_required.length > 0 ? `
⚠️ MANUAL REVIEW REQUIRED:
${data.manual_review_required.map(review => 
  `👀 ${review.service}: ${review.reason}`
).join('\n')}` : ''}

🎯 NEXT ACTIONS:
${data.summary.confidence_score >= 90 ? '✅ All systems healthy' : 
  data.summary.confidence_score >= 70 ? '⚠️ Monitor systems' : 
  '🚨 Update selectors immediately'}`;
}

function formatServiceResults(data, service) {
  if (!data || !data.services_tested || data.services_tested.length === 0) {
    return `❌ No results for ${service}`;
  }
  
  const serviceData = data.services_tested[0];
  const emoji = serviceData.confidence_score >= 90 ? '✅' : serviceData.confidence_score >= 70 ? '⚠️' : '❌';
  
  return `🔍 ${service.toUpperCase()} Diagnostic Results
═══════════════════════════════════

${emoji} CONFIDENCE: ${serviceData.confidence_score}%

📋 SELECTOR ANALYSIS:
Input Selectors: ${serviceData.input_selectors.filter(s => s.found).length}/${serviceData.input_selectors.length} working
Send Selectors: ${serviceData.send_selectors.filter(s => s.found).length}/${serviceData.send_selectors.length} working
Response Selectors: ${serviceData.response_selectors.filter(s => s.found).length}/${serviceData.response_selectors.length} working

${serviceData.recommendations.length > 0 ? `
💡 RECOMMENDATIONS:
${serviceData.recommendations.map(rec => {
  const recEmoji = rec.type === 'CRITICAL' ? '🚨' : rec.type === 'WARNING' ? '⚠️' : '💡';
  return `${recEmoji} ${rec.message}`;
}).join('\n')}` : '✅ No issues found'}

🎯 STATUS: ${serviceData.confidence_score >= 90 ? 'Healthy - no action needed' : 
            serviceData.confidence_score >= 70 ? 'Warning - monitor closely' : 
            'Critical - immediate attention required'}`;
}

// Used by onclick handlers in generated HTML
// eslint-disable-next-line no-unused-vars
function openDiagnosticAPI() {
  window.open('http://localhost:3001/health', '_blank');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addDiagnosticButton);
} else {
  addDiagnosticButton();
}

// Make functions globally available for onclick handlers
window.showServiceSelector = showServiceSelector;
window.runServiceTest = runServiceTest;
window.openDiagnosticAPI = openDiagnosticAPI;
window.closeDiagnosticModal = closeDiagnosticModal;
window.runQuickDiagnostic = runQuickDiagnostic;
window.runFullDiagnostic = runFullDiagnostic;

// Export for manual initialization
window.DiagnosticIntegration = {
  addDiagnosticButton,
  showDiagnosticModal,
  runQuickDiagnostic,
  runFullDiagnostic
};