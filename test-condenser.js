#!/usr/bin/env node

/**
 * Test script for the recording condenser
 * 
 * This script is a wrapper that calls the implementation in lib/ai
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { spawn } from 'child_process';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.join(__dirname, 'app', 'common', 'renderer', 'lib', 'ai', 'test-condenser.js');

// Run the actual test script
const child = spawn('node', [scriptPath], {
  stdio: 'inherit'
});

// Handle exit
child.on('exit', (code) => {
  process.exit(code);
});