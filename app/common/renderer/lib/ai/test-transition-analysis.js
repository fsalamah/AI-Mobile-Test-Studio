/**
 * Test script for Transition Analysis Pipeline
 * 
 * This script demonstrates how to use the TransitionAnalysisPipeline
 * with a sample recording.
 */

// Create a simple mock recording with two states
const mockRecording = [
  {
    actionTime: Date.now() - 60000, // 1 minute ago
    action: {
      action: 'click',
      element: { elementId: 'login-button' },
      args: []
    },
    deviceArtifacts: {
      sessionDetails: {
        platformName: 'Android',
        platformVersion: '12',
        deviceName: 'Pixel 4',
        automationName: 'UiAutomator2'
      },
      // In a real recording, these would be base64 strings
      screenshotBase64: null,
      pageSource: '<xml>Login Screen</xml>',
      currentContext: 'NATIVE_APP'
    }
  },
  {
    actionTime: Date.now() - 30000, // 30 seconds ago
    action: {
      action: 'sendKeys',
      element: { elementId: 'username-field' },
      args: ['testuser']
    },
    deviceArtifacts: {
      sessionDetails: {
        platformName: 'Android',
        platformVersion: '12',
        deviceName: 'Pixel 4',
        automationName: 'UiAutomator2'
      },
      screenshotBase64: null,
      pageSource: '<xml>Login Screen with Username</xml>',
      currentContext: 'NATIVE_APP'
    }
  }
];

// Save the mock recording to a file and run analysis
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { TransitionAnalysisPipeline } from './transitionAnalysisPipeline.js';

// Get the directory path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  try {
    // Create output directory if it doesn't exist
    const testOutputDir = path.join(__dirname, 'test-output');
    await fs.mkdir(testOutputDir, { recursive: true });
    
    // Save mock recording
    const recordingPath = path.join(testOutputDir, 'mock-recording.json');
    await fs.writeFile(recordingPath, JSON.stringify(mockRecording, null, 2), 'utf8');
    console.log(`Mock recording saved to: ${recordingPath}`);
    
    // Run the analysis on the mock recording
    console.log('Running transition analysis on mock recording...');
    console.log('');
    console.log('NOTE: This is a mock recording without actual screenshots,');
    console.log('so the AI service may not be able to perform detailed visual analysis.');
    console.log('');
    
    const outputPath = path.join(testOutputDir, 'analysis-result.json');
    
    // Run the analysis directly
    try {
      const results = await TransitionAnalysisPipeline.analyzeTransitions(mockRecording, {
        outputPath: outputPath
      });
      
      console.log(`Analysis completed. Analyzed ${results.length} transitions.`);
      console.log(`Results written to: ${outputPath}`);
    } catch (analysisError) {
      console.error('Analysis error:', analysisError);
    }
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run the test
runTest();