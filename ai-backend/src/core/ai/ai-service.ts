import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { CONFIG } from '../../config/index.js';
import { Logger } from '../../utils/logger.js';
import { createOsSpecifVisualElementSchema } from '../schemas/visual-element-schema.js';
import { createXpathLocatorSchema } from '../schemas/xpath-locator-schema.js';
import { createXpathRepairSchema } from '../schemas/xpath-repair-schema.js';

/**
 * Service for interacting with AI models
 */
export class AIService {
  private client: OpenAI;
  private originalBaseURL: string | undefined;

  constructor() {
    this.client = new OpenAI({
      apiKey: CONFIG.ai.apiKey,
      baseURL: CONFIG.ai.baseUrl,
    });
    this.originalBaseURL = CONFIG.ai.baseUrl;
  }

  /**
   * Analyze visual elements in a screenshot and XML
   * @param model AI model to use
   * @param prompt Prompt message for the AI
   * @param possibleStateIds Array of possible state IDs
   * @param n Number of completions to generate
   * @param temperature Sampling temperature
   * @returns AI response with identified elements
   */
  async analyzeVisualElements(
    model: string,
    prompt: any,
    possibleStateIds: string[],
    n = 1,
    temperature = 0
  ): Promise<any> {
    try {
      Logger.info(`Calling ${model} for visual element analysis`);
      
      return await this.client.chat.completions.create({
        model,
        messages: [prompt],
        temperature,
        n,
        top_p: CONFIG.ai.generation.topP,
        response_format: zodResponseFormat(
          createOsSpecifVisualElementSchema(possibleStateIds),
          'VisualPageAnalysis'
        ),
      });
    } catch (error: any) {
      Logger.error(`Error calling ${model} for visual element analysis:`, error);
      throw error;
    }
  }

  /**
   * Generate XPath locators for elements
   * @param model AI model to use
   * @param prompt Prompt message for the AI
   * @param stateId State ID for validation
   * @param temperature Sampling temperature
   * @returns AI response with generated XPath locators
   */
  async generateXpathForElements(
    model: string,
    prompt: any,
    stateId: string,
    temperature = 0
  ): Promise<any> {
    try {
      Logger.info(`Calling ${model} for XPath generation`);
      
      return await this.client.chat.completions.create({
        model,
        messages: [prompt],
        temperature,
        top_p: CONFIG.ai.generation.topP,
        response_format: zodResponseFormat(
          createXpathLocatorSchema(stateId),
          'XpathLocatorResponse'
        ),
      });
    } catch (error: any) {
      Logger.error(`Error calling ${model} for XPath generation:`, error);
      throw error;
    }
  }

  /**
   * Generate Page Object Model class
   * @param model AI model to use
   * @param messages Array of messages for the AI
   * @param temperature Sampling temperature
   * @returns AI response with generated POM code
   */
  async generatePOMClass(
    model: string,
    messages: any[],
    temperature = 0
  ): Promise<any> {
    try {
      Logger.info(`Generating POM class with model ${model}`);
      
      // Store original base URL
      const originalBaseURL = this.client.baseURL;
      
      try {
        // Use POM-specific configuration if available
        if (CONFIG.pom?.baseUrl) {
          this.client.baseURL = CONFIG.pom.baseUrl;
        }
        
        // Use the existing client with temporarily modified baseURL
        const response = await this.client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: CONFIG.ai.generation.maxOutputTokens,
          top_p: CONFIG.ai.generation.topP,
        });
        
        return response;
      } finally {
        // Restore original base URL
        this.client.baseURL = originalBaseURL;
      }
    } catch (error: any) {
      Logger.error(`Error calling ${model} for POM generation:`, error);
      throw error;
    }
  }

  /**
   * Repair failed XPath expressions
   * @param model AI model to use
   * @param prompt Messages for the AI
   * @param stateId State ID for validation
   * @param temperature Sampling temperature
   * @returns AI response with repaired XPaths
   */
  async repairFailedXpaths(
    model: string,
    prompt: any[],
    stateId: string,
    temperature = 0
  ): Promise<any> {
    try {
      Logger.info(`Repairing failed XPaths with model ${model}`);
      
      return await this.client.chat.completions.create({
        model,
        messages: prompt,
        temperature,
        response_format: zodResponseFormat(
          createXpathRepairSchema(stateId),
          'XpathRepairResponse'
        ),
        max_tokens: CONFIG.ai.generation.maxOutputTokens,
        top_p: CONFIG.ai.generation.topP,
      });
    } catch (error: any) {
      Logger.error(`Error calling ${model} for XPath repair:`, error);
      throw error;
    }
  }
}