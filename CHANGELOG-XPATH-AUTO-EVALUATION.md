# XPath Auto-Evaluation Feature

## Overview
This changeset implements automatic XPath evaluation for elements when the Xray view of a page is loaded. 
Previously, elements showed 0 matches until manually evaluated, which was inefficient and created a poor user experience.

## Changes

### 1. Auto-Evaluation Implementation
- Added a new `useEffect` hook in `XrayRootComponent.jsx` that auto-evaluates XPaths when page XML loads
- Only evaluates elements with null or 0 match counts to avoid redundant operations
- Uses batched processing with timeouts for better performance
- Only processes elements that match the current state/platform

### 2. State Serialization Enhancement
- Modified `projectStateManager.js` to properly preserve XPath evaluation data
- Added support for storing alternative XPaths and their evaluation results
- Ensured match counts persist between sessions

### 3. Unit and Integration Testing
- Added new tests in `auto-xpath-evaluation.js` and `auto-xpath-evaluation.spec.js`
- Tests confirm elements correctly get match counts automatically
- Verified changes don't break existing functionality

## Benefits
- Elements now show correct match counts as soon as the page loads
- Better user experience without requiring manual evaluation of each element
- Preserved evaluation state between sessions

## Technical Implementation Details
- The auto-evaluation triggers when:
  - Page XML is loaded
  - XMLViewer is ready
  - Elements exist with XPath expressions
- Evaluation happens in batches of 5 elements with 300ms delay between batches
- State serialization preserves XPath expressions, match counts, validity flags, and alternative XPaths