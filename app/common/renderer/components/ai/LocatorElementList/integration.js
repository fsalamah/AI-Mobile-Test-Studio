/**
 * Integration module for XPath fixing
 * Connects the XPath fixing UI to the pipeline
 */
import { executeXpathFixPipeline } from '../../lib/ai/xpathFixPipeline';
import { getXPathFixProgressModalControls } from '../Modals/XPathFixProgressModal';

/**
 * Starts the XPath fixing process with progress tracking
 * @param {Array} elements - All elements with XPaths
 * @param {Object} page - The page object with states and screenshots
 * @param {Function} onComplete - Callback when process completes
 * @returns {Promise} - Promise that resolves when the process completes
 */
export const fixXPaths = async (elements, page, onComplete) => {
  // Get progress modal controls
  const progressModal = getXPathFixProgressModalControls();
  
  // Count failing XPaths for initial display
  const failingXPaths = elements.filter(element => 
    !element.xpath.success || 
    element.xpath.numberOfMatches === 0 || 
    element.xpath.xpathExpression === '//*[99=0]'
  );
  
  // Show the progress modal with initial data
  progressModal.show({ totalFailingXPaths: failingXPaths.length });
  
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
    const result = await executeXpathFixPipeline(elements, page, progressCallback);
    
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