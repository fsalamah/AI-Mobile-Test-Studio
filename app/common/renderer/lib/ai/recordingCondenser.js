/**
 * Recording Condenser
 * 
 * This utility removes redundant states from action recordings by removing
 * consecutive states where no visible changes occurred (same XML, same screenshot).
 */

import { Logger } from './logger.js';
import { FileUtils } from './fileUtils.js';
import { CONFIG } from './config.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Helpers to check if source or screenshot has changed
const hasSourceChanged = (oldSource, newSource) => {
  if (!oldSource && newSource) return true;
  if (!newSource) return false;
  if (!oldSource) return false;
  return oldSource !== newSource;
};

/**
 * Check if a screenshot has changed using string comparison
 * 
 * @param {string} oldScreenshot - Base64 string of old screenshot
 * @param {string} newScreenshot - Base64 string of new screenshot
 * @returns {boolean} - True if screenshots are different
 */
const hasScreenshotChanged = (oldScreenshot, newScreenshot) => {
  if (!oldScreenshot && newScreenshot) return true;
  if (!newScreenshot) return false;
  if (!oldScreenshot) return false;
  return oldScreenshot !== newScreenshot;
};

/**
 * Calculate a simple similarity score between two base64 strings
 * This is a basic implementation that compares chunks of the base64 strings
 * 
 * @param {string} base64String1 - First base64 string
 * @param {string} base64String2 - Second base64 string
 * @param {number} threshold - Similarity threshold (0-1, where 1 is exact match)
 * @returns {boolean} - True if the similarity is below the threshold (images differ)
 */
const hasScreenshotChangedWithThreshold = (base64String1, base64String2, threshold = 1.0) => {
  if (!base64String1 && base64String2) return true;
  if (!base64String2) return false;
  if (!base64String1) return false;
  
  // If threshold is 1.0, use exact string comparison
  if (threshold >= 1.0) {
    return base64String1 !== base64String2;
  }
  
  // For exact match case
  if (base64String1 === base64String2) {
    return false;
  }
  
  try {
    // Calculate similarity using string sections
    // This is a simple approach that divides the strings into chunks and compares them
    const chunkSize = 1000; // Size of chunks to compare
    const string1 = base64String1.toString();
    const string2 = base64String2.toString();
    
    // Handle different length strings
    if (Math.abs(string1.length - string2.length) / Math.max(string1.length, string2.length) > (1 - threshold)) {
      return true; // Different enough based on length alone
    }
    
    // Count matching chunks
    let matchingChunks = 0;
    let totalChunks = 0;
    
    const minLength = Math.min(string1.length, string2.length);
    for (let i = 0; i < minLength; i += chunkSize) {
      const end = Math.min(i + chunkSize, minLength);
      const chunk1 = string1.substring(i, end);
      const chunk2 = string2.substring(i, end);
      
      if (chunk1 === chunk2) {
        matchingChunks++;
      }
      totalChunks++;
    }
    
    const similarity = matchingChunks / totalChunks;
    Logger.log(`Screenshot similarity: ${similarity.toFixed(4)}`, 'debug');
    
    // Return true if the similarity is below the threshold (images differ enough)
    return similarity < threshold;
  } catch (error) {
    Logger.log(`Error comparing screenshots: ${error.message}`, 'error');
    // Fall back to exact comparison on error
    return base64String1 !== base64String2;
  }
};

/**
 * Condenses a recording by removing redundant states.
 * A state is considered redundant if both the XML source and screenshot
 * are identical to the next state in the sequence.
 *
 * @param {Array} recording - Array of recording entries
 * @param {Object} options - Conditioning options
 * @param {boolean} options.checkXml - Whether to check for XML changes (default: true)
 * @param {boolean} options.checkScreenshot - Whether to check for screenshot changes (default: true)
 * @param {number} options.screenshotThreshold - Similarity threshold for screenshot comparison (0-1, default: 1.0)
 * @returns {Array} - Condensed recording with redundant states removed
 */
export function condenseRecording(recording, options = {}) {
  // Load default options from CONFIG if available
  const defaultOptions = CONFIG?.CONDENSER || {
    checkXml: true,
    checkScreenshot: true,
    screenshotThreshold: 1.0
  };
  
  // Merge with provided options
  const checkXml = options.checkXml !== undefined ? options.checkXml : defaultOptions.checkXml;
  const checkScreenshot = options.checkScreenshot !== undefined ? options.checkScreenshot : defaultOptions.checkScreenshot;
  const screenshotThreshold = options.screenshotThreshold !== undefined ? options.screenshotThreshold : defaultOptions.screenshotThreshold;
  
  if (!Array.isArray(recording) || recording.length < 2) {
    Logger.log('Recording has less than 2 states, no condensing needed', 'info');
    return recording;
  }
  
  Logger.log(`Starting recording condensing of ${recording.length} states`, 'info');
  Logger.log(`Options: checkXml=${checkXml}, checkScreenshot=${checkScreenshot}, screenshotThreshold=${screenshotThreshold}`, 'info');
  
  // Keep track of detailed stats
  const stats = {
    initialStateCount: recording.length,
    finalStateCount: 0,
    removedStateCount: 0,
    xmlChanges: 0,
    screenshotChanges: 0,
    unchangedStates: 0
  };
  
  // Make a copy to avoid modifying the original
  const recordingCopy = [...recording];
  
  // If we're not checking both XML and screenshots, there's nothing to do
  if (!checkXml && !checkScreenshot) {
    Logger.log('Both checkXml and checkScreenshot are false, returning original recording', 'info');
    return recordingCopy;
  }
  
  // Array for the condensed recording
  const condensedRecording = [];
  let stateToKeep = recordingCopy[0];
  
  // Always include the first state
  condensedRecording.push(stateToKeep);
  
  // Process each state starting from the second one
  for (let i = 1; i < recordingCopy.length; i++) {
    const currentState = recordingCopy[i];
    
    // Check if there's been a change in XML source
    const sourceChanged = checkXml && hasSourceChanged(
      stateToKeep.deviceArtifacts?.pageSource,
      currentState.deviceArtifacts?.pageSource
    );
    
    // Check if there's been a change in screenshot using the threshold
    const screenshotChanged = checkScreenshot && (
      screenshotThreshold >= 1.0 
        ? hasScreenshotChanged(
            stateToKeep.deviceArtifacts?.screenshotBase64,
            currentState.deviceArtifacts?.screenshotBase64
          )
        : hasScreenshotChangedWithThreshold(
            stateToKeep.deviceArtifacts?.screenshotBase64,
            currentState.deviceArtifacts?.screenshotBase64,
            screenshotThreshold
          )
    );
    
    // Update stats
    if (sourceChanged) stats.xmlChanges++;
    if (screenshotChanged) stats.screenshotChanges++;
    if (!sourceChanged && !screenshotChanged) stats.unchangedStates++;
    
    // Debug log
    Logger.log(`State ${i}: Source changed: ${sourceChanged}, Screenshot changed: ${screenshotChanged}`, 'debug');
    
    // If either source or screenshot has changed, this is a new state to keep
    if (sourceChanged || screenshotChanged) {
      condensedRecording.push(currentState);
      stateToKeep = currentState;
      Logger.log(`Adding state ${i} to condensed recording`, 'debug');
    } else {
      Logger.log(`Skipping redundant state ${i}`, 'debug');
    }
  }
  
  // Update stats
  stats.finalStateCount = condensedRecording.length;
  stats.removedStateCount = stats.initialStateCount - stats.finalStateCount;
  
  // Log condensing results
  Logger.log(`Recording condensed: ${stats.initialStateCount} states → ${stats.finalStateCount} states (${stats.removedStateCount} removed)`, 'info');
  Logger.log(`XML changes: ${stats.xmlChanges}, Screenshot changes: ${stats.screenshotChanges}, Unchanged states: ${stats.unchangedStates}`, 'info');
  
  return condensedRecording;
}

/**
 * Main function for CLI usage
 */
async function main() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    // Show usage if no input file provided
    if (args.length === 0) {
      console.log('Recording Condenser');
      console.log('==================');
      console.log('\nUsage:');
      console.log('  node recordingCondenser.js <input-file.json> [output-file.json] [--xml=true|false] [--screenshot=true|false] [--threshold=1.0]');
      console.log('\nOptions:');
      console.log('  --xml=false         Disable XML comparison');
      console.log('  --screenshot=false  Disable screenshot comparison');
      console.log('  --threshold=0.95    Set similarity threshold for screenshot comparison (0.0-1.0)');
      console.log('                      1.0 = exact match (default), 0.9 = 90% similar, etc.');
      console.log('\nExamples:');
      console.log('  node recordingCondenser.js recording.json condensed.json --xml=true --screenshot=true');
      console.log('  node recordingCondenser.js recording.json condensed.json --threshold=0.95');
      process.exit(0);
    }
    
    // Parse input and output file paths
    const inputFilePath = args[0];
    let outputFilePath = args.length > 1 && !args[1].startsWith('--') 
      ? args[1] 
      : null;
    
    // Load options from config and merge with defaults
    const defaultOptions = CONFIG?.CONDENSER || {
      checkXml: true,
      checkScreenshot: true,
      screenshotThreshold: 1.0
    };
    
    // Parse options (starting with config defaults)
    const options = {
      checkXml: defaultOptions.checkXml,
      checkScreenshot: defaultOptions.checkScreenshot,
      screenshotThreshold: defaultOptions.screenshotThreshold
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
      const outputSuffix = defaultOptions.defaultOutputSuffix || "_condensed";
      outputFilePath = path.join(inputDirName, `${nameWithoutExt}${outputSuffix}.json`);
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

// Export for module usage
export default {
  condenseRecording
};