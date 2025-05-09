#!/usr/bin/env node

/**
 * Transition Analysis Script
 * 
 * This script is used to analyze transitions between app states captured by the Appium Inspector.
 * It takes a recording JSON file as input and outputs an analysis of the transitions.
 * 
 * Usage:
 *   node analyze-transitions.js <recording-file.json> [output-file.json]
 * 
 * Example:
 *   node analyze-transitions.js ./recordings/login-flow.json ./analysis/login-analysis.json
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { TransitionAnalysisPipeline } from './transitionAnalysisPipeline.js';
import { Logger } from './logger.js';

// Get the directory path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const inputFilePath = args[0];
const outputFilePath = args[1] ? args[1] : null;

// Print usage if no input file provided
if (!inputFilePath) {
  console.error('Error: Please provide a path to the recorded states JSON file');
  console.log('\nUsage:');
  console.log('  node analyze-transitions.js <recording-file.json> [output-file.json]');
  console.log('\nExample:');
  console.log('  node analyze-transitions.js ./recordings/login-flow.json ./analysis/login-analysis.json');
  process.exit(1);
}

// Ensure log output directory exists
const ensureDirectory = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`Ensured directory exists: ${dirPath}`);
  } catch (err) {
    console.warn(`Warning: Could not create directory ${dirPath}:`, err.message);
  }
};

// Use a console-friendly logger
Logger.subscribe((logMessage) => {
  if (logMessage.type === 'error') {
    console.error(`[${logMessage.timestamp}] ERROR: ${logMessage.message}`, logMessage.error);
  } else {
    console.log(`[${logMessage.timestamp}] ${logMessage.message}`);
  }
});

/**
 * Main execution function
 */
async function main() {
  try {
    console.log(`Starting transition analysis with input file: ${inputFilePath}`);
    
    // Resolve path to be absolute
    const resolvedInputPath = path.isAbsolute(inputFilePath) 
      ? inputFilePath 
      : path.join(process.cwd(), inputFilePath);
    
    console.log(`Resolved input path: ${resolvedInputPath}`);
    
    // Ensure output directory exists
    const outputDir = path.join(path.dirname(resolvedInputPath), 'output');
    await ensureDirectory(outputDir);
    
    // Read the recorded states from the file
    const recordedStatesRaw = await fs.readFile(resolvedInputPath, 'utf8');
    const recordedStates = JSON.parse(recordedStatesRaw);
    
    if (!Array.isArray(recordedStates)) {
      throw new Error('Input file must contain an array of recorded states');
    }
    
    console.log(`Loaded ${recordedStates.length} recorded states from file`);
    
    // Determine output path
    const resolvedOutputPath = outputFilePath 
      ? (path.isAbsolute(outputFilePath) ? outputFilePath : path.join(process.cwd(), outputFilePath))
      : path.join(outputDir, `transition_analysis_${new Date().toISOString().replace(/:/g, '-').replace(/\./g, '_')}.json`);
    
    console.log(`Output will be written to: ${resolvedOutputPath}`);
    
    // Run the analysis
    const transitions = await TransitionAnalysisPipeline.analyzeTransitions(recordedStates, {
      outputPath: resolvedOutputPath
    });
    
    // Write results to file
    await fs.writeFile(resolvedOutputPath, JSON.stringify(transitions, null, 2), 'utf8');
    
    console.log(`Analysis completed successfully. Analyzed ${transitions.length} transitions.`);
    console.log(`Results written to: ${resolvedOutputPath}`);
    
    return 0;
  } catch (error) {
    console.error('Error running transition analysis:', error);
    return 1;
  }
}

// Execute main function
main()
  .then((exitCode) => process.exit(exitCode))
  .catch((err) => {
    console.error('Unhandled error in main process:', err);
    process.exit(1);
  });