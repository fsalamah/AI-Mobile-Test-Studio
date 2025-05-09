#!/usr/bin/env node

/**
 * Wrapper script for transition analysis
 * 
 * This script forwards arguments to the actual implementation
 * in the app/common/renderer/lib/ai directory
 */

// Import required modules
import { fileURLToPath } from 'url';
import path from 'path';
import { spawn } from 'child_process';

// Get the current directory (ESM compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.join(__dirname, 'app', 'common', 'renderer', 'lib', 'ai', 'analyze-transitions.js');

// Forward all command-line arguments
const args = process.argv.slice(2);

// Print usage if no args provided
if (args.length === 0) {
  console.log('Appium Inspector Transition Analysis Tool');
  console.log('-----------------------------------------');
  console.log('\nUsage:');
  console.log('  node analyze-transitions.js <recording-file.json> [output-file.json]');
  console.log('\nExample:');
  console.log('  node analyze-transitions.js ./recordings/login-flow.json ./analysis/login-analysis.json');
  process.exit(0);
}

// Execute the actual script with all arguments
const child = spawn('node', [scriptPath, ...args], {
  stdio: 'inherit'
});

// Handle exit
child.on('exit', (code) => {
  process.exit(code);
});