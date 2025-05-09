# Appium Inspector Transition Analysis

This tool analyzes transitions between different states of an application recorded during a testing session. It uses AI to generate detailed descriptions of what changed between states, technical analysis of the changes, and inferences about user intent.

## Overview

The Transition Analysis Pipeline:

1. Takes a recording of app states (screenshots, XML structures, and actions)
2. Analyzes transitions between consecutive states
3. Generates detailed descriptions of what changed
4. Outputs a structured analysis report

## Usage

### Command Line

To run the analysis from the command line:

```bash
# Using the CommonJS wrapper (recommended in most environments):
node analyze-transitions.cjs <recording-file.json> [output-file.json]

# Or using the ES module directly:
node analyze-transitions.js <recording-file.json> [output-file.json]
```

These scripts are wrappers that call the implementation in the `app/common/renderer/lib/ai` directory.

**Parameters:**
- `<recording-file.json>` - Path to the JSON file containing recorded states
- `[output-file.json]` - (Optional) Path where the analysis results should be saved

If no output path is provided, the results will be saved next to the input file with a timestamp.

### Programmatic API

You can also use the Transition Analysis Pipeline in your code:

```javascript
// For ES modules (preferred in this project):
import { TransitionAnalysisPipeline } from './app/common/renderer/lib/ai/transitionAnalysisPipeline.js';
import fs from 'fs/promises';

// Load your recorded states
const recordedStatesRaw = await fs.readFile('./path/to/recording.json', 'utf8');
const recordedStates = JSON.parse(recordedStatesRaw);

// Run the analysis
TransitionAnalysisPipeline.analyzeTransitions(recordedStates, {
  outputPath: './path/to/output.json'
})
  .then(results => {
    console.log(`Analysis completed with ${results.length} transitions`);
  })
  .catch(error => {
    console.error('Error in analysis:', error);
  });
```

## Recording Format

The input file should contain an array of recorded states with this structure:

```javascript
[
  {
    "actionTime": 1621234567890,  // Timestamp when the state was recorded
    "action": {                   // Action that led to this state (optional)
      "action": "click",          // Type of action (click, sendKeys, etc.)
      "element": {                // Element that was interacted with
        "elementId": "login-button"
      },
      "args": []                  // Arguments for the action
    },
    "deviceArtifacts": {          // Device state
      "sessionDetails": {         // Session information
        "platformName": "Android",
        "platformVersion": "12",
        "deviceName": "Pixel 4"
      },
      "screenshotBase64": "...",  // Base64-encoded screenshot
      "pageSource": "<xml>...</xml>", // XML representation of the screen
      "currentContext": "NATIVE_APP"
    }
  },
  // Additional states...
]
```

## Output Format

The analysis results are saved as a JSON file with this structure:

```javascript
[
  {
    "fromActionTime": 1621234567890,  // Timestamp of the starting state
    "toActionTime": 1621234589012,    // Timestamp of the ending state
    "transitionDescription": "User clicked the login button and was taken to the home screen",
    "userAction": "click",            // Action that caused the transition
    "actionTarget": "login-button",   // Element that was interacted with
    "actionValue": null,              // Value used in the action (e.g., text input)
    "technicalChanges": [             // Technical details of what changed
      "New elements added: home-dashboard, menu-bar",
      "Removed elements: login-form, registration-link",
      "Text change in header from 'Login' to 'Welcome, User'"
    ],
    "inferredUserIntent": "The user was attempting to log into the application",
    "qualityAssessment": "The transition was smooth and responsive, with appropriate feedback"
  },
  // Additional transitions...
]
```

## Testing

To run a simple test with mock data:

```bash
# Using the CommonJS wrapper (recommended in most environments):
node test-transition-analysis.cjs

# Or using the ES module directly:
node test-transition-analysis.js
```

This will create a mock recording and run the analysis pipeline on it.

## Integration with Appium Inspector

The Transition Analysis Pipeline integrates with the Appium Inspector's recording functionality. When you use the custom action recorder in the Appium Inspector, it captures detailed state information that can be analyzed with this pipeline.

To record states in Appium Inspector:

1. Navigate to the Analysis panel
2. Click the "Recording" button
3. Interact with your application
4. Click "Stop Recording"
5. Save the recording to a file

Then use the command-line tool to analyze the recording:

```bash
node analyze-transitions.js /path/to/saved-recording.json
```

## Requirements

- Node.js 14 or higher
- API credentials for a supported AI service (configured in the model settings)

## Configuring AI Model

The transition analysis uses the AI model configured in the project settings. By default, it uses the `TRANSITION_ANALYSIS` pipeline type with OpenAI's gpt-4-vision-preview model.

You can change this configuration in the Appium Inspector's Model Configuration settings.