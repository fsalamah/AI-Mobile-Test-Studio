import { FileUtils } from './fileUtils.js';
import { Logger } from './logger.js';
import { AIService } from './aiService.js';
import { PromptBuilder } from './promptBuilder.js';
import { CONFIG } from './config.js';
import path from 'path';
import fs from 'fs/promises';

// Initialize AI service
const aiService = new AIService();

// Get configuration for transition analysis
const TRANSITION_CONFIG = CONFIG.TRANSITION_ANALYSIS || {
  maxParallelRequests: 10,    // Default max parallel requests if not defined in config
  batchThreshold: 20,         // Default batch threshold
  processingChunkSize: 5,     // Default chunk size
  enableParallelProcessing: true, // Default to enable parallel processing
  includeHistoricalContext: true, // Default to include historical context
  historyDepth: 2             // Default history depth
};

/**
 * Pipeline for analyzing transitions between recorded states
 */
export class TransitionAnalysisPipeline {
  /**
   * Analyze transitions between recorded states
   * @param {Array} recordedStates - Array of recorded states from ActionRecorder
   * @param {Object} options - Configuration options
   * @returns {Promise<Array>} Array of transition descriptions
   */
  static async analyzeTransitions(recordedStates, options = {}) {
    try {
      // Basic validation
      if (!Array.isArray(recordedStates) || recordedStates.length < 2) {
        throw new Error('At least two recorded states are required for transition analysis');
      }

      Logger.log(`Starting transition analysis for ${recordedStates.length} states`, "info");

      // Mark pipeline start in log
      await FileUtils.writeOutputToFile({
        timestamp: new Date().toISOString(),
        statesCount: recordedStates.length,
        options
      }, "transition_analysis_start");

      // Store stripped down version of recorded states to use for non-AI processing
      // and for logging (avoids large base64 data in logs)
      const statesMetadata = recordedStates.map(state => ({
        actionTime: state.actionTime,
        actionType: state.action?.action || 'Unknown',
        actionTarget: state.action?.element?.elementId || null,
        actionArgs: state.action?.args || null,
        hasScreenshot: !!state.deviceArtifacts?.screenshotBase64,
        hasPageSource: !!state.deviceArtifacts?.pageSource,
        deviceType: state.deviceArtifacts?.sessionDetails?.platformName || 'Unknown',
        deviceVersion: state.deviceArtifacts?.sessionDetails?.platformVersion || 'Unknown',
      }));

      await FileUtils.writeOutputToFile(statesMetadata, "transition_states_metadata");

      // Use options or apply config defaults
      const maxParallelRequests = options.maxParallelRequests || TRANSITION_CONFIG.maxParallelRequests;
      const batchThreshold = options.batchThreshold || TRANSITION_CONFIG.batchThreshold;
      const chunkSize = options.chunkSize || TRANSITION_CONFIG.processingChunkSize;
      const enableParallelProcessing = options.enableParallelProcessing !== undefined ? 
        options.enableParallelProcessing : TRANSITION_CONFIG.enableParallelProcessing;
      const includeHistoricalContext = options.includeHistoricalContext !== undefined ? 
        options.includeHistoricalContext : TRANSITION_CONFIG.includeHistoricalContext;
      const historyDepth = options.historyDepth !== undefined ? 
        options.historyDepth : TRANSITION_CONFIG.historyDepth;
      
      // Progress callback for reporting analysis progress
      const progressCallback = options.onProgress || ((current, total) => {});
      
      // Store historical transition results to provide context for subsequent analyses
      const transitionHistory = [];
      
      // Determine the processing mode based on parallel processing config and number of states
      // 1. If parallel processing disabled - process transitions sequentially
      // 2. Small batches (< batchThreshold) - process all at once with maxParallelRequests concurrency
      // 3. Large batches (>= batchThreshold) - process in chunks with maxParallelRequests concurrency per chunk
      const isParallelDisabled = !enableParallelProcessing;
      const isSmallBatch = !isParallelDisabled && (options.batch === true || recordedStates.length <= batchThreshold);
      
      Logger.log(`Processing ${recordedStates.length - 1} transitions with max ${maxParallelRequests} parallel requests`, "info");
      
      // Create an array to store results in the correct order
      const transitions = new Array(recordedStates.length - 1);
      
      // Create a wrapper function for analyzing a single transition
      const analyzeTransition = async (fromIdx) => {
        const fromState = recordedStates[fromIdx];
        const toState = recordedStates[fromIdx + 1];
        
        try {
          Logger.log(`Starting analysis for transition ${fromIdx + 1} (${fromState.actionTime} to ${toState.actionTime})`, "info");
          
          // Get historical context if enabled and available
          let historicalContext = [];
          if (includeHistoricalContext && historyDepth > 0) {
            // Determine how many previous transitions we can include based on the history depth and current index
            const availableHistory = Math.min(historyDepth, fromIdx);
            
            if (availableHistory > 0) {
              // Get the relevant history based on the available transitions and the configured depth
              historicalContext = transitionHistory.slice(-availableHistory);
              Logger.log(`Including ${historicalContext.length} historical transitions as context for transition ${fromIdx + 1}`, "info");
            } else {
              Logger.log(`No historical context available for transition ${fromIdx + 1} (first state)`, "info");
            }
          }
          
          // Create prompt for the transition analysis
          const transitionPrompt = this._createTransitionPrompt(fromState, toState, historicalContext);
          
          // Call AI service to analyze transition
          const transitionResult = await aiService.analyzeTransition(null, transitionPrompt);
          
          // Parse and validate the result
          const transitionDescription = this._parseTransitionResult(transitionResult, fromState, toState);
          
          Logger.log(`Completed analysis for transition ${fromIdx + 1}`, "info");
          
          // Log each transition result individually
          await FileUtils.writeOutputToFile(transitionDescription, `transition_${fromIdx+1}_result`);
          
          // If we're including historical context, add this transition to the history
          if (includeHistoricalContext) {
            // Maintain history up to the configured depth plus a buffer
            // (we add some buffer to avoid frequent array manipulations)
            const maxHistorySize = historyDepth * 2;
            
            // Add new transition to history
            transitionHistory.push(transitionDescription);
            
            // Trim history if it exceeds the maximum size
            if (transitionHistory.length > maxHistorySize) {
              transitionHistory.splice(0, transitionHistory.length - maxHistorySize);
            }
          }
          
          // Return the result with its position index
          return {
            index: fromIdx,
            transition: transitionDescription
          };
        } catch (transitionError) {
          Logger.error(`Error analyzing transition ${fromIdx + 1}:`, transitionError);
          
          // Return a placeholder for failed transitions
          return {
            index: fromIdx,
            transition: {
              fromActionTime: fromState.actionTime,
              toActionTime: toState.actionTime,
              hasTransition: false,
              transitionDescription: `Failed to analyze transition: ${transitionError.message}`,
              technicalActionDescription: "Error analyzing transition",
              actionTarget: null,
              actionValue: null,
              stateName: "ErrorState",
              isPageChanged: false,
              isSamePageDifferentState: false,
              currentPageName: "Unknown page",
              currentPageDescription: "No page description available",
              pageDescription: "No functional description available",
              pageMainComponents: [],
              pagePrimaryFunction: "Unknown functionality",
              inferredUserActivity: "Unknown activity",
              error: transitionError.message
            }
          };
        }
      };
      
      if (isParallelDisabled) {
        // For sequential processing (parallel disabled), process one transition at a time
        Logger.log(`Sequential processing of ${recordedStates.length - 1} transitions (parallel processing disabled)`, "info");
        
        // Create an array of transition indices
        const transitionIndices = Array.from({ length: recordedStates.length - 1 }, (_, i) => i);
        const totalTransitions = transitionIndices.length;
        let completedCount = 0;
        
        // Process transitions sequentially
        for (const idx of transitionIndices) {
          Logger.log(`Sequentially processing transition ${idx + 1}/${totalTransitions}`, "info");
          
          // Process this transition
          const result = await analyzeTransition(idx);
          
          // Place result in the transitions array
          transitions[result.index] = result.transition;
          
          // Update progress
          completedCount++;
          progressCallback(completedCount, totalTransitions);
          
          Logger.log(`Completed ${completedCount}/${totalTransitions} transitions sequentially`, "info");
        }
        
        Logger.log(`Sequential processing completed for all ${totalTransitions} transitions`, "info");
      } else if (isSmallBatch) {
        // For small batches, process all transitions with controlled concurrency
        Logger.log(`Processing small batch of ${recordedStates.length - 1} transitions`, "info");
        
        // Create an array of transition indices
        const transitionIndices = Array.from({ length: recordedStates.length - 1 }, (_, i) => i);
        
        // Process transitions with a concurrency limit using the p-limit package concept
        const concurrentQueue = async (tasks, concurrency) => {
          const results = [];
          const executing = new Set();
          
          for (const task of tasks) {
            const p = Promise.resolve().then(() => task());
            results.push(p);
            
            executing.add(p);
            
            const clean = () => executing.delete(p);
            p.then(clean).catch(clean);
            
            if (executing.size >= concurrency) {
              await Promise.race(executing);
            }
          }
          
          return Promise.all(results);
        };
        
        // Set up a counter for tracking progress
        let completedCount = 0;
        const totalCount = transitionIndices.length;
        
        // Create task functions with progress tracking
        const tasks = transitionIndices.map(idx => {
          return async () => {
            const result = await analyzeTransition(idx);
            // Increment counter and report progress
            completedCount++;
            progressCallback(completedCount, totalCount);
            return result;
          };
        });
        
        // Process with controlled concurrency
        const results = await concurrentQueue(tasks, maxParallelRequests);
        
        // Log what we received
        Logger.log(`Received ${results.length} analysis results with controlled concurrency`, "info");
        
        // Place results in the correct positions in the transitions array
        for (const result of results) {
          transitions[result.index] = result.transition;
        }
      } else {
        // For large batches, process in chunks with controlled concurrency
        Logger.log(`Processing large batch of ${recordedStates.length - 1} transitions in chunks`, "info");
        
        // Calculate number of chunks needed
        const numChunks = Math.ceil((recordedStates.length - 1) / chunkSize);
        let globalCompletedCount = 0;
        const totalTransitions = recordedStates.length - 1;
        
        // Process chunks sequentially to avoid overwhelming the system
        for (let chunk = 0; chunk < numChunks; chunk++) {
          const startIdx = chunk * chunkSize;
          const endIdx = Math.min(startIdx + chunkSize, recordedStates.length - 1);
          
          Logger.log(`Processing chunk ${chunk + 1}/${numChunks} (transitions ${startIdx + 1} to ${endIdx})`, "info");
          
          // Create an array of transition indices for this chunk
          const chunkIndices = Array.from({ length: endIdx - startIdx }, (_, i) => startIdx + i);
          
          // Create task functions for this chunk with progress tracking
          const chunkTasks = chunkIndices.map(idx => {
            return async () => {
              const result = await analyzeTransition(idx);
              // Increment global counter and report progress
              globalCompletedCount++;
              progressCallback(globalCompletedCount, totalTransitions);
              return result;
            };
          });
          
          // Process this chunk with controlled concurrency
          const chunkResults = await Promise.all(
            chunkTasks.map((task, i) => {
              // Add a small delay to stagger requests
              return new Promise(resolve => {
                setTimeout(() => resolve(task()), i * 100);
              });
            })
          );
          
          // Place chunk results in the correct positions in the transitions array
          for (const result of chunkResults) {
            transitions[result.index] = result.transition;
          }
          
          // Log chunk completion
          Logger.log(`Completed chunk ${chunk + 1}/${numChunks} (${globalCompletedCount}/${totalTransitions} total)`, "info");
        }
      }

      // Write the complete results file
      await FileUtils.writeOutputToFile(transitions, "transition_analysis_results");
      
      Logger.log(`Transition analysis completed with ${transitions.length} transitions analyzed`, "info");
      
      return transitions;
      
    } catch (error) {
      Logger.error("Error in transition analysis pipeline:", error);
      await FileUtils.writeOutputToFile({
        error: error.toString(),
        stack: error.stack,
        timestamp: new Date().toISOString()
      }, "transition_analysis_error_log");
      throw error;
    }
  }

  /**
   * Create a prompt for transition analysis
   * @param {Object} fromState - Starting state
   * @param {Object} toState - Ending state
   * @param {Array} historicalContext - Optional array of previous transition results for context
   * @returns {Array} Prompt for the AI service
   * @private
   */
  static _createTransitionPrompt(fromState, toState, historicalContext = []) {
    // Create a system prompt that instructs the AI on how to analyze transitions with optimized instructions
    const systemInstruction = `# Mobile App Transition Analyzer (Optimized)

You are a specialized mobile UI transition analyzer with expertise in mobile app testing and automation. Your task is to systematically analyze the differences between two sequential UI states and provide deterministic, standardized results with detailed, consistent page descriptions.

## Input Analysis Guidelines

You will receive:
1. **Before state**: The UI state before a user action (with screenshot and XML source)
2. **After state**: The UI state after a user action (with screenshot and XML source)
3. **Action metadata**: Information about what action was performed (if available)
4. **Historical context**: Previous transitions in the sequence (may not be present for the first state)

## Analysis Strategy

Follow this fixed, systematic process for every analysis:
1. First, examine both screenshots carefully to identify visual changes
2. Second, compare the XML structures to detect element additions, removals, or modifications
3. Third, analyze the action metadata to understand what operation was performed
4. Fourth, if available, review historical context to understand the flow and ensure consistency in page naming
5. Finally, synthesize all information to determine the exact nature of the transition

## Using Historical Context (When Available)

When historical context is provided, use it to:
1. Maintain consistent page naming across the entire flow - a page that appears in both history and current analysis should have the same name
2. Use previous transitions to understand the user's journey through the application
3. Leverage previous page descriptions to ensure consistency in your current analysis
4. For pages that previously appeared in the history, use the exact same pageDescription, pageMainComponents, and pagePrimaryFunction values

## Page Naming Conventions

Use these strict conventions for page naming:
1. Always start with the app section/module (e.g., "Login", "Profile", "Shopping Cart")
2. Include a page type descriptor (e.g., "Form", "List", "Dashboard", "Details")
3. Add any specific identifiers if present (e.g., "Product #1234", "User: JohnDoe")
4. Example complete names: "Login Authentication Form", "Product Details View #5678", "Shopping Cart Checkout Summary"
5. Be consistent and specific, avoiding generic terms like "screen" or "page" alone

## State Description Conventions

Follow these guidelines for the new 'stateName' attribute:
1. For initial screens: "Initial State" + additional context if relevant
2. For error states: Error type + affected element/section (e.g., "Network Error Alert", "Validation Error: Email Field")
3. For partial UI updates: Specific state descriptor (e.g., "Form Partially Filled", "Dropdown Expanded")
4. For scrolled/swiped states: Direction + extent (e.g., "Scrolled To Bottom", "Swiped To Card 3")
5. For interactive elements: Interaction state (e.g., "Keyboard Active", "Search Results Visible")
6. Maximum 5 words, use camel case for multi-word states

## Page Description Requirements (NEW)

Provide these REQUIRED detailed page description components for disambiguation purposes:

1. **pageDescription**: A detailed, technical description of the page's functionality and purpose
   - Must be precisely 1-2 sentences (30-100 words)
   - Must focus on the page's primary functionality, not its visual appearance
   - Must be sufficiently distinctive to differentiate similar pages
   - Must avoid using transient data (e.g., specific user values, timestamps)
   - Format: "This page [primary function] allowing users to [main user actions possible]. It contains [key UI components] and serves as [role in workflow]."

2. **pageMainComponents**: An array of 3-7 PRIMARY UI components on the page 
   - Include only the most important components that define the page's core functionality
   - Each component must include its type and purpose (e.g., "Username input field", "Submit button")
   - Must be listed in order of importance or visual hierarchy
   - Must be consistently named across different states of the same page

3. **pagePrimaryFunction**: A single phrase (3-7 words) that identifies the page's main purpose
   - Must be a verb phrase that captures the primary user intent (e.g., "Authenticate User Credentials", "Display Product Details", "Configure Account Settings")
   - Must be at the correct abstraction level (not too generic, not too specific)
   - Must avoid references to specific data values or UI styles

These descriptions MUST be deterministic - the same page at different points should receive identical descriptions regardless of state changes or user data.

## Output Requirements

Provide a detailed analysis with these REQUIRED components:

1. **hasTransition**: Boolean indicating if ANY meaningful UI change occurred between states

2. **transitionDescription**: Clear, one-sentence summary of what changed, focused on user perspective
   - Must include specific element names and values
   - Must be under 100 characters
   - Format: "User [action] the [element] [additional details if relevant]"

3. **technicalActionDescription**: Precise technical description of the action
   - Must include element type, identifiers, and coordinates if available
   - Format: "[Action type] on [element type] with [identifier/attributes]"

4. **actionTarget**: The exact element targeted, including its type and name
   - Include both descriptor and element type (e.g., "Login Button", "Email Text Field")
   - Use official UI element names from the XML when available

5. **actionValue**: The exact value/data associated with the action
   - For text inputs: The exact text entered
   - For selections: The exact option selected
   - For toggles: "ON" or "OFF"
   - For complex actions: JSON object with relevant parameters

6. **stateName**: A concise label (2-5 words) that describes the current UI state (NOT the page)
   - Examples: "FormIncomplete", "ErrorDisplayed", "SwipedToBottom", "CardExpanded"
   - Should capture specific UI state, not just the page name
   - Must follow conventions outlined above

7. **isPageChanged**: Boolean - true ONLY if navigated to entirely new page/screen

8. **isSamePageDifferentState**: Boolean - true if same page but significant state change (validation errors, expanded sections, etc.)

9. **currentPageName**: Specific, full name of the current page using consistent naming conventions
   - Must be descriptive, unique, and follow the page naming convention above
   - Must be complete - never abbreviate or shorten page names
   - Include section identifiers if applicable

10. **currentPageDescription**: Detailed purpose of the current page (1-2 sentences)
    - Must include main function, key elements, and user goals

11. **pageDescription**: NEW FIELD - Detailed functional description as specified above

12. **pageMainComponents**: NEW FIELD - Array of key UI components as specified above  

13. **pagePrimaryFunction**: NEW FIELD - Core function phrase as specified above

14. **inferredUserActivity**: What the user is likely trying to accomplish
    - Must be tied to a concrete user workflow or task
    - Format: "User is [action verb]-ing [specific task]"

## Response Format

Your response MUST follow this exact JSON schema:

\`\`\`json
{
  "hasTransition": true or false,
  "transitionDescription": "Concise, deterministic description",
  "technicalActionDescription": "Precise technical details",
  "actionTarget": "Specific UI target element",
  "actionValue": "Exact associated value",
  "stateName": "ConciseStateLabel",
  "isPageChanged": true or false,
  "isSamePageDifferentState": true or false,
  "currentPageName": "Complete Standardized Page Name",
  "currentPageDescription": "Detailed explanation of page purpose",
  "pageDescription": "Detailed functional description for disambiguation",
  "pageMainComponents": ["Component 1", "Component 2", "Component 3"],
  "pagePrimaryFunction": "Core Function Of Page",
  "inferredUserActivity": "User is performing specific task"
}
\`\`\`

All fields must be populated with specific, deterministic values. Never return generic placeholders or "N/A" - infer the most likely value based on available evidence.`;

    // Extract and prepare the UI data for the before and after states
    const beforeScreenshot = fromState.deviceArtifacts?.screenshotBase64 || null;
    const afterScreenshot = toState.deviceArtifacts?.screenshotBase64 || null;
    const beforeXML = fromState.deviceArtifacts?.pageSource || "XML source not available";
    const afterXML = toState.deviceArtifacts?.pageSource || "XML source not available";
    
    // Add action metadata
    const actionInfo = toState.action ? `User action: ${toState.action.action || 'Unknown'} 
Target element: ${toState.action?.element?.elementId || 'Unknown'}
Args: ${JSON.stringify(toState.action?.args || {})}` : "No explicit action recorded";
    
    // Create session info
    const sessionInfo = `Device: ${fromState.deviceArtifacts?.sessionDetails?.platformName || 'Unknown'} ${fromState.deviceArtifacts?.sessionDetails?.platformVersion || 'Unknown'}
Device name: ${fromState.deviceArtifacts?.sessionDetails?.deviceName || 'Unknown'}
Automation: ${fromState.deviceArtifacts?.sessionDetails?.automationName || 'Unknown'}`;

    // Create the user message content array
    const userContent = [
      {
        type: "text",
        text: `Please analyze this transition between two UI states.\n\nSession info:\n${sessionInfo}\n\nTransition timestamps: From ${new Date(fromState.actionTime).toISOString()} to ${new Date(toState.actionTime).toISOString()}\n\n${actionInfo}`
      }
    ];
    
    // Add historical context if available
    if (historicalContext.length > 0) {
      // Add a section header for historical context
      userContent.push({
        type: "text",
        text: `\n\nHISTORICAL CONTEXT (${historicalContext.length} previous transitions):\n`
      });
      
      // Add each historical transition as context, with the most recent first
      historicalContext.forEach((history, idx) => {
        const historySection = `
PREVIOUS TRANSITION ${historicalContext.length - idx}:
- From: ${new Date(history.fromActionTime).toISOString()}
- To: ${new Date(history.toActionTime).toISOString()}
- Page Name: ${history.currentPageName}
- Action: ${history.transitionDescription}
- Technical: ${history.technicalActionDescription}
- State: ${history.stateName}
- Target: ${history.actionTarget || 'None'}
- Page changed: ${history.isPageChanged ? 'Yes' : 'No'}
`;
        userContent.push({
          type: "text",
          text: historySection
        });
      });
      
      // Add a separator after the history
      userContent.push({
        type: "text",
        text: "\n\nCURRENT TRANSITION TO ANALYZE:\n"
      });
    }
    
    // Add the current states to analyze
    userContent.push(
      {
        type: "text",
        text: "BEFORE STATE SCREENSHOT:"
      },
      {
        type: "image_url",
        image_url: {
          url: beforeScreenshot ? `data:image/png;base64,${beforeScreenshot}` : "No screenshot available"
        }
      },
      {
        type: "text",
        text: "AFTER STATE SCREENSHOT:"
      },
      {
        type: "image_url",
        image_url: {
          url: afterScreenshot ? `data:image/png;base64,${afterScreenshot}` : "No screenshot available"
        }
      },
      {
        type: "text",
        text: `BEFORE STATE XML SOURCE:\n\n${beforeXML.length > 10000 ? beforeXML.substring(0, 10000) + "... (truncated)" : beforeXML}`
      },
      {
        type: "text",
        text: `AFTER STATE XML SOURCE:\n\n${afterXML.length > 10000 ? afterXML.substring(0, 10000) + "... (truncated)" : afterXML}`
      }
    );
    
    // Add instructions for the AI
    const analysisInstructions = historicalContext.length > 0 
      ? "Analyze the transition and provide your assessment in the required JSON format. Be specific about what changed visually and structurally. Use the historical context to provide more accurate and consistent page naming and state descriptions."
      : "Analyze the transition and provide your assessment in the required JSON format. Be specific about what changed visually and structurally.";
    
    userContent.push({
      type: "text",
      text: analysisInstructions
    });
    
    // Create messages array for the AI service
    return [
      {
        role: "system",
        content: systemInstruction
      },
      {
        role: "user",
        content: userContent
      }
    ];
  }

  /**
   * Parse and validate the transition analysis result
   * @param {Object} result - Raw result from the AI service
   * @param {Object} fromState - Starting state
   * @param {Object} toState - Ending state
   * @returns {Object} Parsed and validated transition description
   * @private
   */
  static _parseTransitionResult(result, fromState, toState) {
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
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          parsedContent = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error("Could not parse JSON from response");
        }
      }
      
      // Construct the final transition description with required fields including the new stateName and pageDescription
      return {
        fromActionTime: fromState.actionTime,
        toActionTime: toState.actionTime,
        hasTransition: parsedContent.hasTransition || false,
        transitionDescription: parsedContent.transitionDescription || "No description available",
        technicalActionDescription: parsedContent.technicalActionDescription || "No action description available",
        actionTarget: parsedContent.actionTarget || null,
        actionValue: parsedContent.actionValue || null,
        stateName: parsedContent.stateName || "UnknownState",
        isPageChanged: parsedContent.isPageChanged || false,
        isSamePageDifferentState: parsedContent.isSamePageDifferentState || false,
        currentPageName: parsedContent.currentPageName || "Unknown page",
        currentPageDescription: parsedContent.currentPageDescription || "No page description available",
        pageDescription: parsedContent.pageDescription || "No functional description available",
        pageMainComponents: parsedContent.pageMainComponents || [],
        pagePrimaryFunction: parsedContent.pagePrimaryFunction || "Unknown functionality",
        inferredUserActivity: parsedContent.inferredUserActivity || "Unknown activity"
      };
      
    } catch (error) {
      Logger.error("Error parsing transition result:", error);
      
      // Return a basic transition with error information, including the new stateName field
      return {
        fromActionTime: fromState.actionTime,
        toActionTime: toState.actionTime,
        hasTransition: false,
        transitionDescription: "Failed to analyze transition",
        technicalActionDescription: "Error parsing transition analysis",
        actionTarget: null,
        actionValue: null,
        stateName: "ErrorState",
        isPageChanged: false,
        isSamePageDifferentState: false,
        currentPageName: "Unknown page",
        currentPageDescription: "No page description available",
        pageDescription: "No functional description available",
        pageMainComponents: [],
        pagePrimaryFunction: "Unknown functionality",
        inferredUserActivity: "Unknown activity",
        parsingError: error.message
      };
    }
  }

  /**
   * Run the transition analysis pipeline as a standalone script
   * @param {string} dataPath - Path to the JSON file containing recorded states
   * @param {Object} options - Configuration options
   */
  static async runAsScript(dataPath, options = {}) {
    try {
      Logger.log(`Starting transition analysis script with data from: ${dataPath}`, "info");
      
      // Read the recorded states from the file
      const recordedStates = await FileUtils.readJsonFile(dataPath);
      
      // Run the analysis
      const transitions = await this.analyzeTransitions(recordedStates, options);
      
      // Determine output path
      const outputPath = options.outputPath || path.join(path.dirname(dataPath), 'transition_analysis_results.json');
      
      // Write results to file
      await fs.writeFile(outputPath, JSON.stringify(transitions, null, 2), 'utf8');
      
      Logger.log(`Transition analysis completed. Results written to: ${outputPath}`, "info");
      
      return transitions;
      
    } catch (error) {
      Logger.error("Error running transition analysis script:", error);
      throw error;
    }
  }
}


