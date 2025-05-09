#!/usr/bin/env node

/**
 * Test script for the recording condenser
 * 
 * This script creates a sample recording with redundant states
 * and demonstrates the condenser's functionality.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { condenseRecording } from './recordingCondenser.js';

// Create a directory for test outputs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testOutputDir = path.join(__dirname, 'test-output');

// Create a sample recording with some redundant states
async function createSampleRecording() {
  // Sample XML and screenshots - in reality these would be different
  const sampleXml1 = '<xml>First Page</xml>';
  const sampleXml2 = '<xml>First Page with Changes</xml>';
  const sampleXml3 = '<xml>Second Page</xml>';
  
  // Base64 "screenshots" - just placeholders
  const sampleScreenshot1 = 'AAAA'; // Placeholder for a screenshot
  const sampleScreenshot2 = 'BBBB'; // Different placeholder
  const sampleScreenshot3 = 'CCCC'; // Different placeholder
  
  // Create a recording with redundant states
  const recording = [
    // State 1 - Initial state
    {
      actionTime: Date.now() - 60000,
      action: { action: 'tap', element: { elementId: 'btn1' }, args: [] },
      deviceArtifacts: {
        sessionDetails: { platformName: 'Android', platformVersion: '12' },
        screenshotBase64: sampleScreenshot1, 
        pageSource: sampleXml1
      }
    },
    // State 2 - Redundant (same as 1)
    {
      actionTime: Date.now() - 55000,
      action: { action: 'tap', element: { elementId: 'btn2' }, args: [] },
      deviceArtifacts: {
        sessionDetails: { platformName: 'Android', platformVersion: '12' },
        screenshotBase64: sampleScreenshot1, 
        pageSource: sampleXml1
      }
    },
    // State 3 - Different XML but same screenshot
    {
      actionTime: Date.now() - 50000,
      action: { action: 'input', element: { elementId: 'field1' }, args: ['test'] },
      deviceArtifacts: {
        sessionDetails: { platformName: 'Android', platformVersion: '12' },
        screenshotBase64: sampleScreenshot1, 
        pageSource: sampleXml2
      }
    },
    // State 4 - Redundant (same as 3)
    {
      actionTime: Date.now() - 45000,
      action: { action: 'tap', element: { elementId: 'btn3' }, args: [] },
      deviceArtifacts: {
        sessionDetails: { platformName: 'Android', platformVersion: '12' },
        screenshotBase64: sampleScreenshot1, 
        pageSource: sampleXml2
      }
    },
    // State 5 - Different screenshot but same XML
    {
      actionTime: Date.now() - 40000,
      action: { action: 'tap', element: { elementId: 'btn4' }, args: [] },
      deviceArtifacts: {
        sessionDetails: { platformName: 'Android', platformVersion: '12' },
        screenshotBase64: sampleScreenshot2, 
        pageSource: sampleXml2
      }
    },
    // State 6 - Redundant (same as 5)
    {
      actionTime: Date.now() - 35000,
      action: { action: 'tap', element: { elementId: 'btn5' }, args: [] },
      deviceArtifacts: {
        sessionDetails: { platformName: 'Android', platformVersion: '12' },
        screenshotBase64: sampleScreenshot2, 
        pageSource: sampleXml2
      }
    },
    // State 7 - Both XML and screenshot changed
    {
      actionTime: Date.now() - 30000,
      action: { action: 'tap', element: { elementId: 'btn6' }, args: [] },
      deviceArtifacts: {
        sessionDetails: { platformName: 'Android', platformVersion: '12' },
        screenshotBase64: sampleScreenshot3, 
        pageSource: sampleXml3
      }
    },
    // State 8 - Redundant (same as 7)
    {
      actionTime: Date.now() - 25000,
      action: { action: 'tap', element: { elementId: 'btn7' }, args: [] },
      deviceArtifacts: {
        sessionDetails: { platformName: 'Android', platformVersion: '12' },
        screenshotBase64: sampleScreenshot3, 
        pageSource: sampleXml3
      }
    }
  ];
  
  return recording;
}

async function main() {
  try {
    // Create output directory if it doesn't exist
    await fs.mkdir(testOutputDir, { recursive: true });
    
    console.log("Creating sample recording...");
    const recording = await createSampleRecording();
    
    // Save the original recording
    const originalRecordingPath = path.join(testOutputDir, 'sample_recording.json');
    await fs.writeFile(originalRecordingPath, JSON.stringify(recording, null, 2), 'utf8');
    console.log(`Original recording (${recording.length} states) saved to: ${originalRecordingPath}`);
    
    // Test condenser with different option combinations
    
    // 1. Default options (check both XML and screenshot)
    console.log("\n1. Condensing with default options (check both XML and screenshot):");
    const condensed1 = condenseRecording(recording);
    const condensed1Path = path.join(testOutputDir, 'condensed_default.json');
    await fs.writeFile(condensed1Path, JSON.stringify(condensed1, null, 2), 'utf8');
    console.log(`Condensed recording (${condensed1.length} states) saved to: ${condensed1Path}`);
    
    // 2. Check XML only
    console.log("\n2. Condensing with XML check only:");
    const condensed2 = condenseRecording(recording, { checkXml: true, checkScreenshot: false });
    const condensed2Path = path.join(testOutputDir, 'condensed_xml_only.json');
    await fs.writeFile(condensed2Path, JSON.stringify(condensed2, null, 2), 'utf8');
    console.log(`Condensed recording (${condensed2.length} states) saved to: ${condensed2Path}`);
    
    // 3. Check screenshot only
    console.log("\n3. Condensing with screenshot check only:");
    const condensed3 = condenseRecording(recording, { checkXml: false, checkScreenshot: true });
    const condensed3Path = path.join(testOutputDir, 'condensed_screenshot_only.json');
    await fs.writeFile(condensed3Path, JSON.stringify(condensed3, null, 2), 'utf8');
    console.log(`Condensed recording (${condensed3.length} states) saved to: ${condensed3Path}`);
    
    console.log("\nTest completed successfully. Results are in the test-output directory.");
    console.log("\nNow try running the condenser on these files directly:");
    console.log(`node condense-recording.js ${originalRecordingPath}`);
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

main();