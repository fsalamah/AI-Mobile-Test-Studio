import _ from 'lodash'; // Import lodash for debounce
import { message } from 'antd';
import { executeXpathFixPipeline } from '../../lib/ai/xpathFixPipeline'; // Import the XPath fix pipeline
// // Function to fix failing XPaths using the pipeline
const fixFailingXPaths = useCallback(async () => {
    // Get current locators
    const locators = selectedPage.aiAnalysis?.locators || [];
    
    // Check if there are any failing locators
    const failingLocators = locators.filter(loc => 
      !loc.xpath?.isValid || 
      loc.xpath?.numberOfMatches === 0 || 
      loc.xpath?.xpathExpression === '//*[99=0]'
    );
    
    if (failingLocators.length === 0) {
      message.info('No failing XPaths found to repair.');
      return;
    }
    
    // Set loading state
    setIsFixingXPaths(true);
    message.loading(`Fixing ${failingLocators.length} failing XPaths...`, 0);
    
    try {
      // Call the XPath fix pipeline
      const updatedElements = await executeXpathFixPipeline(locators, selectedPage);
      
      // Update elements with new XPaths
      updateLocators(updatedElements);
      
      // Evaluate all fixed XPaths
      const evaluatedElements = await evaluateFixedXPaths(updatedElements);
      
      // Apply the best alternatives
      const optimizedElements = applyBestXPathAlternatives(evaluatedElements);
      
      // Final update with evaluated and optimized XPaths
      updateLocators(optimizedElements);
      
      message.destroy();
      message.success(`Fixed ${failingLocators.length} XPaths successfully!`);
      setHasFixedXPaths(true);
    } catch (error) {
      console.error('Error fixing XPaths:', error);
      message.destroy();
      message.error('Failed to fix XPaths. Please check console for details.');
    } finally {
      setIsFixingXPaths(false);
    }
  }, [selectedPage, updateLocators]);
  
  // Function to evaluate all fixed XPaths
  const evaluateFixedXPaths = useCallback(async (elements) => {
    const result = [...elements];
    
    // For each element, evaluate its XPaths
    for (const element of result) {
      // Skip if no alternatives or if current XPath is already valid with 1 match
      if (
        (!element.xpath?.alternativeXpaths || element.xpath.alternativeXpaths.length === 0) && 
        (element.xpath?.numberOfMatches === 1)
      ) {
        continue;
      }
      
      // Create an array of XPaths to evaluate
      const xpathsToEvaluate = [
        { 
          xpath: element.xpath?.xpathExpression || '//*[99=0]', 
          isPrimary: true
        },
        ...(element.xpath?.alternativeXpaths || []).map(alt => ({
          xpath: alt.xpath,
          confidence: alt.confidence,
          description: alt.description,
          isPrimary: false
        }))
      ];
      
      // Evaluate each XPath
      const evaluatedXPaths = [];
      for (const xpathData of xpathsToEvaluate) {
        if (!xpathData.xpath || xpathData.xpath === '//*[99=0]') {
          evaluatedXPaths.push({
            ...xpathData,
            matchCount: 0,
            isValid: false
          });
          continue;
        }
        
        // Evaluate this XPath
        const result = evaluateXPathStable(xpathData.xpath);
        
        evaluatedXPaths.push({
          ...xpathData,
          matchCount: result.numberOfMatches,
          isValid: result.isValid,
          matchingNodes: result.matchingNodes
        });
      }
      
      // Store the evaluated XPaths in the element
      element.xpath = {
        ...element.xpath,
        evaluatedAlternatives: evaluatedXPaths
      };
    }
    
    return result;
  }, [evaluateXPathStable]);
  
  // Function to apply the best XPath alternatives
  const applyBestXPathAlternatives = useCallback((elements) => {
    const result = [...elements];
    
    for (const element of result) {
      // Skip if no alternatives or if current XPath is already valid with 1 match
      if (
        !element.xpath?.evaluatedAlternatives || 
        element.xpath.evaluatedAlternatives.length <= 1
      ) {
        continue;
      }
      
      const alternatives = element.xpath.evaluatedAlternatives;
      
      // Find alternatives with exactly 1 match first
      const exactMatchAlt = alternatives.find(alt => alt.matchCount === 1);
      
      // If we have an exact match, use it
      if (exactMatchAlt) {
        element.xpath = {
          ...element.xpath,
          xpathExpression: exactMatchAlt.xpath,
          numberOfMatches: exactMatchAlt.matchCount,
          isValid: true,
          matchingNodes: exactMatchAlt.matchingNodes || []
        };
        continue;
      }
      
      // Otherwise, find alternatives with more than 1 match
      const multiMatchAlt = alternatives.find(alt => alt.matchCount > 1);
      
      // If we have a multi-match, use it
      if (multiMatchAlt) {
        element.xpath = {
          ...element.xpath,
          xpathExpression: multiMatchAlt.xpath,
          numberOfMatches: multiMatchAlt.matchCount,
          isValid: true,
          matchingNodes: multiMatchAlt.matchingNodes || []
        };
        continue;
      }
      
      // If all else fails, use placeholder
      element.xpath = {
        ...element.xpath,
        xpathExpression: '//*[99=0]',
        numberOfMatches: 0,
        isValid: false,
        matchingNodes: []
      };
    }
    
    return result;
  }, []);
  
  // Get count of failing XPaths
  const getFailingXPathCount = useCallback(() => {
    const locators = selectedPage.aiAnalysis?.locators || [];
    
    return locators.filter(loc => 
      !loc.xpath?.isValid || 
      loc.xpath?.numberOfMatches === 0 || 
      loc.xpath?.xpathExpression === '//*[99=0]'
    ).length;
  }, [selectedPage.aiAnalysis?.locators]);import { useCallback, useMemo, useState } from 'react';
