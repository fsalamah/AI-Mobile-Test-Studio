import { v4 as uuidv4 } from 'uuid';
import { AIService } from '../ai/ai-service.js';
import { FileUtils } from '../utils/file-utils.js';
import { XmlUtils } from '../utils/xml-utils.js';
import { Logger } from '../../utils/logger.js';
import { CONFIG } from '../../config/index.js';
import { PromptBuilder } from '../processors/prompt-builder.js';
import { ElementWithLocator, Page } from '../../types/api.js';
import { retryAICall } from './visual-pipeline.js';

// Initialize services
const aiService = new AIService();
const fileUtils = new FileUtils();

/**
 * Execute the XPath Fix pipeline to repair failing XPaths
 * @param elementsWithXPaths Elements with XPaths from executeXpathPipeline
 * @param page Page object with states and XML source
 * @param jobId Optional job ID for tracking
 * @returns Array of elements with repaired XPaths
 */
export async function executeXpathFixPipeline(
  elementsWithXPaths: ElementWithLocator[],
  page: Page,
  jobId?: string
): Promise<ElementWithLocator[]> {
  const pipelineId = jobId || uuidv4();
  
  try {
    Logger.info(`Starting XPath fix pipeline for job ${pipelineId}`);
    
    // Save input data for reference
    await fileUtils.writeOutputToFile(elementsWithXPaths, `${pipelineId}_elements_input`, 'xpath-fix');
    
    // Filter for failing XPaths
    const failingXPaths = elementsWithXPaths.filter(element => 
      !element.xpath.success || 
      element.xpath.numberOfMatches === 0 || 
      element.xpath.numberOfMatches > 1 ||
      element.xpath.xpathExpression === '//*[99=0]'
    );
    
    Logger.info(`Found ${failingXPaths.length} failing XPaths out of ${elementsWithXPaths.length} total`);
    await fileUtils.writeOutputToFile(failingXPaths, `${pipelineId}_failing_xpaths`, 'xpath-fix');
    
    if (failingXPaths.length === 0) {
      Logger.info('No failing XPaths found, skipping repair process');
      return elementsWithXPaths;
    }
    
    // Group failing XPaths by stateId and platform
    const groupsToFix = groupFailingXPathsByStateAndPlatform(failingXPaths);
    Logger.info(`Grouped failing XPaths into ${Object.keys(groupsToFix).length} groups by state and platform`);
    await fileUtils.writeOutputToFile(groupsToFix, `${pipelineId}_failing_xpath_groups`, 'xpath-fix');
    
    // Add state data (screenshots and XML) to each group
    const groupsWithStateData = await addStateDataToGroups(groupsToFix, page);
    Logger.info('Added state data to failing XPath groups');
    await fileUtils.writeOutputToFile(groupsWithStateData, `${pipelineId}_failing_xpath_groups_with_state_data`, 'xpath-fix');
    
    // Process each group to fix XPaths
    const fixedGroups = await processXPathFixGroups(groupsWithStateData, pipelineId);
    Logger.info('Completed XPath repair process');
    await fileUtils.writeOutputToFile(fixedGroups, `${pipelineId}_fixed_xpath_groups`, 'xpath-fix');
    
    // Update the original elements array with fixed XPaths
    const updatedElements = updateElementsWithFixedXPaths(elementsWithXPaths, fixedGroups);
    Logger.info('Updated elements with fixed XPaths');
    await fileUtils.writeOutputToFile(updatedElements, `${pipelineId}_elements_with_fixed_xpaths`, 'xpath-fix');
    
    return updatedElements;
  } catch (error) {
    Logger.error(`Error in XPath fix pipeline for job ${pipelineId}:`, error);
    throw error;
  }
}

/**
 * Group failing XPaths by stateId and platform
 * @param failingXPaths Elements with failing XPaths
 * @returns Groups of failing XPaths by stateId and platform
 */
function groupFailingXPathsByStateAndPlatform(failingXPaths: ElementWithLocator[]): Record<string, any> {
  const groups: Record<string, any> = {};
  
  for (const element of failingXPaths) {
    const key = `${element.stateId}_${element.platform}`;
    
    if (!groups[key]) {
      groups[key] = {
        stateId: element.stateId,
        platform: element.platform,
        elements: [],
      };
    }
    
    groups[key].elements.push(element);
  }
  
  return groups;
}

/**
 * Add state data (screenshots and XML) to each group
 * @param groups Groups of failing XPaths
 * @param page Page object with states
 * @returns Groups with state data
 */
async function addStateDataToGroups(groups: Record<string, any>, page: Page): Promise<Record<string, any>> {
  const result = { ...groups };
  
  for (const key in result) {
    const group = result[key];
    const stateId = group.stateId;
    const platform = group.platform;
    
    // Find the state in the page
    const state = page.states.find(s => s.id === stateId);
    
    if (!state) {
      Logger.warn(`Warning: State with ID ${stateId} not found`);
      group.processingStatus = 'missing_state_data';
      continue;
    }
    
    // Check if the platform version exists
    if (!state.versions || !state.versions[platform]) {
      Logger.warn(`Warning: No version for platform ${platform} in state ${stateId}`);
      
      // Try case-insensitive match
      const foundVersion = Object.keys(state.versions || {}).find(
        v => v.toLowerCase() === platform.toLowerCase()
      );
      
      if (foundVersion) {
        Logger.info(`Found case-insensitive match: "${foundVersion}" for platform ${platform}`);
        group.platform = foundVersion;
        group.screenshot = state.versions[foundVersion].screenShot;
        group.pageSource = state.versions[foundVersion].pageSource;
        group.processingStatus = 'ready';
      } else {
        group.processingStatus = 'missing_platform_version';
      }
      
      continue;
    }
    
    // Add screenshot and page source to the group
    group.screenshot = state.versions[platform].screenShot;
    group.pageSource = state.versions[platform].pageSource;
    group.processingStatus = 'ready';
  }
  
  return result;
}

/**
 * Process each group to fix XPaths
 * @param groups Groups with state data
 * @param pipelineId Pipeline ID for tracking
 * @returns Groups with fixed XPaths
 */
async function processXPathFixGroups(groups: Record<string, any>, pipelineId: string): Promise<Record<string, any>> {
  const result = { ...groups };
  
  for (const key in result) {
    const group = result[key];
    
    if (group.processingStatus !== 'ready') {
      Logger.warn(`Skipping XPath repair for group ${key} due to status: ${group.processingStatus}`);
      continue;
    }
    
    try {
      Logger.info(`Processing XPath repairs for stateId: ${group.stateId}, platform: ${group.platform}`);
      
      // Check size of data to avoid API limits
      const screenshotSize = group.screenshot ? group.screenshot.length : 0;
      const pageSourceSize = group.pageSource ? group.pageSource.length : 0;
      const elementsCount = group.elements.length;
      
      Logger.debug(`Request stats - Screenshot size: ${(screenshotSize / 1024).toFixed(2)} KB, XML size: ${(pageSourceSize / 1024).toFixed(2)} KB, Elements: ${elementsCount}`);
      
      // If data is too large, consider reducing it
      if (screenshotSize > 5 * 1024 * 1024 || pageSourceSize > 1 * 1024 * 1024) {
        Logger.warn('Warning: Large data size detected, may exceed API limits');
        
        // Reduce screenshot quality or size if needed
        if (screenshotSize > 5 * 1024 * 1024) {
          Logger.warn(`Screenshot is very large (${(screenshotSize / 1024 / 1024).toFixed(2)} MB)`);
        }
        
        // Simplify XML if needed
        if (pageSourceSize > 1 * 1024 * 1024) {
          Logger.warn(`Page source is very large (${(pageSourceSize / 1024 / 1024).toFixed(2)} MB)`);
          group.pageSource = XmlUtils.simplifyXml(group.pageSource, 10);
        }
      }
      
      // Process in smaller batches if there are many elements
      const batchSize = 5; // Smaller batch size for XPath repair
      const batches = [];
      
      for (let i = 0; i < elementsCount; i += batchSize) {
        batches.push(group.elements.slice(i, i + batchSize));
      }
      
      Logger.info(`Processing ${batches.length} batches of elements`);
      
      let allFixedElements = [];
      
      for (let i = 0; i < batches.length; i++) {
        Logger.info(`Processing batch ${i+1}/${batches.length}`);
        
        // Create a prompt for this batch using the PromptBuilder
        const batchPrompt = PromptBuilder.buildXPathRepairPrompt({
          screenshotBase64: group.screenshot,
          xmlText: group.pageSource,
          failingElements: batches[i],
          platform: group.platform,
        });
        
        await fileUtils.writeOutputToFile(
          batchPrompt, 
          `${pipelineId}_xpath_repair_prompt_${group.stateId}_${group.platform}_batch${i}`, 
          'xpath-fix'
        );
        
        // Try to repair this batch with exponential backoff
        let retryCount = 0;
        let success = false;
        let batchResult;
        
        while (!success && retryCount < 3) {
          try {
            // Call the AI service with exponential backoff
            batchResult = await retryAICall(
              () => aiService.repairFailedXpaths(
                CONFIG.ai.model,
                batchPrompt,
                group.stateId,
                0.2
              ),
              3,  // max retries
              1000 * Math.pow(2, retryCount)  // exponential backoff
            );
            
            success = true;
          } catch (error) {
            retryCount++;
            Logger.error(`Batch ${i+1} attempt ${retryCount} failed:`, error);
            
            if (retryCount >= 3) {
              Logger.error(`Failed to process batch ${i+1} after ${retryCount} attempts`);
              
              // Add placeholder repairs for this batch with new format
              const placeholderRepairs = batches[i].map(element => ({
                ...element,
                xpathFix: [
                  {
                    priority: 0, // Primary
                    xpath: '//*[99=0]',
                    confidence: "Low",
                    description: "Placeholder due to API error",
                    fix: "Failed to generate repair due to API error",
                  },
                  {
                    priority: 1, // Alternative 1
                    xpath: '//*[99=0]',
                    confidence: "Low",
                    description: "Placeholder due to API error",
                    fix: "Failed to generate repair due to API error",
                  },
                  {
                    priority: 2, // Alternative 2
                    xpath: '//*[99=0]',
                    confidence: "Low",
                    description: "Placeholder due to API error",
                    fix: "Failed to generate repair due to API error",
                  },
                ],
              }));
              
              allFixedElements = [...allFixedElements, ...placeholderRepairs];
              break;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          if (success && batchResult) {
            try {
              // Extract the repaired elements from this batch
              const content = batchResult.choices[0].message.content;
              let batchFixedElements = [];
              
              // Check if content is a string (and try to parse it as JSON) or already an array
              if (typeof content === 'string') {
                try {
                  // Try to parse the string as JSON
                  const parsedContent = JSON.parse(content);
                  if (Array.isArray(parsedContent)) {
                    batchFixedElements = parsedContent;
                  } else {
                    Logger.warn(`AI response is not an array after parsing, type: ${typeof parsedContent}`);
                    batchFixedElements = [parsedContent];
                  }
                } catch (parseError) {
                  Logger.error(`Failed to parse AI response as JSON:`, parseError);
                  
                  // Create placeholder repairs
                  batchFixedElements = batches[i].map(element => ({
                    ...element,
                    xpathFix: [
                      {
                        priority: 0,
                        xpath: '//*[99=0]',
                        confidence: "Low",
                        description: "Placeholder due to parsing error",
                        fix: "Failed to parse AI response",
                      },
                      {
                        priority: 1,
                        xpath: '//*[99=0]',
                        confidence: "Low",
                        description: "Placeholder due to parsing error",
                        fix: "Failed to parse AI response",
                      },
                      {
                        priority: 2,
                        xpath: '//*[99=0]',
                        confidence: "Low",
                        description: "Placeholder due to parsing error",
                        fix: "Failed to parse AI response",
                      },
                    ],
                  }));
                }
              } else if (Array.isArray(content)) {
                // Content is already an array
                batchFixedElements = content;
              } else if (content && typeof content === 'object') {
                // If it's a single object, wrap it in an array
                batchFixedElements = [content];
              } else {
                Logger.warn(`Unexpected AI response format: ${typeof content}`);
                batchFixedElements = [];
              }
              
              // Validate the fixed XPaths against the XML source
              if (group.pageSource) {
                batchFixedElements = validateFixedXPaths(batchFixedElements, group.pageSource);
              }
              
              await fileUtils.writeOutputToFile(
                batchFixedElements, 
                `${pipelineId}_fixed_elements_batch${i}`, 
                'xpath-fix'
              );
              
              allFixedElements = [...allFixedElements, ...batchFixedElements];
            } catch (processingError) {
              Logger.error(`Error processing AI response:`, processingError);
              
              // Add placeholder repairs for this batch as a fallback
              const placeholderRepairs = batches[i].map(element => ({
                ...element,
                xpathFix: [
                  {
                    priority: 0,
                    xpath: '//*[99=0]',
                    confidence: "Low",
                    description: "Placeholder due to processing error",
                    fix: "Failed to process AI response",
                  },
                  {
                    priority: 1,
                    xpath: '//*[99=0]',
                    confidence: "Low",
                    description: "Placeholder due to processing error",
                    fix: "Failed to process AI response",
                  },
                  {
                    priority: 2,
                    xpath: '//*[99=0]',
                    confidence: "Low",
                    description: "Placeholder due to processing error",
                    fix: "Failed to process AI response",
                  },
                ],
              }));
              
              allFixedElements = [...allFixedElements, ...placeholderRepairs];
            }
          }
        }
      }
      
      // Store the combined results
      group.fixedElements = allFixedElements;
      group.processingStatus = 'complete';
      
    } catch (error) {
      Logger.error(`Error processing XPath repairs for group ${key}:`, error);
      group.processingStatus = 'error';
      group.error = (error as Error).message;
    }
  }
  
  return result;
}

/**
 * Validate fixed XPaths against the XML source
 * @param repairedElements Elements with repaired XPaths
 * @param pageSource XML source for validation
 * @returns Validated fixed elements
 */
function validateFixedXPaths(repairedElements: any[], pageSource: string): any[] {
  // Check if repairedElements is an array
  if (!Array.isArray(repairedElements)) {
    Logger.warn(`Warning: repairedElements is not an array, type: ${typeof repairedElements}`);
    return [];
  }

  const validatedElements = [];

  for (const element of repairedElements) {
    // Skip if element is not an object or is a string
    if (typeof element !== 'object' || element === null || typeof element === 'string') {
      Logger.warn(`Warning: Skipping invalid element type: ${typeof element}`);
      continue;
    }

    // Create a clone of the element to avoid modifying by reference
    const validatedElement = { ...element };

    // Check if xpathFix exists and has the expected structure
    if (!validatedElement.xpathFix || !Array.isArray(validatedElement.xpathFix) || validatedElement.xpathFix.length === 0) {
      Logger.warn(`Warning: Element ${validatedElement.devName || 'unknown'} missing proper xpathFix structure`);
      
      // Initialize with a default structure if missing
      validatedElement.xpathFix = [
        {
          priority: 0,
          xpath: validatedElement.xpath?.xpathExpression || '//*[99=0]',
          confidence: "Low",
          description: "Default placeholder - missing xpathFix",
          fix: "Created default xpathFix",
        },
        {
          priority: 1,
          xpath: '//*[99=0]',
          confidence: "Low",
          description: "Default alternative 1",
          fix: "Placeholder alternative xpath",
        },
        {
          priority: 2,
          xpath: '//*[99=0]',
          confidence: "Low",
          description: "Default alternative 2",
          fix: "Placeholder alternative xpath",
        },
      ];
    }
    
    // Get primary XPath (priority 0)
    const primaryXpathItem = validatedElement.xpathFix.find((item: any) => item.priority === 0);
    const primaryXpath = primaryXpathItem?.xpath || '//*[99=0]';
    
    // Evaluate primary XPath
    const primaryResult = XmlUtils.evaluateXPath(pageSource, primaryXpath);
    
    // Add evaluation result to the XPath item
    if (primaryXpathItem) {
      primaryXpathItem.evaluation = primaryResult;
      primaryXpathItem.valid = primaryResult.success && primaryResult.numberOfMatches === 1;
    }
    
    // Check if primary XPath is valid
    const primaryValid = primaryResult.success && primaryResult.numberOfMatches === 1;
    
    // If primary XPath is not valid, try alternatives
    if (!primaryValid) {
      Logger.warn(`Primary XPath for ${validatedElement.devName || 'unknown'} failed, trying alternatives`);
      
      // Try alternative XPaths (priority 1 and 2)
      const alternativeXpaths = validatedElement.xpathFix.filter((item: any) => item.priority > 0);
      let foundValidAlternative = false;
      
      for (const alternative of alternativeXpaths) {
        // Evaluate alternative XPath
        const altResult = XmlUtils.evaluateXPath(pageSource, alternative.xpath);
        
        // Add evaluation result to the alternative XPath item
        alternative.evaluation = altResult;
        alternative.valid = altResult.success && altResult.numberOfMatches === 1;
        
        // If we find a valid alternative, update the primary XPath
        if (alternative.valid) {
          Logger.info(`Found valid alternative XPath for ${validatedElement.devName || 'unknown'}`);
          
          // Swap positions to make the valid alternative the primary
          const validXpath = alternative.xpath;
          const validConfidence = alternative.confidence;
          const validDescription = alternative.description;
          const validFix = alternative.fix;
          const validEvaluation = alternative.evaluation;
          
          // Update the xpathFix array to reflect the change
          validatedElement.xpathFix = validatedElement.xpathFix.map((item: any) => {
            if (item.priority === alternative.priority) {
              return {
                ...item,
                priority: 0,
                xpath: validXpath,
                confidence: validConfidence,
                description: validDescription,
                fix: validFix,
                evaluation: validEvaluation,
                valid: true,
              };
            } else if (item.priority === 0) {
              return {
                ...item,
                priority: alternative.priority,
              };
            }
            return item;
          });
          
          foundValidAlternative = true;
          break;
        }
      }
      
      // If all XPaths failed, ensure the primary is marked properly
      if (!foundValidAlternative) {
        Logger.warn(`All XPaths failed for ${validatedElement.devName || 'unknown'}, using placeholder`);
        
        validatedElement.xpathFix = validatedElement.xpathFix.map((item: any) => {
          if (item.priority === 0) {
            return {
              ...item,
              xpath: '//*[99=0]',
              confidence: "Low",
              description: "Placeholder due to no valid XPath found",
              fix: "No valid XPath could be generated",
              valid: false,
            };
          }
          return item;
        });
      }
    }
    
    validatedElements.push(validatedElement);
  }
  
  return validatedElements;
}

/**
 * Update the original elements array with fixed XPaths
 * @param originalElements Original elements with XPaths
 * @param fixedGroups Groups with fixed XPaths
 * @returns Updated elements with fixed XPaths
 */
function updateElementsWithFixedXPaths(
  originalElements: ElementWithLocator[],
  fixedGroups: Record<string, any>
): ElementWithLocator[] {
  const result = [...originalElements];
  
  // Create a map for quick lookup
  const fixedElementsMap = new Map();
  
  // Populate the map with all fixed elements
  for (const key in fixedGroups) {
    const group = fixedGroups[key];
    
    if (group.processingStatus === 'complete' && group.fixedElements) {
      for (const fixedElement of group.fixedElements) {
        const lookupKey = `${fixedElement.id || fixedElement.devName}_${fixedElement.stateId}_${fixedElement.platform}`;
        fixedElementsMap.set(lookupKey, fixedElement);
      }
    }
  }
  
  // Update original elements with fixed XPaths
  for (let i = 0; i < result.length; i++) {
    const element = result[i];
    
    // Skip elements with working XPaths
    if (element.xpath.success && element.xpath.numberOfMatches === 1) {
      continue;
    }
    
    const lookupKey = `${element.id || element.devName}_${element.stateId}_${element.platform}`;
    const fixedElement = fixedElementsMap.get(lookupKey);
    
    if (fixedElement && fixedElement.xpathFix) {
      // Get primary XPath (priority 0) from the new structure
      const primaryXPathItem = fixedElement.xpathFix.find((item: any) => item.priority === 0);
      
      if (primaryXPathItem && primaryXPathItem.xpath !== '//*[99=0]' && primaryXPathItem.valid) {
        // Update the XPath with the fixed version
        element.xpath = {
          ...element.xpath,
          xpathExpression: primaryXPathItem.xpath,
          isValid: true,
          success: true,
          numberOfMatches: primaryXPathItem.evaluation?.numberOfMatches || 1,
          matchingNodes: primaryXPathItem.evaluation?.matchingNodes || [],
          // Store the original XPath for reference
          originalXpathExpression: element.xpath.xpathExpression,
        };
        
        // Store alternative XPaths for fallback
        element.alternativeXpaths = fixedElement.xpathFix
          .filter((item: any) => item.priority > 0 && item.valid)
          .map((item: any) => ({
            xpathExpression: item.xpath,
            confidence: item.confidence,
            description: item.description,
            numberOfMatches: item.evaluation?.numberOfMatches || 0,
            isValid: item.valid || false,
          }));
      }
    }
  }
  
  return result;
}