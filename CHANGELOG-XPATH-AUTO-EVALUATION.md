# XPath Auto-Evaluation and UI Improvements

## Overview
This changeset implements a series of improvements to the XPath evaluation functionality in the Xray view:

1. Enhanced state persistence for XPath evaluation results
2. Fixed duplicate notification issues
3. Improved "Confirm Exit" dialog behavior to only appear when meaningful changes are made

## Changes

### 1. XPath Match Counts Persistence
- Modified `projectStateManager.js` to properly preserve XPath evaluation data
- Added support for storing alternative XPaths and their evaluation results
- Ensured match counts persist between sessions
- **Important Note**: Per requirement, auto-evaluation was REMOVED. The system now relies on saved match counts.

### 2. Multiple Notifications Fix
- Increased notification suppression window in `notificationManager.js` from 3s to 5s
- Changed backup notifications to silent updates in `XPathManager.js`
- Added notification tracking to prevent duplicates

### 3. "Confirm Exit" Dialog Improvements
- Modified `updateLocators` to take a `shouldMarkAsChanged` parameter
- Implemented precise change detection that only considers meaningful changes to XPath expressions or element names
- Fixed `handleElementListChanged` to correctly detect meaningful changes from element list edits
- Non-meaningful changes (like XPath evaluation results) no longer trigger the exit confirmation

## Technical Implementation Details
- The change detection logic specifically looks for:
  - Changes to XPath expressions
  - Changes to element names (devName)
  - Addition or removal of elements
- Changes to match counts, validation status, or other metadata do not trigger the "save changes" prompt
- Each component using `updateLocators` now explicitly specifies whether changes should be marked for saving
- Improved consistency of notifications to prevent duplicates by tracking shown messages

## Testing Instructions

### For XPath Match Counts Persistence
1. Open the Xray view and evaluate several XPaths
2. Navigate away from the page and return to it
3. Verify: Match counts should be preserved and displayed immediately without manual evaluation

### For Multiple Notifications Fix
1. Evaluate an XPath by clicking the "Evaluate" button on an element
2. Verify: Only one notification appears (not multiple duplicate notifications)

### For "Confirm Exit" Dialog Fix
1. Open the Xray view without making any changes
2. Try to exit the view 
3. Verify: No confirmation dialog appears
4. Make a meaningful change (edit an XPath expression or element name)
5. Try to exit the view
6. Verify: Confirmation dialog now appears
7. Edit only non-meaningful attributes (e.g., evaluate an XPath without changing its expression)
8. Try to exit the view
9. Verify: No confirmation dialog appears