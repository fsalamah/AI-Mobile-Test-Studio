//File: aiService.js
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { CONFIG } from './config.js';
import { createOsSpecifVisualElementSchema, createXpathLocatorSchema } from './schemas.js';
import {Logger} from 
'./logger.js'
import { createXpathRepairSchema } from "./xpathFixSchema.js";
export class AIService {
  constructor() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Consider making this configurable
    
    this.client = new OpenAI({
      apiKey: CONFIG.API.KEY,
      baseURL: CONFIG.API.BASE_URL,
      dangerouslyAllowBrowser:true
    });
  }

  async analyzeVisualElements(model, prompt, possibleStateIds, n = 3, temperature = 0) {
    try {
      return await this.client.chat.completions.create({
        model,
        messages: [prompt],
        temperature,
        n,
        top_p: 0.1,
        response_format: zodResponseFormat(createOsSpecifVisualElementSchema(possibleStateIds), "VisualPageAnalysis"),
      });
    } catch (error) {
      console.error(`Error calling ${model}:`, error);
      throw error;
    }
  }

  async generateXpathForElements(model, prompt, stateId, temperature = 0) {
    try {
      return await this.client.chat.completions.create({
        model,
        messages: [prompt],
        temperature,
        top_p: 0.1,
        response_format: zodResponseFormat(createXpathLocatorSchema(stateId), "XpathLocatorResponse"),
      });
    } catch (error) {
      console.error(`Error calling ${model} (generateXpathForElements):`, error);
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
    Logger.log(`Generating POM class with model ${model}`, "info");
    
    // Store original base URL
    const originalBaseURL = this.client.baseURL;
    
    try {
      // Use POM-specific configuration temporarily
      if (CONFIG.POM_MODEL && CONFIG.POM_MODEL.API && CONFIG.POM_MODEL.API.BASE_URL) {
        this.client.baseURL = CONFIG.POM_MODEL.API.BASE_URL;
      }
      
      // Use the existing client with temporarily modified baseURL
      const response = await this.client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: CONFIG.GENERATION.maxOutputTokens ,
        top_p: CONFIG.GENERATION.topP || 0.0,
      });
      
      return response;
    } finally {
      // Restore original base URL
      this.client.baseURL = originalBaseURL;
    }
  } catch (error) {
    Logger.error(`Error calling ${model} (generatePOMClass):`, error);
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
      Logger.log(`Repairing failed XPaths with model ${model}`, "info");
      console.log('##################################################################################################')
      console.log(temperature)
      console.log(model)
      //console.log(prompt)
      return await this.client.chat.completions.create({
        model,
        messages: prompt,
         temperature,
        // max_tokens: CONFIG.GENERATION.maxOutputTokens || 4096,
        // top_p: CONFIG.GENERATION.topP || 0.1,
        response_format: zodResponseFormat(createXpathRepairSchema(stateId), "XpathRepairResponse"),
      });
    } catch (error) {
      Logger.error(`Error calling ${model} (repairFailedXpaths):`, error);
      throw error;
    }
  }
}