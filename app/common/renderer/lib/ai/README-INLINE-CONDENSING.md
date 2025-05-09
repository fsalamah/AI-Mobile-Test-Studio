# Action Recorder with Inline Condensing

This module enhances the Action Recorder functionality in Appium Inspector with real-time condensing capabilities. Instead of removing redundant states during post-processing, this feature marks them with an `isCondensed: true` flag during recording, making it easier to filter them later if needed.

## Key Features

- **Real-time condensation detection**: States that don't introduce significant changes are marked as condensed
- **Configurable comparison criteria**: Choose what to compare (XML source, screenshots, or both)
- **Adjustable threshold**: Set similarity threshold for screenshot comparison (0.0-1.0)
- **Filtered access**: Access full or filtered recordings with or without condensed states
- **Event notifications**: Subscribe to recording events to react to new entries and condensation decisions
- **JSON loading**: Load recordings from JSON files with automatic condensed state detection

## Usage

### Basic Usage

```javascript
import ActionRecorder from './actionRecorder.js';

// Start recording
ActionRecorder.startRecording();

// Record actions
ActionRecorder.recordAction(inspectorState, actionData);

// Get full recording (including condensed states)
const fullRecording = ActionRecorder.getRecording();

// Get filtered recording (excluding condensed states)
const filteredRecording = ActionRecorder.getFilteredRecording(false);

// Stop recording
ActionRecorder.stopRecording();
```

### Configure Condensing Options

```javascript
// Configure condensing options
ActionRecorder.setCondensingOptions({
  enabled: true,               // Enable/disable inline condensing
  checkXml: true,              // Check XML source for changes
  checkScreenshot: true,       // Check screenshots for changes
  screenshotThreshold: 0.95    // 95% similarity threshold (0.0-1.0)
});

// Get current options
const options = ActionRecorder.getCondensingOptions();
```

### Subscribe to Events

```javascript
// Subscribe to recording events
const unsubscribe = ActionRecorder.subscribe((event) => {
  if (event.type === 'ENTRY_ADDED') {
    const entry = event.entry;
    console.log(`Added entry ${entry.isCondensed ? '(condensed)' : ''}`);
  }
});

// Unsubscribe when done
unsubscribe();
```

### Load from JSON

```javascript
// Load a recording from JSON string or object
const jsonRecording = fs.readFileSync('my-recording.json', 'utf8');

// Simple loading (replaces current recording)
ActionRecorder.loadRecording(jsonRecording);

// Load with options
ActionRecorder.loadRecording(jsonRecording, {
  replace: true,             // Replace existing recording (default: true)
  detectCondensed: true      // Auto-detect condensed states (default: false)
});

// Append to existing recording
ActionRecorder.loadRecording(jsonRecording, { replace: false });

// Get filtered version (without condensed states)
const filteredRecording = ActionRecorder.getFilteredRecording(false);
```

## Condensing Behavior

A state is marked as condensed (`isCondensed: true`) when:

1. Condensing is enabled
2. There is a previous state to compare with
3. No significant changes are detected:
   - When checking XML: XML source has not changed
   - When checking screenshots: Screenshots are similar within the threshold

## Event Types

- `RECORDING_STARTED`: Recording has started
- `RECORDING_STOPPED`: Recording has stopped
- `RECORDING_CLEARED`: Recording has been cleared
- `RECORDING_LOADED`: Recording has been loaded from JSON
- `ENTRY_ADDED`: New entry added to recording
- `CONDENSING_OPTIONS_UPDATED`: Condensing options have been updated

## Test Scripts

- `test-recorder-condensing.js`: ESM version of the test script
- `test-recorder-condensing.cjs`: CommonJS version of the test script

Run the tests with:

```bash
node test-recorder-condensing.js
# or
node test-recorder-condensing.cjs
```

## Implementation Notes

- The screenshot comparison uses a chunked string comparison approach for similarity detection
- Base64-encoded screenshots are compared for changes
- The condenser detects changes in both XML source and screenshots by default
- When both XML and screenshot checks are enabled, a state is only condensed if both remain unchanged