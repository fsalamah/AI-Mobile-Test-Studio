import { Logger } from '../utils/logger';
import { ConfigService } from './config.service';
import OpenAI from 'openai';

/**
 * Service handling AI model interactions
 */
export class AIService {
  private openAI: OpenAI;
  private logger: Logger;
  private configService: ConfigService;

  constructor() {
    this.configService = new ConfigService();
    this.logger = new Logger('AIService');
    
    // Initialize OpenAI client
    this.openAI = new OpenAI({
      apiKey: this.configService.get('AI_API_KEY'),
      baseURL: this.configService.get('AI_BASE_URL') || undefined,
      dangerouslyAllowBrowser: false
    });
  }

  /**
   * Analyze visual elements
   * @param model AI model to use
   * @param prompt The prompt for visual analysis
   * @param possibleStateIds Array of possible state IDs
   */
  public async analyzeVisualElements(model: string, prompt: any, possibleStateIds: string[]) {
    try {
      this.logger.log(`Starting visual analysis with model ${model}`, 'info');
      
      // Get the actual model name from configuration
      const actualModel = this.getModelName(model);
      
      // Create schema for response validation
      const responseFormat = this.createVisualElementSchema(possibleStateIds);
      
      // Make API call
      const response = await this.openAI.chat.completions.create({
        model: actualModel,
        messages: [prompt],
        temperature: 0,
        response_format: { type: "json_object", schema: responseFormat },
      });
      
      // Parse and return the response
      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result;
    } catch (error: any) {
      this.logger.error(`Error in visual analysis: ${error.message}`, 'error');
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  /**
   * Generate XPath locators for elements
   * @param model AI model to use
   * @param prompt The prompt with visual elements data
   * @param stateId The state ID for validation
   */
  public async generateXpathForElements(model: string, prompt: any, stateId: string) {
    try {
      this.logger.log(`Starting XPath generation with model ${model}`, 'info');
      
      // Get the actual model name from configuration
      const actualModel = this.getModelName(model);
      
      // Create schema for response validation
      const responseFormat = this.createXpathLocatorSchema(stateId);
      
      // Make API call
      const response = await this.openAI.chat.completions.create({
        model: actualModel,
        messages: [prompt],
        temperature: 0,
        response_format: { type: "json_object", schema: responseFormat },
      });
      
      // Parse and return the response
      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result;
    } catch (error: any) {
      this.logger.error(`Error generating XPath locators: ${error.message}`, 'error');
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  /**
   * Repair failed XPath expressions
   * @param model AI model to use
   * @param messages Messages for the AI model
   * @param stateId The state ID for validation
   */
  public async repairFailedXpaths(model: string, messages: any[], stateId: string) {
    try {
      this.logger.log(`Repairing failed XPaths with model ${model}`, 'info');
      
      // Get the actual model name from configuration
      const actualModel = this.getModelName(model);
      
      // Create schema for response validation
      const responseFormat = this.createXpathRepairSchema(stateId);
      
      // Make API call
      const response = await this.openAI.chat.completions.create({
        model: actualModel,
        messages,
        temperature: 0,
        response_format: { type: "json_object", schema: responseFormat },
      });
      
      // Parse and return the response
      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result;
    } catch (error: any) {
      this.logger.error(`Error repairing XPaths: ${error.message}`, 'error');
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  /**
   * Generate Page Object Model class
   * @param model AI model to use
   * @param messages Messages for the AI model
   */
  public async generatePOMClass(model: string, messages: any[]) {
    try {
      this.logger.log(`Generating POM class with model ${model}`, 'info');
      
      // Get the actual model name from configuration
      const actualModel = this.getModelName(model);
      
      // Store original base URL in case POM models use a different endpoint
      const originalBaseURL = this.openAI.baseURL;
      
      try {
        // Use POM-specific configuration if available
        if (this.configService.get('POM_MODEL_API_BASE_URL')) {
          this.openAI.baseURL = this.configService.get('POM_MODEL_API_BASE_URL');
        }
        
        // Make API call
        const response = await this.openAI.chat.completions.create({
          model: this.configService.get('POM_MODEL') || actualModel,
          messages,
          temperature: 0,
          max_tokens: this.configService.get('MAX_OUTPUT_TOKENS') || 4096,
          top_p: this.configService.get('TOP_P') || 0.1,
        });
        
        return response.choices[0].message.content;
      } finally {
        // Restore original base URL
        this.openAI.baseURL = originalBaseURL;
      }
    } catch (error: any) {
      this.logger.error(`Error generating POM class: ${error.message}`, 'error');
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  /**
   * Get actual model name from configuration
   * @param modelKey The model key
   */
  private getModelName(modelKey: string): string {
    switch (modelKey) {
      case 'default':
        return this.configService.get('DEFAULT_MODEL') || 'gpt-4-turbo-preview';
      case 'fast':
        return this.configService.get('FAST_MODEL') || 'gpt-3.5-turbo';
      default:
        return modelKey;
    }
  }

  /**
   * Create schema for visual element analysis
   * @param possibleStateIds Array of possible state IDs
   */
  private createVisualElementSchema(possibleStateIds: string[]) {
    return {
      type: "object",
      properties: {
        stateId: {
          type: "string",
          enum: possibleStateIds
        },
        elements: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              type: { type: "string" },
              description: { type: "string" },
              role: { type: "string" },
              isInteractive: { type: "boolean" },
              visibleText: { type: "string" },
              boundingBox: {
                type: "object",
                properties: {
                  x: { type: "number" },
                  y: { type: "number" },
                  width: { type: "number" },
                  height: { type: "number" }
                },
                required: ["x", "y", "width", "height"]
              }
            },
            required: ["id", "name", "type", "isInteractive"]
          }
        }
      },
      required: ["stateId", "elements"]
    };
  }

  /**
   * Create schema for XPath locator generation
   * @param stateId The state ID for validation
   */
  private createXpathLocatorSchema(stateId: string) {
    return {
      type: "object",
      properties: {
        stateId: {
          type: "string",
          enum: [stateId]
        },
        elements: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              xpaths: {
                type: "object",
                properties: {
                  ios: {
                    type: "array",
                    items: { type: "string" }
                  },
                  android: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["ios", "android"]
              }
            },
            required: ["id", "xpaths"]
          }
        }
      },
      required: ["stateId", "elements"]
    };
  }

  /**
   * Create schema for XPath repair
   * @param stateId The state ID for validation
   */
  private createXpathRepairSchema(stateId: string) {
    return {
      type: "object",
      properties: {
        stateId: {
          type: "string",
          enum: [stateId]
        },
        fixedElements: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              originalXPath: { type: "string" },
              fixedXPath: { type: "string" },
              reason: { type: "string" },
              confidenceScore: { 
                type: "number",
                minimum: 0,
                maximum: 1
              }
            },
            required: ["id", "originalXPath", "fixedXPath", "reason"]
          }
        },
        summary: {
          type: "object",
          properties: {
            totalFixed: { type: "number" },
            totalFailed: { type: "number" },
            fixSuccessRate: { 
              type: "number",
              minimum: 0,
              maximum: 1
            }
          },
          required: ["totalFixed", "totalFailed", "fixSuccessRate"]
        }
      },
      required: ["stateId", "fixedElements", "summary"]
    };
  }
}
EOF < /dev/null
