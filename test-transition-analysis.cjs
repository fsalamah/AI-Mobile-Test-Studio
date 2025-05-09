#!/usr/bin/env node

/**
 * CommonJS wrapper script for testing transition analysis
 * 
 * This is a CommonJS script that forwards to the ES Module implementation
 */

// Get the current directory
const path = require('path');
const scriptPath = path.join(__dirname, 'app', 'common', 'renderer', 'lib', 'ai', 'test-transition-analysis.js');

// Execute the actual test script
const { spawn } = require('child_process');
const child = spawn('node', [scriptPath], {
  stdio: 'inherit'
});

// Handle exit
child.on('exit', (code) => {
  process.exit(code);
});