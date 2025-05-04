import { CONFIG } from './config.js';
import { FileUtils } from './fileUtils.js';
import { PageService } from './pageService.js';
import { PromptBuilder } from './promptBuilder.js';
import { AIService } from './aiService.js';
import { ElementProcessor } from './elementProcessor.js';
import { Logger } from './logger.js';
import { evaluateXPath } from './xpathEvaluator.js';

const aiService = new AIService();
// Don't use hardcoded model - let aiService use configured model
const MAX_RETRIES = 1;
const RETRY_DELAY = 2000;

async function extractPageVisualElements(page, osVersions) {
  try {
    // Use null instead of CONFIG.MODEL to let aiService use the project's model configuration
    const visual_model = null; // This will make aiService use the configured model
    const os = CONFIG.DEFAULT_OS || 'ios';
    const analysisRuns = CONFIG.ANALYSIS_RUNS || 1;
    await FileUtils.writeOutputToFile(page, "original_page_data");
    const possibleStateIds = Array.from(new Set(page.states.map(s => s.id)));

    const initialPrompt = await PromptBuilder.generateStatesPrompt(page, CONFIG.GENERATION, os);
    await FileUtils.writeOutputToFile(initialPrompt, "initial_prompt");

    Logger.log(`Running initial analysis ${analysisRuns} time(s)`, "info");

    const runs = [];

    for (let runIndex = 0; runIndex < analysisRuns; runIndex++) {
      const response = await retryAICall(() =>
        aiService.analyzeVisualElements(visual_model, initialPrompt, possibleStateIds, 1, 0)
      );

      const parsedResult = JSON.parse(response.choices[0].message.content);
      const cleanedResult = ElementProcessor.removeDuplicateDevNames(parsedResult);

      const validation = validateElementsAgainstPageState(cleanedResult, page, os);

      runs.push({
        response,
        parsed: parsedResult,
        cleaned: cleanedResult,
        validation,
        score: computeScore(cleanedResult, validation)
      });

      await FileUtils.writeOutputToFile(response, `run_response_${runIndex}`);
      await FileUtils.writeOutputToFile(parsedResult, `run_parsed_${runIndex}`);
      await FileUtils.writeOutputToFile(cleanedResult, `run_cleaned_${runIndex}`);
      await FileUtils.writeOutputToFile(validation, `run_validation_${runIndex}`);
    }
    FileUtils.writeOutputToFile(runs, "all_runs_data");
    Logger.log(`Initial visual analysis runs completed.`, "info");
    // Select the best run
    const bestRun = runs.reduce((best, curr) => (curr.score > best.score ? curr : best), runs[0]);
    Logger.log(`Best run score: ${bestRun.score}`, "info");
    FileUtils.writeOutputToFile(bestRun, "best_run_data");
    Logger.log(`Best run validation: ${bestRun.validation.valid}`, "info");
    const validatedPrompt = PromptBuilder.createValidationPrompt(
      initialPrompt,
      JSON.stringify(bestRun.cleaned),
      os
    );
    await FileUtils.writeOutputToFile(validatedPrompt, "validated_prompt");

    Logger.log("Running visual analysis validation", "info");
    const secondResponse = await retryAICall(() =>
      aiService.analyzeVisualElements(null, validatedPrompt, possibleStateIds, 1, 0)
    );
    await FileUtils.writeOutputToFile(secondResponse, "second_response_complete");

    const validatedResults = await ElementProcessor.parseAndLogResults(secondResponse.choices, "Validated");

    for (let i = 0; i < secondResponse.choices.length; i++) {
      const parsed = JSON.parse(secondResponse.choices[i].message.content);
      await FileUtils.writeOutputToFile(parsed, `Validated_choice_${i}`);
    }

    const finalParsed = JSON.parse(secondResponse.choices[0].message.content);
    const deduplicated = ElementProcessor.removeDuplicateDevNames(finalParsed);

    let final_result = {};
    let is_last_validation_valid = null;
    let processingResults = {
      success: true,
      processedOSVersions: {},
      errorDetails: {}
    };

    for (const osVersion of osVersions) {
      try {
        if (osVersion !== os) {
          const stateIdPrompt = PromptBuilder.createOtherOsStateIdPrompt(deduplicated, page, osVersion);
          await FileUtils.writeOutputToFile(stateIdPrompt, `stateId_prompt_${osVersion}`);

          const stateIdResponse = await retryAICall(() =>
            aiService.analyzeVisualElements(null, stateIdPrompt, possibleStateIds)
          );
          await FileUtils.writeOutputToFile(stateIdResponse, `stateId_response_${osVersion}`);

          const stateIdResults = JSON.parse(stateIdResponse.choices[0].message.content);
          await FileUtils.writeOutputToFile(stateIdResults, `stateId_objects_${osVersion}`);

          for (const element of deduplicated) {
            const matchingElement = stateIdResults.find(e => e.devName === element.devName);
            if (matchingElement) {
              element.state_Ids = {
                ...element.state_Ids,
                [osVersion]: matchingElement.stateId
              };
            }
          }
          final_result = stateIdResults;

          Logger.log(`Validating elements for OS: ${osVersion}`, "info");
          const validationResults = validateElementsAgainstPageState(stateIdResults, page, osVersion);
          await FileUtils.writeOutputToFile(validationResults, `validation_results_${osVersion}`);
          console.log(validationResults);

          is_last_validation_valid = validationResults.valid;
          processingResults.processedOSVersions[osVersion] = {
            success: validationResults.valid,
            details: validationResults
          };

          if (!validationResults.valid) {
            Logger.log(`Validation failed for OS: ${osVersion}`, "warn");
            Logger.log(`Missing Elements: ${JSON.stringify(validationResults.missingElements, null, 2)}`, "warn");
            Logger.log(`Duplicate devNames: ${JSON.stringify(validationResults.duplicateDevNames, null, 2)}`, "warn");
          } else {
            Logger.log(`Validation passed for OS: ${osVersion}`, "info");
          }
        }
      } catch (osError) {
        Logger.error(`Error processing OS version ${osVersion}:`, osError);
        processingResults.success = false;
        processingResults.processedOSVersions[osVersion] = {
          success: false,
          error: osError.message
        };
        processingResults.errorDetails[osVersion] = {
          message: osError.message,
          stack: osError.stack
        };
      }
    }

    Logger.log(`Writing final result to file`, "info");
    Logger.log(`Final results validation: ${is_last_validation_valid}`, "info");
    await FileUtils.writeOutputToFile(final_result, `result`);
    await FileUtils.writeOutputToFile(processingResults, `processing_results`);

    return final_result;
  } catch (error) {
    Logger.error("Unhandled Error:", error);
    await FileUtils.writeOutputToFile({ error: error.toString(), stack: error.stack }, "error_log");
    throw error;
  }
}

function computeScore(elements, validation) {
  const baseScore = elements.length;
  const penalty = (validation.missingElements.length * 2) + (validation.duplicateDevNames.length * 3);
  return baseScore - penalty;
}

async function retryAICall(fn, maxRetries = MAX_RETRIES, initialDelay = RETRY_DELAY) {
  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        Logger.log(`AI service call failed, retrying (${attempt + 1}/${maxRetries})...`, "warn");
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }

  throw lastError;
}

function validateElementsAgainstPageState(elements, page, targetOS) {
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

    const targetStateId = el.state_ids?.[targetOS] || el.state_Ids?.[targetOS];
    if (targetStateId && !stateIds.has(targetStateId)) {
      missingElements.push(el);
    }
  }

  return {
    valid: missingElements.length === 0 && duplicateDevNames.size === 0,
    missingElements,
    duplicateDevNames: Array.from(duplicateDevNames),
    timestamp: new Date().toISOString()
  };
}

async function generateXpathForStateElements(aiService, screenshotBase64, xmlText, elements, os) {
  const genConfig = CONFIG.GENERATION;
  const prompt = PromptBuilder.createXpathOnlyPrompt({
    screenshotBase64,
    xmlText,
    elements,
    os,
    genConfig
  });

  // Use null instead of CONFIG.MODEL to let aiService use the project's model configuration
  return await retryAICall(() =>
    aiService.generateXpathForElements(null, prompt, os)
  );
}

function groupElementsByStateAndOs(data, page) {
  console.log("=== STARTING ELEMENT GROUPING BY STATE AND OS ===");
  console.log(`Input data contains ${data.length} items`);
  console.log(`Page contains ${page.states?.length || 0} states`);
  
  // Log all input data to inspect for patterns
  console.log("Input data elements:");
  data.forEach((item, index) => {
    console.log(`${index}: ${item.devName}`);
  });
  
  // Debug the structure of the first state if available
  if (page.states && page.states.length > 0) {
    console.log("First state structure sample:", JSON.stringify(page.states[0], null, 2));
  } else {
    console.log("WARNING: No states found in page object");
  }

  const groupedData = {};
  // Track elements with unknown state IDs
  const elementsWithUnknownStates = [];

  // First phase: Group elements by state ID and OS
  console.log("\n=== PHASE 1: GROUPING ELEMENTS ===");
  for (const item of data) {
    const stateIdsObj = item.state_ids || item.state_Ids || {};
    const keys = Object.keys(stateIdsObj);
    
    if (keys.length === 0) {
      console.log(`WARNING: Item with devName "${item.devName}" has no state IDs`);
      continue;
    }
    
    console.log(`\nProcessing item: ${item.devName}`);
    console.log(`State IDs object: ${JSON.stringify(stateIdsObj)}`);
    
    // Flag to check if this item has any unknown states
    let hasUnknownState = false;

    for (const os in stateIdsObj) {
      const stateId = stateIdsObj[os];
      if (!stateId) {
        console.log(`WARNING: Empty state ID for OS "${os}" in item "${item.devName}"`);
        continue;
      }
      
      // Check if this is an unknown state
      if (stateId === "unknown") {
        console.log(`DETECTED UNKNOWN STATE: Element "${item.devName}" has unknown state for OS "${os}"`);
        hasUnknownState = true;
      }
      
      const key = `${stateId}-${os}`;
      console.log(`Creating group key: ${key} (State ID: ${stateId}, OS: ${os})`);

      if (!groupedData[key]) {
        groupedData[key] = {
          state_id: stateId,
          osVersion: os,
          elements: [],
          processingStatus: 'pending'
        };
        console.log(`Created new group for key: ${key}`);
      }

      const { state_ids, state_Ids, ...rest } = item;
      groupedData[key].elements.push(rest);
      console.log(`Added element to group ${key}`);
    }
    
    // If this item has unknown state, save the entire item for detailed inspection
    if (hasUnknownState) {
      elementsWithUnknownStates.push({
        ...item,
        _index: data.indexOf(item) // Save original index for reference
      });
    }
  }

  // Second phase: Resolve state data for each group
  console.log("\n=== PHASE 2: RESOLVING STATE DATA ===");
  console.log(`Number of groups to process: ${Object.keys(groupedData).length}`);
  
  // Log all available state IDs and OS versions for reference
  if (page.states && page.states.length > 0) {
    const availableStates = page.states.map(s => ({
      id: s.id,
      versions: s.versions ? Object.keys(s.versions) : []
    }));
    console.log("Available states and versions:", JSON.stringify(availableStates, null, 2));
  }

  for (const key in groupedData) {
    const { state_id, osVersion } = groupedData[key];
    console.log(`\nResolving state data for group: ${key}`);
    console.log(`Looking for state ID: "${state_id}" with OS version: "${osVersion}"`);

    // First check if we can find the state by ID
    const stateById = page.states?.find(s => s.id === state_id);
    
    if (!stateById) {
      console.log(`ERROR: No state found with ID: "${state_id}"`);
      if (page.states && page.states.length > 0) {
        console.log(`Available state IDs: ${page.states.map(s => s.id).join(', ')}`);
      }
      groupedData[key].processingStatus = 'missing_state_data';
      continue;
    }
    
    console.log(`Found state with ID: "${state_id}", title: "${stateById.title || 'unnamed'}"`);
    
    // Check if the state has a versions object
    if (!stateById.versions) {
      console.log(`ERROR: State with ID "${state_id}" has no versions object`);
      groupedData[key].processingStatus = 'missing_versions_object';
      continue;
    }
    
    // Check if the specific OS version exists
    if (!stateById.versions[osVersion]) {
      console.log(`ERROR: State with ID "${state_id}" has no version for OS "${osVersion}"`);
      console.log(`Available versions: ${Object.keys(stateById.versions).join(', ')}`);
      
      // Try case-insensitive match
      const foundVersion = Object.keys(stateById.versions).find(
        v => v.toLowerCase() === osVersion.toLowerCase()
      );
      
      if (foundVersion) {
        console.log(`Found case-insensitive match: "${foundVersion}"`);
        // Use the correctly cased version
        groupedData[key].osVersion = foundVersion;
        groupedData[key].screenshot = stateById.versions[foundVersion].screenShot;
        groupedData[key].pageSource = stateById.versions[foundVersion].pageSource;
        groupedData[key].stateDescription = stateById.description;
        groupedData[key].stateTitle = stateById.title;
        groupedData[key].pageDescription = page.description;
        groupedData[key].pageTitle = page.name;
        groupedData[key].processingStatus = 'ready';
        console.log(`Successfully resolved state data using case-insensitive match`);
      } else {
        groupedData[key].processingStatus = 'missing_os_version';
      }
      continue;
    }
    
    // Successfully found the state and version
    console.log(`Found version "${osVersion}" for state ID "${state_id}"`);
    groupedData[key].screenshot = stateById.versions[osVersion].screenShot;
    groupedData[key].pageSource = stateById.versions[osVersion].pageSource;
    groupedData[key].stateDescription = stateById.description;
    groupedData[key].stateTitle = stateById.title;
    groupedData[key].pageDescription = page.description;
    groupedData[key].pageTitle = page.name;
    groupedData[key].processingStatus = 'ready';
    console.log(`Successfully resolved state data for group ${key}`);
  }

  // Final statistics
  console.log("\n=== GROUPING COMPLETED ===");
  const statistics = Object.values(groupedData).reduce((stats, group) => {
    stats[group.processingStatus] = (stats[group.processingStatus] || 0) + 1;
    return stats;
  }, {});
  
  console.log("Processing status statistics:", statistics);
  return Object.values(groupedData);
}

/**
 * NEW: Execute full pipeline with best-of-N XPath runs
 */
async function executeVisualPipeline(page, osVersions) {
  const processingStatus = {
    startTime: new Date().toISOString(),
    pageId: "DUMMY",
    osVersions,
    steps: {}
  };

  Logger.log("Starting visual elements extraction...", "info");
  processingStatus.steps.extraction = { status: 'in_progress' };

  let visualElements;
  try {
    visualElements = await extractPageVisualElements(page, osVersions);
    processingStatus.steps.extraction = {
      status: 'complete',
      elementsCount: visualElements.length
    };
  } catch (extractionError) {
    processingStatus.steps.extraction = {
      status: 'failed',
      error: extractionError.message
    };
    throw extractionError;
  }

  Logger.log("Extracting elements by state and OS versions...", "info");
  processingStatus.steps.grouping = { status: 'in_progress' };

  let elementsByStateByOS;
  try {
    elementsByStateByOS = groupElementsByStateAndOs(visualElements, page);
    processingStatus.steps.grouping = {
      status: 'complete',
      groupsCount: elementsByStateByOS.length
    };
    Logger.log(`Extracted ${elementsByStateByOS.length} element groups by state and OS`, "info");
    await FileUtils.writeOutputToFile(elementsByStateByOS, "elements_by_state_and_os");
  } catch (groupingError) {
    processingStatus.steps.grouping = {
      status: 'failed',
      error: groupingError.message
    };
    throw groupingError;
  }
  return elementsByStateByOS
}
async function executeXpathPipeline(elementsByStateByOS, osVersions) {
  
  const processingStatus = {
    startTime: new Date().toISOString(),
    pageId: "DUMMY",
    osVersions,
    steps: {}
  };

  Logger.log("Processing XPath generation...", "info");
  processingStatus.steps.xpathGeneration = {
    status: 'in_progress',
    groups: {}
  };

  const finalRawResults = [];
  const xpathRunsConfig = CONFIG.XPATH_ANALYSIS_RUNS || 1;

  for (const elementGroup of elementsByStateByOS) {
    const { state_id, osVersion, elements, screenshot, pageSource, processingStatus: groupStatus } = elementGroup;
    const groupKey = `${state_id}_${osVersion}`;

    processingStatus.steps.xpathGeneration.groups[groupKey] = { status: 'in_progress' };

    if (groupStatus === 'missing_state_data') {
      Logger.log(`Skipping XPath generation for incomplete group: ${groupKey}`, "warn");
      processingStatus.steps.xpathGeneration.groups[groupKey] = {
        status: 'skipped',
        reason: 'missing_state_data'
      };
      continue;
    }

    try {
      Logger.log(`Running XPath analysis for stateId: ${state_id}, OS: ${osVersion} (${xpathRunsConfig} runs)`, "info");
      const runs = [];
      for (let runIndex = 0; runIndex < xpathRunsConfig; runIndex++) {
        const xpathResult = await generateXpathForStateElements(aiService, screenshot, pageSource, elements, osVersion);
        await FileUtils.writeOutputToFile(xpathResult, `response_xpath_result_${state_id}_${osVersion}_run${runIndex}`);
        const parsed = JSON.parse(xpathResult.choices[0].message.content);

        // Evaluate each xpath
        let validCount = 0;
        for (const el of parsed) {
          const evalResult = evaluateXPath(pageSource, el.xpathLocator);
          el.locatorEvaluation = evalResult;
          if (evalResult?.success) validCount++;
        }
        const totalCount = parsed.length;
        const score = totalCount > 0 ? (validCount / totalCount) : 0;

        runs.push({ parsed, validCount, totalCount, score });
        await FileUtils.writeOutputToFile({ validCount, totalCount, score }, `xpath_run_score_${state_id}_${osVersion}_run${runIndex}`);
      }

      // Pick best run
      const bestRun = runs.reduce((best, curr) => curr.score > best.score ? curr : best, runs[0]);
      Logger.log(`Best XPath run for ${groupKey}: ${bestRun.validCount}/${bestRun.totalCount} (${(bestRun.score * 100).toFixed(2)}%)`, "info");
      await FileUtils.writeOutputToFile(bestRun, `best_xpath_run_${state_id}_${osVersion}`);

      // Attach best run results
      elementGroup.elements_with_xpaths = bestRun.parsed;

      processingStatus.steps.xpathGeneration.groups[groupKey] = {
        status: 'complete',
        validXpaths: bestRun.validCount,
        totalXpaths: bestRun.totalCount,
        successRate: bestRun.score
      };

      await FileUtils.writeOutputToFile(elementGroup, `json_evaluated_xpath_result_${state_id}_${osVersion}`);
      finalRawResults.push(elementGroup);
      Logger.log(`Completed XPath generation and evaluation for stateId: ${state_id}, OS: ${osVersion}`, "info");
    } catch (xpathError) {
      Logger.error(`Error generating XPaths for stateId: ${state_id}, OS: ${osVersion}:`, xpathError);
      processingStatus.steps.xpathGeneration.groups[groupKey] = {
        status: 'failed',
        error: xpathError.message
      };
    }
  }

  // Write the final raw results to a file
  await FileUtils.writeOutputToFile(finalRawResults, "final_raw_results_file");
  const clean_results = createMappedElements(finalRawResults);
  await FileUtils.writeOutputToFile(clean_results, "final_cleaned_results_file");
  
  processingStatus.steps.xpathGeneration.status = 'complete';
  processingStatus.endTime = new Date().toISOString();
  await FileUtils.writeOutputToFile(processingStatus, "processing_status");

  Logger.log("Processing completed successfully", "info");
  return clean_results;
}

async function executePOMClassPipeline(page)
{
  
}
export const  createMappedElements=(states) =>{
  const result = [];
  for (const state of states) {
      const os = state.osVersion.toLowerCase();
      const elements = state.elements;
      const xpathElements = state.elements_with_xpaths;

      const xpathMap = new Map();
      for (const xpathEl of xpathElements) {
          xpathMap.set(xpathEl.devName, xpathEl);
      }

      for (const element of elements) {
          const xpathEl = xpathMap.get(element.devName);
          if (xpathEl) {
              result.push({
                  devName: element.devName,
                  value: element.value,
                  name: element.name,
                  description: element.description,
                  stateId: state.state_id,
                  platform:os,
                  xpath: xpathEl.locatorEvaluation
                  
              });
          }
      }
  }
  return result;
}

// Main entry
async function main() {
  try {
    const osVersions = CONFIG.OS_VERSIONS || ['ios', 'android'];
    const page = await PageService.getPageById(CONFIG.DATA_PATH, CONFIG.PAGE_ID);
    const visualResult =await executeVisualPipeline(page, osVersions);
    const xpathResult = await executeXpathPipeline(visualResult)
    return xpathResult
  } catch (error) {
    Logger.error("Fatal error in main process:", error);
    await FileUtils.writeOutputToFile({
      error: error.toString(),
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, "fatal_error_log");
    process.exit(1);
  }
  
}

//main();

export {
  extractPageVisualElements,
  generateXpathForStateElements,
  groupElementsByStateAndOs,
  validateElementsAgainstPageState,
  retryAICall,
  executeVisualPipeline,
  executeXpathPipeline
};
