#!/usr/bin/env node

/**
 * Wrapper script for testing transition analysis
 * 
 * This script forwards to the actual test implementation
 * in the app/common/renderer/lib/ai directory
 */

// Import required modules
import { fileURLToPath } from 'url';
import path from 'path';
import { spawn } from 'child_process';

// Get the current directory (ESM compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.join(__dirname, 'app', 'common', 'renderer', 'lib', 'ai', 'test-transition-analysis.js');

// Execute the actual test script
const child = spawn('node', [scriptPath], {
  stdio: 'inherit'
});

// Handle exit
child.on('exit', (code) => {
  process.exit(code);
});