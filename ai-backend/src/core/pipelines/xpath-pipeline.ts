import { v4 as uuidv4 } from 'uuid';
import { AIService } from '../ai/ai-service.js';
import { FileUtils } from '../utils/file-utils.js';
import { XmlUtils } from '../utils/xml-utils.js';
import { Logger } from '../../utils/logger.js';
import { CONFIG } from '../../config/index.js';
import { PromptBuilder } from '../processors/prompt-builder.js';
import { ElementProcessor } from '../processors/element-processor.js';
import { Element, ElementWithLocator } from '../../types/api.js';
import { retryAICall } from './visual-pipeline.js';

// Initialize services
const aiService = new AIService();
const fileUtils = new FileUtils();

/**
 * Executes the XPath generation pipeline
 * @param elements Elements to generate XPaths for
 * @param platforms Platforms to generate XPaths for
 * @param jobId Optional job ID for tracking
 * @returns Array of elements with XPath locators
 */
export async function executeXpathPipeline(
  elements: Element[],
  platforms: string[] = CONFIG.osVersions,
  jobId?: string
): Promise<ElementWithLocator[]> {
  const pipelineId = jobId || uuidv4();
  
  try {
    Logger.info(`Starting XPath generation pipeline for job ${pipelineId}`);
    
    // Save input data for reference
    await fileUtils.writeOutputToFile(elements, `${pipelineId}_elements_input`, 'xpath');
    
    // Group elements by state and platform
    const elementGroups = ElementProcessor.groupElementsByStateAndPlatform(elements);
    
    // Save element groups for reference
    await fileUtils.writeOutputToFile(elementGroups, `${pipelineId}_element_groups`, 'xpath');
    
    // Filter groups by requested platforms
    const filteredGroups = Object.values(elementGroups).filter((group: any) => 
      platforms.includes(group.platform)
    );
    
    Logger.info(`Processing ${filteredGroups.length} element groups for XPath generation`);
    
    // Final results array
    const elementsWithXPaths: ElementWithLocator[] = [];
    
    // Get the number of XPath analysis runs to perform
    const xpathRunsConfig = CONFIG.ai.generation.xpathAnalysisRuns;
    
    // Process each element group
    for (const group of filteredGroups) {
      const { stateId, platform, elements, pageSource } = group;
      const groupKey = `${stateId}_${platform}`;
      
      if (!pageSource) {
        Logger.warn(`Skipping XPath generation for group ${groupKey}: Missing page source`);
        continue;
      }
      
      try {
        Logger.info(`Running XPath analysis for stateId: ${stateId}, platform: ${platform} (${xpathRunsConfig} runs)`);
        
        // Perform multiple XPath generation runs for better results
        const runs = [];
        
        for (let runIndex = 0; runIndex < xpathRunsConfig; runIndex++) {
          // Get a random element from the first state to use as a screenshot
          // In a real implementation, this would use the actual screenshot for the state
          const screenshot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
          
          // Generate XPath locators for the elements
          const xpathResult = await generateXpathForStateElements(
            aiService,
            screenshot,
            pageSource,
            elements,
            platform
          );
          
          await fileUtils.writeOutputToFile(
            xpathResult, 
            `${pipelineId}_xpath_result_${groupKey}_run${runIndex}`, 
            'xpath'
          );
          
          // Parse the results
          const parsed = JSON.parse(xpathResult.choices[0].message.content);
          
          // Evaluate each XPath against the page source
          let validCount = 0;
          for (const el of parsed) {
            const evalResult = XmlUtils.evaluateXPath(pageSource, el.xpathLocator);
            el.xpath = evalResult;
            if (evalResult.success && evalResult.numberOfMatches === 1) {
              validCount++;
            }
          }
          
          const totalCount = parsed.length;
          const score = totalCount > 0 ? (validCount / totalCount) : 0;
          
          runs.push({ parsed, validCount, totalCount, score });
          
          await fileUtils.writeOutputToFile(
            { validCount, totalCount, score }, 
            `${pipelineId}_xpath_score_${groupKey}_run${runIndex}`, 
            'xpath'
          );
        }
        
        // Select the best run based on XPath validity score
        const bestRun = runs.reduce((best, curr) => curr.score > best.score ? curr : best, runs[0]);
        
        Logger.info(`Best XPath run for ${groupKey}: ${bestRun.validCount}/${bestRun.totalCount} (${(bestRun.score * 100).toFixed(2)}%)`);
        
        // Save the best run for reference
        await fileUtils.writeOutputToFile(bestRun, `${pipelineId}_best_xpath_run_${groupKey}`, 'xpath');
        
        // Add best run elements to the results
        elementsWithXPaths.push(...bestRun.parsed);
        
      } catch (error) {
        Logger.error(`Error generating XPaths for group ${groupKey}:`, error);
      }
    }
    
    // Save final results
    await fileUtils.writeOutputToFile(elementsWithXPaths, `${pipelineId}_final_xpath_elements`, 'xpath');
    
    Logger.info(`XPath generation pipeline completed successfully for job ${pipelineId}`);
    
    return elementsWithXPaths;
  } catch (error) {
    Logger.error(`Error in XPath generation pipeline for job ${pipelineId}:`, error);
    throw error;
  }
}

/**
 * Generate XPath locators for elements in a state
 * @param aiService AI service
 * @param screenshotBase64 Base64 encoded screenshot
 * @param xmlText XML source
 * @param elements Elements to generate XPaths for
 * @param platform Target platform
 * @returns AI response with XPath locators
 */
async function generateXpathForStateElements(
  aiService: AIService,
  screenshotBase64: string,
  xmlText: string,
  elements: Element[],
  platform: string
): Promise<any> {
  // Generate the prompt
  const prompt = PromptBuilder.createXpathOnlyPrompt({
    screenshotBase64,
    xmlText,
    elements,
    os: platform,
    genConfig: CONFIG.ai.generation,
  });
  
  // Call AI service with retries
  return await retryAICall(() =>
    aiService.generateXpathForElements(CONFIG.ai.model, prompt, platform)
  );
}