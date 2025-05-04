/**
 * Tests for automatic XPath evaluation on page load
 * 
 * These tests verify that XPaths are automatically evaluated when a page is loaded,
 * ensuring that elements display the correct match count on initial load.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupAutoEvaluationTest } from './auto-xpath-evaluation';

// Mock React's useEffect hook
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useEffect: vi.fn((callback, deps) => {
      // Call the callback immediately for testing purposes
      return callback();
    })
  };
});

describe('Auto XPath Evaluation', () => {
  let testSetup;
  
  beforeEach(() => {
    // Setup test environment
    testSetup = setupAutoEvaluationTest();
  });
  
  it('should correctly evaluate XPaths when elements are loaded', () => {
    // Get the test elements and evaluate them
    const evaluatedElements = testSetup.evaluateElements();
    
    // Verify that elements have correct match counts
    expect(evaluatedElements[0].xpath.numberOfMatches).toBe(1); // Login button should have 1 match
    expect(evaluatedElements[1].xpath.numberOfMatches).toBe(1); // Username field should have 1 match
    expect(evaluatedElements[2].xpath.numberOfMatches).toBe(0); // Non-existent element should have 0 matches
  });
  
  it('should mark XPaths as valid when they have correct syntax', () => {
    // Get the test elements and evaluate them
    const evaluatedElements = testSetup.evaluateElements();
    
    // Verify that elements have correct validity
    expect(evaluatedElements[0].xpath.isValid).toBe(true); // Login button XPath is valid
    expect(evaluatedElements[1].xpath.isValid).toBe(true); // Username field XPath is valid
    expect(evaluatedElements[2].xpath.isValid).toBe(true); // Non-existent element XPath is valid (syntax is fine)
  });
});