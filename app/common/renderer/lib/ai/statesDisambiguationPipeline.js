import { FileUtils } from './fileUtils.js';
import { Logger } from './logger.js';
import { AIService } from './aiService.js';
import { CONFIG } from './config.js';
import path from 'path';
import fs from 'fs/promises';

// Initialize AI service
const aiService = new AIService();

/**
 * Pipeline for disambiguating page names across recorded states
 * to ensure consistency in naming the same pages
 */
export class RecordedStatesDisambiguationPipeline {
  /**
   * Disambiguate page names across recorded states
   * @param {Array} transitionResults - Array of transition analysis results from TransitionAnalysisPipeline
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} Results of page name disambiguation with standardized flow and mapping
   */
  static async disambiguatePageNames(transitionResults, options = {}) {
    try {
      // Basic validation
      if (!Array.isArray(transitionResults) || transitionResults.length === 0) {
        throw new Error('No transition results provided for disambiguation');
      }

      Logger.log(`Starting page name disambiguation for ${transitionResults.length} transitions`, "info");

      // Mark pipeline start in log
      await FileUtils.writeOutputToFile({
        timestamp: new Date().toISOString(),
        transitionsCount: transitionResults.length,
        options
      }, "disambiguation_pipeline_start");

      // Extract page information from transitions - now includes userFlow and uniquePages
      const pageInformation = this._extractPageInformation(transitionResults);
      
      Logger.log(`Extracted user flow with ${pageInformation.userFlow.length} steps and ${Object.keys(pageInformation.uniquePages).length} unique pages`, "info");

      // Create prompt for disambiguation
      const disambiguationPrompt = this._createDisambiguationPrompt(pageInformation);

      // Call AI service to perform disambiguation
      Logger.log('Calling AI service to disambiguate page names', "info");
      const disambiguationResult = await aiService.disambiguatePages(null, disambiguationPrompt);

      // Parse the result - now returns standardizedFlow, standardizedPages, and pageNameMapping
      const parsedResults = this._parseDisambiguationResult(disambiguationResult, pageInformation);
      
      // Extract components from parsed results
      const { standardizedFlow, standardizedPages, pageNameMapping } = parsedResults;

      Logger.log(`Disambiguation complete. ${parsedResults.statistics.renamedPageCount} pages were renamed, resulting in ${standardizedPages.length} unique standardized pages`, "info");

      // Apply the mapping to create updated transitions
      const updatedTransitions = transitionResults.map(transition => {
        const originalPageName = transition.currentPageName;
        const standardizedPageName = pageNameMapping[originalPageName] || originalPageName;
        
        // Find the standardized page details
        const standardizedPageDetails = standardizedPages.find(page => 
          page.standardizedPageName === standardizedPageName
        );
        
        // Find if this page was renamed
        const wasRenamed = originalPageName !== standardizedPageName;
        
        // Return the updated transition with standardized page information
        return {
          ...transition,
          originalPageName,
          currentPageName: standardizedPageName,
          standardizedPageDescription: standardizedPageDetails?.standardizedPageDescription || transition.pageDescription,
          standardizedPageComponents: standardizedPageDetails?.standardizedPageComponents || transition.pageMainComponents,
          standardizedPageFunction: standardizedPageDetails?.standardizedPageFunction || transition.pagePrimaryFunction,
          wasRenamed
        };
      });

      // Generate output object with all the information
      const output = {
        standardizedFlow,     // The flow in chronological order with standardized names
        pageNameMapping,      // Mapping from original to standardized names
        standardizedPages,    // Array of unique standardized pages
        updatedTransitions,   // Original transitions with standardized names
        statistics: parsedResults.statistics
      };
      
      // Write output to file
      await FileUtils.writeOutputToFile(output, "disambiguation_results");

      return output;
    } catch (error) {
      Logger.error("Error in page name disambiguation pipeline:", error);
      await FileUtils.writeOutputToFile({
        error: error.toString(),
        stack: error.stack,
        timestamp: new Date().toISOString()
      }, "disambiguation_pipeline_error");
      throw error;
    }
  }

  /**
   * Extract page flow information from transition results in chronological order
   * @param {Array} transitionResults - Array of transition analysis results
   * @returns {Object} Page flow information and unique pages dictionary
   * @private
   */
  static _extractPageInformation(transitionResults) {
    // Get disambiguation settings from CONFIG
    const disambiguationConfig = CONFIG.PAGE_DISAMBIGUATION || {};
    
    // Determine if we should include screenshots and XML
    const includeScreenshots = disambiguationConfig.includeScreenshots || false;
    const includeXml = disambiguationConfig.includeXml || false;
    const maxScreenshotsPerPage = disambiguationConfig.maxScreenshotsPerPage || 1;
    const maxXmlSourcesPerPage = disambiguationConfig.maxXmlSourcesPerPage || 1;
    const maxXmlLength = disambiguationConfig.maxXmlLength || 10000;
    
    // First, prepare a chronological user flow
    const userFlow = [];
    
    // Process each transition to create chronological user flow
    transitionResults.forEach((transition, index) => {
      const pageName = transition.currentPageName;
      
      // Skip if we don't have a valid page name
      if (!pageName || pageName === "Unknown page") {
        return;
      }
      
      // Create a flow step object with necessary information
      const flowStep = {
        stepIndex: index,
        pageName: pageName,
        pageDescription: transition.pageDescription || transition.currentPageDescription || "",
        userAction: transition.transitionDescription || "No action recorded",
        components: Array.isArray(transition.pageMainComponents) ? transition.pageMainComponents : [],
        pageFunction: transition.pagePrimaryFunction || "",
        actionTime: transition.toActionTime,
        stateName: transition.stateName || ""
      };
      
      // Add screenshot if configured
      if (includeScreenshots && transition.deviceArtifacts?.screenshotBase64) {
        flowStep.screenshot = transition.deviceArtifacts.screenshotBase64;
      }
      
      // Add XML source if configured
      if (includeXml && transition.deviceArtifacts?.pageSource) {
        // Truncate XML if it's too long
        const xmlSource = transition.deviceArtifacts.pageSource;
        flowStep.xmlSource = xmlSource.length > maxXmlLength ? 
          xmlSource.substring(0, maxXmlLength) + "... (truncated)" : 
          xmlSource;
      }
      
      userFlow.push(flowStep);
    });
    
    // Also create a dictionary of unique page names for reference
    const uniquePages = {};
    
    userFlow.forEach(step => {
      const pageName = step.pageName;
      
      // If this is a new page name, initialize its entry
      if (!uniquePages[pageName]) {
        uniquePages[pageName] = {
          name: pageName,
          occurrences: 0,
          descriptions: [],
          pageFunction: step.pageFunction,
          components: [],
          flowIndices: [],
          screenshots: [],
          xmlSources: []
        };
      }
      
      // Update unique page information
      uniquePages[pageName].occurrences++;
      uniquePages[pageName].flowIndices.push(step.stepIndex);
      
      // Only add unique values
      if (step.pageDescription && !uniquePages[pageName].descriptions.includes(step.pageDescription)) {
        uniquePages[pageName].descriptions.push(step.pageDescription);
      }
      
      // Add components, ensuring uniqueness
      step.components.forEach(component => {
        if (!uniquePages[pageName].components.includes(component)) {
          uniquePages[pageName].components.push(component);
        }
      });
      
      // Add screenshot to page info if configured and available
      if (includeScreenshots && step.screenshot) {
        // Only add up to the max number of screenshots per page
        if (uniquePages[pageName].screenshots.length < maxScreenshotsPerPage) {
          uniquePages[pageName].screenshots.push({
            stepIndex: step.stepIndex,
            screenshot: step.screenshot,
            action: step.userAction
          });
        }
      }
      
      // Add XML source to page info if configured and available
      if (includeXml && step.xmlSource) {
        // Only add up to the max number of XML sources per page
        if (uniquePages[pageName].xmlSources.length < maxXmlSourcesPerPage) {
          uniquePages[pageName].xmlSources.push({
            stepIndex: step.stepIndex,
            xml: step.xmlSource,
            action: step.userAction
          });
        }
      }
    });
    
    return { 
      userFlow, 
      uniquePages,
      config: {
        includeScreenshots,
        includeXml,
        maxScreenshotsPerPage,
        maxXmlSourcesPerPage
      }
    };
  }

  /**
   * Create a prompt for page name disambiguation
   * @param {Object} pageInformation - Information about pages extracted from transitions
   * @returns {Array} Messages array for the AI service
   * @private
   */
  static _createDisambiguationPrompt(pageInformation) {
    // Create a system prompt that instructs the AI on how to disambiguate page names
    let systemInstruction = `# Mobile App Page Name Disambiguator

You are a specialized mobile UI analyst with expertise in standardizing and disambiguating page names across a mobile app recording. Your task is to systematically analyze page information collected during app usage and establish a consistent naming scheme.

## Input Analysis Guidelines

You will receive:
1. **Page information**: Collected data about pages from a recording session, including:
   - Page names as initially identified
   - Page descriptions and functions
   - UI components present on each page
   - Actions performed on these pages`;
    
    // Add instructions for screenshots and XML if enabled
    const { includeScreenshots, includeXml } = pageInformation.config;
    
    if (includeScreenshots) {
      systemInstruction += `
   - Screenshots of key pages to aid visual analysis`;
    }
    
    if (includeXml) {
      systemInstruction += `
   - XML source of key pages to aid structural analysis`;
    }

    // Continue with standard instructions
    systemInstruction += `

## Analysis Strategy

Follow this systematic process for disambiguation:
1. First, analyze all page names to identify potential duplicates (same page with different names)
2. Second, compare page descriptions, functions, and components to confirm similarity`;

    if (includeScreenshots) {
      systemInstruction += `
3. Third, use screenshot visual analysis to confirm when pages are the same or different`;
    }
    
    if (includeXml) {
      systemInstruction += `
4. Analyze XML structure to identify common elements that indicate same page with different states`;
    }

    systemInstruction += `
5. Determine which pages truly represent the same logical screen in the application
6. Finally, create standardized names and descriptions for each unique application page

## Standardization Requirements

Provide these outputs for EACH unique application page:

1. **standardizedPageName**: A consistent, descriptive name following these rules:
   - Begin with the app section/module (e.g., "Login", "Profile", "Shopping Cart")
   - Include a page type descriptor (e.g., "Form", "List", "Dashboard", "Details")
   - Use title case for all words
   - Be precise and unambiguous
   - Example: "Login Authentication Form", "Product Details View", "Shopping Cart Checkout"

2. **standardizedPageDescription**: A deterministic description that:
   - Precisely describes the page's primary functionality (1-2 sentences)
   - Focuses on the page's purpose, not its appearance
   - Is generic enough to apply to all instances of the page
   - Avoids references to specific data values

3. **standardizedPageFunction**: A concise phrase (3-7 words) that:
   - Captures the core purpose of the page
   - Uses a verb phrase describing the primary user intent
   - Is at the proper abstraction level

4. **standardizedPageComponents**: An array of 3-7 primary UI components that:
   - Defines the essential elements that characterize this page
   - Listed in order of importance
   - Each component includes its type and purpose

5. **originalPageNames**: Array of all the original names that refer to this same page

## Disambiguation Guidelines

When deciding if different page names refer to the same logical page:

1. **Strong evidence of SAME page**:
   - Nearly identical UI components
   - Same primary function
   - Similar descriptions
   - Sequential transitions between states`;
   
    if (includeScreenshots) {
      systemInstruction += `
   - Visual similarity in screenshots`;
    }
    
    if (includeXml) {
      systemInstruction += `
   - Similar XML structure and element hierarchy`;
    }

    systemInstruction += `

2. **Strong evidence of DIFFERENT pages**:
   - Substantially different UI components 
   - Different primary functions
   - Descriptions that indicate different purposes
   - Clear navigation actions between them`;
   
    if (includeScreenshots) {
      systemInstruction += `
   - Visually distinct layouts and content in screenshots`;
    }
    
    if (includeXml) {
      systemInstruction += `
   - Different XML element structures or hierarchies`;
    }

    systemInstruction += `

3. **Edge cases**:
   - Modal dialogs: Generally considered separate pages
   - Form steps: Different steps in a multi-step form should be different pages
   - Dynamic content: Same template with different content is the same page

## Response Format

Your response MUST follow this exact JSON schema:

\`\`\`json
[
  {
    "standardizedPageName": "Consistent Name For This Page",
    "standardizedPageDescription": "Detailed functional description for this page",
    "standardizedPageFunction": "Core Function Of Page",
    "standardizedPageComponents": ["Component 1", "Component 2", "Component 3"],
    "originalPageNames": ["Original Name 1", "Original Name 2"]
  },
  {
    "standardizedPageName": "Another Unique Page Name",
    "standardizedPageDescription": "Detailed functional description for this page",
    "standardizedPageFunction": "Core Function Of Page",
    "standardizedPageComponents": ["Component 1", "Component 2", "Component 3"],
    "originalPageNames": ["Original Name 3"]
  }
]
\`\`\`

Be thorough in your analysis and reasoning. The goal is to produce a standardized naming scheme that is consistent, clear, and accurately represents the application's navigation structure.`;

    // Get sorted user flow in chronological order for consistent analysis
    const userFlow = pageInformation.userFlow.sort((a, b) => a.stepIndex - b.stepIndex);
    
    // Get unique pages for analysis
    const pagesArray = Object.values(pageInformation.uniquePages);
    
    // Create the initial user message
    const messages = [
      {
        role: "system",
        content: systemInstruction
      },
      {
        role: "user",
        content: `Please disambiguate the following ${pagesArray.length} page names from a mobile app recording session with ${userFlow.length} steps.
            
I need you to analyze these pages in chronological order, determine which ones actually represent the same logical page in the application, and create a standardized naming scheme.

I'll now provide:
1. The complete page information extracted from the recording
2. Each step in the user flow in chronological order${includeScreenshots ? "\n3. Screenshots for each step to aid visual analysis" : ""}${includeXml ? `\n${includeScreenshots ? "4" : "3"}. XML source for each step to aid structural analysis` : ""}`
      }
    ];
    
    // Add the structured page information
    messages.push({
      role: "user",
      content: "COMPLETE PAGE INFORMATION:\n\n" + JSON.stringify(pagesArray.map(page => ({
        pageName: page.name,
        occurrences: page.occurrences,
        descriptions: page.descriptions,
        pageFunction: page.pageFunction,
        components: page.components,
        flowIndices: page.flowIndices
      })), null, 2)
    });
    
    // Create chronological flow message
    messages.push({
      role: "user",
      content: "USER FLOW IN CHRONOLOGICAL ORDER:\n\n" + JSON.stringify(userFlow.map(step => ({
        stepIndex: step.stepIndex,
        pageName: step.pageName,
        action: step.userAction,
        pageDescription: step.pageDescription
      })), null, 2)
    });
    
    // Add screenshots in chronological order if enabled
    if (includeScreenshots) {
      // Add header message
      messages.push({
        role: "user",
        content: "SCREENSHOTS FOR EACH STEP IN CHRONOLOGICAL ORDER:"
      });
      
      // Add screenshots for each step that has them, in chronological order
      userFlow.forEach(step => {
        // Find the page that contains this step
        const page = pagesArray.find(p => p.name === step.pageName);
        
        // Find the screenshot that matches this step if available
        if (page && page.screenshots) {
          const screenshot = page.screenshots.find(s => s.stepIndex === step.stepIndex);
          
          if (screenshot) {
            // Add screenshot context
            messages.push({
              role: "user",
              content: `Step ${step.stepIndex}: Screenshot for page "${step.pageName}" (Action: "${screenshot.action}")`
            });
            
            // Add the screenshot as a message with content array containing the image
            messages.push({
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${screenshot.screenshot}`
                  }
                }
              ]
            });
          }
        }
      });
    }
    
    // Add XML sources in chronological order if enabled
    if (includeXml) {
      // Add header message
      messages.push({
        role: "user",
        content: "XML SOURCES FOR EACH STEP IN CHRONOLOGICAL ORDER:"
      });
      
      // Add XML for each step that has it, in chronological order
      userFlow.forEach(step => {
        // Find the page that contains this step
        const page = pagesArray.find(p => p.name === step.pageName);
        
        // Find the XML that matches this step if available
        if (page && page.xmlSources) {
          const xmlData = page.xmlSources.find(s => s.stepIndex === step.stepIndex);
          
          if (xmlData) {
            // Add XML context and content
            messages.push({
              role: "user",
              content: `Step ${step.stepIndex}: XML source for page "${step.pageName}" (Action: "${xmlData.action}"):\n\n${xmlData.xml}`
            });
          }
        }
      });
    }
    
    // Add final instructions
    messages.push({
      role: "user",
      content: `Please carefully analyze the page information${includeScreenshots ? ", screenshots" : ""}${includeXml ? ", and XML sources" : ""} to identify which page names refer to the same actual page in the application. 

Follow these steps:
1. Examine all details for each page, especially noting visual similarities${includeScreenshots ? " in screenshots" : ""}${includeXml ? " and structural similarities in XML sources" : ""}
2. Identify cases where different names are used for what is clearly the same logical page
3. Create standardized names following the guidelines provided
4. Return your analysis in the required JSON format`
    });

    // Return the messages array
    return messages;
  }

  /**
   * Parse the disambiguation result from the AI service
   * @param {Object} result - Raw result from the AI service
   * @param {Object} originalPageInformation - Original page information for reference
   * @returns {Object} Parsed disambiguation results with standardized pages and page mapping
   * @private
   */
  static _parseDisambiguationResult(result, originalPageInformation) {
    try {
      // Parse the content from the AI response
      const content = result.choices[0].message.content;
      
      // Try to extract JSON from the content (the AI might wrap it in markdown code blocks)
      let parsedContent;
      
      try {
        // First try direct JSON parse
        parsedContent = JSON.parse(content);
      } catch (e) {
        // If direct parse fails, try to extract from markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          parsedContent = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error("Could not parse JSON from disambiguation response");
        }
      }
      
      // Validate the parsed content
      if (!Array.isArray(parsedContent)) {
        throw new Error("Disambiguation result is not an array");
      }
      
      // Ensure all pages have the required fields
      const standardizedPages = parsedContent.map(page => {
        return {
          standardizedPageName: page.standardizedPageName || "Unknown Page",
          standardizedPageDescription: page.standardizedPageDescription || "No description available",
          standardizedPageFunction: page.standardizedPageFunction || "Unknown function",
          standardizedPageComponents: Array.isArray(page.standardizedPageComponents) ? 
            page.standardizedPageComponents : [],
          originalPageNames: Array.isArray(page.originalPageNames) ? 
            page.originalPageNames : []
        };
      });
      
      // Create a mapping of original page names to standardized names
      const pageNameMapping = {};
      for (const standardPage of standardizedPages) {
        for (const originalName of standardPage.originalPageNames) {
          pageNameMapping[originalName] = standardPage.standardizedPageName;
        }
      }
      
      // Create a user flow to maintain compatibility with the newer implementation
      const userFlow = originalPageInformation.userFlow;
      const standardizedFlow = userFlow.map(step => {
        const originalPageName = step.pageName;
        const standardizedPageName = pageNameMapping[originalPageName] || originalPageName;
        const wasRenamed = originalPageName !== standardizedPageName;
        
        return {
          stepIndex: step.stepIndex,
          originalPageName: originalPageName,
          standardizedPageName: standardizedPageName,
          wasRenamed: wasRenamed,
          reason: wasRenamed ? 
            `Renamed to match other instances of the same page` : 
            `Page name already consistent`
        };
      });
      
      // Calculate statistics
      const originalPageCount = Object.keys(originalPageInformation.uniquePages).length;
      const renamedPageCount = Object.keys(pageNameMapping).length - standardizedPages.length;
      const standardizedPageCount = standardizedPages.length;
      
      Logger.log(`Disambiguation statistics:`, "info");
      Logger.log(`- Original unique page names: ${originalPageCount}`, "info");
      Logger.log(`- Pages that were renamed: ${renamedPageCount}`, "info");
      Logger.log(`- Standardized unique pages: ${standardizedPageCount}`, "info");
      
      // Reconstruct the results to include both standardized pages and flow for compatibility
      return {
        standardizedFlow,
        standardizedPages,
        pageNameMapping,
        statistics: {
          originalPageCount,
          renamedPageCount,
          standardizedPageCount
        }
      };
      
    } catch (error) {
      Logger.error("Error parsing disambiguation result:", error);
      throw error;
    }
  }

  /**
   * Run the disambiguation pipeline as a standalone script
   * @param {string} dataPath - Path to the JSON file containing transition results
   * @param {Object} options - Configuration options
   */
  static async runAsScript(dataPath, options = {}) {
    try {
      Logger.log(`Starting page name disambiguation script with data from: ${dataPath}`, "info");
      
      // Read the transition results from the file
      const transitionResults = await FileUtils.readJsonFile(dataPath);
      
      // Run the disambiguation
      const disambiguationResults = await this.disambiguatePageNames(transitionResults, options);
      
      // Determine output path
      const outputPath = options.outputPath || path.join(path.dirname(dataPath), 'page_disambiguation_results.json');
      
      // Write results to file
      await fs.writeFile(outputPath, JSON.stringify(disambiguationResults, null, 2), 'utf8');
      
      Logger.log(`Page name disambiguation completed. Results written to: ${outputPath}`, "info");
      
      return disambiguationResults;
      
    } catch (error) {
      Logger.error("Error running page name disambiguation script:", error);
      throw error;
    }
  }
}