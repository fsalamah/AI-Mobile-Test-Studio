#!/usr/bin/env node

/**
 * Command-line tool for the recording condenser
 * 
 * Usage:
 *   node condense-recording.js <input-file.json> [output-file.json] [--xml=true|false] [--screenshot=true|false] [--threshold=0.95]
 * 
 * Examples:
 *   node condense-recording.js recording.json condensed.json --xml=true --screenshot=true
 *   node condense-recording.js recording.json condensed.json --threshold=0.95
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { condenseRecording } from './recordingCondenser.js';
import { Logger } from './logger.js';

// Set up logging to console
Logger.subscribe((logMessage) => {
  if (logMessage.type === 'error') {
    console.error(`[${logMessage.timestamp}] ERROR: ${logMessage.message}`, logMessage.error);
  } else if (logMessage.type === 'debug') {
    // Only show debug logs if DEBUG=true is set
    if (process.env.DEBUG === 'true') {
      console.log(`[${logMessage.timestamp}] DEBUG: ${logMessage.message}`);
    }
  } else {
    console.log(`[${logMessage.timestamp}] ${logMessage.message}`);
  }
});

/**
 * Main function for CLI usage
 */
async function main() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    // Show usage if no input file provided or --help is specified
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
      console.log('Recording Condenser');
      console.log('==================');
      console.log('\nUsage:');
      console.log('  node condense-recording.js <input-file.json> [output-file.json] [--xml=true|false] [--screenshot=true|false] [--threshold=1.0]');
      console.log('\nOptions:');
      console.log('  --xml=false         Disable XML comparison');
      console.log('  --screenshot=false  Disable screenshot comparison');
      console.log('  --threshold=0.95    Set similarity threshold for screenshot comparison (0.0-1.0)');
      console.log('                      1.0 = exact match (default), 0.9 = 90% similar, etc.');
      console.log('\nExamples:');
      console.log('  node condense-recording.js recording.json condensed.json --xml=true --screenshot=true');
      console.log('  node condense-recording.js recording.json condensed.json --threshold=0.95');
      process.exit(0);
    }
    
    // Parse input and output file paths
    const inputFilePath = args[0];
    let outputFilePath = args.length > 1 && !args[1].startsWith('--') 
      ? args[1] 
      : null;
    
    // Parse options
    const options = {
      checkXml: true,
      checkScreenshot: true,
      screenshotThreshold: 1.0
    };
    
    // Process all arguments starting with --
    for (const arg of args) {
      if (arg.startsWith('--xml=')) {
        options.checkXml = arg.split('=')[1].toLowerCase() === 'true';
      } else if (arg.startsWith('--screenshot=')) {
        options.checkScreenshot = arg.split('=')[1].toLowerCase() === 'true';
      } else if (arg.startsWith('--threshold=')) {
        const thresholdValue = parseFloat(arg.split('=')[1]);
        if (!isNaN(thresholdValue) && thresholdValue >= 0 && thresholdValue <= 1) {
          options.screenshotThreshold = thresholdValue;
        } else {
          console.warn(`Invalid threshold value: ${arg.split('=')[1]}. Must be between 0.0 and 1.0. Using default 1.0.`);
        }
      }
    }
    
    console.log(`Reading recording from: ${inputFilePath}`);
    console.log(`Options: checkXml=${options.checkXml}, checkScreenshot=${options.checkScreenshot}, threshold=${options.screenshotThreshold}`);
    
    // Read input file
    const fileContent = await fs.readFile(inputFilePath, 'utf8');
    const recording = JSON.parse(fileContent);
    
    if (!Array.isArray(recording)) {
      throw new Error('Input file must contain an array of recording entries');
    }
    
    console.log(`Loaded recording with ${recording.length} states`);
    
    // Condense the recording
    const condensedRecording = condenseRecording(recording, options);
    
    // Determine output path
    if (!outputFilePath) {
      const inputFileName = path.basename(inputFilePath);
      const inputDirName = path.dirname(inputFilePath);
      const nameWithoutExt = inputFileName.replace(/\.[^/.]+$/, ''); // Remove extension
      outputFilePath = path.join(inputDirName, `${nameWithoutExt}_condensed.json`);
    }
    
    // Write condensed recording to output file
    await fs.writeFile(outputFilePath, JSON.stringify(condensedRecording, null, 2), 'utf8');
    
    console.log(`Condensed recording saved to: ${outputFilePath}`);
    console.log(`Reduced from ${recording.length} to ${condensedRecording.length} states (${recording.length - condensedRecording.length} states removed)`);
    
    return 0;
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    return 1;
  }
}

// Run as script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(exitCode => process.exit(exitCode));
}