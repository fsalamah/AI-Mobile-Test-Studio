//File: aiService.js
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { CONFIG } from './config.js';
import { createOsSpecifVisualElementSchema, createXpathLocatorSchema } from './schemas.js';
import { Logger } from './logger.js';
import { createXpathRepairSchema } from "./xpathFixSchema.js";
import modelConfigProvider from './modelConfigProvider.js';
import { PIPELINE_TYPES } from './modelManager.js';

// Define the transition analysis pipeline type if not already defined
if (!PIPELINE_TYPES.TRANSITION_ANALYSIS) {
  PIPELINE_TYPES.TRANSITION_ANALYSIS = 'transition_analysis';
}

export class AIService {
  constructor() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Consider making this configurable
    
    // Initialize with default config
    this.initClient();
  }
  
  /**
   * Update the service with a new project ID
   * @param {string} projectId - The project ID to use for model configuration
   */
  updateProjectContext(projectId) {
    // Update the global project context via the provider
    modelConfigProvider.setProjectContext(projectId);
    Logger.log(`AI service using updated project context: ${projectId}`, "info");
  }
  
  /**
   * Initialize OpenAI client with the appropriate configuration
   * This will use the current project context set in modelConfigProvider
   * @returns {OpenAI} - The initialized OpenAI client
   */
  initClient() {
    // Get config for visual analysis pipeline (used as default)
    const visualConfig = modelConfigProvider.getApiConfigForPipeline(PIPELINE_TYPES.VISUAL_ANALYSIS);
    
    // Extract API key and base URL
    const apiKey = visualConfig.apiKey;
    const baseURL = visualConfig.baseUrl;
    
    // Get default model
    const modelName = modelConfigProvider.getModelForPipeline(PIPELINE_TYPES.VISUAL_ANALYSIS);
    
    // Check if we have a valid API key
    if (!apiKey || apiKey === "YOUR_API_KEY") {
      // Only log a warning during initialization - we'll throw an error during actual API calls
      Logger.log("WARNING: No valid API key found. Please configure a valid API key in project settings or config.js", "warn");
    }
    
    // Create the client with the appropriate configuration
    this.client = new OpenAI({
      apiKey: apiKey || "MISSING_API_KEY", // Temporary placeholder to initialize client
      baseURL: baseURL,
      dangerouslyAllowBrowser: true
    });
    
    // Store the current active model name
    this.currentModel = modelName;
    
    return this.client;
  }
  
  /**
   * Get the current model to use
   * @param {string} specificModel - Optional model to override the default
   * @returns {string} - The model name to use
   */
  getModelToUse(specificModel = null) {
    return specificModel || this.currentModel || CONFIG.MODEL;
  }

  /**
   * Analyze visual elements from screen to identify elements and their properties
   * @param {string} model - Specific model to use (optional)
   * @param {Object} prompt - The formatted prompt
   * @param {Array} possibleStateIds - Possible state IDs for validation
   * @param {number} n - Number of completions
   * @param {number} temperature - Randomness parameter
   * @returns {Promise<Object>} - Model response
   */
  async analyzeVisualElements(model, prompt, possibleStateIds, n = 3, temperature = 0) {
    try {
      // Start comprehensive logging
      Logger.log(`========== ANALYZE VISUAL ELEMENTS ==========`, "info");
      
      // Get the current project context
      const projectId = modelConfigProvider.getProjectContext();
      Logger.log(`Project ID: ${projectId || 'not set'}`, "info");
      Logger.log(`Input model param: ${model || 'not provided'}`, "info");
      Logger.log(`Current model: ${this.currentModel || 'not set'}`, "info");
      Logger.log(`Default CONFIG.MODEL: ${CONFIG.MODEL}`, "info");
      
      // Get model configuration for this pipeline
      const pipelineConfig = modelConfigProvider.getApiConfigForPipeline(PIPELINE_TYPES.VISUAL_ANALYSIS);
      let apiKey = pipelineConfig.apiKey;
      let baseURL = pipelineConfig.baseUrl;
      
      // Get model name, with explicit model taking precedence
      let modelName = model || modelConfigProvider.getModelForPipeline(PIPELINE_TYPES.VISUAL_ANALYSIS);
      
      Logger.log(`Retrieved config values:`, "info");
      Logger.log(`- API Key: ${apiKey ? 'Valid' : 'None/Invalid'}`, "info");
      Logger.log(`- Base URL: ${baseURL}`, "info");
      Logger.log(`- Model Name: ${modelName}`, "info");
      
      // Throw an error if no valid API key is found
      if (!apiKey || apiKey === "YOUR_API_KEY") {
        Logger.log(`ERROR: No valid API key found`, "error");
        throw new Error("No valid API key found. Please configure a valid API key in project settings or config.js");
      }
      
      // Check OpenAI client state before modification
      Logger.log(`OpenAI client current state:`, "info");
      Logger.log(`- API Key: ${this.client.apiKey ? (this.client.apiKey !== "MISSING_API_KEY" ? 'Set' : 'Missing') : 'None'}`, "info");
      Logger.log(`- Base URL: ${this.client.baseURL}`, "info");
      
      // Temporarily update client if needed
      let originalBaseURL = null;
      let originalApiKey = null;
      
      if (baseURL !== this.client.baseURL) {
        originalBaseURL = this.client.baseURL;
        this.client.baseURL = baseURL;
        Logger.log(`Updated client baseURL to: ${baseURL}`, "info");
      }
      
      if (apiKey !== this.client.apiKey) {
        originalApiKey = this.client.apiKey;
        this.client.apiKey = apiKey;
        Logger.log(`Updated client apiKey`, "info");
      }
      
      try {
        Logger.log(`Making API call with model: ${modelName}`, "info");
        Logger.log(`Request temperature: ${temperature}, n: ${n}`, "info");
        Logger.log(`Message length: ${JSON.stringify(prompt).length} chars`, "info");
        
        return await this.client.chat.completions.create({
          model: modelName,
          messages: [prompt],
          temperature,
          n,
          top_p: 0.1,
          response_format: zodResponseFormat(createOsSpecifVisualElementSchema(possibleStateIds), "VisualPageAnalysis"),
        });
      } catch (apiError) {
        Logger.log(`API call error: ${apiError.message}`, "error");
        Logger.log(`Error details: ${JSON.stringify(apiError, null, 2)}`, "error");
        throw apiError;
      } finally {
        // Restore original client settings
        if (originalBaseURL) {
          this.client.baseURL = originalBaseURL;
          Logger.log(`Restored original baseURL: ${originalBaseURL}`, "info");
        }
        if (originalApiKey) {
          this.client.apiKey = originalApiKey;
          Logger.log(`Restored original apiKey`, "info");
        }
        Logger.log(`========== END ANALYZE VISUAL ELEMENTS ==========`, "info");
      }
    } catch (error) {
      Logger.log(`Error in analyzeVisualElements: ${error.message}`, "error");
      Logger.log(`Stack trace: ${error.stack}`, "error");
      console.error(`Error calling model:`, error);
      throw error;
    }
  }

  /**
   * Generate XPath expressions for identified elements
   * @param {string} model - Specific model to use (optional)
   * @param {Object} prompt - The formatted prompt
   * @param {string} stateId - State ID for validation
   * @param {number} temperature - Randomness parameter
   * @returns {Promise<Object>} - Model response
   */
  async generateXpathForElements(model, prompt, stateId, temperature = 0) {
    try {
      // Get model configuration for this pipeline
      const pipelineConfig = modelConfigProvider.getApiConfigForPipeline(PIPELINE_TYPES.XPATH_GENERATION);
      let apiKey = pipelineConfig.apiKey;
      let baseURL = pipelineConfig.baseUrl;
      
      // Get model name, with explicit model taking precedence
      let modelName = model || modelConfigProvider.getModelForPipeline(PIPELINE_TYPES.XPATH_GENERATION);
      
      // Throw an error if no valid API key is found
      if (!apiKey || apiKey === "YOUR_API_KEY") {
        throw new Error("No valid API key found. Please configure a valid API key in project settings or config.js");
      }
      
      Logger.log(`Generating XPath elements with model ${modelName}`, "info");
      
      // Temporarily update client if needed
      let originalBaseURL = null;
      let originalApiKey = null;
      
      if (baseURL !== this.client.baseURL) {
        originalBaseURL = this.client.baseURL;
        this.client.baseURL = baseURL;
      }
      
      if (apiKey !== this.client.apiKey) {
        originalApiKey = this.client.apiKey;
        this.client.apiKey = apiKey;
      }
      
      try {
        return await this.client.chat.completions.create({
          model: modelName,
          messages: [prompt],
          temperature,
          top_p: 0.1,
          response_format: zodResponseFormat(createXpathLocatorSchema(stateId), "XpathLocatorResponse"),
        });
      } finally {
        // Restore original client settings
        if (originalBaseURL) {
          this.client.baseURL = originalBaseURL;
        }
        if (originalApiKey) {
          this.client.apiKey = originalApiKey;
        }
      }
    } catch (error) {
      console.error(`Error calling model (generateXpathForElements):`, error);
      throw error;
    }
  }
 /**
   * Generates a Page Object Model class using AI
   * @param {string} model - The AI model to use
   * @param {Array} messages - The messages to send to the AI service
   * @param {number} temperature - Temperature setting (0-1)
   * @returns {Promise<Object>} - The AI service response
   */
 async generatePOMClass(model, messages, temperature = 0) {
  try {
    // Get model configuration for this pipeline
    const pipelineConfig = modelConfigProvider.getApiConfigForPipeline(PIPELINE_TYPES.POM_GENERATION);
    let apiKey = pipelineConfig.apiKey;
    let baseURL = pipelineConfig.baseUrl;
    
    // Get model name, with explicit model taking precedence
    let modelName = model || modelConfigProvider.getModelForPipeline(PIPELINE_TYPES.POM_GENERATION);
    
    // Throw an error if no valid API key is found
    if (!apiKey || apiKey === "YOUR_API_KEY") {
      throw new Error("No valid API key found. Please configure a valid API key in project settings or config.js");
    }
    
    Logger.log(`Generating POM class with model ${modelName}`, "info");
    
    // Temporarily update client if needed
    let originalBaseURL = null;
    let originalApiKey = null;
    
    if (baseURL !== this.client.baseURL) {
      originalBaseURL = this.client.baseURL;
      this.client.baseURL = baseURL;
    }
    
    if (apiKey !== this.client.apiKey) {
      originalApiKey = this.client.apiKey;
      this.client.apiKey = apiKey;
    }
    
    try {
      // Use the client with temporarily configured settings
      const response = await this.client.chat.completions.create({
        model: modelName,
        messages,
        temperature,
        max_tokens: CONFIG.GENERATION.maxOutputTokens,
        top_p: CONFIG.GENERATION.topP || 0.0,
      });
      
      return response;
    } finally {
      // Restore original client settings
      if (originalBaseURL) {
        this.client.baseURL = originalBaseURL;
      }
      if (originalApiKey) {
        this.client.apiKey = originalApiKey;
      }
    }
  } catch (error) {
    Logger.error(`Error calling model (generatePOMClass):`, error);
    throw error;
  }
}

  /**
   * Analyze transition between two UI states
   * @param {string} model - The AI model to use (optional)
   * @param {Array} prompt - The formatted prompt for transition analysis
   * @param {number} temperature - Temperature setting (0-1)
   * @returns {Promise<Object>} - The AI service response with transition analysis
   */
  async analyzeTransition(model, prompt, temperature = 0) {
    try {
      // Use explicit model if provided, otherwise use CONFIG.API.MODEL (if available) or CONFIG.MODEL
      const modelName = model || CONFIG.API.MODEL || CONFIG.MODEL;
      
      // Use the API key and base URL from CONFIG.API
      let apiKey = CONFIG.API.KEY;
      let baseURL = CONFIG.API.BASE_URL;
      
      // Log what model we're using
      Logger.log(`Analyzing transition with model: ${modelName}`, "info");
      Logger.log(`Using API Base URL: ${baseURL}`, "info");
      
      // Throw an error if no valid API key is found
      if (!apiKey || apiKey === "YOUR_API_KEY") {
        throw new Error("No valid API key found. Please configure a valid API key in project settings or config.js");
      }
      
      Logger.log(`Analyzing transition with model ${modelName}`, "info");
      
      // Temporarily update client if needed
      let originalBaseURL = null;
      let originalApiKey = null;
      
      if (baseURL !== this.client.baseURL) {
        originalBaseURL = this.client.baseURL;
        this.client.baseURL = baseURL;
      }
      
      if (apiKey !== this.client.apiKey) {
        originalApiKey = this.client.apiKey;
        this.client.apiKey = apiKey;
      }
      
      try {
        // Configure OpenAI client with proper settings for this call
      // This ensures we use the right API key and base URL regardless of what's in this.client
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: baseURL,
        dangerouslyAllowBrowser: true
      });

      // Use the configured client
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: prompt,
        temperature:temperature,
        max_tokens: CONFIG.GENERATION.maxOutputTokens,
        top_p: CONFIG.GENERATION.topP || 0.0,
      });
      
      return response;
      } finally {
        // Restore original client settings
        if (originalBaseURL) {
          this.client.baseURL = originalBaseURL;
        }
        if (originalApiKey) {
          this.client.apiKey = originalApiKey;
        }
      }
    } catch (error) {
      Logger.error(`Error calling model (analyzeTransition):`, error);
      throw error;
    }
  }

  /**
   * Repairs failed XPath expressions for elements
   * @param {string} model - The AI model to use
   * @param {Object} prompt - The prompt containing the repair instructions
   * @param {string} stateId - The state ID for validation
   * @param {number} temperature - Temperature setting (0-1)
   * @returns {Promise<Object>} - The AI service response with repaired XPaths
   */
  async repairFailedXpaths(model, prompt, stateId, temperature = 0) {
    try {
      // Get model configuration for this pipeline
      const pipelineConfig = modelConfigProvider.getApiConfigForPipeline(PIPELINE_TYPES.XPATH_REPAIR);
      let apiKey = pipelineConfig.apiKey;
      let baseURL = pipelineConfig.baseUrl;
      
      // Get model name, with explicit model taking precedence
      let modelName = model || modelConfigProvider.getModelForPipeline(PIPELINE_TYPES.XPATH_REPAIR);
      
      // Throw an error if no valid API key is found
      if (!apiKey || apiKey === "YOUR_API_KEY") {
        throw new Error("No valid API key found. Please configure a valid API key in project settings or config.js");
      }
      
      // Add response schema to prompt
      prompt['generationConfig'] = {
        responseSchema: zodResponseFormat(createXpathRepairSchema(stateId), "XpathRepairResponse"),
        responseFormat: 'application/json'
      };
      
      Logger.log(`Repairing failed XPaths with model ${modelName}`, "info");
      
      // Temporarily update client if needed
      let originalBaseURL = null;
      let originalApiKey = null;
      
      if (baseURL !== this.client.baseURL) {
        originalBaseURL = this.client.baseURL;
        this.client.baseURL = baseURL;
      }
      
      if (apiKey !== this.client.apiKey) {
        originalApiKey = this.client.apiKey;
        this.client.apiKey = apiKey;
      }
      
      try {
        return await this.client.chat.completions.create({
          model: modelName,
          messages: prompt,
          temperature: temperature,
          response_format: zodResponseFormat(createXpathRepairSchema(stateId), "XpathRepairResponse")
        });
      } finally {
        // Restore original client settings
        if (originalBaseURL) {
          this.client.baseURL = originalBaseURL;
        }
        if (originalApiKey) {
          this.client.apiKey = originalApiKey;
        }
      }
    } catch (error) {
      Logger.error(`Error calling model (repairFailedXpaths):`, error);
      throw error;
    }
  }
}