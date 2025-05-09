#!/usr/bin/env node

/**
 * CommonJS wrapper for the recording condenser
 * 
 * Usage:
 *   node condense-recording.cjs <input-file.json> [output-file.json] [--xml=true|false] [--screenshot=true|false]
 * 
 * Example:
 *   node condense-recording.cjs recording.json condensed.json --xml=true --screenshot=true
 */

const path = require('path');
const { spawn } = require('child_process');

// Get the path to the implementation script
const scriptPath = path.join(__dirname, 'app', 'common', 'renderer', 'lib', 'ai', 'condense-recording.cjs');

// Forward all command-line arguments
const args = process.argv.slice(2);

// Show usage if no args provided
if (args.length === 0) {
  console.log('Recording Condenser');
  console.log('==================');
  console.log('\nUsage:');
  console.log('  node condense-recording.cjs <input-file.json> [output-file.json] [--xml=true|false] [--screenshot=true|false]');
  console.log('\nOptions:');
  console.log('  --xml=false         Disable XML comparison');
  console.log('  --screenshot=false  Disable screenshot comparison');
  console.log('\nExample:');
  console.log('  node condense-recording.cjs recording.json condensed.json --xml=true --screenshot=true');
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