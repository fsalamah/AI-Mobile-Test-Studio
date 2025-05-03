import { v4 as uuidv4 } from 'uuid';
import { AIService } from '../ai/ai-service.js';
import { FileUtils } from '../utils/file-utils.js';
import { Logger } from '../../utils/logger.js';
import { CONFIG } from '../../config/index.js';
import { PromptBuilder } from '../processors/prompt-builder.js';
import { Page, ElementWithLocator } from '../../types/api.js';
import { retryAICall } from './visual-pipeline.js';

// Initialize services
const aiService = new AIService();
const fileUtils = new FileUtils();

/**
 * Execute the POM generation pipeline
 * @param page Page object with elements and locators
 * @param language Target programming language
 * @param framework Target testing framework
 * @param jobId Optional job ID for tracking
 * @returns Generated POM code
 */
export async function executePOMPipeline(
  page: Page,
  language: string = 'java',
  framework: string = 'appium',
  jobId?: string
): Promise<string> {
  const pipelineId = jobId || uuidv4();
  
  try {
    Logger.info(`Starting POM generation pipeline for job ${pipelineId}`);
    
    // Save input data for reference
    await fileUtils.writeOutputToFile(page, `${pipelineId}_page_input`, 'pom');
    
    // Ensure page has elements with locators
    if (!hasElementsWithLocators(page)) {
      Logger.warn('Page has no elements with locators, cannot generate POM');
      throw new Error('Page has no elements with locators, cannot generate POM');
    }
    
    // Generate the POM code
    const pomCode = await generatePOMClass(page, language, framework, pipelineId);
    
    // Save the generated code for reference
    await fileUtils.writeOutputToFile(
      { language, framework, code: pomCode }, 
      `${pipelineId}_pom_output`, 
      'pom'
    );
    
    Logger.info(`POM generation pipeline completed successfully for job ${pipelineId}`);
    
    return pomCode;
  } catch (error) {
    Logger.error(`Error in POM generation pipeline for job ${pipelineId}:`, error);
    throw error;
  }
}

/**
 * Check if page has elements with locators
 * @param page Page object
 * @returns True if page has elements with locators
 */
function hasElementsWithLocators(page: Page): boolean {
  // Check if the page has analysis data with elements
  if (
    !page.aiAnalysis || 
    !page.aiAnalysis.locators || 
    !Array.isArray(page.aiAnalysis.locators) || 
    page.aiAnalysis.locators.length === 0
  ) {
    return false;
  }
  
  // Check if the elements have valid XPaths
  const elementsWithValidXPaths = page.aiAnalysis.locators.filter(
    (element: ElementWithLocator) => 
      element.xpath && 
      element.xpath.isValid && 
      element.xpath.success && 
      element.xpath.numberOfMatches > 0
  );
  
  return elementsWithValidXPaths.length > 0;
}

/**
 * Generate POM class code
 * @param page Page object with elements and locators
 * @param language Target programming language
 * @param framework Target testing framework
 * @param pipelineId Pipeline ID for tracking
 * @returns Generated POM code
 */
async function generatePOMClass(
  page: Page,
  language: string,
  framework: string,
  pipelineId: string
): Promise<string> {
  // Create the prompt
  const prompt = PromptBuilder.createPOMGenerationPrompt(page, language, framework);
  
  // Save the prompt for reference
  await fileUtils.writeOutputToFile(prompt, `${pipelineId}_pom_prompt`, 'pom');
  
  // Call AI service
  Logger.info(`Generating POM class in ${language} with ${framework} framework`);
  
  const response = await retryAICall(() =>
    aiService.generatePOMClass(CONFIG.ai.model, prompt, 0)
  );
  
  // Extract the code from the response
  const content = response.choices[0].message.content;
  
  // Parse out the code block if needed
  const code = extractCodeBlock(content, language);
  
  return code;
}

/**
 * Extract code block from AI response
 * @param content Response content
 * @param language Target programming language
 * @returns Extracted code
 */
function extractCodeBlock(content: string, language: string): string {
  // If content is already just code, return it
  if (!content.includes('```')) {
    return content;
  }
  
  // Try to extract code block
  const codeBlockRegex = new RegExp(`\`\`\`(?:${language})?\\s*([\\s\\S]*?)\\s*\`\`\``, 'i');
  const match = content.match(codeBlockRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // If no code block found, return the whole content
  return content;
}