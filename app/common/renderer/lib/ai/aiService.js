//File: aiService.js
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { CONFIG } from './config.js';
import { createOsSpecifVisualElementSchema, createXpathLocatorSchema } from './schemas.js';

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
  
}
