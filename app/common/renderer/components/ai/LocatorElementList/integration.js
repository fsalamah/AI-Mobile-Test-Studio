/**
 * Integration module for XPath fixing
 * Connects the XPath fixing UI to the pipeline
 */
import { executeXpathFixPipeline } from '../../../lib/ai/xpathFixPipeline';
import { getXPathFixProgressModalControls } from '../Modals/XPathFixProgressModal';

/**
 * Starts the XPath fixing process with progress tracking
 * @param {Array} elements - All elements with XPaths
 * @param {Object} page - The page object with states and screenshots
 * @param {Function} onComplete - Callback when process completes
 * @param {Object} options - Additional options
 * @param {boolean} options.singleElementMode - Fix only the specified element (for single element operations)
 * @param {boolean} options.failingXPathsOnly - Only process failing XPaths (default true for page operations)
 * @returns {Promise} - Promise that resolves when the process completes
 */
export const fixXPaths = async (elements, page, onComplete, options = {}) => {
  // Get progress modal controls
  const progressModal = getXPathFixProgressModalControls();
  
  // Set default option: failingXPathsOnly = true unless explicitly set to false
  const finalOptions = {
    failingXPathsOnly: true,
    ...options
  };
  
  // Count failing XPaths for initial display
  const failingXPaths = elements.filter(element => 
    !element.xpath.success || 
    element.xpath.numberOfMatches === 0 || 
    element.xpath.xpathExpression === '//*[99=0]'
  );
  
  // Determine how many elements will be processed
  const elementsToProcess = finalOptions.singleElementMode ? 1 : 
    (finalOptions.failingXPathsOnly ? failingXPaths.length : elements.length);
  
  // Show the progress modal with initial data
  progressModal.show({ 
    totalFailingXPaths: elementsToProcess,
    singleElementMode: finalOptions.singleElementMode
  });
  
  try {
    // Create progress callback function
    const progressCallback = (stage, status, details, stats) => {
      if (stage === 'start') {
        // Initial start - stats contains counts
        progressModal.updateStage('grouping', 'processing', 'Starting XPath fix process', stats);
      } else if (stage === 'complete') {
        // Process complete - status is success boolean, details contains stats
        progressModal.complete(status, details);
      } else if (stage === 'error') {
        // Error occurred - status contains error message
        progressModal.updateStage(stage, 'error', status);
        progressModal.complete(false);
      } else {
        // Regular stage update
        progressModal.updateStage(stage, status, details, stats);
      }
    };
    
    // Execute the pipeline with progress tracking
    const result = await executeXpathFixPipeline(
      elements, 
      page, 
      progressCallback, 
      finalOptions
    );
    
    // Call completion callback with result
    if (onComplete && typeof onComplete === 'function') {
      onComplete(result);
    }
    
    return result;
  } catch (error) {
    console.error('Error in XPath fix process:', error);
    progressModal.complete(false, { error: error.message });
    throw error;
  }
};

/**
 * Fixes a single element's XPath
 * @param {Object} element - Element to fix
 * @param {Array} allElements - All elements in the list (needed for returning updated list)
 * @param {Object} page - The page object with states and screenshots
 * @param {Function} onComplete - Callback when process completes
 * @returns {Promise} - Promise that resolves when the process completes
 */
export const fixSingleElementXPath = async (element, allElements, page, onComplete) => {
  // Create a list with just this element (marked as failing to ensure it gets processed)
  const elementToFix = {
    ...element,
    xpath: {
      ...element.xpath,
      // Force this element to be considered as failing
      success: false
    }
  };
  
  const elementsWithTargetFirst = [
    elementToFix,
    ...allElements.filter(e => e.id !== element.id)
  ];
  
  // Call the main fixXPaths function with singleElementMode=true and failingXPathsOnly=true
  return fixXPaths(elementsWithTargetFirst, page, onComplete, {
    singleElementMode: true,
    failingXPathsOnly: true // This will ensure only our marked element is processed
  });
};