import xpath from 'xpath';
import { DOMParser, XMLSerializer } from 'xmldom';

// Cache for parsed XML documents to avoid repeated parsing
const xmlDocCache = new Map();

// Optimized evaluateXPath with caching and performance improvements
export const evaluateXPath = (xmlString, xpathExpr) => {
  let result = {
    xpathExpression: xpathExpr,
    numberOfMatches: 0,
    matchingNodes: [],
    isValid: true,
  };

  if (!xmlString || !xpathExpr) {
    result.isValid = false;
    return result;
  }

  try {
    // Use cached parsed XML doc if available (significant performance improvement)
    let doc;
    if (xmlDocCache.has(xmlString)) {
      doc = xmlDocCache.get(xmlString);
    } else {
      // Parse new document and cache it
      doc = new DOMParser().parseFromString(xmlString, 'text/xml');
      xmlDocCache.set(xmlString, doc);
      
      // Limit cache size to prevent memory issues
      if (xmlDocCache.size > 5) {
        const oldestKey = xmlDocCache.keys().next().value;
        xmlDocCache.delete(oldestKey);
      }
    }

    // Use try/catch for XPath evaluation separately to provide better error handling
    try {
      const nodes = xpath.select(xpathExpr, doc);
      result.numberOfMatches = nodes.length;

      // For performance, limit the number of nodes we serialize
      const serializer = new XMLSerializer();
      const MAX_NODES = 100; // Limit number of nodes to serialize for better performance
      result.matchingNodes = nodes.slice(0, MAX_NODES).map(node => serializer.serializeToString(node));
    } catch (xpathError) {
      // XPath is invalid, but XML was valid
      result.isValid = false;
      result.error = xpathError.message;
    }
  } catch (error) {
    // XML parsing error
    result.isValid = false;
    result.error = error.message;
  }

  return result;
}


