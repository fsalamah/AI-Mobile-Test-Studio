#!/usr/bin/env node

/**
 * CommonJS wrapper script for transition analysis
 * 
 * This is a CommonJS script that forwards to the ES Module implementation
 */

// Forward all command-line arguments
const { spawn } = require('child_process');
const path = require('path');
const args = process.argv.slice(2);

// Handle zero args - print help
if (args.length === 0) {
  console.log('Appium Inspector Transition Analysis Tool');
  console.log('-----------------------------------------');
  console.log('\nUsage:');
  console.log('  node analyze-transitions.cjs <recording-file.json> [output-file.json]');
  console.log('\nExample:');
  console.log('  node analyze-transitions.cjs ./recordings/login-flow.json ./analysis/login-analysis.json');
  process.exit(0);
}

// Get the script path (ESM version)
const scriptPath = path.join(__dirname, 'app', 'common', 'renderer', 'lib', 'ai', 'analyze-transitions.js');

// Execute the ESM script
const child = spawn('node', [scriptPath, ...args], {
  stdio: 'inherit'
});

// Handle exit
child.on('exit', (code) => {
  process.exit(code);
});