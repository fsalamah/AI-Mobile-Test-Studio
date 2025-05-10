// actionRecorder.js
/**
 * Action Recorder Service
 * 
 * This module provides functionality to record user actions and device states
 * during Appium Inspector sessions. It includes built-in condensing capabilities
 * to mark redundant states that show no significant changes.
 * 
 * Key features:
 * - Recording of actions with timestamps
 * - Capturing device artifacts (screenshot, page source, context)
 * - Real-time condensing to mark redundant states with isCondensed=true
 * - Configurable condensing options (XML check, screenshot check, threshold)
 * - Event subscription system for all recorder events
 * 
 * Usage:
 * 1. Start recording: ActionRecorder.startRecording()
 * 2. Record actions: ActionRecorder.recordAction(inspectorState, actionData)
 * 3. Configure condensing: ActionRecorder.setCondensingOptions({ ... })
 * 4. Get filtered recording: ActionRecorder.getFilteredRecording(includeCondensed)
 * 5. Stop recording: ActionRecorder.stopRecording()
 */
import _ from 'lodash';

// Import condensing functionality
// We'll use the inline version rather than importing from recordingCondenser.js
// to avoid module compatibility issues

// Import config
import { CONFIG } from './config.js';

// Initialize the recording array
let detailedRecording = [];
let isRecording = false;
let subscribers = [];

// Initialize condensing options from CONFIG with fallbacks
let condensingOptions = {
  enabled: CONFIG?.CONDENSER?.enabled !== undefined ? CONFIG.CONDENSER.enabled : true,
  checkXml: CONFIG?.CONDENSER?.checkXml !== undefined ? CONFIG.CONDENSER.checkXml : true,
  checkScreenshot: CONFIG?.CONDENSER?.checkScreenshot !== undefined ? CONFIG.CONDENSER.checkScreenshot : true,
  screenshotThreshold: CONFIG?.CONDENSER?.screenshotThreshold !== undefined ? CONFIG.CONDENSER.screenshotThreshold : 1.0
};

// Helpers to check if source or screenshot has changed
const hasSourceChanged = (oldSource, newSource) => {
  if (!oldSource && newSource) return true;
  if (!newSource) return false;
  if (!oldSource) return false;
  return oldSource !== newSource;
};

const hasScreenshotChanged = (oldScreenshot, newScreenshot) => {
  if (!oldScreenshot && newScreenshot) return true;
  if (!newScreenshot) return false;
  if (!oldScreenshot) return false;
  return oldScreenshot !== newScreenshot;
};

// Helper for screenshot similarity comparison with threshold
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
    console.log(`Screenshot similarity: ${similarity.toFixed(4)}`);
    
    // Return true if the similarity is below the threshold (images differ enough)
    return similarity < threshold;
  } catch (error) {
    console.error(`Error comparing screenshots: ${error.message}`);
    // Fall back to exact comparison on error
    return base64String1 !== base64String2;
  }
};

// Check if a state should be condensed (marked as redundant)
const shouldBeCondensed = (previousState, currentState, options = null) => {
  // Use provided options or fall back to global condensingOptions
  const config = options || condensingOptions;
  
  // Quick checks
  if (!config.enabled) {
    console.log("Condensing disabled in config");
    return false;
  }
  if (!previousState) {
    console.log("No previous state to compare");
    return false;
  }
  
  // Check if source has changed
  let sourceChanged = false;
  if (config.checkXml) {
    sourceChanged = hasSourceChanged(
      previousState.deviceArtifacts?.pageSource,
      currentState.deviceArtifacts?.pageSource
    );
    if (sourceChanged) {
      console.log("Source XML has changed");
    }
  } else {
    console.log("XML check disabled in config");
  }
  
  // Check if screenshot has changed using threshold if needed
  let screenshotChanged = false;
  if (config.checkScreenshot) {
    if (config.screenshotThreshold >= 1.0) {
      screenshotChanged = hasScreenshotChanged(
        previousState.deviceArtifacts?.screenshotBase64,
        currentState.deviceArtifacts?.screenshotBase64
      );
    } else {
      screenshotChanged = hasScreenshotChangedWithThreshold(
        previousState.deviceArtifacts?.screenshotBase64,
        currentState.deviceArtifacts?.screenshotBase64,
        config.screenshotThreshold
      );
    }
    if (screenshotChanged) {
      console.log("Screenshot has changed (threshold: " + config.screenshotThreshold + ")");
    }
  } else {
    console.log("Screenshot check disabled in config");
  }
  
  // If both source and screenshot are unchanged, this state should be condensed
  const shouldCondense = !sourceChanged && !screenshotChanged;
  console.log(`Condensing decision: ${shouldCondense} (sourceChanged=${sourceChanged}, screenshotChanged=${screenshotChanged})`);
  return shouldCondense;
};

// Main recorder service
const ActionRecorder = {
  /**
   * Start a new recording session
   */
  startRecording: () => {
    detailedRecording = [];
    isRecording = true;
    
    // Notify subscribers
    subscribers.forEach(callback => callback({
      type: 'RECORDING_STARTED',
      timestamp: Date.now(),
      recording: detailedRecording
    }));
    
    return detailedRecording;
  },
  
  /**
   * Stop the current recording session
   */
  stopRecording: () => {
    isRecording = false;
    
    // Notify subscribers
    subscribers.forEach(callback => callback({
      type: 'RECORDING_STOPPED',
      timestamp: Date.now(),
      recording: detailedRecording
    }));
    
    return detailedRecording;
  },
  
  /**
   * Clear the current recording
   */
  clearRecording: () => {
    detailedRecording = [];
    
    // Notify subscribers
    subscribers.forEach(callback => callback({
      type: 'RECORDING_CLEARED',
      timestamp: Date.now(),
      recording: detailedRecording
    }));
    
    return detailedRecording;
  },
  
  /**
   * Add a new entry to the recording
   * @param {Object} inspectorState - Current state of the inspector
   * @param {Object} actionData - Data about the action being performed
   */
  recordAction: (inspectorState, actionData = null) => {
    if (!isRecording) return null;
    
    // Get the last recording entry if it exists
    const lastEntry = detailedRecording.length > 0 
      ? detailedRecording[detailedRecording.length - 1] 
      : null;
      
    // Only record if there's an explicit action or a change in source or screenshot
    const hasAction = actionData !== null;
    const sourceChanged = hasSourceChanged(
      lastEntry?.deviceArtifacts.pageSource,
      inspectorState?.sourceXML
    );
    const screenshotChanged = hasScreenshotChanged(
      lastEntry?.deviceArtifacts.screenshotBase64,
      inspectorState?.screenshot
    );
    
    // If there's nothing to record, return
    if (!hasAction && !sourceChanged && !screenshotChanged) {
      return null;
    }
    
    // Get session details to capture
    let sessionDetails = {};
    try {
      sessionDetails = inspectorState?.flatSessionCaps || {};
      
      // Include basic device info if available
      if (inspectorState?.driver?.client?.capabilities) {
        const caps = inspectorState.driver.client.capabilities;
        const deviceInfo = {
          platformName: caps.platformName,
          platformVersion: caps.platformVersion,
          deviceName: caps.deviceName,
          automationName: caps.automationName
        };
        sessionDetails = { ...sessionDetails, ...deviceInfo };
      }
    } catch (err) {
      console.warn('Could not get complete session details', err);
    }
    
    // Create the new recording entry
    const newEntry = {
      actionTime: Date.now(),
      action: actionData || (lastEntry ? lastEntry.action : null),
      deviceArtifacts: {
        sessionDetails,
        screenshotBase64: inspectorState?.screenshot || null,
        pageSource: inspectorState?.sourceXML || null,
        currentContext: inspectorState?.currentContext || null
      }
    };
    
    // Check if this state should be condensed based on similarity to the previous state
    if (lastEntry) {
      // Prepare a temporary object with device artifacts to check for condensing
      const currentState = {
        deviceArtifacts: {
          pageSource: inspectorState?.sourceXML || null,
          screenshotBase64: inspectorState?.screenshot || null,
        }
      };
      
      // Determine if this entry should be marked as condensed
      const shouldCondense = shouldBeCondensed(lastEntry, currentState);
      
      // Add the isCondensed flag to the entry
      newEntry.isCondensed = shouldCondense;
      
      if (shouldCondense) {
        console.log('Adding condensed state - no significant changes detected');
      }
    } else {
      // First entry is never condensed
      newEntry.isCondensed = false;
    }
    
    // Add the new entry
    detailedRecording.push(newEntry);
    
    // Notify subscribers
    subscribers.forEach(callback => callback({
      type: 'ENTRY_ADDED',
      timestamp: Date.now(),
      entry: newEntry,
      recording: detailedRecording
    }));
    
    return newEntry;
  },
  
  /**
   * Get the current recording
   */
  getRecording: () => {
    return detailedRecording;
  },
  
  /**
   * Check if recording is active
   */
  isRecording: () => {
    return isRecording;
  },
  
  /**
   * Subscribe to recording events
   * @param {Function} callback - Function to call when recording changes
   */
  subscribe: (callback) => {
    if (typeof callback === 'function' && !subscribers.includes(callback)) {
      subscribers.push(callback);
    }
    return () => ActionRecorder.unsubscribe(callback);
  },
  
  /**
   * Unsubscribe from recording events
   * @param {Function} callback - Function to remove from subscribers
   */
  unsubscribe: (callback) => {
    subscribers = subscribers.filter(sub => sub !== callback);
  },
  
  /**
   * Get the current condensing options
   */
  getCondensingOptions: () => {
    return { ...condensingOptions };
  },
  
  /**
   * Set condensing options
   * @param {Object} options - Condensing options
   * @param {boolean} options.enabled - Enable/disable inline condensing
   * @param {boolean} options.checkXml - Check XML source for changes
   * @param {boolean} options.checkScreenshot - Check screenshots for changes
   * @param {number} options.screenshotThreshold - Similarity threshold (0-1, default: 1.0)
   */
  setCondensingOptions: (options = {}) => {
    // Update only provided options
    if (typeof options.enabled === 'boolean') {
      condensingOptions.enabled = options.enabled;
    }
    
    if (typeof options.checkXml === 'boolean') {
      condensingOptions.checkXml = options.checkXml;
    }
    
    if (typeof options.checkScreenshot === 'boolean') {
      condensingOptions.checkScreenshot = options.checkScreenshot;
    }
    
    if (typeof options.screenshotThreshold === 'number' && 
        options.screenshotThreshold >= 0 && 
        options.screenshotThreshold <= 1) {
      condensingOptions.screenshotThreshold = options.screenshotThreshold;
    }
    
    // Notify subscribers
    subscribers.forEach(callback => callback({
      type: 'CONDENSING_OPTIONS_UPDATED',
      timestamp: Date.now(),
      options: { ...condensingOptions }
    }));
    
    return { ...condensingOptions };
  },
  
  /**
   * Get a filtered recording with condensed states either included or excluded
   * @param {boolean} includeCondensed - Whether to include condensed states
   */
  getFilteredRecording: (includeCondensed = true) => {
    if (includeCondensed) {
      return detailedRecording;
    } else {
      return detailedRecording.filter(entry => !entry.isCondensed);
    }
  },
  
  /**
   * Check if all entries in the recording have isCondensed flag
   * @returns {boolean} - Whether all entries have isCondensed flag
   */
  allEntriesHaveCondensedFlag: () => {
    if (detailedRecording.length === 0) return true;
    
    for (let i = 0; i < detailedRecording.length; i++) {
      if (detailedRecording[i].isCondensed === undefined) {
        return false;
      }
    }
    
    return true;
  },
  
  /**
   * Add a single entry to the recording
   * @param {Object} entry - The entry to add to the recording
   * @returns {Array} - The updated recording
   */
  addEntry: (entry) => {
    if (!entry) {
      console.warn('Attempted to add an empty entry to recording');
      return detailedRecording;
    }

    // Add the entry to the recording
    detailedRecording.push(entry);

    // Notify subscribers
    subscribers.forEach(callback => callback({
      type: 'ENTRY_ADDED',
      timestamp: Date.now(),
      entry: entry,
      recording: detailedRecording
    }));

    return detailedRecording;
  },

  /**
   * Load a recording from JSON data
   * @param {Object|string} jsonData - Recording data as JSON object or string
   * @param {Object} options - Options for loading
   * @param {boolean} options.replace - Whether to replace current recording (default: true)
   * @param {boolean} options.detectCondensed - Whether to detect condensed states if not present (default: false)
   * @returns {Array} - The loaded recording
   */
  loadRecording: (jsonData, options = {}) => {
    // Default options from CONFIG.CONDENSER
    const defaultDetectCondensed = CONFIG?.CONDENSER?.enabled || false;

    // Merge with provided options
    const replace = options.replace !== false; // Default to true
    const detectCondensed = options.detectCondensed !== undefined ? options.detectCondensed : defaultDetectCondensed;

    // Parse JSON if string
    let parsedData;
    try {
      if (typeof jsonData === 'string') {
        parsedData = JSON.parse(jsonData);
      } else {
        parsedData = jsonData;
      }

      // Validate recording structure
      if (!Array.isArray(parsedData)) {
        throw new Error('Recording data must be an array');
      }

      // Check if each entry has required fields
      parsedData.forEach((entry, index) => {
        if (!entry.actionTime || !entry.deviceArtifacts) {
          console.warn(`Entry at index ${index} is missing required fields. This may cause issues.`);
        }
      });

      // Mark condensed states if needed
      if (detectCondensed) {
        for (let i = 1; i < parsedData.length; i++) {
          const previousEntry = parsedData[i - 1];
          const currentEntry = parsedData[i];

          // Skip if already marked
          if (currentEntry.isCondensed !== undefined) {
            continue;
          }

          // Prepare states for condensing check
          const previousState = {
            deviceArtifacts: {
              pageSource: previousEntry.deviceArtifacts?.pageSource,
              screenshotBase64: previousEntry.deviceArtifacts?.screenshotBase64
            }
          };

          const currentState = {
            deviceArtifacts: {
              pageSource: currentEntry.deviceArtifacts?.pageSource,
              screenshotBase64: currentEntry.deviceArtifacts?.screenshotBase64
            }
          };

          // Create options from CONFIG.CONDENSER
          const condenserOptions = {
            enabled: CONFIG?.CONDENSER?.enabled !== undefined ? CONFIG.CONDENSER.enabled : true,
            checkXml: CONFIG?.CONDENSER?.checkXml !== undefined ? CONFIG.CONDENSER.checkXml : true,
            checkScreenshot: CONFIG?.CONDENSER?.checkScreenshot !== undefined ? CONFIG.CONDENSER.checkScreenshot : true,
            screenshotThreshold: CONFIG?.CONDENSER?.screenshotThreshold !== undefined ? CONFIG.CONDENSER.screenshotThreshold : 1.0
          };

          // Determine if this entry should be marked as condensed
          const shouldCondense = shouldBeCondensed(previousState, currentState, condenserOptions);
          currentEntry.isCondensed = shouldCondense;

          if (shouldCondense) {
            console.log(`Marked entry ${i} as condensed based on config (checkXml=${condenserOptions.checkXml}, checkScreenshot=${condenserOptions.checkScreenshot}, threshold=${condenserOptions.screenshotThreshold})`);
          }
        }
      }

      // Replace or merge with current recording
      if (replace) {
        detailedRecording = parsedData;
      } else {
        detailedRecording = [...detailedRecording, ...parsedData];
      }

      // Notify subscribers
      subscribers.forEach(callback => callback({
        type: 'RECORDING_LOADED',
        timestamp: Date.now(),
        recording: detailedRecording
      }));

      return detailedRecording;
    } catch (error) {
      console.error('Error loading recording:', error);
      throw error;
    }
  }
};

export default ActionRecorder;