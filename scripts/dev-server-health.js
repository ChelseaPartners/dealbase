#!/usr/bin/env node

/**
 * Development Server Health Monitor
 * Monitors CSS serving and automatically recovers from issues
 */

const http = require('http');
const { spawn } = require('child_process');

const FRONTEND_URL = 'http://localhost:3001';
const CSS_ENDPOINT = '/_next/static/css/app/layout.css';
const HEALTH_CHECK_INTERVAL = 5000; // 5 seconds
const MAX_RETRIES = 3;

let retryCount = 0;
let isMonitoring = false;

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [DEV-HEALTH] ${message}`);
}

function checkCSSHealth() {
  return new Promise((resolve) => {
    const req = http.get(`${FRONTEND_URL}${CSS_ENDPOINT}`, (res) => {
      if (res.statusCode === 200) {
        log('✅ CSS serving healthy');
        retryCount = 0;
        resolve(true);
      } else {
        log(`❌ CSS serving unhealthy (status: ${res.statusCode})`);
        resolve(false);
      }
    });

    req.on('error', (err) => {
      log(`❌ CSS health check failed: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(3000, () => {
      log('❌ CSS health check timeout');
      req.destroy();
      resolve(false);
    });
  });
}

function restartDevServer() {
  log('🔄 Restarting development server...');
  
  // Kill existing processes
  spawn('pkill', ['-f', 'next dev'], { stdio: 'inherit' });
  
  setTimeout(() => {
    // Start new server
    const devServer = spawn('pnpm', ['dev', '--port', '3001'], {
      cwd: './apps/web',
      stdio: 'inherit',
      shell: true
    });

    devServer.on('error', (err) => {
      log(`❌ Failed to restart dev server: ${err.message}`);
    });

    devServer.on('exit', (code) => {
      log(`Dev server exited with code ${code}`);
    });

    log('✅ Development server restarted');
  }, 2000);
}

async function monitorHealth() {
  if (isMonitoring) return;
  isMonitoring = true;

  log('🔍 Starting CSS health monitoring...');

  const healthCheck = async () => {
    const isHealthy = await checkCSSHealth();
    
    if (!isHealthy) {
      retryCount++;
      log(`⚠️  CSS unhealthy (attempt ${retryCount}/${MAX_RETRIES})`);
      
      if (retryCount >= MAX_RETRIES) {
        log('🚨 Max retries reached, restarting dev server...');
        restartDevServer();
        retryCount = 0;
      }
    }
    
    // Schedule next check
    setTimeout(healthCheck, HEALTH_CHECK_INTERVAL);
  };

  // Start monitoring
  healthCheck();
}

function startHealthMonitor() {
  log('🏥 Development Server Health Monitor started');
  log(`📊 Monitoring: ${FRONTEND_URL}${CSS_ENDPOINT}`);
  log(`⏱️  Check interval: ${HEALTH_CHECK_INTERVAL}ms`);
  log(`🔄 Max retries before restart: ${MAX_RETRIES}`);
  
  monitorHealth();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('🛑 Health monitor shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('🛑 Health monitor shutting down...');
  process.exit(0);
});

// Start the monitor
startHealthMonitor();


