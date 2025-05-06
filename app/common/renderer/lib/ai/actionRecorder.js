// actionRecorder.js
import _ from 'lodash';

// Initialize the recording array
let detailedRecording = [];
let isRecording = false;
let subscribers = [];

// Helpers to check if source or screenshot has changed
const hasSourceChanged = (oldSource, newSource) => {
  if (!oldSource && newSource) return true;
  if (!newSource) return false;
  return oldSource !== newSource;
};

const hasScreenshotChanged = (oldScreenshot, newScreenshot) => {
  if (!oldScreenshot && newScreenshot) return true;
  if (!newScreenshot) return false;
  return oldScreenshot !== newScreenshot;
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
  }
};

export default ActionRecorder;