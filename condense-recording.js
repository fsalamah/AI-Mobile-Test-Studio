#!/usr/bin/env node

/**
 * Command-line wrapper for the recording condenser
 * 
 * Usage:
 *   node condense-recording.js <input-file.json> [output-file.json] [--xml=true|false] [--screenshot=true|false]
 * 
 * Example:
 *   node condense-recording.js recording.json condensed.json --xml=true --screenshot=true
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { spawn } from 'child_process';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.join(__dirname, 'app', 'common', 'renderer', 'lib', 'ai', 'condense-recording.js');

// Forward all command-line arguments
const args = process.argv.slice(2);

// Show usage if no args provided
if (args.length === 0) {
  console.log('Recording Condenser');
  console.log('==================');
  console.log('\nUsage:');
  console.log('  node condense-recording.js <input-file.json> [output-file.json] [--xml=true|false] [--screenshot=true|false]');
  console.log('\nOptions:');
  console.log('  --xml=false         Disable XML comparison');
  console.log('  --screenshot=false  Disable screenshot comparison');
  console.log('\nExample:');
  console.log('  node condense-recording.js recording.json condensed.json --xml=true --screenshot=true');
  process.exit(0);
}

// Execute the implementation script
const child = spawn('node', [scriptPath, ...args], {
  stdio: 'inherit'
});

// Handle exit
child.on('exit', (code) => {
  process.exit(code);
});