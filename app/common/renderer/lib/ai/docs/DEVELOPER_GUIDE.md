# AI Module Developer Guide

This guide provides essential information for developers working with the Appium Inspector AI Module.

## Getting Started

### Prerequisites

- Node.js 14+
- Access to AI API (Google Vertex AI, OpenAI, or Azure OpenAI)
- Valid API key with appropriate permissions

### Setup

1. Configure the API credentials:

```javascript
// app/common/renderer/lib/ai/config.js
export const CONFIG = {
  API: {
    KEY: "your-api-key", // Required
    BASE_URL: "https://generativelanguage.googleapis.com/v1beta/openai/", // API endpoint
    MODEL: "gemini-2.0-flash" // Default model
  },
  // Additional configuration...
};
```

2. Validate your configuration:

```bash
node show-model-config.js
```

## Core Components

### Service Classes

- **AIService** (`aiService.js`): Primary interface for AI API interactions
- **ModelManager** (`modelManager.js`): Handles model selection and configuration
- **ActionRecorder** (`actionRecorder.js`): Manages recording of app states

### Pipeline Classes

- **TransitionAnalysisPipeline** (`transitionAnalysisPipeline.js`): Analyzes state transitions
- **StatesDisambiguationPipeline** (`statesDisambiguationPipeline.js`): Standardizes page names
- **PomPipeline** (`pomPipeline.js`): Generates Page Object Models
- **XPathFixPipeline** (`xpathFixPipeline.js`): Repairs XPath expressions

### UI Components

- **RecordingView** (`RecordingView.jsx`): UI for recording and playback
- **AppiumAnalysisPanel** (`AppiumAnalysisPanel.jsx`): Main container for AI features

## Development Workflow

### Adding a New Feature

1. Define clear requirements and design the feature
2. Update configuration in `config.js` if needed
3. Implement processing logic in an appropriate service or pipeline
4. Add UI components to visualize and interact with the feature
5. Add documentation and tests

### Testing

Test utilities are provided for different components:

```bash
# Test transition analysis
node test-transition-analysis.js

# Test recording condensing
node test-condenser.js

# Test recorder loading/saving
node app/common/renderer/lib/ai/test-recorder-loading.js
```

### Common Tasks

#### Processing a Recording

```javascript
// Import the pipeline
import { TransitionAnalysisPipeline } from './transitionAnalysisPipeline.js';

// Load recording data
const recordedStates = [...]; // Array of recorded states

// Configure options
const options = {
  enableParallelProcessing: true,
  includeHistoricalContext: true,
  historyDepth: 2,
  onProgress: (current, total) => {
    console.log(`Progress: ${current}/${total}`);
  }
};

// Process the recording
const results = await TransitionAnalysisPipeline.analyzeTransitions(recordedStates, options);
```

#### Adding a New AI Prompt

1. Define the prompt structure in `promptBuilder.js`
2. Create a method in `AIService` to use the prompt
3. Process the response in the appropriate pipeline

#### Creating a Visual Component

1. Create a new React component in the `components/ai` directory
2. Use Ant Design components for consistent UI
3. Connect to data sources via props or context
4. Add to the appropriate parent component

## Best Practices

### Performance

- Avoid blocking the UI thread with long-running operations
- Use chunking for large data processing
- Implement proper error handling and fallbacks
- Consider offline processing for CPU-intensive tasks

### State Management

- Keep UI state local when possible
- Use React hooks for complex state interactions
- Avoid deep nesting of stateful components
- Document state dependencies clearly

### API Usage

- Respect API rate limits and use throttling
- Implement proper error handling for API failures
- Optimize prompts to reduce token usage
- Cache results when appropriate

## Troubleshooting

### Common Issues

#### API Connection Errors

- Check API key validity
- Verify network connectivity
- Ensure correct API endpoint URL
- Check for rate limiting or quota issues

#### Slow Performance

- Reduce `historyDepth` or disable historical context
- Enable parallel processing for large recordings
- Increase `batchThreshold` and `processingChunkSize`
- Check for memory leaks with the React DevTools

#### Incorrect Analysis

- Check the prompt structure in debugging output
- Verify the XML and screenshot data is being processed correctly
- Adjust the model parameters in configuration
- Consider using a more capable model for complex analysis

### Debugging Tools

- Use `Logger.log()` and `Logger.error()` for consistent logging
- Enable `CONFIG.DEBUG` for additional debugging information
- Inspect network requests to AI providers
- Use the React DevTools to inspect component state

## Contributing

### Pull Request Process

1. Create a feature branch from `main`
2. Implement your changes with tests and documentation
3. Ensure all tests pass
4. Submit a pull request with a clear description of changes

### Coding Standards

- Follow existing patterns and naming conventions
- Use meaningful variable and function names
- Document complex logic and edge cases
- Write unit tests for new functionality

## Resources

- [Technical Documentation](./tech_docs.md)
- [Changelog](./CHANGELOG.md)
- [API Documentation](https://developers.generativeai.google/)
- [Ant Design Components](https://ant.design/components/overview/)