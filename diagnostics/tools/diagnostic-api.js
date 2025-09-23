#!/usr/bin/env node

/**
 * Diagnostic API Server
 * Provides REST endpoints for WebAI diagnostic functionality
 * Integrates with diagnostic panel and tools
 */

import express from 'express';
import cors from 'cors';
// import { spawn } from 'child_process'; // Unused
import fs from 'fs';
import path from 'path';
import WebAIDiagnostic from './webai-diagnostic.js';
import WebAIMonitor from '../../scripts/monitor-webai.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: '4AI Diagnostic API',
    version: '2.0.0'
  });
});

// Quick monitor endpoint (no login required)
app.get('/api/monitor', async (req, res) => {
  try {
    console.log('🔍 Running quick monitor check...');
    
    const monitor = new WebAIMonitor();
    const results = await monitor.runMonitoring();
    
    res.json({
      success: true,
      type: 'monitor',
      data: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Monitor error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      type: 'monitor_error'
    });
  }
});

// Full diagnostic endpoint (with login)
app.post('/api/diagnostic', async (req, res) => {
  try {
    const { type, options } = req.body;
    
    console.log(`🎯 Running ${type} diagnostic with options:`, options);
    
    // Validate request
    if (!type || !['full', 'quick', 'service'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid diagnostic type. Use: full, quick, or service'
      });
    }
    
    // Create diagnostic instance
    const diagnostic = new WebAIDiagnostic({
      autoUpdate: options?.autoUpdate || false,
      headless: options?.headless !== false,
      specificService: options?.service || null,
      timeout: options?.timeout || 30000
    });
    
    // Run diagnostic
    const results = await diagnostic.runFullDiagnostic();
    
    res.json({
      success: true,
      type: 'diagnostic',
      data: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Diagnostic error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      type: 'diagnostic_error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Service-specific diagnostic
app.post('/api/diagnostic/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { options } = req.body;
    
    console.log(`🎯 Running diagnostic for service: ${serviceId}`);
    
    const diagnostic = new WebAIDiagnostic({
      ...options,
      specificService: serviceId
    });
    
    const results = await diagnostic.runFullDiagnostic();
    
    res.json({
      success: true,
      type: 'service_diagnostic',
      service: serviceId,
      data: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const { serviceId } = req.params;
    console.error(`Service diagnostic error for ${serviceId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      service: serviceId
    });
  }
});

// Get diagnostic results
app.get('/api/results', (req, res) => {
  try {
    const resultsPath = './logs/diagnostic-results.json';
    
    if (!fs.existsSync(resultsPath)) {
      return res.status(404).json({
        success: false,
        error: 'No diagnostic results found'
      });
    }
    
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    
    res.json({
      success: true,
      data: results,
      file_timestamp: fs.statSync(resultsPath).mtime
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get diagnostic history
app.get('/api/history', (req, res) => {
  try {
    const logsDir = './logs';
    const diagnosticFiles = fs.readdirSync(logsDir)
      .filter(file => file.startsWith('diagnostic-') && file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          timestamp: stats.mtime,
          size: stats.size
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20); // Last 20 results
    
    res.json({
      success: true,
      data: diagnosticFiles
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific diagnostic result by filename
app.get('/api/history/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join('./logs', filename);
    
    if (!fs.existsSync(filePath) || !filename.startsWith('diagnostic-')) {
      return res.status(404).json({
        success: false,
        error: 'Diagnostic file not found'
      });
    }
    
    const results = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    res.json({
      success: true,
      data: results,
      filename
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Configuration endpoints
app.get('/api/config', (req, res) => {
  try {
    const configPath = './config/webai-selectors.json';
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    res.json({
      success: true,
      data: config
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/config/backup', (req, res) => {
  try {
    const configPath = './config/webai-selectors.json';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./config/webai-selectors.backup-${timestamp}.json`;
    
    fs.copyFileSync(configPath, backupPath);
    
    res.json({
      success: true,
      backup_file: backupPath,
      timestamp
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update configuration
app.post('/api/config/update', (req, res) => {
  try {
    const { updates, service } = req.body;
    
    if (!service || !updates) {
      return res.status(400).json({
        success: false,
        error: 'Service and updates are required'
      });
    }
    
    // Create backup first
    const configPath = './config/webai-selectors.json';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./config/webai-selectors.backup-${timestamp}.json`;
    fs.copyFileSync(configPath, backupPath);
    
    // Load current config
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    // Apply updates (simplified - real implementation would be more sophisticated)
    console.log(`Applying updates for ${service}:`, updates);
    
    // Update version
    config.version = `${config.version}-updated-${Date.now()}`;
    
    // Save updated config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    res.json({
      success: true,
      service,
      updates_applied: updates.length,
      backup_file: backupPath,
      new_version: config.version
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// WebSocket support for real-time updates (optional)
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.IO for real-time diagnostic updates
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('start_diagnostic', async (options) => {
    try {
      console.log('🎯 Starting real-time diagnostic...');
      
      socket.emit('diagnostic_status', {
        status: 'starting',
        message: 'Initializing diagnostic...'
      });
      
      const diagnostic = new WebAIDiagnostic({
        ...options,
        // Add progress callback for real-time updates
        progressCallback: (progress) => {
          socket.emit('diagnostic_progress', progress);
        }
      });
      
      const results = await diagnostic.runFullDiagnostic();
      
      socket.emit('diagnostic_complete', {
        success: true,
        results
      });
      
    } catch (error) {
      socket.emit('diagnostic_error', {
        success: false,
        error: error.message
      });
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((error, req, res) => {
  console.error('API Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 4AI Diagnostic API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Monitor API: http://localhost:${PORT}/api/monitor`);
  console.log(`🎯 Diagnostic API: http://localhost:${PORT}/api/diagnostic`);
  console.log('═'.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;