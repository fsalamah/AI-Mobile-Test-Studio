import { CONFIG } from './config.js';
import { FileUtils } from './fileUtils.js';
import { AIService } from './aiService.js';
import { Logger } from './logger.js';
import { PromptBuilder } from './promptBuilder.js';
import { evaluateXPath } from './xpathEvaluator.js';
import { groupElementsByStateAndOs, retryAICall } from './pipeline.js';

const aiService = new AIService();

/**
 * Executes the XPath fix pipeline to repair failing XPaths
 * @param {Array} elementsWithXPaths - Elements with XPaths from executeXpathPipeline
 * @param {Object} page - The page object with states and screenshots
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Array} - Elements with repaired XPaths
 */
async function executeXpathFixPipeline(elementsWithXPaths, page, progressCallback) {
  Logger.log("Starting XPath fix pipeline...", "info");
  
  // Initialize progress callback if provided
  const updateProgress = progressCallback || (() => {});
  
  // Get all failing XPaths
  const failingXPaths = elementsWithXPaths.filter(element => 
    !element.xpath.success || 
    element.xpath.numberOfMatches === 0 || 
    element.xpath.xpathExpression === '//*[99=0]'
  );
  
  Logger.log(`Found ${failingXPaths.length} failing XPaths out of ${elementsWithXPaths.length} total`, "info");
  await FileUtils.writeOutputToFile(failingXPaths, "failing_xpaths");
  
  // Update progress with initial data
  updateProgress('start', {
    totalFailingXPaths: failingXPaths.length,
    totalElements: elementsWithXPaths.length
  });
  
  if (failingXPaths.length === 0) {
    Logger.log("No failing XPaths found, skipping repair process", "info");
    updateProgress('complete', { fixedCount: 0, errorCount: 0 });
    return elementsWithXPaths;
  }
  
  try {
    // Group failing XPaths by stateId and platform
    updateProgress('grouping', 'processing', 'Grouping elements by state and platform');
    const groupsToFix = groupFailingXPathsByStateAndPlatform(failingXPaths);
    const groupCount = Object.keys(groupsToFix).length;
    
    Logger.log(`Grouped failing XPaths into ${groupCount} groups by state and platform`, "info");
    await FileUtils.writeOutputToFile(groupsToFix, "failing_xpath_groups");
    updateProgress('grouping', 'complete', `Created ${groupCount} groups`, { totalGroups: groupCount });
    
    // Find state data for each group
    updateProgress('stateData', 'processing', 'Loading screenshots and XML for each group');
    const groupsWithStateData = await addStateDataToGroups(groupsToFix, page);
    Logger.log("Added state data to failing XPath groups", "info");
    await FileUtils.writeOutputToFile(groupsWithStateData, "failing_xpath_groups_with_state_data");
    updateProgress('stateData', 'complete', 'Associated screenshots and XML with groups');
    
    // Process each group to fix XPaths
    updateProgress('processing', 'processing', 'Generating XPath repairs');
    const fixedGroups = await processXPathFixGroups(groupsWithStateData, updateProgress);
    Logger.log("Completed XPath repair process", "info");
    await FileUtils.writeOutputToFile(fixedGroups, "fixed_xpath_groups");
    updateProgress('processing', 'complete', 'Generated XPath repairs for all groups');
    
    // Update the original elements array with fixed XPaths
    updateProgress('validation', 'processing', 'Validating repaired XPaths');
    
    // Count fixed XPaths
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const key in fixedGroups) {
      const group = fixedGroups[key];
      if (group.fixedElements) {
        group.fixedElements.forEach(elem => {
          const primaryXPath = elem.xpathFix?.find(x => x.priority === 0);
          if (primaryXPath && primaryXPath.xpath !== '//*[99=0]') {
            fixedCount++;
          } else {
            errorCount++;
          }
        });
      }
    }
    
    updateProgress('validation', 'complete', `Validated ${fixedCount + errorCount} XPaths`, {
      fixedCount,
      errorCount
    });
    
    // Update elements with fixed XPaths
    updateProgress('updating', 'processing', 'Applying fixes to original elements');
    const updatedElements = updateElementsWithFixedXPaths(elementsWithXPaths, fixedGroups);
    Logger.log("Updated elements with fixed XPaths", "info");
    await FileUtils.writeOutputToFile(updatedElements, "elements_with_fixed_xpaths");
    updateProgress('updating', 'complete', 'Applied all XPath fixes');
    
    // Complete the process
    updateProgress('complete', true, {
      fixedCount,
      errorCount,
      totalFixed: failingXPaths.length
    });
    
    return updatedElements;
  } catch (error) {
    Logger.error('Error in XPath fix pipeline:', error);
    updateProgress('error', error.message);
    throw error;
  }
}

/**
 * Groups failing XPaths by stateId and platform
 * @param {Array} failingXPaths - Elements with failing XPaths
 * @returns {Object} - Groups of failing XPaths by stateId and platform
 */
function groupFailingXPathsByStateAndPlatform(failingXPaths) {
  const groups = {};
  
  for (const element of failingXPaths) {
    // Normalize stateId and platform for consistent grouping
    const stateId = element.stateId || '';
    const platform = (element.platform || '').toLowerCase();
    const key = `${stateId}::${platform}`;
    
    if (!groups[key]) {
      groups[key] = {
        stateId: element.stateId,
        platform: element.platform, // Keep original platform for display
        platformNormalized: platform, // Store normalized version
        elements: []
      };
    }
    
    groups[key].elements.push(element);
  }
  
  return groups;
}

/**
 * Adds state data (screenshot and XML) to each group
 * @param {Object} groups - Groups of failing XPaths
 * @param {Object} page - The page object with states
 * @returns {Object} - Groups with state data
 */
async function addStateDataToGroups(groups, page) {
  const result = { ...groups };
  
  for (const key in result) {
    const group = result[key];
    const stateId = group.stateId;
    const platform = group.platform;
    
    // Find the state in the page
    const state = page.states.find(s => s.id === stateId);
    
    if (!state) {
      Logger.log(`Warning: State with ID ${stateId} not found`, "warn");
      group.processingStatus = 'missing_state_data';
      continue;
    }
    
    // Check if the platform version exists - normalize for case-insensitive comparison
    const platformNormalized = platform.toLowerCase();
    
    // First try direct match
    if (state.versions && state.versions[platform]) {
      // Direct match found - use it
      group.screenshot = state.versions[platform].screenShot;
      group.pageSource = state.versions[platform].pageSource;
      group.processingStatus = 'ready';
    } else {
      Logger.log(`No direct match for platform ${platform} in state ${stateId}, trying case-insensitive match`, "info");
      
      // Try case-insensitive match
      const foundVersion = Object.keys(state.versions || {}).find(
        v => v.toLowerCase() === platformNormalized
      );
      
      if (foundVersion) {
        Logger.log(`Found case-insensitive match: "${foundVersion}" for platform ${platform}`, "info");
        group.platform = foundVersion; // Store the canonical version from the state
        group.screenshot = state.versions[foundVersion].screenShot;
        group.pageSource = state.versions[foundVersion].pageSource;
        group.processingStatus = 'ready';
      } else {
        Logger.log(`Warning: No version for platform ${platform} in state ${stateId}`, "warn");
        group.processingStatus = 'missing_platform_version';
      }
    }
  }
  
  return result;
}

/**
 * Processes each group to fix failing XPaths
 * @param {Object} groups - Groups with state data
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Object} - Groups with fixed XPaths
 */
async function processXPathFixGroups(groups, progressCallback) {
  const result = { ...groups };
  const updateProgress = progressCallback || (() => {});
  
  // Calculate total for progress tracking
  const readyGroups = Object.values(result).filter(g => g.processingStatus === 'ready');
  const totalGroups = readyGroups.length;
  
  let currentGroupIndex = 0;
  let totalBatchCount = 0;
  
  // Pre-calculate total batch count
  readyGroups.forEach(group => {
    if (group.processingStatus === 'ready') {
      const batchSize = 50;
      const batchCount = Math.ceil(group.elements.length / batchSize);
      totalBatchCount += batchCount;
    }
  });
  
  for (const key in result) {
    const group = result[key];
    
    if (group.processingStatus !== 'ready') {
      Logger.log(`Skipping XPath repair for group ${key} due to status: ${group.processingStatus}`, "warn");
      continue;
    }
    
    currentGroupIndex++;
    
    try {
      Logger.log(`Processing XPath repairs for stateId: ${group.stateId}, platform: ${group.platform}`, "info");
      updateProgress('processing', 'processing', 
        `Processing group ${currentGroupIndex}/${totalGroups}: ${group.stateId} (${group.platform})`, 
        { currentGroup: currentGroupIndex, totalGroups }
      );
      
      // Check size of data to avoid API limits
      const screenshotSize = group.screenshot ? group.screenshot.length : 0;
      const pageSourceSize = group.pageSource ? group.pageSource.length : 0;
      const elementsCount = group.elements.length;
      
      Logger.log(`Request stats - Screenshot size: ${(screenshotSize / 1024).toFixed(2)} KB, XML size: ${(pageSourceSize / 1024).toFixed(2)} KB, Elements: ${elementsCount}`, "debug");
      
      // If data is too large, consider reducing it
      if (screenshotSize > 5 * 1024 * 1024 || pageSourceSize > 1 * 1024 * 1024) {
        Logger.log(`Warning: Large data size detected, may exceed API limits`, "warn");
        
        // If needed, reduce screenshot or XML data size here
        if (screenshotSize > 5 * 1024 * 1024) {
          // Consider implementing a screenshot compression function
          Logger.log(`Screenshot is very large (${(screenshotSize / 1024 / 1024).toFixed(2)} MB)`, "warn");
        }
        
        if (pageSourceSize > 1 * 1024 * 1024) {
          // Consider trimming the XML to essential parts
          Logger.log(`Page source is very large (${(pageSourceSize / 1024 / 1024).toFixed(2)} MB)`, "warn");
        }
      }
      
      // Process in batches of 50 elements
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < elementsCount; i += batchSize) {
        batches.push(group.elements.slice(i, i + batchSize));
      }
      
      Logger.log(`Processing ${batches.length} batches of elements`, "info");
      
      let allFixedElements = [];
      for (let i = 0; i < batches.length; i++) {
        Logger.log(`Processing batch ${i+1}/${batches.length}`, "info");
        
        // Update batch progress
        updateProgress('processing', 'processing',
          `Processing batch ${i+1}/${batches.length} for ${group.stateId} (${group.platform})`,
          { currentBatch: i+1, totalBatches: batches.length }
        );
        
        // Create a prompt for this batch using the PromptBuilder
        const batchPrompt = PromptBuilder.buildXPathRepairPrompt({
          screenshotBase64: group.screenshot,
          xmlText: group.pageSource,
          failingElements: batches[i],
          platform: group.platform
        });
        
        // Try to repair this batch with exponential backoff
        let retryCount = 0;
        let success = false;
        let batchResult;
        
        while (!success && retryCount < 3) {
          try {
            // Call the AI service with exponential backoff
            batchResult = await retryAICall(
              () => aiService.repairFailedXpaths(
                CONFIG.MODEL,
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
              Logger.error(`Failed to process batch ${i+1} after ${retryCount} attempts`, "error");
              
              // Add placeholder repairs for this batch with new format
              const placeholderRepairs = batches[i].map(element => ({
                ...element,
                xpathFix: [
                  {
                    priority: 0, // Primary
                    xpath: '//*[99=0]',
                    confidence: "Low",
                    description: "Placeholder due to API error",
                    fix: "Failed to generate repair due to API error"
                  },
                  {
                    priority: 1, // Alternative 1
                    xpath: '//*[99=0]',
                    confidence: "Low",
                    description: "Placeholder due to API error",
                    fix: "Failed to generate repair due to API error"
                  },
                  {
                    priority: 2, // Alternative 2
                    xpath: '//*[99=0]',
                    confidence: "Low",
                    description: "Placeholder due to API error",
                    fix: "Failed to generate repair due to API error"
                  }
                ]
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
                    Logger.log(`AI response is not an array after parsing, type: ${typeof parsedContent}`);
                    // If not an array, wrap single object in array if needed
                    batchFixedElements = [parsedContent];
                  }
                } catch (parseError) {
                  // If it's not valid JSON, log and create placeholders
                  Logger.log(`Failed to parse AI response as JSON: ${parseError.message}`);
                  Logger.debug(`Response content: ${content.substring(0, 200)}...`);
                  
                  // Create placeholder repairs
                  batchFixedElements = batches[i].map(element => ({
                    ...element,
                    xpathFix: [
                      {
                        priority: 0,
                        xpath: '//*[99=0]',
                        confidence: "Low",
                        description: "Placeholder due to parsing error",
                        fix: "Failed to parse AI response"
                      },
                      {
                        priority: 1,
                        xpath: '//*[99=0]',
                        confidence: "Low",
                        description: "Placeholder due to parsing error",
                        fix: "Failed to parse AI response"
                      },
                      {
                        priority: 2,
                        xpath: '//*[99=0]',
                        confidence: "Low",
                        description: "Placeholder due to parsing error",
                        fix: "Failed to parse AI response"
                      }
                    ]
                  }));
                }
              } else if (Array.isArray(content)) {
                // Content is already an array
                batchFixedElements = content;
              } else if (content && typeof content === 'object') {
                // If it's a single object, wrap it in an array
                batchFixedElements = [content];
              } else {
                Logger.log(`Unexpected AI response format: ${typeof content}`);
                batchFixedElements = [];
              }
              
              // Ensure each element has the xpathFix property in correct format
              batchFixedElements = batchFixedElements.map(element => {
                if (typeof element !== 'object' || element === null) {
                  Logger.log(`Invalid element in AI response, type: ${typeof element}`);
                  return null;
                }
                
                // If xpathFix is missing or not an array, initialize it
                if (!element.xpathFix || !Array.isArray(element.xpathFix)) {
                  return {
                    ...element,
                    xpathFix: [
                      {
                        priority: 0,
                        xpath: element.xpath?.xpathExpression || '//*[99=0]',
                        confidence: "Low",
                        description: "Default placeholder - missing xpathFix",
                        fix: "Created default xpathFix"
                      },
                      {
                        priority: 1,
                        xpath: '//*[99=0]',
                        confidence: "Low",
                        description: "Default alternative 1",
                        fix: "Created default xpathFix"
                      },
                      {
                        priority: 2,
                        xpath: '//*[99=0]',
                        confidence: "Low",
                        description: "Default alternative 2",
                        fix: "Created default xpathFix"
                      }
                    ]
                  };
                }
                
                return element;
              }).filter(el => el !== null); // Remove any null elements
              
              allFixedElements = [...allFixedElements, ...batchFixedElements];
            } catch (processingError) {
              Logger.error(`Error processing AI response: ${processingError.message}`);
              
              // Add placeholder repairs for this batch as a fallback
              const placeholderRepairs = batches[i].map(element => ({
                ...element,
                xpathFix: [
                  {
                    priority: 0,
                    xpath: '//*[99=0]',
                    confidence: "Low",
                    description: "Placeholder due to processing error",
                    fix: "Failed to process AI response"
                  },
                  {
                    priority: 1,
                    xpath: '//*[99=0]',
                    confidence: "Low",
                    description: "Placeholder due to processing error",
                    fix: "Failed to process AI response"
                  },
                  {
                    priority: 2,
                    xpath: '//*[99=0]',
                    confidence: "Low",
                    description: "Placeholder due to processing error",
                    fix: "Failed to process AI response"
                  }
                ]
              }));
              
              allFixedElements = [...allFixedElements, ...placeholderRepairs];
            }
          }
        }
      }
      
      // Store the combined results
      group.fixedElements = allFixedElements;
      group.processingStatus = 'complete';
      
      // Validate fixed XPaths
      if (group.pageSource) {
        // Only validate if fixedElements is an array
        if (Array.isArray(group.fixedElements)) {
          group.fixedElements = validateFixedXPaths(group.fixedElements, group.pageSource);
        } else {
          Logger.error(`Cannot validate fixedElements: not an array, type: ${typeof group.fixedElements}`);
          // Create a placeholder array if needed
          group.fixedElements = [];
        }
      }
      
    } catch (error) {
      Logger.error(`Error processing XPath repairs for group ${key}:`, error);
      group.processingStatus = 'error';
      group.error = error.message;
    }
  }
  
  return result;
}

/**
 * Validates fixed XPaths against the XML source
 * @param {Array} repairedElements - Elements with repaired XPaths
 * @param {string} pageSource - XML source for validation
 * @returns {Array} - Validated fixed elements
 */
function validateFixedXPaths(repairedElements, pageSource) {
  // Check if repairedElements is an array
  if (!Array.isArray(repairedElements)) {
    Logger.log(`Warning: repairedElements is not an array, type: ${typeof repairedElements}`, "warn");
    return [];
  }

  const validatedElements = [];

  for (const element of repairedElements) {
    // Skip if element is not an object or is a string
    if (typeof element !== 'object' || element === null || typeof element === 'string') {
      Logger.log(`Warning: Skipping invalid element type: ${typeof element}`, "warn");
      continue;
    }

    // Create a clone of the element to avoid modifying by reference
    const validatedElement = { ...element };

    // Check if xpathFix exists and has the expected structure
    if (!validatedElement.xpathFix || !Array.isArray(validatedElement.xpathFix) || validatedElement.xpathFix.length === 0) {
      Logger.log(`Warning: Element ${validatedElement.devName || 'unknown'} missing proper xpathFix structure`, "warn");
      
      // Initialize with a default structure if missing
      validatedElement.xpathFix = [
        {
          priority: 0,
          xpath: validatedElement.xpath?.xpathExpression || '//*[99=0]',
          confidence: "Low",
          description: "Default placeholder",
          fix: "Initial placeholder xpath"
        },
        {
          priority: 1,
          xpath: '//*[99=0]',
          confidence: "Low",
          description: "Default alternative 1",
          fix: "Placeholder alternative xpath"
        },
        {
          priority: 2,
          xpath: '//*[99=0]',
          confidence: "Low",
          description: "Default alternative 2",
          fix: "Placeholder alternative xpath"
        }
      ];
    }
    
    // Get primary XPath (priority 0)
    const primaryXpathItem = validatedElement.xpathFix.find(item => item.priority === 0);
    const primaryXpath = primaryXpathItem?.xpath || '//*[99=0]';
    const primaryResult = evaluateXPath(pageSource, primaryXpath);
    const primaryValid = primaryResult && primaryResult.isValid === true && primaryResult.numberOfMatches > 0;
    
    // If primary XPath is not valid, try alternatives
    if (!primaryValid) {
      Logger.log(`Primary XPath for ${validatedElement.devName || 'unknown'} failed, trying alternatives`, "warn");
      
      // Try alternative XPaths (priority 1 and 2)
      const alternativeXpaths = validatedElement.xpathFix.filter(item => item.priority > 0);
      let foundValidAlternative = false;
      
      for (const alternative of alternativeXpaths) {
        const altResult = evaluateXPath(pageSource, alternative.xpath);
        alternative.valid = altResult && altResult.isValid === true && altResult.numberOfMatches > 0;
        
        // If we find a valid alternative, update the primary XPath
        if (alternative.valid) {
          Logger.log(`Found valid alternative XPath for ${validatedElement.devName || 'unknown'}`, "info");
          // Swap positions to make the valid alternative the primary
          const validXpath = alternative.xpath;
          const validConfidence = alternative.confidence;
          const validDescription = alternative.description;
          const validFix = alternative.fix;
          
          // Update the xpathFix array to reflect the change
          validatedElement.xpathFix = validatedElement.xpathFix.map(item => {
            if (item.priority === alternative.priority) {
              return {
                ...item,
                priority: 0,
                xpath: validXpath,
                confidence: validConfidence,
                description: validDescription,
                fix: validFix
              };
            } else if (item.priority === 0) {
              return {
                ...item,
                priority: alternative.priority
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
        Logger.log(`All XPaths failed for ${validatedElement.devName || 'unknown'}, using placeholder`, "warn");
        validatedElement.xpathFix = validatedElement.xpathFix.map(item => {
          if (item.priority === 0) {
            return {
              ...item,
              xpath: '//*[99=0]',
              confidence: "Low",
              description: "Placeholder due to no valid XPath found",
              fix: "No valid XPath could be generated"
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
 * Updates the original elements array with fixed XPaths
 * @param {Array} originalElements - Original elements with XPaths
 * @param {Object} fixedGroups - Groups with fixed XPaths
 * @returns {Array} - Updated elements with fixed XPaths
 */
function updateElementsWithFixedXPaths(originalElements, fixedGroups) {
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
    if (element.xpath && element.xpath.success && element.xpath.numberOfMatches > 0) {
      continue;
    }
    
    const lookupKey = `${element.id || element.devName}_${element.stateId}_${element.platform}`;
    const fixedElement = fixedElementsMap.get(lookupKey);
    
    if (fixedElement && fixedElement.xpathFix) {
      // Get primary XPath (priority 0) from the new structure
      const primaryXPathItem = fixedElement.xpathFix.find(item => item.priority === 0);
      
      if (primaryXPathItem && primaryXPathItem.xpath !== '//*[99=0]') {
        element.xpath = {
          ...element.xpath,
          xpathExpression: primaryXPathItem.xpath,
          isValid: true,
          success: true,
          // Store the original XPath for reference
          originalXpath: element.xpath.xpathExpression,
          // Store alternative XPaths for fallback
          alternativeXpaths: fixedElement.xpathFix.filter(item => item.priority > 0)
            .map(item => ({
              xpath: item.xpath,
              confidence: item.confidence,
              description: item.description
            }))
        };
      }
    }
  }
  
  return result;
}

export { executeXpathFixPipeline };