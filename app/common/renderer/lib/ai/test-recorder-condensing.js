#!/usr/bin/env node

/**
 * Test script for ActionRecorder with condensing functionality
 * 
 * This script simulates a recording session with various states to demonstrate
 * how the inline condensing functionality marks redundant states.
 */

import ActionRecorder from './actionRecorder.js';

// Subscribe to recorder events for logging
const unsubscribe = ActionRecorder.subscribe((event) => {
  console.log(`[${new Date(event.timestamp).toISOString()}] Event: ${event.type}`);
  
  if (event.type === 'ENTRY_ADDED') {
    const entry = event.entry;
    console.log(`  > Added entry ${entry.isCondensed ? '(condensed)' : ''} with action: ${entry.action?.type || 'No action'}`);
  }
});

// Start recording
console.log('Starting recording...');
ActionRecorder.startRecording();

// Configure condensing options
ActionRecorder.setCondensingOptions({
  enabled: true,
  checkXml: true,
  checkScreenshot: true,
  screenshotThreshold: 1.0 // Exact match for screenshots
});
console.log('Condensing options:', ActionRecorder.getCondensingOptions());

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

// Simulate a sequence of actions and states
console.log('\nSimulating recording sequence:');

// Initial state
const initialXml = '<root><element id="1">Initial</element></root>';
const initialScreenshot = 'base64screenshot1';
ActionRecorder.recordAction(
  createMockState(initialXml, initialScreenshot),
  createMockAction('Initial', {})
);

// Second state - XML changed, screenshot changed
const secondXml = '<root><element id="1">Changed</element></root>';
const secondScreenshot = 'base64screenshot2';
ActionRecorder.recordAction(
  createMockState(secondXml, secondScreenshot),
  createMockAction('Click', { elementId: '1' })
);

// Third state - No changes (should be condensed)
ActionRecorder.recordAction(
  createMockState(secondXml, secondScreenshot),
  createMockAction('Hover', { elementId: '1' })
);

// Fourth state - Screenshot changed, XML same
ActionRecorder.recordAction(
  createMockState(secondXml, 'base64screenshot3'),
  createMockAction('Scroll', { direction: 'down' })
);

// Fifth state - No changes (should be condensed)
ActionRecorder.recordAction(
  createMockState(secondXml, 'base64screenshot3'),
  createMockAction('Wait', { time: 1000 })
);

// Sixth state - XML changed, screenshot same
const sixthXml = '<root><element id="1">Changed</element><element id="2">New</element></root>';
ActionRecorder.recordAction(
  createMockState(sixthXml, 'base64screenshot3'),
  createMockAction('Type', { elementId: '2', text: 'Hello' })
);

// Stop recording
console.log('\nStopping recording...');
const recording = ActionRecorder.stopRecording();

// Show full recording with condensed states
console.log('\nFull recording with condensed states:');
recording.forEach((entry, index) => {
  console.log(`Entry ${index + 1}${entry.isCondensed ? ' (condensed)' : ''}:`);
  console.log(`  Action: ${entry.action?.type}`);
  console.log(`  XML: ${entry.deviceArtifacts.pageSource?.substring(0, 30)}...`);
  console.log(`  Screenshot: ${entry.deviceArtifacts.screenshotBase64?.substring(0, 10)}...`);
});

// Show filtered recording (without condensed states)
console.log('\nFiltered recording (without condensed states):');
const filteredRecording = ActionRecorder.getFilteredRecording(false);
filteredRecording.forEach((entry, index) => {
  console.log(`Entry ${index + 1}:`);
  console.log(`  Action: ${entry.action?.type}`);
});

// Clean up
unsubscribe();
console.log('\nTest completed.');

// Run this script with: node test-recorder-condensing.js