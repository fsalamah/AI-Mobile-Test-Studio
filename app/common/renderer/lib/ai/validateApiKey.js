/**
 * API Key Validation Script
 * 
 * This script helps validate that the API key prioritization is working correctly.
 * It provides a function to check if a valid API key is being used and provides
 * guidance if there are configuration issues.
 */

import { AIService } from './aiService.js';
import { CONFIG } from './config.js';
import { 
  getModelConfigForPipeline, 
  PIPELINE_TYPES,
  updateProviderConfig,
  saveProjectModelAssignments
} from './modelManager.js';
import {Logger} from './logger.js';

// Test project ID
const TEST_PROJECT_ID = 'api_key_validation_project';

/**
 * Validates API key configuration
 * @param {string} [projectId] - Optional project ID to validate
 * @returns {Object} - Validation results
 */
export function validateApiKey(projectId = null) {
  try {
    // Check if default config.js has a valid API key
    const hasValidDefaultKey = CONFIG.API.KEY && CONFIG.API.KEY !== "YOUR_API_KEY";
    
    // Check if POM-specific config has a valid API key
    const hasValidPomKey = CONFIG.POM_MODEL && 
                          CONFIG.POM_MODEL.API && 
                          CONFIG.POM_MODEL.API.KEY && 
                          CONFIG.POM_MODEL.API.KEY !== "YOUR_API_KEY";
    
    // Check if provided project has a valid API key
    let hasValidProjectKey = false;
    if (projectId) {
      const visualConfig = getModelConfigForPipeline(projectId, PIPELINE_TYPES.VISUAL_ANALYSIS);
      hasValidProjectKey = visualConfig && 
                          visualConfig.apiKey && 
                          visualConfig.apiKey !== "YOUR_API_KEY";
    }
    
    // Log validation results
    Logger.log(`API Key Validation:`, "info");
    Logger.log(`- Default Config Key: ${hasValidDefaultKey ? "Valid" : "Invalid/Missing"}`, "info");
    Logger.log(`- POM-specific Key: ${hasValidPomKey ? "Valid" : "Invalid/Missing"}`, "info");
    
    if (projectId) {
      Logger.log(`- Project Key (${projectId}): ${hasValidProjectKey ? "Valid" : "Invalid/Missing"}`, "info");
    }
    
    // Create validation results
    const results = {
      hasValidDefaultKey,
      hasValidPomKey,
      hasValidProjectKey: projectId ? hasValidProjectKey : null,
      allValid: (hasValidDefaultKey || hasValidPomKey || hasValidProjectKey),
      recommendations: []
    };
    
    // Provide recommendations based on validation results
    if (!results.allValid) {
      results.recommendations.push(
        "No valid API key found in any configuration. Please add a valid API key to either:"
      );
      results.recommendations.push("1. Project settings (recommended)");
      results.recommendations.push("2. config.js (as fallback)");
    } else if (!hasValidProjectKey && projectId) {
      results.recommendations.push(
        "Project is using fallback API key from config.js. For better control, consider adding a project-specific API key."
      );
    }
    
    return results;
  } catch (error) {
    Logger.error(`Error validating API key:`, error);
    return {
      error: error.message,
      allValid: false,
      recommendations: ["Error occurred during validation. Check console for details."]
    };
  }
}

/**
 * Attempts to fix API key configuration by adding a valid key to project
 * @param {string} projectId - Project ID to update
 * @param {string} apiKey - API key to add
 * @returns {boolean} - Whether the fix was successful
 */
export function fixProjectApiKey(projectId, apiKey) {
  try {
    if (!projectId || !apiKey) {
      return false;
    }
    
    // Create a test project config with the supplied API key
    const pipelines = Object.values(PIPELINE_TYPES);
    const assignments = {};
    
    // Apply the API key to all pipeline types
    pipelines.forEach(pipelineType => {
      assignments[pipelineType] = {
        providerId: 'openai',
        modelName: 'gpt-4',
        baseUrl: CONFIG.API.BASE_URL,
        apiKey: apiKey
      };
    });
    
    // Save the configuration
    saveProjectModelAssignments(projectId, assignments);
    
    // Validate that it worked
    const validation = validateApiKey(projectId);
    return validation.hasValidProjectKey;
  } catch (error) {
    Logger.error(`Error fixing project API key:`, error);
    return false;
  }
}

/**
 * Helper function to check if an API key is likely valid
 * @param {string} apiKey - API key to check
 * @returns {boolean} - Whether the key is likely valid
 */
export function isLikelyValidApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // OpenAI API keys typically start with "sk-" and are 51 characters long
  if (apiKey.startsWith('sk-') && apiKey.length >= 40) {
    return true;
  }
  
  // Anthropic API keys typically start with "sk-ant-" and are longer
  if (apiKey.startsWith('sk-ant-') && apiKey.length >= 40) {
    return true;
  }
  
  // Gemini API keys are longer alphanumeric strings
  if (apiKey.length >= 30) {
    // Check if it's mostly alphanumeric
    const nonAlphaNumeric = apiKey.replace(/[a-zA-Z0-9]/g, '');
    if (nonAlphaNumeric.length < apiKey.length * 0.1) {
      return true;
    }
  }
  
  // If none of the above patterns match, it's probably not valid
  return false;
}