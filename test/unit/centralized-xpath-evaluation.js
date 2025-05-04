// centralized-xpath-evaluation.js
// Mock implementation for the centralized XPath evaluation system

import xpath from 'xpath';
import { DOMParser, XMLSerializer } from 'xmldom';

// Create a XPathManager class for testing
class XPathManager {
  constructor() {
    this.xmlSource = '';
    this.currentStateId = '';
    this.currentPlatform = '';
    this.listeners = [];
    this.xmlDocCache = new Map();
    this.lastEvaluationResults = new Map();
    this.activeEvaluations = new Set();
    this.xmlDoc = null;
    this.highlightedNodes = [];
    this.debug = false;
  }
  
  _log(message, force = false) {
    if (this.debug || force) {
      console.log(message);
    }
  }

  setXmlSource(xmlSource, stateId, platform) {
    this.xmlSource = xmlSource;
    this.currentStateId = stateId;
    this.currentPlatform = platform;
    
    if (xmlSource) {
      try {
        this.xmlDoc = new DOMParser().parseFromString(xmlSource, 'text/xml');
        this.xmlDocCache.clear();
        this.xmlDocCache.set(xmlSource, this.xmlDoc);
      } catch (error) {
        console.error("Error parsing XML:", error);
        this.xmlDoc = null;
      }
    } else {
      this.xmlDoc = null;
    }
    
    this.clearHighlights();
  }
  
  getXmlSource() {
    return this.xmlSource;
  }
  
  clearHighlights() {
    this.highlightedNodes = [];
    this.notifyListeners('highlightsChanged', { 
      nodes: [], 
      xpathExpression: '' 
    });
  }
  
  centralizedEvaluate(options) {
    const { 
      xpathExpression, 
      elementId = null, 
      highlight = true, 
      updateUI = true,
      debug = false
    } = options;
    
    if (!xpathExpression || !this.xmlDoc) {
      if (highlight) {
        this.clearHighlights();
      }
      
      const emptyResult = {
        xpathExpression,
        numberOfMatches: 0,
        matchingNodes: [],
        isValid: false,
        success: false
      };
      
      if (updateUI) {
        this.notifyListeners('evaluationComplete', {
          result: emptyResult,
          xpathExpression,
          elementId,
          highlight
        });
      }
      
      return emptyResult;
    }
    
    if (elementId && this.activeEvaluations.has(elementId)) {
      return {
        xpathExpression,
        numberOfMatches: -1,
        matchingNodes: [],
        isValid: false,
        inProgress: true,
        success: false
      };
    }
    
    if (elementId) {
      this.activeEvaluations.add(elementId);
    }
    
    const platform = options.elementPlatform || this.currentPlatform;
    const cacheKey = `${this.currentStateId}:${platform}:${xpathExpression}`;
    let result;
    
    try {
      if (this.lastEvaluationResults.has(cacheKey)) {
        result = this.lastEvaluationResults.get(cacheKey);
      } else {
        const nodes = xpath.select(xpathExpression, this.xmlDoc);
        const serializer = new XMLSerializer();
        
        const nodeDetails = [];
        const matchingSerializedNodes = [];
        
        for (let i = 0; i < nodes.length; i++) {
          try {
            const node = nodes[i];
            const serializedNode = serializer.serializeToString(node);
            matchingSerializedNodes.push(serializedNode);
            
            // Extract position data for highlighting
            const boundsData = {};
            
            if (node.getAttribute && node.getAttribute('bounds')) {
              const boundsAttr = node.getAttribute('bounds');
              const match = boundsAttr.match(/\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]/);
              if (match) {
                const [_, x1, y1, x2, y2] = match.map(Number);
                boundsData.bounds = boundsAttr;
                boundsData.androidBounds = { x1, y1, x2, y2 };
              }
            }
            else if (node.getAttribute && 
                     node.getAttribute('x') !== null && 
                     node.getAttribute('y') !== null &&
                     node.getAttribute('width') !== null &&
                     node.getAttribute('height') !== null) {
              const x = parseInt(node.getAttribute('x'), 10);
              const y = parseInt(node.getAttribute('y'), 10);
              const width = parseInt(node.getAttribute('width'), 10);
              const height = parseInt(node.getAttribute('height'), 10);
              
              boundsData.x = x;
              boundsData.y = y;
              boundsData.width = width;
              boundsData.height = height;
            }
            
            nodeDetails.push({
              index: i,
              nodeType: node.nodeType,
              nodeName: node.nodeName,
              serialized: serializedNode.substring(0, 100) + (serializedNode.length > 100 ? '...' : ''),
              ...boundsData
            });
          } catch (err) {
            console.error(`Error processing node at index ${i}:`, err);
          }
        }
        
        // Create safe versions of nodes for UI
        const safeNodes = nodes.map((node, index) => {
          const safeNode = { 
            nodeType: node.nodeType,
            nodeName: node.nodeName
          };
          
          if (node.nodeType === 1 && node.getAttribute) {
            const bounds = node.getAttribute('bounds');
            if (bounds) {
              safeNode.bounds = bounds;
              
              const match = bounds.match(/\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]/);
              if (match) {
                const [_, x1, y1, x2, y2] = match.map(Number);
                safeNode.androidBounds = { x1, y1, x2, y2 };
              }
            }
            
            const x = node.getAttribute('x');
            const y = node.getAttribute('y');
            const width = node.getAttribute('width');
            const height = node.getAttribute('height');
            
            if (x !== null && y !== null && width !== null && height !== null) {
              safeNode.x = parseInt(x, 10);
              safeNode.y = parseInt(y, 10);
              safeNode.width = parseInt(width, 10);
              safeNode.height = parseInt(height, 10);
              safeNode.isIOS = true;
            }
          }
          
          return safeNode;
        });
        
        result = {
          xpathExpression,
          numberOfMatches: nodes.length,
          matchingNodes: matchingSerializedNodes,
          actualNodes: safeNodes,
          nodeDetails: nodeDetails,
          isValid: true,
          success: true,
          platform: platform,
          isAndroid: platform === 'android',
          isIOS: platform === 'ios'
        };
        
        this.lastEvaluationResults.set(cacheKey, result);
      }
      
      if (highlight) {
        this.highlightedNodes = result.actualNodes || [];
        this.notifyListeners('highlightsChanged', {
          nodes: this.highlightedNodes,
          nodeDetails: result.nodeDetails || [],
          xpathExpression,
          platform
        });
      }
      
      if (elementId) {
        this.activeEvaluations.delete(elementId);
      }
      
      if (updateUI) {
        this.notifyListeners('evaluationComplete', {
          result,
          xpathExpression,
          elementId,
          highlight
        });
      }
      
      return result;
    } catch (error) {
      console.error('XPath evaluation error:', error);
      
      const errorResult = {
        xpathExpression,
        numberOfMatches: 0,
        matchingNodes: [],
        isValid: false,
        error: error.message,
        success: false
      };
      
      this.lastEvaluationResults.set(cacheKey, errorResult);
      
      if (highlight) {
        this.clearHighlights();
      }
      
      if (elementId) {
        this.activeEvaluations.delete(elementId);
      }
      
      if (updateUI) {
        this.notifyListeners('evaluationError', {
          result: errorResult,
          xpathExpression,
          elementId,
          error: error.message,
          highlight
        });
      }
      
      return errorResult;
    }
  }
  
  evaluateXPath(xpathExpression, options = {}) {
    return this.centralizedEvaluate({
      xpathExpression,
      elementId: typeof options === 'string' ? options : options.elementId,
      elementPlatform: typeof options === 'object' ? options.elementPlatform : null,
      highlight: true,
      updateUI: true
    });
  }
  
  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  notifyListeners(eventType, data, options = {}) {
    this.listeners.forEach(listener => {
      try {
        listener(eventType, data);
      } catch (error) {
        console.error('Error in XPath listener:', error);
      }
    });
  }
  
  setDebugMode(enabled) {
    this.debug = enabled;
  }
}

// Create a singleton instance for testing and expose it globally for tests
const xpathManager = new XPathManager();

// Expose the XPathManager instance globally for the test files
globalThis.xpathManager = xpathManager;

// These are example XML strings for testing purposes
export const MOCK_ANDROID_XML = `
<hierarchy>
  <node id="1" text="Hello" class="android.widget.TextView" bounds="[0,0][100,50]">
    <node id="2" text="World" class="android.widget.TextView" bounds="[10,10][90,40]" />
  </node>
  <node id="3" text="Button" class="android.widget.Button" bounds="[0,100][100,150]" />
</hierarchy>
`;

export const MOCK_IOS_XML = `
<XCUIElementTypeApplication x="0" y="0" width="375" height="812">
  <XCUIElementTypeWindow x="0" y="0" width="375" height="812">
    <XCUIElementTypeStaticText x="20" y="40" width="335" height="30" value="Hello" />
    <XCUIElementTypeStaticText x="30" y="80" width="315" height="30" value="World" />
    <XCUIElementTypeButton x="20" y="130" width="335" height="44" name="Button" />
  </XCUIElementTypeWindow>
</XCUIElementTypeApplication>
`;