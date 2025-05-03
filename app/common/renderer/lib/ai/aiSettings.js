/**
 * AI Module Settings Utilities
 * 
 * This file handles persistent storage of AI module settings using localStorage
 * to avoid modifying core Inspector files.
 */

// Settings keys
export const AI_SETTINGS_KEYS = {
  LAST_PAGES_FILE_PATH: 'ai_last_pages_file_path',
  LAST_PAGES_FILE_NAME: 'ai_last_pages_file_name'
};

/**
 * Save a setting to localStorage
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 */
export const saveAISetting = (key, value) => {
  try {
    const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
    localStorage.setItem(key, serializedValue);
  } catch (err) {
    console.error(`Error saving AI setting ${key}:`, err);
  }
};

/**
 * Get a setting from localStorage
 * @param {string} key - Setting key
 * @param {any} defaultValue - Default value if setting not found
 * @returns {any} - Setting value
 */
export const getAISetting = (key, defaultValue = null) => {
  try {
    const value = localStorage.getItem(key);
    if (value === null) {
      return defaultValue;
    }
    
    // Try to parse as JSON, if fails return the raw value
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (err) {
    console.error(`Error getting AI setting ${key}:`, err);
    return defaultValue;
  }
};

/**
 * Remove a setting from localStorage
 * @param {string} key - Setting key
 */
export const removeAISetting = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error(`Error removing AI setting ${key}:`, err);
  }
};

/**
 * Clear all AI module settings
 */
export const clearAISettings = () => {
  try {
    Object.values(AI_SETTINGS_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (err) {
    console.error('Error clearing AI settings:', err);
  }
};