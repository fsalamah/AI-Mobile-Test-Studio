import { v4 as uuidv4 } from 'uuid';
import { AIService } from '../ai/ai-service.js';
import { FileUtils } from '../utils/file-utils.js';
import { Logger } from '../../utils/logger.js';
import { CONFIG } from '../../config/index.js';
import { PromptBuilder } from '../processors/prompt-builder.js';
import { ElementProcessor } from '../processors/element-processor.js';
import { Page, State, Element } from '../../types/api.js';

// Initialize services
const aiService = new AIService();
const fileUtils = new FileUtils();

/**
 * Executes the visual analysis pipeline to extract UI elements
 * @param page Page object with states and screenshots
 * @param osVersions OS versions to analyze
 * @param jobId Optional job ID for tracking
 * @returns Array of elements with their properties
 */
export async function executeVisualPipeline(
  page: Page,
  osVersions: string[] = CONFIG.osVersions,
  jobId?: string
): Promise<Element[]> {
  const analysisId = jobId || uuidv4();
  
  try {
    Logger.info(`Starting visual analysis pipeline for job ${analysisId}`);
    
    // Save input data for reference
    await fileUtils.writeOutputToFile(page, `${analysisId}_page_input`, 'analysis');
    
    // Extract possible state IDs for validation
    const possibleStateIds = page.states.map(s => s.id);
    
    // Get the AI model to use
    const model = CONFIG.ai.model;
    
    // Get the default OS for initial analysis
    const defaultOs = CONFIG.defaultOs;
    
    // Number of analysis runs to perform
    const analysisRuns = CONFIG.ai.generation.analysisRuns;
    
    // Generate initial prompt
    const initialPrompt = await PromptBuilder.generateStatesPrompt(page, CONFIG.ai.generation, defaultOs);
    await fileUtils.writeOutputToFile(initialPrompt, `${analysisId}_initial_prompt`, 'analysis');
    
    Logger.info(`Running initial analysis ${analysisRuns} time(s) with ${model}`, 'info');
    
    // Run multiple analyses and collect results
    const runs = [];
    
    for (let runIndex = 0; runIndex < analysisRuns; runIndex++) {
      Logger.info(`Starting analysis run ${runIndex + 1}/${analysisRuns}`);
      
      const response = await retryAICall(() =>
        aiService.analyzeVisualElements(model, initialPrompt, possibleStateIds, 1, 0)
      );
      
      await fileUtils.writeOutputToFile(
        response, 
        `${analysisId}_run_response_${runIndex}`, 
        'analysis'
      );
      
      const parsedResult = JSON.parse(response.choices[0].message.content);
      const cleanedResult = ElementProcessor.removeDuplicateDevNames(parsedResult);
      
      const validation = validateElementsAgainstPageState(cleanedResult, page, defaultOs);
      
      runs.push({
        response,
        parsed: parsedResult,
        cleaned: cleanedResult,
        validation,
        score: computeScore(cleanedResult, validation),
      });
      
      await fileUtils.writeOutputToFile(parsedResult, `${analysisId}_run_parsed_${runIndex}`, 'analysis');
      await fileUtils.writeOutputToFile(cleanedResult, `${analysisId}_run_cleaned_${runIndex}`, 'analysis');
      await fileUtils.writeOutputToFile(validation, `${analysisId}_run_validation_${runIndex}`, 'analysis');
    }
    
    // Save all runs data
    await fileUtils.writeOutputToFile(runs, `${analysisId}_all_runs_data`, 'analysis');
    
    // Select the best run
    const bestRun = runs.reduce((best, curr) => (curr.score > best.score ? curr : best), runs[0]);
    Logger.info(`Best run score: ${bestRun.score}`, 'info');
    
    await fileUtils.writeOutputToFile(bestRun, `${analysisId}_best_run_data`, 'analysis');
    
    // Process for other OS versions if requested
    let finalElements = bestRun.cleaned;
    
    // Filter out the default OS from the list
    const otherOsVersions = osVersions.filter(os => os !== defaultOs);
    
    // Process each OS version
    for (const osVersion of otherOsVersions) {
      try {
        Logger.info(`Processing OS version: ${osVersion}`);
        
        // Create a prompt to map elements to this OS version
        const osStateIdPrompt = PromptBuilder.createOtherOsStateIdPrompt(finalElements, page, osVersion);
        await fileUtils.writeOutputToFile(osStateIdPrompt, `${analysisId}_osStateId_prompt_${osVersion}`, 'analysis');
        
        // Call AI service to get state ID mapping
        const stateIdResponse = await retryAICall(() =>
          aiService.analyzeVisualElements(model, osStateIdPrompt, possibleStateIds)
        );
        
        await fileUtils.writeOutputToFile(stateIdResponse, `${analysisId}_osStateId_response_${osVersion}`, 'analysis');
        
        // Parse results
        const stateIdResults = JSON.parse(stateIdResponse.choices[0].message.content);
        await fileUtils.writeOutputToFile(stateIdResults, `${analysisId}_osStateId_objects_${osVersion}`, 'analysis');
        
        // Map state IDs for this OS version
        for (const element of finalElements) {
          const matchingElement = stateIdResults.find((e: any) => e.devName === element.devName);
          if (matchingElement) {
            if (!element.state_ids) {
              element.state_ids = {};
            }
            element.state_ids[osVersion] = matchingElement.stateId;
          }
        }
        
        // Validate the results for this OS version
        const osValidation = validateElementsAgainstPageState(stateIdResults, page, osVersion);
        await fileUtils.writeOutputToFile(osValidation, `${analysisId}_validation_${osVersion}`, 'analysis');
        
        if (!osValidation.valid) {
          Logger.warn(`Validation failed for OS: ${osVersion}`);
          Logger.warn(`Missing Elements: ${JSON.stringify(osValidation.missingElements, null, 2)}`);
          Logger.warn(`Duplicate devNames: ${JSON.stringify(osValidation.duplicateDevNames, null, 2)}`);
        } else {
          Logger.info(`Validation passed for OS: ${osVersion}`, 'info');
        }
      } catch (osError) {
        Logger.error(`Error processing OS version ${osVersion}:`, osError);
      }
    }
    
    // Save final results
    await fileUtils.writeOutputToFile(finalElements, `${analysisId}_final_elements`, 'analysis');
    
    Logger.info(`Visual analysis pipeline completed successfully for job ${analysisId}`);
    
    return finalElements;
  } catch (error) {
    Logger.error(`Error in visual analysis pipeline for job ${analysisId}:`, error);
    throw error;
  }
}

/**
 * Compute score for element analysis quality
 * @param elements Analyzed elements
 * @param validation Validation results
 * @returns Score (higher is better)
 */
function computeScore(elements: Element[], validation: ValidationResult): number {
  const baseScore = elements.length;
  const penalty = (validation.missingElements.length * 2) + (validation.duplicateDevNames.length * 3);
  return baseScore - penalty;
}

/**
 * Retry an AI call with exponential backoff
 * @param fn Function to call
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in milliseconds
 * @returns Result of the function call
 */
export async function retryAICall<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        Logger.warn(`AI service call failed, retrying (${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }

  throw lastError;
}

/**
 * Validate elements against page state
 * @param elements Elements to validate
 * @param page Page object
 * @param targetOS Target OS
 * @returns Validation result
 */
export function validateElementsAgainstPageState(
  elements: any[],
  page: Page,
  targetOS: string
): ValidationResult {
  const stateIds = new Set(page.states.map(s => s.id));
  const seenDevNames = new Set();
  const duplicateDevNames = new Set();
  const missingElements = [];

  for (const el of elements) {
    if (seenDevNames.has(el.devName)) {
      duplicateDevNames.add(el.devName);
    } else {
      seenDevNames.add(el.devName);
    }

    const targetStateId = el.state_ids?.[targetOS] || el.state_Ids?.[targetOS] || el.stateId;
    if (targetStateId && !stateIds.has(targetStateId)) {
      missingElements.push(el);
    }
  }

  return {
    valid: missingElements.length === 0 && duplicateDevNames.size === 0,
    missingElements,
    duplicateDevNames: Array.from(duplicateDevNames),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validation result interface
 */
interface ValidationResult {
  valid: boolean;
  missingElements: any[];
  duplicateDevNames: string[];
  timestamp: string;
}