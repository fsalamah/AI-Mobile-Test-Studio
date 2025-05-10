/**
 * Recording Service
 *
 * This module provides functionality to manage recordings within the project structure.
 * It allows saving, loading, and managing recordings as part of the project data.
 */

import { saveProjectState, loadProjectState } from './projectStateManager';
import ActionRecorder from './actionRecorder';
import { CONFIG } from './config.js';

// Generate a unique ID for recordings
const generateId = () => `rec_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;

/**
 * Save current ActionRecorder recording to the project
 * 
 * @param {Object} options - Options for saving the recording
 * @param {string} options.name - Name of the recording
 * @param {string} options.description - Description of the recording (optional)
 * @param {string} options.module - Module the recording belongs to (optional)
 * @returns {Object} The saved recording object
 */
export const saveRecordingToProject = (options = {}) => {
  try {
    // Get current project state
    const { pages = [], selectedPageId } = loadProjectState();
    
    // Get the current recording data
    const recordingData = ActionRecorder.getRecording();
    
    if (!recordingData || recordingData.length === 0) {
      throw new Error("No recording data available to save");
    }
    
    // Create a recording object
    const recording = {
      id: generateId(),
      name: options.name || `Recording ${new Date().toLocaleString()}`,
      description: options.description || '',
      module: options.module || '',
      timestamp: new Date().toISOString(),
      data: recordingData,
      transitions: [], // Reserved for AI-analyzed transitions
      type: "recording"
    };
    
    // Add the recording to the project pages array
    pages.push(recording);
    
    // Save the updated project state
    saveProjectState(pages, selectedPageId);
    
    return recording;
  } catch (error) {
    console.error("Error saving recording to project:", error);
    throw error;
  }
};

/**
 * Import a recording from an external source (file, clipboard, etc.)
 * 
 * @param {Object} options - Options for importing the recording
 * @param {Array} options.data - The recording data array
 * @param {string} options.name - Name of the recording
 * @param {string} options.description - Description of the recording (optional)
 * @param {string} options.module - Module the recording belongs to (optional) 
 * @returns {Object} The imported recording object
 */
export const importRecordingToProject = (options = {}) => {
  try {
    if (!options.data || !Array.isArray(options.data) || options.data.length === 0) {
      throw new Error("Invalid recording data. Expected non-empty array.");
    }
    
    // Get current project state
    const { pages = [], selectedPageId } = loadProjectState();
    
    // Create a recording object
    const recording = {
      id: generateId(),
      name: options.name || `Imported Recording ${new Date().toLocaleString()}`,
      description: options.description || '',
      module: options.module || '',
      timestamp: new Date().toISOString(),
      data: options.data,
      transitions: [], // Reserved for AI-analyzed transitions
      type: "recording"
    };
    
    // Add the recording to the project pages array
    pages.push(recording);
    
    // Save the updated project state
    saveProjectState(pages, selectedPageId);
    
    return recording;
  } catch (error) {
    console.error("Error importing recording to project:", error);
    throw error;
  }
};

/**
 * Load a recording from the project into the ActionRecorder
 * 
 * @param {string} recordingId - ID of the recording to load
 * @returns {Object} The loaded recording object
 */
export const loadRecordingFromProject = (recordingId) => {
  try {
    // Get current project state
    const { pages = [] } = loadProjectState();
    
    // Find the recording in the project
    const recording = pages.find(page => page.id === recordingId && page.type === "recording");
    
    if (!recording) {
      throw new Error(`Recording with ID ${recordingId} not found in project`);
    }
    
    // Clear existing recording
    ActionRecorder.clearRecording();
    
    // Add each entry from the recording data
    for (const entry of recording.data) {
      ActionRecorder.addEntry(entry);
    }
    
    return recording;
  } catch (error) {
    console.error("Error loading recording from project:", error);
    throw error;
  }
};

/**
 * Delete a recording from the project
 * 
 * @param {string} recordingId - ID of the recording to delete
 * @returns {boolean} True if deletion was successful
 */
export const deleteRecordingFromProject = (recordingId) => {
  try {
    // Get current project state
    const { pages = [], selectedPageId } = loadProjectState();
    
    // Remove the recording from the project
    const updatedPages = pages.filter(page => !(page.id === recordingId && page.type === "recording"));
    
    // Check if the recording was found and removed
    if (pages.length === updatedPages.length) {
      throw new Error(`Recording with ID ${recordingId} not found in project`);
    }
    
    // Save the updated project state
    saveProjectState(updatedPages, selectedPageId);
    
    return true;
  } catch (error) {
    console.error("Error deleting recording from project:", error);
    throw error;
  }
};

/**
 * Get all recordings from the project
 * 
 * @returns {Array} Array of recording objects
 */
export const getRecordingsFromProject = () => {
  try {
    // Get current project state
    const { pages = [] } = loadProjectState();
    
    // Filter out only recording-type entries
    return pages.filter(page => page.type === "recording");
  } catch (error) {
    console.error("Error getting recordings from project:", error);
    return [];
  }
};

/**
 * Check if a recording exists in the project
 * 
 * @param {string} recordingId - ID of the recording to check
 * @returns {boolean} True if the recording exists
 */
export const recordingExistsInProject = (recordingId) => {
  try {
    // Get current project state
    const { pages = [] } = loadProjectState();
    
    // Check if the recording exists
    return pages.some(page => page.id === recordingId && page.type === "recording");
  } catch (error) {
    console.error("Error checking if recording exists in project:", error);
    return false;
  }
};

// Export a default object for convenience
export default {
  saveRecordingToProject,
  importRecordingToProject,
  loadRecordingFromProject,
  deleteRecordingFromProject,
  getRecordingsFromProject,
  recordingExistsInProject,
};