/**
 * ModelConfigProvider
 * 
 * Centralized module to provide model configurations to AI pipelines.
 * This module manages the loading of model configurations based on project ID
 * and pipeline type, with appropriate fallbacks to config.js.
 * 
 * The goal is to segregate UI concerns from the AI backend library, ensuring
 * that pipelines don't need to know about project contexts.
 */

import { CONFIG } from './config.js';
import { 
  getModelConfigForPipeline, 
  loadGlobalModelConfigs,
  PIPELINE_TYPES 
} from './modelManager.js';

// Import PIPELINE_TYPES but don't re-export it
// Use from modelManager.js directly
import { Logger } from './logger.js';

// Track the current project context
let currentProjectId = null;

/**
 * Initialize or update the current project context
 * @param {string|null} projectId - The project ID to use
 */
export function setProjectContext(projectId) {
  if (projectId !== currentProjectId) {
    Logger.log(`Setting model config context to project: ${projectId || 'default'}`, "info");
    currentProjectId = projectId;
  }
}

/**
 * Get the current project context
 * @returns {string|null} - The current project ID
 */
export function getProjectContext() {
  return currentProjectId;
}

/**
 * Clear the current project context
 */
export function clearProjectContext() {
  Logger.log("Clearing model config project context", "info");
  currentProjectId = null;
}

/**
 * Get model configuration for a specific pipeline type
 * This function will use the current project context if available,
 * or fall back to global/default configuration
 * 
 * @param {string} pipelineType - The pipeline type (use PIPELINE_TYPES constants)
 * @returns {Object} - The model configuration for this pipeline
 */
export function getModelConfig(pipelineType) {
  // Get model configuration using project context if available
  const config = getModelConfigForPipeline(currentProjectId, pipelineType);
  
  // For debugging
  Logger.log(`[MODEL CONFIG] Getting model config for ${pipelineType}`, "debug");
  Logger.log(`[MODEL CONFIG] Project context: ${currentProjectId || 'none'}`, "debug");
  Logger.log(`[MODEL CONFIG] Using model: ${config.modelName}`, "debug");
  
  return config;
}

/**
 * Get the appropriate model name for a pipeline
 * This is a convenience function for getting just the model name
 * 
 * @param {string} pipelineType - The pipeline type (use PIPELINE_TYPES constants)
 * @param {string|null} explicitModel - Optional explicit model override
 * @returns {string} - The model name to use
 */
export function getModelForPipeline(pipelineType, explicitModel = null) {
  // Explicit model takes precedence if provided
  if (explicitModel) {
    return explicitModel;
  }
  
  // Otherwise get from configuration
  const config = getModelConfig(pipelineType);
  return config.modelName || CONFIG.MODEL;
}

/**
 * Get API configuration for a pipeline
 * Returns the API key and base URL to use for a pipeline
 * 
 * @param {string} pipelineType - The pipeline type (use PIPELINE_TYPES constants)
 * @returns {Object} - {apiKey, baseUrl} for the pipeline
 */
export function getApiConfigForPipeline(pipelineType) {
  const config = getModelConfig(pipelineType);
  
  // Check if we have a valid API key
  const apiKey = (config.apiKey && config.apiKey !== "YOUR_API_KEY") 
    ? config.apiKey 
    : (CONFIG.API.KEY !== "YOUR_API_KEY" ? CONFIG.API.KEY : null);
    
  // Get base URL with fallback to config.js
  const baseUrl = config.baseUrl || CONFIG.API.BASE_URL;
  
  return { apiKey, baseUrl };
}

/**
 * Special function for POM generation, which has its own config
 * This function is deprecated - use getApiConfigForPipeline(PIPELINE_TYPES.POM_GENERATION) instead
 * @returns {Object} - {apiKey, baseUrl, modelName} for POM generation
 */
export function getPomGenerationConfig() {
  // First check if we have project-specific settings
  const pipelineConfig = getModelConfig(PIPELINE_TYPES.POM_GENERATION);
  
  // Start with the pipeline config
  const result = {
    apiKey: pipelineConfig.apiKey,
    baseUrl: pipelineConfig.baseUrl,
    modelName: pipelineConfig.modelName
  };
  
  // For backward compatibility, we'll still check the special POM config
  // but this is deprecated and will be removed in a future version
  
  // NOTE: This code is being kept for backward compatibility
  // but the preferred approach is to use the model configuration system
  
  // If API key is missing or invalid, try special POM config from config.js
  if (!result.apiKey || result.apiKey === "YOUR_API_KEY") {
    if (CONFIG.POM_MODEL && CONFIG.POM_MODEL.API && CONFIG.POM_MODEL.API.KEY && 
        CONFIG.POM_MODEL.API.KEY !== "YOUR_API_KEY") {
      result.apiKey = CONFIG.POM_MODEL.API.KEY;
    } else {
      result.apiKey = CONFIG.API.KEY !== "YOUR_API_KEY" ? CONFIG.API.KEY : null;
    }
  }
  
  // If base URL is missing, try special POM config, then default
  if (!result.baseUrl) {
    if (CONFIG.POM_MODEL && CONFIG.POM_MODEL.API && CONFIG.POM_MODEL.API.BASE_URL) {
      result.baseUrl = CONFIG.POM_MODEL.API.BASE_URL;
    } else {
      result.baseUrl = CONFIG.API.BASE_URL;
    }
  }
  
  // If model name is missing, try special POM model, then default
  if (!result.modelName) {
    if (CONFIG.POM_MODEL && CONFIG.POM_MODEL.MODEL) {
      result.modelName = CONFIG.POM_MODEL.MODEL;
    } else {
      result.modelName = CONFIG.MODEL;
    }
  }
  
  return result;
}

// Initialize by loading the global configurations once
loadGlobalModelConfigs();

export default {
  setProjectContext,
  getProjectContext,
  clearProjectContext,
  getModelConfig,
  getModelForPipeline,
  getApiConfigForPipeline,
  getPomGenerationConfig
};