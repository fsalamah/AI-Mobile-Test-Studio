#!/usr/bin/env node

/**
 * This script displays the model configuration that will be used for transition analysis
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { PIPELINE_TYPES } from './app/common/renderer/lib/ai/modelManager.js';
import modelConfigProvider from './app/common/renderer/lib/ai/modelConfigProvider.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Display header
console.log('Appium Inspector - Transition Analysis Model Configuration');
console.log('=======================================================');
console.log('');

// Import CONFIG to show the default model
import { CONFIG } from './app/common/renderer/lib/ai/config.js';

// Display actual configuration that will be used
console.log('Pipeline Type:', PIPELINE_TYPES.TRANSITION_ANALYSIS);
console.log('Model Priority:');
console.log('  1. CONFIG.API.MODEL:', CONFIG.API.MODEL || '[NOT SET]');
console.log('  2. CONFIG.MODEL:', CONFIG.MODEL);
console.log('  → Final model that will be used:', CONFIG.API.MODEL || CONFIG.MODEL);
console.log('API Base URL:', CONFIG.API.BASE_URL);
console.log('API Key:', CONFIG.API.KEY ? '[CONFIGURED]' : '[NOT CONFIGURED]');
console.log('');

console.log('');

// Show how to modify the configuration
console.log('To change the model configuration:');
console.log('1. Edit app/common/renderer/lib/ai/modelManager.js to update DEFAULT_MODEL_ASSIGNMENTS');
console.log('2. Edit app/common/renderer/lib/ai/config.js to update API keys and base URLs');
console.log('');