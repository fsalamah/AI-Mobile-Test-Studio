/**
 * Integration module for XPath fixing
 * Connects the XPath fixing UI to the pipeline with enhanced error handling
 */
import { executeXpathFixPipeline } from '../../../lib/ai/xpathFixPipeline';
import { getXPathFixProgressModalControls } from '../Modals/XPathFixProgressModal';
// Import XPathManager for direct XPath evaluation
import xpathManager from '../../Xray/XPathManager.js';

/**
 * Starts the XPath fixing process with progress tracking
 * @param {Array} elements - All elements with XPaths
 * @param {Object} page - The page object with states and screenshots
 * @param {Function} onComplete - Callback when process completes
 * @param {Object} options - Additional options
 * @param {boolean} options.singleElementMode - Fix only the specified element (for single element operations)
 * @param {boolean} options.failingXPathsOnly - Only process failing XPaths (default true for page operations)
 * @param {boolean} options.enableDebug - Enable debug mode during the fixing process
 * @returns {Promise} - Promise that resolves when the process completes
 */
export const fixXPaths = async (elements, page, onComplete, options = {}) => {
  // Get progress modal controls
  const progressModal = getXPathFixProgressModalControls();
  
  // Store XPathManager's previous debug state to restore later
  const wasDebugEnabled = xpathManager.debug;
  
  // Set default option: failingXPathsOnly = true unless explicitly set to false
  const finalOptions = {
    failingXPathsOnly: true,
    enableDebug: false,
    ...options
  };
  
  // Enable debug mode in XPathManager if requested
  if (finalOptions.enableDebug) {
    console.log("🔍 Enabling XPath debug mode for fix process");
    xpathManager.setDebugMode(true);
  }
  
  // More robustly identify failing XPaths with better error tolerance
  const failingXPaths = elements.filter(element => {
    // Handle undefined/null xpath properties
    if (!element.xpath) return true;
    
    return !element.xpath.success || 
           element.xpath.numberOfMatches === 0 || 
           element.xpath.isValid === false ||
           element.xpath.error ||
           element.xpath.xpathExpression === '//*[99=0]' ||
           !element.xpath.xpathExpression; // Consider empty XPath expressions as failing
  });
  
  console.log(`Found ${failingXPaths.length} failing XPaths out of ${elements.length} elements`);
  
  // Determine how many elements will be processed
  const elementsToProcess = finalOptions.singleElementMode ? 1 : 
    (finalOptions.failingXPathsOnly ? failingXPaths.length : elements.length);
  
  // Show the progress modal with initial data
  progressModal.show({ 
    totalFailingXPaths: elementsToProcess,
    singleElementMode: finalOptions.singleElementMode
  });
  
  try {
    // Create enhanced progress callback function with timing information
    const progressCallback = (stage, status, details, stats) => {
      try {
        // Add timestamp to all progress updates
        const timestamp = new Date().toISOString();
        const enhancedStats = {
          ...(stats || {}),
          timestamp,
          timeElapsed: stats?.startTime ? (Date.now() - stats.startTime) : 0
        };
        
        if (stage === 'start') {
          // Initial start - stats contains counts
          console.log(`🚀 Starting XPath fix process at ${timestamp}`);
          progressModal.updateStage('grouping', 'processing', 'Starting XPath fix process', enhancedStats);
        } else if (stage === 'complete') {
          // Process complete - status is success boolean, details contains stats
          console.log(`✅ XPath fix process completed: Success=${status}`);
          progressModal.complete(status, {
            ...details,
            timestamp,
            timeElapsed: details?.startTime ? (Date.now() - details.startTime) : 0
          });
        } else if (stage === 'error') {
          // Error occurred - status contains error message
          console.error(`❌ XPath fix error: ${status}`);
          progressModal.updateStage(stage, 'error', status);
          progressModal.complete(false);
        } else {
          // Regular stage update
          console.log(`⏳ XPath fix progress: ${stage} - ${status}`);
          progressModal.updateStage(stage, status, details, enhancedStats);
        }
      } catch (error) {
        console.error("Error in progress callback:", error);
        // Continue process even if UI update fails
      }
    };
    
    // Execute the pipeline with progress tracking
    const result = await executeXpathFixPipeline(
      elements, 
      page, 
      progressCallback, 
      finalOptions
    );
    
    // Validate the results before returning
    let validatedResult = result;
    if (result && Array.isArray(result)) {
      console.log(`📊 Validating ${result.length} fixed elements`);
      
      // Verify each element has the expected XPath properties
      validatedResult = result.map(element => {
        // Ensure xpath object exists
        if (!element.xpath) {
          element.xpath = {
            xpathExpression: '//*[0=1]', // Default invalid expression
            isValid: false,
            numberOfMatches: 0
          };
        }
        
        // Ensure all required properties exist
        const validatedXPath = {
          ...element.xpath,
          // Set defaults for missing properties
          isValid: element.xpath.isValid !== false, // Default to true if not explicitly false
          numberOfMatches: element.xpath.numberOfMatches || 0,
          matchingNodes: element.xpath.matchingNodes || []
        };
        
        return {
          ...element,
          xpath: validatedXPath
        };
      });
      
      console.log(`✅ Validation complete: ${validatedResult.length} elements processed`);
    }
    
    // Call completion callback with validated result
    if (onComplete && typeof onComplete === 'function') {
      onComplete(validatedResult);
    }
    
    // Restore XPathManager debug state
    if (finalOptions.enableDebug !== wasDebugEnabled) {
      xpathManager.setDebugMode(wasDebugEnabled);
    }
    
    return validatedResult;
  } catch (error) {
    console.error('Error in XPath fix process:', error);
    progressModal.complete(false, { 
      error: error.message, 
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Restore XPathManager debug state
    if (finalOptions.enableDebug !== wasDebugEnabled) {
      xpathManager.setDebugMode(wasDebugEnabled);
    }
    
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
  // Log operation details
  console.log(`🔧 Starting XPath fix for element: ${element.devName} (${element.id})`);
  console.log(`📱 Platform: ${element.platform}`);
  console.log(`🔍 Current XPath: ${element.xpath?.xpathExpression}`);
  console.log(`📊 Current match count: ${element.xpath?.numberOfMatches}`);
  
  // Create a list with just this element (marked as failing to ensure it gets processed)
  const elementToFix = {
    ...element,
    xpath: {
      ...element.xpath,
      // Force this element to be considered as failing
      success: false,
      // Store original state for reference
      _originalState: {
        xpathExpression: element.xpath?.xpathExpression,
        numberOfMatches: element.xpath?.numberOfMatches,
        isValid: element.xpath?.isValid
      }
    }
  };
  
  const elementsWithTargetFirst = [
    elementToFix,
    ...allElements.filter(e => e.id !== element.id)
  ];
  
  // Call the main fixXPaths function with singleElementMode=true and failingXPathsOnly=true
  return fixXPaths(elementsWithTargetFirst, page, onComplete, {
    singleElementMode: true,
    failingXPathsOnly: true, // This will ensure only our marked element is processed
    enableDebug: true // Enable debug mode for single element fixes
  });
};