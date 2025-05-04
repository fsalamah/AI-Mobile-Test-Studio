# XPathManager - Centralized XPath Evaluation System

The `XPathManager` is a singleton service that provides centralized XPath evaluation across the Appium Inspector application. It ensures consistent evaluation results, cross-component coordination, and performance optimization through caching.

## Key Features

- **Centralized XML and XPath State**: Maintains a single source of truth for XML documents and evaluation results
- **Platform-Aware Evaluation**: Handles differences between iOS and Android XPaths correctly
- **Result Caching**: Improves performance by caching evaluation results
- **Event-Based Notifications**: Updates UI components when evaluation states change
- **Debounced Updates**: Prevents UI flickering by debouncing rapid update events
- **Consolidated Highlighting**: Coordinates highlight rendering across components

## Using the XPathManager

### Import the Singleton

```javascript
import xpathManager from './XPathManager';
```

### Set XML Source

Before evaluating XPaths, set the XML source:

```javascript
// Set XML and its metadata
xpathManager.setXmlSource(xmlString, stateId, platform);
```

Parameters:
- `xmlString`: XML content to parse and evaluate against
- `stateId`: Identifier for the current state (used for caching)
- `platform`: `'ios'` or `'android'` - platform context for evaluation

### Evaluate XPath

```javascript
// Basic evaluation
const result = xpathManager.centralizedEvaluate({
  xpathExpression: '//some[@xpath]',
  highlight: true,        // Whether to highlight matches (default: true)
  updateUI: true,         // Whether to update UI components (default: true)
  elementId: 'element1',  // Optional ID to track elements being evaluated
  elementPlatform: 'ios'  // Optional platform override
});

// Result includes:
// {
//   xpathExpression: String,
//   numberOfMatches: Number,
//   matchingNodes: Array,
//   isValid: Boolean,
//   success: Boolean,
//   actualNodes: Array (safe node references for highlighting)
// }
```

### Handle Highlighted Elements

```javascript
// Clear highlights
xpathManager.clearHighlights();

// Highlight without UI updates
xpathManager.highlightNodesOnly('//some[@xpath]');
```

### Subscribe to Events

```javascript
// Add a listener
const unsubscribe = xpathManager.addListener((eventType, data) => {
  switch (eventType) {
    case 'evaluationComplete':
      // Handle evaluation completion
      break;
    case 'highlightsChanged':
      // Update highlights
      break;
    case 'evaluationError':
      // Handle errors
      break;
    case 'xmlChanged':
      // Handle XML document changes
      break;
  }
});

// Unsubscribe when done
unsubscribe();
```

## Debugging

```javascript
// Enable debug mode globally
xpathManager.setDebugMode(true);

// Enable debug for a specific evaluation
xpathManager.centralizedEvaluate({
  xpathExpression: '//some[@xpath]',
  debug: true
});
```

## Migration from Legacy API

If you're currently using the legacy `evaluateXPath` function, switch to the centralized system:

### Before
```javascript
import { evaluateXPath } from '../../lib/ai/xpathEvaluator';

// Use directly with XML and XPath
const result = evaluateXPath(xmlSource, xpathExpression);
```

### After
```javascript
import xpathManager from './XPathManager';

// Set XML once
xpathManager.setXmlSource(xmlSource, stateId, platform);

// Evaluate as needed
const result = xpathManager.centralizedEvaluate({
  xpathExpression,
  highlight: true
});
```

## Best Practices

1. **Set XML Once**: Avoid setting XML repeatedly - set it once and reuse
2. **Use Element IDs**: When evaluating for specific elements, always provide an elementId
3. **Consider Platform**: Always specify the correct platform for context-aware evaluation
4. **Subscribe Wisely**: Add listeners when components mount, remove when they unmount
5. **Debug Sparingly**: Enable debug mode only when troubleshooting issues