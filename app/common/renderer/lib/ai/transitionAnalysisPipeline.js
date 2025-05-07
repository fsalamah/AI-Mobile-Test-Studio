import { FileUtils } from './fileUtils.js';
import { Logger } from './logger.js';
import { AIService } from './aiService.js';
import { PromptBuilder } from './promptBuilder.js';
import path from 'path';
import fs from 'fs/promises';

// Initialize AI service
const aiService = new AIService();

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

      // Process each pair of states to analyze the transitions
      const transitions = [];
      for (let i = 0; i < recordedStates.length - 1; i++) {
        const fromState = recordedStates[i];
        const toState = recordedStates[i + 1];
        
        Logger.log(`Analyzing transition ${i + 1} of ${recordedStates.length - 1}`, "info");
        
        try {
          // Create prompt for the transition analysis
          const transitionPrompt = this._createTransitionPrompt(fromState, toState);

          // Call AI service to analyze transition
          const transitionResult = await aiService.analyzeTransition(null, transitionPrompt);
          
          // Parse and validate the result
          const transitionDescription = this._parseTransitionResult(transitionResult, fromState, toState);
          
          // Add to transitions array
          transitions.push(transitionDescription);
          
          // Log each transition result individually
          await FileUtils.writeOutputToFile(transitionDescription, `transition_${i+1}_result`);
          
        } catch (transitionError) {
          Logger.error(`Error analyzing transition ${i + 1}:`, transitionError);
          
          // Add a placeholder for failed transitions
          transitions.push({
            fromActionTime: fromState.actionTime,
            toActionTime: toState.actionTime,
            hasTransition: false,
            transitionDescription: `Failed to analyze transition: ${transitionError.message}`,
            technicalActionDescription: "Error analyzing transition",
            actionTarget: null,
            actionValue: null,
            isPageChanged: false,
            isSamePageDifferentState: false,
            currentPageName: "Unknown page",
            currentPageDescription: "No page description available",
            inferredUserActivity: "Unknown activity",
            error: transitionError.message
          });
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
   * @returns {Array} Prompt for the AI service
   * @private
   */
  static _createTransitionPrompt(fromState, toState) {
    // Create a system prompt that instructs the AI on how to analyze transitions
    const systemInstruction = `# Mobile App Transition Analyzer

You are a specialized mobile UI transition analyst. Your task is to analyze the differences between two UI states and describe what changed from one state to another.

## Input Analysis Guidelines

1. You will receive two complete mobile app states:
   - **Before state**: The UI state before a user action
   - **After state**: The UI state after a user action

2. For each state, you will have:
   - Screenshot (visual representation)
   - XML source (structural representation)
   - Action metadata (what the user did, if available)

## Output Requirements

Provide a detailed analysis of the transition with these components:

1. **Has Transition**: Boolean indicating if the user has performed anything that caused the page to change or moved to a different page.

2. **Transition Description**: A clear, concise description of what changed between states.
   - Focus on visible UI changes from the user's perspective
   - Describe new elements that appeared or disappeared
   - Note content changes (text, values, selections)

3. **Technical Action Description**: Detailed description of the action that caused this transition.
   - Example: "User tapped on the 'Continue' button at the bottom of the screen"
   - Example: "User entered text 'Faisal' into the First Name field"

4. **Action Target**: Describe the specific UI element targeted by the action.
   - Example: "First Name text field"
   - Example: "Continue button"

5. **Action Value**: The value associated with the action, if applicable.
   - Example: "Faisal Salamah" for text input
   - Example: "Selected" for checkbox toggle

6. **Page Change Assessment**:
   - Is Page Changed: Boolean indicating if the user moved to a completely different page
   - Is Same Page Different State: Boolean indicating if the page is the same but in a different state (e.g., form validation error shown, dialog appeared)

7. **Page Identification**:
   - Current Page Name: Full, specific name of the current page to avoid confusion with similar pages
   - Current Page Description: Detailed description of the current page's purpose and content

8. **Inferred User Activity**: Based on the changes, what was the user doing?
   - What specific task was the user performing?
   - Which workflow are they engaged in?

## Response Format

Provide your analysis in this JSON format:
\`\`\`json
{
  "hasTransition": true,
  "transitionDescription": "Concise description of the transition from the user's perspective",
  "technicalActionDescription": "Detailed description of the action that caused this transition",
  "actionTarget": "Specific UI element that was the target of the action",
  "actionValue": "Value associated with the action, if applicable",
  "isPageChanged": false,
  "isSamePageDifferentState": true,
  "currentPageName": "Full and specific name of the current page",
  "currentPageDescription": "Detailed description of the current page's purpose and content",
  "inferredUserActivity": "Description of what the user was trying to accomplish"
}
\`\`\`

Focus on being specific, accurate, and insightful in your analysis. Look beyond the obvious to identify subtle but important interaction patterns.`;

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

    // Create messages array for the AI service
    return [
      {
        role: "system",
        content: systemInstruction
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Please analyze this transition between two UI states.\n\nSession info:\n${sessionInfo}\n\nTransition timestamps: From ${new Date(fromState.actionTime).toISOString()} to ${new Date(toState.actionTime).toISOString()}\n\n${actionInfo}`
          },
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
          },
          {
            type: "text",
            text: "Analyze the transition and provide your assessment in the required JSON format. Be specific about what changed visually and structurally."
          }
        ]
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
      
      // Construct the final transition description with required fields
      return {
        fromActionTime: fromState.actionTime,
        toActionTime: toState.actionTime,
        hasTransition: parsedContent.hasTransition || false,
        transitionDescription: parsedContent.transitionDescription || "No description available",
        technicalActionDescription: parsedContent.technicalActionDescription || "No action description available",
        actionTarget: parsedContent.actionTarget || null,
        actionValue: parsedContent.actionValue || null,
        isPageChanged: parsedContent.isPageChanged || false,
        isSamePageDifferentState: parsedContent.isSamePageDifferentState || false,
        currentPageName: parsedContent.currentPageName || "Unknown page",
        currentPageDescription: parsedContent.currentPageDescription || "No page description available",
        inferredUserActivity: parsedContent.inferredUserActivity || "Unknown activity"
      };
      
    } catch (error) {
      Logger.error("Error parsing transition result:", error);
      
      // Return a basic transition with error information
      return {
        fromActionTime: fromState.actionTime,
        toActionTime: toState.actionTime,
        hasTransition: false,
        transitionDescription: "Failed to analyze transition",
        technicalActionDescription: "Error parsing transition analysis",
        actionTarget: null,
        actionValue: null,
        isPageChanged: false,
        isSamePageDifferentState: false,
        currentPageName: "Unknown page",
        currentPageDescription: "No page description available",
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


