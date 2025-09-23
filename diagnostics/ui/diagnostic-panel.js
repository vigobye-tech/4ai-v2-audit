/**
 * Diagnostic Button Integration for 4AI System
 * Provides one-click diagnostic functionality for WebAI selectors
 */

class DiagnosticPanel {
  constructor() {
    this.isRunning = false;
    this.currentSession = null;
    this.initializeUI();
  }

  initializeUI() {
    // Create diagnostic panel
    const panel = document.createElement('div');
    panel.id = 'diagnostic-panel';
    panel.className = 'diagnostic-panel';
    panel.innerHTML = `
      <div class="diagnostic-header">
        <h3>🎯 WebAI Diagnostics</h3>
        <div class="diagnostic-status" id="diagnostic-status">Ready</div>
      </div>
      
      <div class="diagnostic-controls">
        <div class="diagnostic-options">
          <label>
            <input type="checkbox" id="auto-update-toggle" checked>
            Auto-update selectors (high confidence only)
          </label>
          
          <label>
            <input type="checkbox" id="headless-toggle" checked>
            Run in background (headless mode)
          </label>
          
          <select id="service-selector">
            <option value="">All Services</option>
            <option value="chatgpt">ChatGPT Only</option>
            <option value="claude">Claude Only</option>
            <option value="gemini">Gemini Only</option>
          </select>
        </div>
        
        <div class="diagnostic-buttons">
          <button id="run-diagnostic-btn" class="diagnostic-btn primary">
            🚀 Run Full Diagnostic
          </button>
          
          <button id="quick-check-btn" class="diagnostic-btn secondary">
            ⚡ Quick Health Check
          </button>
          
          <button id="view-logs-btn" class="diagnostic-btn tertiary">
            📋 View Results
          </button>
        </div>
      </div>
      
      <div class="diagnostic-progress" id="diagnostic-progress" style="display: none;">
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
        <div class="progress-text" id="progress-text">Initializing...</div>
      </div>
      
      <div class="diagnostic-results" id="diagnostic-results" style="display: none;"></div>
    `;
    
    // Add to page
    document.body.appendChild(panel);
    
    // Add event listeners
    this.bindEvents();
    
    // Add CSS styles
    this.addStyles();
  }

  bindEvents() {
    document.getElementById('run-diagnostic-btn').addEventListener('click', () => {
      this.runFullDiagnostic();
    });
    
    document.getElementById('quick-check-btn').addEventListener('click', () => {
      this.runQuickCheck();
    });
    
    document.getElementById('view-logs-btn').addEventListener('click', () => {
      this.viewResults();
    });
  }

  async runFullDiagnostic() {
    if (this.isRunning) {
      alert('Diagnostic already running!');
      return;
    }

    this.isRunning = true;
    this.updateStatus('Running full diagnostic...', 'running');
    this.showProgress();

    const options = this.getSelectedOptions();
    
    try {
      // Call backend diagnostic
      const results = await this.callDiagnosticAPI('full', options);
      this.displayResults(results);
      this.updateStatus(`Complete! Confidence: ${results.summary.confidence_score}%`, 'success');
      
    } catch (error) {
      this.updateStatus(`Error: ${error.message}`, 'error');
      this.displayError(error);
    } finally {
      this.isRunning = false;
      this.hideProgress();
    }
  }

  async runQuickCheck() {
    if (this.isRunning) {
      alert('Diagnostic already running!');
      return;
    }

    this.isRunning = true;
    this.updateStatus('Running quick health check...', 'running');
    this.showProgress();

    try {
      // Call existing monitor (faster, no login required)  
      const results = await this.callMonitorAPI();
      this.displayQuickResults(results);
      this.updateStatus(`Quick check complete!`, 'success');
      
    } catch (error) {
      this.updateStatus(`Error: ${error.message}`, 'error');
      this.displayError(error);
    } finally {
      this.isRunning = false;
      this.hideProgress();
    }
  }

  getSelectedOptions() {
    return {
      autoUpdate: document.getElementById('auto-update-toggle').checked,
      headless: document.getElementById('headless-toggle').checked,
      service: document.getElementById('service-selector').value || null
    };
  }

  async callDiagnosticAPI(type, options) {
    // This would call the Node.js diagnostic tool
    const response = await fetch('/api/diagnostic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, options })
    });
    
    if (!response.ok) {
      throw new Error(`Diagnostic failed: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async callMonitorAPI() {
    // Call existing monitor script
    const response = await fetch('/api/monitor', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Monitor failed: ${response.statusText}`);
    }
    
    return await response.json();
  }

  displayResults(results) {
    const resultsDiv = document.getElementById('diagnostic-results');
    resultsDiv.style.display = 'block';
    
    const html = `
      <div class="results-summary">
        <h4>📊 Diagnostic Summary</h4>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">Services Tested:</span>
            <span class="value">${results.summary.total_services}</span>
          </div>
          <div class="summary-item">
            <span class="label">Successful Logins:</span>
            <span class="value">${results.summary.successful_logins}</span>
          </div>
          <div class="summary-item">
            <span class="label">Overall Confidence:</span>
            <span class="value confidence-${this.getConfidenceClass(results.summary.confidence_score)}">
              ${results.summary.confidence_score}%
            </span>
          </div>
          <div class="summary-item">
            <span class="label">Auto-Updates Applied:</span>
            <span class="value">${results.auto_updates_applied.length}</span>
          </div>
        </div>
      </div>
      
      <div class="service-results">
        <h4>🔍 Service Details</h4>
        ${results.services_tested.map(service => this.renderServiceResult(service)).join('')}
      </div>
      
      ${results.auto_updates_applied.length > 0 ? `
        <div class="updates-applied">
          <h4>🔄 Updates Applied</h4>
          ${results.auto_updates_applied.map(update => `
            <div class="update-item">
              <strong>${update.service}:</strong> ${update.updates_count} selector(s) updated
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      ${results.manual_review_required.length > 0 ? `
        <div class="manual-review">
          <h4>⚠️ Manual Review Required</h4>
          ${results.manual_review_required.map(review => `
            <div class="review-item">
              <strong>${review.service}:</strong> ${review.reason} (${review.confidence}% confidence)
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
    
    resultsDiv.innerHTML = html;
  }

  displayQuickResults(results) {
    const resultsDiv = document.getElementById('diagnostic-results');
    resultsDiv.style.display = 'block';
    
    const html = `
      <div class="quick-results">
        <h4>⚡ Quick Health Check</h4>
        <div class="health-overview">
          <div class="health-item ${results.status.toLowerCase()}">
            <span class="status-indicator"></span>
            <span>Overall Status: ${results.status}</span>
          </div>
          <div class="health-stats">
            ✅ Healthy: ${results.summary.healthy_services}/${results.summary.total_services} |
            ⚠️ Warning: ${results.summary.warning_services} |
            ❌ Failed: ${results.summary.failed_services}
          </div>
        </div>
        
        <div class="services-grid">
          ${Object.entries(results.services).map(([serviceId, service]) => `
            <div class="service-card ${service.status.toLowerCase()}">
              <h5>${serviceId.toUpperCase()}</h5>
              <div class="service-score">${service.overall_score}%</div>
              <div class="service-details">
                Input: ${service.inputSelector.found ? '✅' : '❌'} |
                Send: ${service.sendSelector.found ? '✅' : '❌'} |
                Response: ${service.responseSelector.found ? '✅' : '❌'}
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="quick-actions">
          <button onclick="diagnosticPanel.runFullDiagnostic()" class="action-btn">
            🎯 Run Full Diagnostic
          </button>
          <button onclick="diagnosticPanel.viewLogs()" class="action-btn secondary">
            📋 View Detailed Logs
          </button>
        </div>
      </div>
    `;
    
    resultsDiv.innerHTML = html;
  }

  renderServiceResult(service) {
    const confidenceClass = this.getConfidenceClass(service.confidence_score);
    
    return `
      <div class="service-result ${confidenceClass}">
        <div class="service-header">
          <h5>${service.service.toUpperCase()}</h5>
          <span class="confidence-badge confidence-${confidenceClass}">
            ${service.confidence_score}%
          </span>
        </div>
        
        <div class="selector-groups">
          <div class="selector-group">
            <h6>Input Selectors:</h6>
            ${service.input_selectors.map(s => this.renderSelectorStatus(s)).join('')}
          </div>
          
          <div class="selector-group">
            <h6>Send Selectors:</h6>
            ${service.send_selectors.map(s => this.renderSelectorStatus(s)).join('')}
          </div>
          
          <div class="selector-group">
            <h6>Response Selectors:</h6>
            ${service.response_selectors.map(s => this.renderSelectorStatus(s)).join('')}
          </div>
        </div>
        
        ${service.recommendations.length > 0 ? `
          <div class="recommendations">
            <h6>Recommendations:</h6>
            ${service.recommendations.map(rec => `
              <div class="recommendation ${rec.type.toLowerCase()}">
                ${this.getRecommendationEmoji(rec.type)} ${rec.message}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  renderSelectorStatus(selector) {
    const statusIcon = selector.found ? '✅' : '❌';
    const confidenceClass = selector.confidence ? selector.confidence.toLowerCase() : 'unknown';
    
    return `
      <div class="selector-status ${confidenceClass}">
        <span class="status-icon">${statusIcon}</span>
        <span class="selector-text">${selector.selector}</span>
        <span class="response-time">${selector.response_time_ms}ms</span>
      </div>
    `;
  }

  getConfidenceClass(score) {
    if (score >= 90) return 'high';
    if (score >= 70) return 'medium';
    if (score >= 50) return 'low';
    return 'critical';
  }

  getRecommendationEmoji(type) {
    const emojis = {
      'CRITICAL': '🚨',
      'WARNING': '⚠️',
      'SUGGESTION': '💡',
      'INFO': 'ℹ️'
    };
    return emojis[type] || '📝';
  }

  updateStatus(text, type = 'info') {
    const statusEl = document.getElementById('diagnostic-status');
    statusEl.textContent = text;
    statusEl.className = `diagnostic-status ${type}`;
  }

  showProgress() {
    document.getElementById('diagnostic-progress').style.display = 'block';
    this.updateProgress(0, 'Initializing...');
  }

  hideProgress() {
    document.getElementById('diagnostic-progress').style.display = 'none';
  }

  updateProgress(percent, text) {
    document.getElementById('progress-fill').style.width = `${percent}%`;
    document.getElementById('progress-text').textContent = text;
  }

  displayError(error) {
    const resultsDiv = document.getElementById('diagnostic-results');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
      <div class="error-display">
        <h4>❌ Diagnostic Error</h4>
        <div class="error-message">${error.message}</div>
        <div class="error-actions">
          <button onclick="diagnosticPanel.runQuickCheck()" class="action-btn">
            ⚡ Try Quick Check Instead
          </button>
          <button onclick="diagnosticPanel.viewLogs()" class="action-btn secondary">
            📋 Check Logs
          </button>
        </div>
      </div>
    `;
  }

  async viewResults() {
    // Open results in new window or modal
    window.open('/logs/diagnostic-results.json', '_blank');
  }

  async viewLogs() {
    // Open logs directory or specific log files
    window.open('/logs/', '_blank');
  }

  addStyles() {
    const styles = `
      <style>
        .diagnostic-panel {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 400px;
          max-height: 80vh;
          overflow-y: auto;
          background: white;
          border: 2px solid #007acc;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          z-index: 10000;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .diagnostic-header {
          background: linear-gradient(135deg, #007acc, #005a9e);
          color: white;
          padding: 15px;
          border-radius: 6px 6px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .diagnostic-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .diagnostic-status {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 12px;
          background: rgba(255,255,255,0.2);
        }

        .diagnostic-status.running {
          background: #ffc107;
          color: #000;
          animation: pulse 1.5s infinite;
        }

        .diagnostic-status.success {
          background: #28a745;
        }

        .diagnostic-status.error {
          background: #dc3545;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .diagnostic-controls {
          padding: 20px;
        }

        .diagnostic-options {
          margin-bottom: 15px;
        }

        .diagnostic-options label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .diagnostic-options select {
          width: 100%;
          padding: 6px;
          margin-top: 5px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .diagnostic-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .diagnostic-btn {
          padding: 10px 15px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .diagnostic-btn.primary {
          background: #007acc;
          color: white;
        }

        .diagnostic-btn.primary:hover {
          background: #005a9e;
        }

        .diagnostic-btn.secondary {
          background: #6c757d;
          color: white;
        }

        .diagnostic-btn.secondary:hover {
          background: #545b62;
        }

        .diagnostic-btn.tertiary {
          background: #f8f9fa;
          color: #495057;
          border: 1px solid #dee2e6;
        }

        .diagnostic-btn.tertiary:hover {
          background: #e9ecef;
        }

        .diagnostic-progress {
          padding: 0 20px 20px;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: #e9ecef;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #007acc, #0099ff);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 12px;
          color: #6c757d;
          text-align: center;
        }

        .diagnostic-results {
          max-height: 400px;
          overflow-y: auto;
          padding: 0 20px 20px;
          border-top: 1px solid #dee2e6;
        }

        .results-summary, .service-results {
          margin-bottom: 20px;
        }

        .results-summary h4, .service-results h4 {
          margin: 15px 0 10px 0;
          color: #333;
          font-size: 16px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 15px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
          font-size: 13px;
        }

        .confidence-high { color: #28a745; font-weight: bold; }
        .confidence-medium { color: #ffc107; font-weight: bold; }
        .confidence-low { color: #fd7e14; font-weight: bold; }
        .confidence-critical { color: #dc3545; font-weight: bold; }

        .service-result {
          border: 1px solid #dee2e6;
          border-radius: 6px;
          margin-bottom: 10px;
          overflow: hidden;
        }

        .service-result.high {
          border-left: 4px solid #28a745;
        }

        .service-result.medium {
          border-left: 4px solid #ffc107;
        }

        .service-result.low {
          border-left: 4px solid #fd7e14;
        }

        .service-result.critical {
          border-left: 4px solid #dc3545;
        }

        .service-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          background: #f8f9fa;
        }

        .service-header h5 {
          margin: 0;
          font-size: 14px;
        }

        .confidence-badge {
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: bold;
        }

        .confidence-badge.confidence-high {
          background: #d4edda;
          color: #155724;
        }

        .confidence-badge.confidence-medium {
          background: #fff3cd;
          color: #856404;
        }

        .confidence-badge.confidence-low {
          background: #f8d7da;
          color: #721c24;
        }

        .confidence-badge.confidence-critical {
          background: #f5c6cb;
          color: #721c24;
        }

        .selector-groups {
          padding: 15px;
        }

        .selector-group {
          margin-bottom: 15px;
        }

        .selector-group h6 {
          margin: 0 0 8px 0;
          font-size: 13px;
          color: #495057;
        }

        .selector-status {
          display: flex;
          align-items: center;
          padding: 4px 0;
          font-size: 12px;
        }

        .status-icon {
          margin-right: 8px;
        }

        .selector-text {
          flex: 1;
          font-family: monospace;
          color: #495057;
        }

        .response-time {
          color: #6c757d;
          font-size: 11px;
        }

        .recommendations {
          padding: 0 15px 15px;
          border-top: 1px solid #dee2e6;
        }

        .recommendations h6 {
          margin: 10px 0 8px 0;
          font-size: 13px;
          color: #495057;
        }

        .recommendation {
          padding: 6px 10px;
          margin-bottom: 5px;
          border-radius: 4px;
          font-size: 12px;
        }

        .recommendation.critical {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .recommendation.warning {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        }

        .recommendation.suggestion {
          background: #d1ecf1;
          color: #0c5460;
          border: 1px solid #bee5eb;
        }

        .quick-results {
          padding: 15px;
        }

        .health-overview {
          margin-bottom: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .health-item {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          font-weight: 500;
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 10px;
        }

        .health-item.success .status-indicator {
          background: #28a745;
        }

        .health-item.warning .status-indicator {
          background: #ffc107;
        }

        .health-item.failure .status-indicator {
          background: #dc3545;
        }

        .health-stats {
          font-size: 13px;
          color: #6c757d;
        }

        .services-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 20px;
        }

        .service-card {
          padding: 12px;
          border-radius: 6px;
          text-align: center;
          border: 1px solid #dee2e6;
        }

        .service-card.healthy {
          border-left: 4px solid #28a745;
          background: #f8fff9;
        }

        .service-card.warning {
          border-left: 4px solid #ffc107;
          background: #fffef8;
        }

        .service-card.failed {
          border-left: 4px solid #dc3545;
          background: #fff8f8;
        }

        .service-card h5 {
          margin: 0 0 8px 0;
          font-size: 14px;
        }

        .service-score {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .service-details {
          font-size: 11px;
          color: #6c757d;
        }

        .quick-actions {
          display: flex;
          gap: 10px;
        }

        .action-btn {
          flex: 1;
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          background: #007acc;
          color: white;
        }

        .action-btn:hover {
          background: #005a9e;
        }

        .action-btn.secondary {
          background: #6c757d;
        }

        .action-btn.secondary:hover {
          background: #545b62;
        }

        .error-display {
          padding: 20px;
          text-align: center;
        }

        .error-display h4 {
          color: #dc3545;
          margin-bottom: 15px;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-family: monospace;
          font-size: 12px;
        }

        .error-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
        }
      </style>
    `;
    
    if (!document.getElementById('diagnostic-styles')) {
      const styleSheet = document.createElement('div');
      styleSheet.id = 'diagnostic-styles';
      styleSheet.innerHTML = styles;
      document.head.appendChild(styleSheet);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.diagnosticPanel = new DiagnosticPanel();
  });
} else {
  window.diagnosticPanel = new DiagnosticPanel();
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DiagnosticPanel;
}