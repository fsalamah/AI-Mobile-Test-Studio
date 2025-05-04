import xpathManager from '../../components/Xray/XPathManager';

/**
 * Legacy API for XPath evaluation - redirects to the centralized XPathManager
 * This provides backwards compatibility with existing code
 * @deprecated Use xpathManager.centralizedEvaluate() directly instead
 */
export const evaluateXPath = (xmlString, xpathExpr) => {
  // If no XML source has been set in the manager, set it temporarily
  const currentXml = xpathManager.getXmlSource();
  const hasExistingXml = !!currentXml;
  const needsToSetXml = !hasExistingXml && !!xmlString;
  
  // Only set XML if needed (temp XML for this evaluation only)
  if (needsToSetXml) {
    // Detect platform based on XML content
    const platform = 
      xmlString.includes('XCUIElementType') ? 'ios' : 
      xmlString.includes('android.widget') ? 'android' : 
      'unknown';
    
    xpathManager.setXmlSource(xmlString, 'legacy-evaluation', platform);
  }
  
  // Use the centralized evaluation system with minimal UI updates
  const result = xpathManager.centralizedEvaluate({
    xpathExpression: xpathExpr,
    highlight: false, // Don't highlight for legacy calls
    updateUI: false,  // Don't trigger UI updates for legacy calls
    debug: false      // Keep logging minimal
  });
  
  // Format result to match legacy API
  return {
    xpathExpression: xpathExpr,
    numberOfMatches: result.numberOfMatches || 0,
    matchingNodes: result.matchingNodes || [],
    isValid: result.isValid !== false,
    error: result.error || null
  };
}