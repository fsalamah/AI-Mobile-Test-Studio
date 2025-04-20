import { CONFIG } from './config.js';
import { FileUtils } from './fileUtils.js';
import { PageService } from './pageService.js';
import { PromptBuilder } from './promptBuilder.js';
import { AIService } from './aiService.js';
import { ElementProcessor } from './elementProcessor.js';
import { Logger } from './logger.js';
import { evaluateXPath } from './xpathEvaluator.js';

const aiService = new AIService();
const model = CONFIG.MODEL;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

async function extractPageVisualElements(page, osVersions) {
  try {
    const os = CONFIG.DEFAULT_OS || 'ios';
    const analysisRuns = CONFIG.ANALYSIS_RUNS || 1;
    await FileUtils.writeOutputToFile(page, "original_page_data");
    const possibleStateIds = Array.from(new Set(page.states.map(s => s.id)));

    const initialPrompt = await PromptBuilder.generateStatesPrompt(page, CONFIG.GENERATION, os);
    await FileUtils.writeOutputToFile(initialPrompt, "initial_prompt");

    Logger.log(`Running initial analysis ${analysisRuns} time(s) with ${model}`, "info");

    const runs = [];

    for (let runIndex = 0; runIndex < analysisRuns; runIndex++) {
      const response = await retryAICall(() =>
        aiService.analyzeVisualElements(model, initialPrompt, possibleStateIds, 1, 0)
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

    Logger.log("Running final validation with gemini-2.0-flash", "info");
    const secondResponse = await retryAICall(() =>
      aiService.analyzeVisualElements("gemini-2.0-flash", validatedPrompt, possibleStateIds, 1, 0)
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
            aiService.analyzeVisualElements(model, stateIdPrompt, possibleStateIds)
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

  return await retryAICall(() =>
    aiService.generateXpathForElements(CONFIG.MODEL, prompt, os)
  );
}

function groupElementsByStateAndOs(data, page) {
  const groupedData = {};
  for (const item of data) {
    const stateIdsObj = item.state_ids || item.state_Ids || {};
    for (const os in stateIdsObj) {
      const stateId = stateIdsObj[os];
      const key = `${stateId}-${os}`;
      if (!groupedData[key]) {
        groupedData[key] = {
          state_id: stateId,
          osVersion: os,
          elements: [],
          processingStatus: 'pending'
        };
      }
      const { state_ids, state_Ids, ...rest } = item;
      groupedData[key].elements.push(rest);
    }
  }

  for (const key in groupedData) {
    const { state_id, osVersion } = groupedData[key];
    const state = page.states.find(s => s.id === state_id && s.versions[osVersion]);

    if (state) {
      groupedData[key].screenshot = state.versions[osVersion].screenShot;
      groupedData[key].pageSource = state.versions[osVersion].pageSource;
      groupedData[key].stateDescription = state.description;
      groupedData[key].stateTitle = state.title;
      groupedData[key].pageDescription = page.description;
      groupedData[key].pageTitle = page.name;
      groupedData[key].processingStatus = 'ready';
    } else {
      groupedData[key].processingStatus = 'missing_state_data';
      Logger.log(`Warning: Missing state data for ${key}`, "warn");
    }
  }

  return Object.values(groupedData);
}

/**
 * NEW: Execute full pipeline with best-of-N XPath runs
 */
async function executePipeline(page, osVersions) {
  const processingStatus = {
    startTime: new Date().toISOString(),
    pageId: CONFIG.PAGE_ID,
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
  return elementsByStateByOS;
}

function createMappedElements(states) {
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
                  [`${os}_StateId`]: state.state_id,
                  [`${os}_xpath`]: xpathEl.locatorEvaluation
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
    await executePipeline(page, osVersions);
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

main();

export {
  extractPageVisualElements,
  generateXpathForStateElements,
  groupElementsByStateAndOs,
  validateElementsAgainstPageState,
  retryAICall,
  executePipeline
};
