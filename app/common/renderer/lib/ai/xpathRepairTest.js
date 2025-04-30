import fs from 'fs/promises';
import path from 'path';
import { CONFIG } from './config.js';
import { Logger } from './logger.js';
import { executeXpathFixPipeline } from './xpathFixPipeline.js';
import { evaluateXPath } from './xpathEvaluator.js';

/**
 * Loads JSON data from a file
 * @param {string} filePath - Path to the JSON file
 * @returns {Promise<Object>} - Parsed JSON data
 */
async function loadJsonFromFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    throw new Error(`Failed to load JSON from ${filePath}: ${error.message}`);
  }
}

/**
 * Saves JSON data to a file
 * @param {string} filePath - Path to save the file
 * @param {Object} data - Data to save
 * @returns {Promise<boolean>} - Returns true if successful
 */
async function saveJsonToFile(filePath, data) {
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // Write the file
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      Logger.error(`Error writing to ${filePath}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * FileUtils module that creates directories before writing
   */
  const FileUtils = {
    /**
     * Writes output data to a file in the output directory
     * @param {Object} data - Data to save
     * @param {string} [filename] - Optional filename (will generate one with timestamp if not provided)
     * @returns {Promise<string>} - Returns the full path of the written file
     */
    async writeOutputToFile(data, filename) {
      try {
        // Create output directory if it doesn't exist
        const outputDir = path.join(process.cwd(), 'output');
        await fs.mkdir(outputDir, { recursive: true });
        
        // Create a filename with timestamp if none provided
        const actualFilename = filename || `output_${new Date().toISOString().replace(/:/g, '-')}`;
        
        // Add .json extension if not already present
        const finalFilename = actualFilename.endsWith('.json') 
          ? actualFilename 
          : `${actualFilename}.json`;
        
        // Write the file
        const filePath = path.join(outputDir, finalFilename);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        
        Logger.log(`Wrote ${finalFilename} to ${filePath}`, "debug");
        return filePath;
      } catch (error) {
        Logger.error(`Error writing ${filename} to file: ${error}`);
        throw error;
      }
    },
    
    /**
     * Ensures a directory exists, creating it if necessary
     * @param {string} dirPath - Path to the directory
     * @returns {Promise<boolean>} - Returns true if successful
     */
    async ensureDirectoryExists(dirPath) {
      try {
        await fs.mkdir(dirPath, { recursive: true });
        return true;
      } catch (error) {
        if (error.code === 'EEXIST') {
          // Directory already exists, which is fine
          return true;
        }
        Logger.error(`Error creating directory ${dirPath}: ${error.message}`);
        throw error;
      }
    },
    
    /**
     * Saves any data to a file, creating directories as needed
     * @param {string} filePath - Path to save the file
     * @param {string|Buffer|Object} data - Data to save
     * @param {Object} [options] - Options for writing the file
     * @param {string} [options.encoding='utf8'] - File encoding
     * @param {boolean} [options.json=false] - Whether to stringify as JSON
     * @returns {Promise<boolean>} - Returns true if successful
     */
    async writeFile(filePath, data, options = {}) {
      const { encoding = 'utf8', json = false } = options;
      
      try {
        // Create directory if it doesn't exist
        await this.ensureDirectoryExists(path.dirname(filePath));
        
        // Process data if it's JSON
        const contentToWrite = json && typeof data === 'object' 
          ? JSON.stringify(data, null, 2) 
          : data;
        
        // Write the file
        await fs.writeFile(filePath, contentToWrite, encoding);
        return true;
      } catch (error) {
        Logger.error(`Error writing to ${filePath}: ${error.message}`);
        throw error;
      }
    }
  };
  

/**
 * Generates a summary report of the XPath fixing results
 * @param {Array} originalElements - Original elements with failing XPaths
 * @param {Array} fixedElements - Elements with fixed XPaths
 * @returns {Object} - Summary report
 */
function generateFixReport(originalElements, fixedElements) {
  // Count of elements
  const totalElements = originalElements.length;
  
  // Original failures
  const originalFailingXPaths = originalElements.filter(element => 
    !element.xpath.success || 
    element.xpath.numberOfMatches === 0 || 
    element.xpath.xpathExpression === '//*[99=0]' ||
    element.xpath.xpathExpression === '//*[11=99]'
  );
  
  // Original success rate
  const originalSuccessCount = totalElements - originalFailingXPaths.length;
  const originalSuccessRate = (originalSuccessCount / totalElements) * 100;
  
  // Current failures
  const currentFailingXPaths = fixedElements.filter(element => 
    !element.xpath.success || 
    element.xpath.numberOfMatches === 0 || 
    element.xpath.xpathExpression === '//*[99=0]' ||
    element.xpath.xpathExpression === '//*[11=99]'
  );
  
  // Current success rate
  const currentSuccessCount = totalElements - currentFailingXPaths.length;
  const currentSuccessRate = (currentSuccessCount / totalElements) * 100;
  
  // Fixed count
  const fixedCount = originalFailingXPaths.length - currentFailingXPaths.length;
  const fixRate = originalFailingXPaths.length > 0 ? 
    (fixedCount / originalFailingXPaths.length) * 100 : 0;
  
  // Group failures by reason
  const failureReasons = {};
  for (const element of currentFailingXPaths) {
    if (element.xpath.error) {
      failureReasons[element.xpath.error] = (failureReasons[element.xpath.error] || 0) + 1;
    } else if (element.xpath.numberOfMatches === 0) {
      failureReasons['No matches found'] = (failureReasons['No matches found'] || 0) + 1;
    } else if (element.xpath.xpathExpression === '//*[99=0]' || element.xpath.xpathExpression === '//*[11=99]') {
      failureReasons['Fallback placeholder used'] = (failureReasons['Fallback placeholder used'] || 0) + 1;
    } else {
      failureReasons['Unknown failure'] = (failureReasons['Unknown failure'] || 0) + 1;
    }
  }
  
  // Group by platform
  const platformStats = {};
  for (const element of fixedElements) {
    const platform = element.platform || 'unknown';
    
    if (!platformStats[platform]) {
      platformStats[platform] = {
        total: 0,
        success: 0,
        failure: 0
      };
    }
    
    platformStats[platform].total++;
    
    if (
      element.xpath.success && 
      element.xpath.numberOfMatches > 0 && 
      element.xpath.xpathExpression !== '//*[99=0]' &&
      element.xpath.xpathExpression !== '//*[11=99]'
    ) {
      platformStats[platform].success++;
    } else {
      platformStats[platform].failure++;
    }
  }
  
  // Calculate platform success rates
  for (const platform in platformStats) {
    platformStats[platform].successRate = 
      (platformStats[platform].success / platformStats[platform].total) * 100;
  }
  
  // Get details of elements that were fixed
  const fixedElementsList = [];
  for (const element of originalFailingXPaths) {
    const fixedElement = fixedElements.find(el => 
      el.devName === element.devName && 
      el.stateId === element.stateId && 
      el.platform === element.platform
    );
    
    if (
      fixedElement && 
      fixedElement.xpath.success && 
      fixedElement.xpath.numberOfMatches > 0 && 
      fixedElement.xpath.xpathExpression !== '//*[99=0]' &&
      fixedElement.xpath.xpathExpression !== '//*[11=99]'
    ) {
      fixedElementsList.push({
        devName: element.devName,
        stateId: element.stateId,
        platform: element.platform,
        originalXPath: element.xpath.xpathExpression,
        fixedXPath: fixedElement.xpath.xpathExpression
      });
    }
  }
  
  return {
    summary: {
      totalElements,
      originalSuccessCount,
      originalFailureCount: originalFailingXPaths.length,
      originalSuccessRate: originalSuccessRate.toFixed(2) + '%',
      currentSuccessCount,
      currentFailureCount: currentFailingXPaths.length,
      currentSuccessRate: currentSuccessRate.toFixed(2) + '%',
      fixedCount,
      fixRate: fixRate.toFixed(2) + '%'
    },
    failureReasons,
    platformStats,
    fixedElements: fixedElementsList,
    stillFailingElements: currentFailingXPaths.map(element => ({
      devName: element.devName,
      stateId: element.stateId,
      platform: element.platform,
      xpathExpression: element.xpath.xpathExpression
    }))
  };
}

/**
 * Extracts failing XPaths from the data structure
 * @param {Object} data - Full data structure
 * @param {string} pageId - Optional page ID to filter by
 * @returns {Object} - Failing XPaths organized by page, state, and platform
 */
function extractFailingXPaths(data, pageId = null) {
  const result = {
    pages: {}
  };
  
  // Iterate through all pages
  for (const page of data.pages) {
    // Skip if specific pageId was provided and doesn't match
    if (pageId && page.id !== pageId) {
      continue;
    }
    
    Logger.log(`Processing page: ${page.id} (${page.name})`, "info");
    
    const pageData = {
      id: page.id,
      name: page.name,
      description: page.description,
      module: page.module,
      states: {},
      failingElements: []
    };
    
    // First check for failing XPaths in the aiAnalysis.locators array if it exists
    if (page.aiAnalysis && page.aiAnalysis.locators && Array.isArray(page.aiAnalysis.locators)) {
      for (const locator of page.aiAnalysis.locators) {
        if (locator.xpath && locator.xpath.numberOfMatches === 0) {
          // Add failing element to the page's failing elements
          pageData.failingElements.push({
            devName: locator.devName,
            value: locator.value,
            name: locator.name,
            description: locator.description,
            stateId: locator.stateId,
            platform: locator.platform,
            xpath: locator.xpath
          });
          
          // Track the state for this failing element
          if (!pageData.states[locator.stateId]) {
            pageData.states[locator.stateId] = {
              platforms: {},
              elements: []
            };
          }
          
          // Track the platform for this state
          if (!pageData.states[locator.stateId].platforms[locator.platform]) {
            pageData.states[locator.stateId].platforms[locator.platform] = {
              elements: []
            };
          }
          
          // Add the element to the appropriate state and platform
          pageData.states[locator.stateId].platforms[locator.platform].elements.push(locator);
        }
      }
    }
    
    // Now check in visualElements if they exist
    if (page.aiAnalysis && page.aiAnalysis.visualElements && Array.isArray(page.aiAnalysis.visualElements)) {
      for (const visualElement of page.aiAnalysis.visualElements) {
        const stateId = visualElement.state_id;
        const platform = visualElement.osVersion.toLowerCase();
        
        // Skip if there are no elements with XPaths
        if (!visualElement.elements_with_xpaths || !Array.isArray(visualElement.elements_with_xpaths)) {
          continue;
        }
        
        // Check each element for failing XPaths
        for (const element of visualElement.elements_with_xpaths) {
          if (element.locatorEvaluation && element.locatorEvaluation.numberOfMatches === 0) {
            // Skip if this element was already added from locators
            const isDuplicate = pageData.failingElements.some(e => 
              e.devName === element.devName && 
              e.stateId === stateId && 
              e.platform === platform
            );
            
            if (isDuplicate) {
              continue;
            }
            
            // Create an object with the necessary properties
            const formattedElement = {
              devName: element.devName,
              value: element.value,
              name: element.name,
              description: element.description,
              stateId: stateId,
              platform: platform,
              xpath: {
                xpathExpression: element.locatorEvaluation.xpathExpression,
                numberOfMatches: element.locatorEvaluation.numberOfMatches,
                matchingNodes: element.locatorEvaluation.matchingNodes || [],
                isValid: element.locatorEvaluation.isValid,
                success: false
              }
            };
            
            // Add failing element to the page's failing elements
            pageData.failingElements.push(formattedElement);
            
            // Track the state for this failing element
            if (!pageData.states[stateId]) {
              pageData.states[stateId] = {
                platforms: {},
                elements: []
              };
            }
            
            // Track the platform for this state
            if (!pageData.states[stateId].platforms[platform]) {
              pageData.states[stateId].platforms[platform] = {
                elements: []
              };
            }
            
            // Add the element to the appropriate state and platform
            pageData.states[stateId].platforms[platform].elements.push(formattedElement);
          }
        }
      }
    }
    
    // Add state data for each failing element
    for (const stateId in pageData.states) {
      // Find the state object
      const state = page.states.find(s => s.id === stateId);
      
      if (!state) {
        Logger.log(`Warning: State ${stateId} not found for page ${page.id}`, "warn");
        continue;
      }
      
      // Add state details
      pageData.states[stateId].title = state.title;
      pageData.states[stateId].description = state.description;
      
      // Add platform-specific data (screenshot and page source)
      for (const platform in pageData.states[stateId].platforms) {
        if (state.versions && state.versions[platform]) {
          pageData.states[stateId].platforms[platform].screenShot = state.versions[platform].screenShot;
          pageData.states[stateId].platforms[platform].pageSource = state.versions[platform].pageSource;
        } else {
          // Try to find a case-insensitive match
          const foundPlatform = Object.keys(state.versions || {}).find(
            p => p.toLowerCase() === platform.toLowerCase()
          );
          
          if (foundPlatform && state.versions[foundPlatform]) {
            pageData.states[stateId].platforms[platform].screenShot = state.versions[foundPlatform].screenShot;
            pageData.states[stateId].platforms[platform].pageSource = state.versions[foundPlatform].pageSource;
          } else {
            Logger.log(`Warning: Platform ${platform} not found for state ${stateId} in page ${page.id}`, "warn");
          }
        }
      }
    }
    
    // Only add the page if it has failing elements
    if (pageData.failingElements.length > 0) {
      result.pages[page.id] = pageData;
      Logger.log(`Found ${pageData.failingElements.length} failing XPaths in page ${page.id}`, "info");
    } else {
      Logger.log(`No failing XPaths found in page ${page.id}`, "info");
    }
  }
  
  return result;
}

/**
 * Creates a page object in the format required by the XPath fix pipeline
 * @param {Object} pageData - Page data extracted from the JSON
 * @returns {Object} - Page object in the required format
 */
function createPageObject(pageData) {
  return {
    id: pageData.id,
    name: pageData.name,
    description: pageData.description,
    module: pageData.module,
    states: Object.keys(pageData.states).map(stateId => {
      const stateData = pageData.states[stateId];
      const versions = {};
      
      // Create versions object
      for (const platform in stateData.platforms) {
        versions[platform] = {
          screenShot: stateData.platforms[platform].screenShot,
          pageSource: stateData.platforms[platform].pageSource
        };
      }
      
      return {
        id: stateId,
        title: stateData.title,
        description: stateData.description,
        versions
      };
    })
  };
}

/**
 * Updates the original data with fixed XPaths
 * @param {Object} originalData - Original data object
 * @param {Array} fixedElements - Elements with fixed XPaths
 * @returns {Object} - Updated data object
 */
function updateDataWithFixedXPaths(originalData, fixedElements) {
  const result = JSON.parse(JSON.stringify(originalData));
  
  // Create a map for quick lookup
  const fixedElementsMap = new Map();
  for (const element of fixedElements) {
    const key = `${element.devName}_${element.stateId}_${element.platform}`;
    fixedElementsMap.set(key, element);
  }
  
  // Update locators in aiAnalysis
  for (const page of result.pages) {
    if (page.aiAnalysis && page.aiAnalysis.locators) {
      for (const locator of page.aiAnalysis.locators) {
        const key = `${locator.devName}_${locator.stateId}_${locator.platform}`;
        const fixedElement = fixedElementsMap.get(key);
        
        if (fixedElement && fixedElement.xpath && locator.xpath.numberOfMatches === 0) {
          locator.xpath = { ...fixedElement.xpath };
        }
      }
    }
    
    // Update visual elements
    if (page.aiAnalysis && page.aiAnalysis.visualElements) {
      for (const visualElement of page.aiAnalysis.visualElements) {
        const stateId = visualElement.state_id;
        const platform = visualElement.osVersion.toLowerCase();
        
        if (visualElement.elements_with_xpaths) {
          for (const element of visualElement.elements_with_xpaths) {
            const key = `${element.devName}_${stateId}_${platform}`;
            const fixedElement = fixedElementsMap.get(key);
            
            if (fixedElement && fixedElement.xpath && element.locatorEvaluation.numberOfMatches === 0) {
              element.locatorEvaluation = { ...fixedElement.xpath };
              element.xpathLocator = fixedElement.xpath.xpathExpression;
            }
          }
        }
      }
    }
  }
  
  return result;
}

/**
 * Process a page to fix failing XPaths
 * @param {Object} pageData - Page data with failing XPaths
 * @param {Object} page - Page object formatted for the fix pipeline
 * @param {string} outputDir - Directory for output files
 * @returns {Promise<Object>} - Results with fixed XPaths
 */
async function processPageForFixing(pageData, page, outputDir) {
  try {
    Logger.log(`Processing page ${pageData.id} (${pageData.name}) for XPath fixes`, "info");
    
    // Make a deep copy of the original elements
    const originalElements = JSON.parse(JSON.stringify(pageData.failingElements));
    
    // Make sure the fixPipeline uses our FileUtils
    const modifiedExecuteXpathFixPipeline = async (elements, page) => {
      // Create a modified version of the pipeline that uses our FileUtils
      const originalModule = await import('./xpathFixPipeline.js');
      const originalFn = originalModule.executeXpathFixPipeline;
      
      // Override the FileUtils dependency
      global.FileUtils = FileUtils;
      
      try {
        return await originalFn(elements, page);
      }
      catch (e )
      {console.log(e)}
      finally {
        // Restore original FileUtils if needed
        delete global.FileUtils;
      }
    };
    
    // Execute the XPath fix pipeline with our FileUtils
    const startTime = new Date();
    const fixedElements = await modifiedExecuteXpathFixPipeline(pageData.failingElements, page);
    const endTime = new Date();
    const executionTime = (endTime - startTime) / 1000;
    
    Logger.log(`XPath fix pipeline completed in ${executionTime.toFixed(2)} seconds`, "info");
    
    // Generate a report
    const report = generateFixReport(originalElements, fixedElements);
    
    // Display the report
    Logger.log(`\n===== XPATH FIX REPORT FOR PAGE ${pageData.id} =====\n`, "info");
    Logger.log(`Total elements: ${report.summary.totalElements}`, "info");
    Logger.log(`Original success: ${report.summary.originalSuccessCount}/${report.summary.totalElements} (${report.summary.originalSuccessRate})`, "info");
    Logger.log(`Current success: ${report.summary.currentSuccessCount}/${report.summary.totalElements} (${report.summary.currentSuccessRate})`, "info");
    Logger.log(`Fixed XPaths: ${report.summary.fixedCount}/${report.summary.originalFailureCount} (${report.summary.fixRate})`, "info");
    
    Logger.log("\n--- Platform Statistics ---", "info");
    for (const platform in report.platformStats) {
      const stats = report.platformStats[platform];
      Logger.log(`${platform}: ${stats.success}/${stats.total} (${stats.successRate.toFixed(2)}%)`, "info");
    }
    
    Logger.log("\n--- Failure Reasons ---", "info");
    for (const reason in report.failureReasons) {
      Logger.log(`${reason}: ${report.failureReasons[reason]}`, "info");
    }
    
    Logger.log(`\n${report.fixedElements.length} elements were successfully fixed`, "info");
    Logger.log(`${report.stillFailingElements.length} elements still have failing XPaths`, "info");
    
    // Save the report to our custom output directory
    try {
      const outputPath = path.join(outputDir, `${pageData.id}_xpath_fix_report.json`);
      await saveJsonToFile(outputPath, report);
      Logger.log(`Report saved to ${outputPath}`, "info");
      
      // Also save fixed elements
      const elementsPath = path.join(outputDir, `${pageData.id}_fixed_elements.json`);
      await saveJsonToFile(elementsPath, fixedElements);
      Logger.log(`Fixed elements saved to ${elementsPath}`, "info");
    } catch (error) {
      Logger.error(`Error saving report: ${error.message}`);
    }
    
    return {
      pageId: pageData.id,
      fixedElements,
      report
    };
  } catch (error) {
    Logger.error(`Error processing page ${pageData.id} for XPath fixes:`, error);
    throw error;
  }
}

/**
 * Main function to fix XPaths from a file
 */
async function main() {
  try {
    Logger.log("Starting advanced XPath Fix Pipeline", "info");
    
    // Parse command-line arguments
    const args = process.argv.slice(2);
    if (args.length < 1) {
      Logger.log("Usage: node fixXPathsFromFile.js <input-file> [page-id] [output-dir]", "error");
      process.exit(1);
    }
    
    const inputFilePath = args[0];
    const specificPageId = args[1] || null;
    const outputDir = args[2] || path.join(process.cwd(), 'xpath_fix_output');
    
    Logger.log(`Input file: ${inputFilePath}`, "info");
    if (specificPageId) {
      Logger.log(`Specific page ID: ${specificPageId}`, "info");
    } else {
      Logger.log("Processing all pages", "info");
    }
    Logger.log(`Output directory: ${outputDir}`, "info");
    
    // Create output directory
    try {
      await fs.mkdir(outputDir, { recursive: true });
      Logger.log(`Created output directory: ${outputDir}`, "debug");
    } catch (error) {
      Logger.error(`Failed to create output directory: ${error.message}`, "error");
      process.exit(1);
    }
    
    // Load data from file
    Logger.log("Loading data from file...", "info");
    let data;
    try {
      data = await loadJsonFromFile(inputFilePath);
      if (!data.pages || !Array.isArray(data.pages)) {
        throw new Error("Invalid data format: missing 'pages' array");
      }
      Logger.log(`Loaded data with ${data.pages.length} pages`, "info");
    } catch (error) {
      Logger.error("Failed to load data:", error);
      process.exit(1);
    }
    
    // Extract failing XPaths
    Logger.log("Extracting failing XPaths...", "info");
    const failingXPaths = extractFailingXPaths(data, specificPageId);
    const pageIds = Object.keys(failingXPaths.pages);
    
    if (pageIds.length === 0) {
      Logger.log("No failing XPaths found in the data", "info");
      process.exit(0);
    }
    
    Logger.log(`Found failing XPaths in ${pageIds.length} pages`, "info");
    
    // Save failing XPaths to file
    try {
      await saveJsonToFile(path.join(outputDir, 'failing_xpaths.json'), failingXPaths);
    } catch (error) {
      Logger.error(`Failed to save failing XPaths: ${error.message}`);
      // Continue anyway, this is not critical
    }
    
    // Process each page
    const results = [];
    const totalStats = {
      totalElements: 0,
      originalSuccessCount: 0,
      fixedCount: 0,
      finalSuccessCount: 0
    };
    
    for (const pageId of pageIds) {
      try {
        const pageData = failingXPaths.pages[pageId];
        const page = createPageObject(pageData);
        
        // Save intermediate files for debugging
        try {
          await saveJsonToFile(path.join(outputDir, `${pageId}_page_data.json`), pageData);
          await saveJsonToFile(path.join(outputDir, `${pageId}_page_object.json`), page);
        } catch (error) {
          Logger.error(`Failed to save page data: ${error.message}`);
          // Continue anyway, this is not critical
        }
        
        // Process the page
        const result = await processPageForFixing(pageData, page, outputDir);
        results.push(result);
        
        // Update total statistics
        totalStats.totalElements += result.report.summary.totalElements;
        totalStats.originalSuccessCount += result.report.summary.originalSuccessCount;
        totalStats.fixedCount += result.report.summary.fixedCount;
        totalStats.finalSuccessCount += result.report.summary.currentSuccessCount;
      } catch (error) {
        Logger.error(`Error processing page ${pageId}:`, error);
        // Continue with next page
      }
    }
    
    // Generate overall report
    const overallReport = {
      processedPages: pageIds.length,
      totalStats: {
        totalElements: totalStats.totalElements,
        originalSuccessRate: totalStats.totalElements > 0 ? 
          ((totalStats.originalSuccessCount / totalStats.totalElements) * 100).toFixed(2) + '%' : '0.00%',
        finalSuccessRate: totalStats.totalElements > 0 ? 
          ((totalStats.finalSuccessCount / totalStats.totalElements) * 100).toFixed(2) + '%' : '0.00%',
        fixedCount: totalStats.fixedCount,
        improvementRate: ((totalStats.finalSuccessCount - totalStats.originalSuccessCount) / totalStats.totalElements * 100).toFixed(2) + '%'
      },
      pageResults: results.map(result => ({
        pageId: result.pageId,
        totalElements: result.report.summary.totalElements,
        originalSuccessRate: result.report.summary.originalSuccessRate,
        finalSuccessRate: result.report.summary.currentSuccessRate,
        fixedCount: result.report.summary.fixedCount,
        fixRate: result.report.summary.fixRate
      }))
    };
    
    // Display overall results
    Logger.log("\n\n===== OVERALL XPATH FIX RESULTS =====\n", "info");
    Logger.log(`Processed ${overallReport.processedPages} pages`, "info");
    Logger.log(`Total elements: ${totalStats.totalElements}`, "info");
    Logger.log(`Original success rate: ${overallReport.totalStats.originalSuccessRate}`, "info");
    Logger.log(`Final success rate: ${overallReport.totalStats.finalSuccessRate}`, "info");
    Logger.log(`Total fixed XPaths: ${totalStats.fixedCount}`, "info");
    Logger.log(`Overall improvement: ${overallReport.totalStats.improvementRate}`, "info");
    
    // Save overall report
    try {
      await saveJsonToFile(path.join(outputDir, 'overall_xpath_fix_report.json'), overallReport);
      
      // Merge all fixed elements into a single array
      const allFixedElements = results.flatMap(result => result.fixedElements);
      await saveJsonToFile(path.join(outputDir, 'all_fixed_elements.json'), allFixedElements);
      
      // Update the original data with fixed XPaths
      const updatedData = updateDataWithFixedXPaths(data, allFixedElements);
      await saveJsonToFile(path.join(outputDir, 'updated_data.json'), updatedData);
    } catch (error) {
      Logger.error(`Failed to save final reports: ${error.message}`);
    }
    
    Logger.log("\nXPath fix process completed successfully", "info");
    return {
      results,
      overallReport,
      allFixedElements: results.flatMap(result => result.fixedElements)
    };
  } catch (error) {
    Logger.error("Unhandled error in main process:", error);
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
// if (require.main === module) {
  main()
    .then(() => {
      Logger.log("Process completed successfully", "info");
      process.exit(0);
    })
    .catch(error => {
      Logger.error("Process failed:", error);
      process.exit(1);
    });
// }

export { main, extractFailingXPaths, createPageObject, updateDataWithFixedXPaths, processPageForFixing };