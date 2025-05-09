#!/usr/bin/env node

/**
 * CommonJS wrapper for the test condenser
 * 
 * This script forwards to the implementation in lib/ai
 */

const path = require('path');
const { spawn } = require('child_process');

// Get the path to the implementation script
const scriptPath = path.join(__dirname, 'app', 'common', 'renderer', 'lib', 'ai', 'test-condenser.cjs');

// Run the test script
const child = spawn('node', [scriptPath], {
  stdio: 'inherit'
});

// Handle exit
child.on('exit', (code) => {
  process.exit(code);
});