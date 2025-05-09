#!/usr/bin/env node

/**
 * Test script for ActionRecorder's JSON loading functionality (CommonJS version)
 * 
 * This script demonstrates how to load recordings from JSON and use the
 * auto-detection of condensed states.
 */

const ActionRecorder = require('./actionRecorder.cjs');
const fs = require('fs').promises;
const path = require('path');

// Subscribe to recorder events for logging
const unsubscribe = ActionRecorder.subscribe((event) => {
  console.log(`[${new Date(event.timestamp).toISOString()}] Event: ${event.type}`);
  
  if (event.type === 'RECORDING_LOADED') {
    console.log(`  > Loaded recording with ${event.recording.length} entries`);
  }
});

// Create a sample recording manually to save to JSON
console.log('Creating sample recording...');
ActionRecorder.startRecording();

// Helper to create mock inspector state
const createMockState = (xml, screenshot) => ({
  sourceXML: xml,
  screenshot: screenshot,
  currentContext: 'NATIVE_APP',
  flatSessionCaps: {
    platformName: 'Android',
    deviceName: 'Test Device'
  }
});

// Helper to create mock action
const createMockAction = (type, details) => ({
  type,
  details
});

// Add some test entries
ActionRecorder.recordAction(
  createMockState('<root><element id="1">Initial</element></root>', 'base64screenshot1'),
  createMockAction('Initial', {})
);

ActionRecorder.recordAction(
  createMockState('<root><element id="1">Changed</element></root>', 'base64screenshot2'),
  createMockAction('Click', { elementId: '1' })
);

ActionRecorder.recordAction(
  createMockState('<root><element id="1">Changed</element><element id="2">New</element></root>', 'base64screenshot2'),
  createMockAction('Type', { elementId: '2', text: 'Hello' })
);

// Get the recording
const recording = ActionRecorder.getRecording();

// Create directory for test output if it doesn't exist
const testOutputDir = path.join(process.cwd(), 'app', 'common', 'renderer', 'lib', 'ai', 'test-output');

async function runTest() {
  try {
    // Create output directory if needed
    try {
      await fs.mkdir(testOutputDir, { recursive: true });
    } catch (err) {
      // Ignore if directory exists
      if (err.code !== 'EEXIST') throw err;
    }
    
    // Save the recording to a JSON file
    const recordingPath = path.join(testOutputDir, 'sample-recording.json');
    await fs.writeFile(recordingPath, JSON.stringify(recording, null, 2), 'utf8');
    console.log(`Recording saved to: ${recordingPath}`);
    
    // Clear the recording
    ActionRecorder.clearRecording();
    console.log('Recording cleared, current count:', ActionRecorder.getRecording().length);
    
    // Load the recording without detection
    console.log('\nLoading recording without condensed detection:');
    const jsonData = await fs.readFile(recordingPath, 'utf8');
    ActionRecorder.loadRecording(jsonData);
    
    // Display loaded recording
    console.log('Loaded recording:');
    ActionRecorder.getRecording().forEach((entry, index) => {
      console.log(`Entry ${index + 1} (isCondensed: ${entry.isCondensed || false}):`);
      console.log(`  Action: ${entry.action?.type}`);
    });
    
    // Clear the recording again
    ActionRecorder.clearRecording();
    
    // Now load with condensed detection
    console.log('\nLoading recording WITH condensed detection:');
    ActionRecorder.loadRecording(jsonData, {
      detectCondensed: true,
      replace: true
    });
    
    // Display loaded recording with auto-detected condensed states
    console.log('Loaded recording with auto-detected condensed states:');
    ActionRecorder.getRecording().forEach((entry, index) => {
      console.log(`Entry ${index + 1} (isCondensed: ${entry.isCondensed}):`);
      console.log(`  Action: ${entry.action?.type}`);
    });
    
    // Test appending to existing recording
    console.log('\nTesting append functionality:');
    
    // Clear and add one entry
    ActionRecorder.clearRecording();
    ActionRecorder.recordAction(
      createMockState('<root><element id="1">New Initial</element></root>', 'base64screenshot_new'),
      createMockAction('NewInitial', {})
    );
    
    // Now append the loaded recording
    console.log('Appending loaded recording to existing one:');
    ActionRecorder.loadRecording(jsonData, {
      replace: false,
      detectCondensed: true
    });
    
    // Display combined recording
    console.log('Combined recording:');
    ActionRecorder.getRecording().forEach((entry, index) => {
      console.log(`Entry ${index + 1} (isCondensed: ${entry.isCondensed}):`);
      console.log(`  Action: ${entry.action?.type}`);
    });
    
    // Cleanup
    unsubscribe();
    console.log('\nTest completed successfully.');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();

// Run this script with: node test-recorder-loading.cjs