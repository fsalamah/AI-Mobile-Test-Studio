// centralized-xpath-evaluation.js
// Unit tests for the centralized XPath evaluation system

import { expect } from 'chai';
import sinon from 'sinon';
import xpath from 'xpath';
import { DOMParser, XMLSerializer } from 'xmldom';

// Create a mock XPathManager for testing
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
  
  clearHighlights() {
    this.highlightedNodes = [];
    this.notifyListeners('highlightsChanged', { 
      nodes: [], 
      xpathExpression: '' 
    });
  }
  
  getXmlSource() {
    return this.xmlSource;
  }
  
  centralizedEvaluate(options) {
    const { 
      xpathExpression, 
      elementId = null, 
      highlight = true, 
      updateUI = true 
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
    
    const cacheKey = `${this.currentStateId}:${this.currentPlatform}:${xpathExpression}`;
    let result;
    
    try {
      if (this.lastEvaluationResults.has(cacheKey)) {
        result = this.lastEvaluationResults.get(cacheKey);
      } else {
        const nodes = xpath.select(xpathExpression, this.xmlDoc);
        const serializer = new XMLSerializer();
        
        result = {
          xpathExpression,
          numberOfMatches: nodes.length,
          matchingNodes: nodes.slice(0, 100).map(node => 
            serializer.serializeToString(node)
          ),
          actualNodes: nodes,
          isValid: true,
          success: true
        };
        
        this.lastEvaluationResults.set(cacheKey, result);
      }
      
      if (highlight) {
        this.highlightedNodes = result.actualNodes || [];
        this.notifyListeners('highlightsChanged', {
          nodes: this.highlightedNodes,
          xpathExpression
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
  
  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  notifyListeners(eventType, data, options = {}) {
    setTimeout(() => {
      this.listeners.forEach(listener => {
        try {
          listener(eventType, data);
        } catch (error) {
          console.error('Error in XPath listener:', error);
        }
      });
    }, 0);
  }
}

// Mock XML for testing
const MOCK_XML = `
<hierarchy>
  <node id="1" text="Hello" class="android.widget.TextView">
    <node id="2" text="World" class="android.widget.TextView" />
  </node>
  <node id="3" text="Button" class="android.widget.Button" />
</hierarchy>
`;

describe('Centralized XPath Evaluation', function () {
  let xpathManager;
  let listenerStub;
  
  beforeEach(function () {
    // Create a new XPathManager for each test
    xpathManager = new XPathManager();
    
    // Set up XML source
    xpathManager.setXmlSource(MOCK_XML, 'test-state', 'android');
    
    // Set up a listener stub
    listenerStub = sinon.stub();
    xpathManager.listeners = [listenerStub];
  });
  
  afterEach(function () {
    // Clean up
    xpathManager.listeners = [];
  });
  
  it('should properly evaluate a valid XPath', function () {
    const result = xpathManager.centralizedEvaluate({
      xpathExpression: '//node[@text="Hello"]',
      highlight: false,
      updateUI: false
    });
    
    expect(result.numberOfMatches).to.equal(1);
    expect(result.isValid).to.be.true;
  });
  
  it('should return 0 matches for a non-matching XPath', function () {
    const result = xpathManager.centralizedEvaluate({
      xpathExpression: '//node[@text="NotFound"]',
      highlight: false,
      updateUI: false
    });
    
    expect(result.numberOfMatches).to.equal(0);
    expect(result.isValid).to.be.true;
  });
  
  it('should track element-specific evaluations', function () {
    // Store the current implementation of notifyListeners to modify it
    const originalNotify = xpathManager.notifyListeners;
    
    // Override notifyListeners to make it synchronous for testing
    xpathManager.notifyListeners = function(eventType, data) {
      this.listeners.forEach(listener => {
        try {
          listener(eventType, data);
        } catch (error) {
          console.error('Error in XPath listener:', error);
        }
      });
    };
    
    // First evaluation for element1
    xpathManager.centralizedEvaluate({
      xpathExpression: '//node[@class="android.widget.TextView"]',
      elementId: 'element1',
      updateUI: true
    });
    
    // Check that the listener was called with the correct event
    const element1Calls = listenerStub.getCalls().filter(
      call => call.args[0] === 'evaluationComplete' && 
             call.args[1].elementId === 'element1'
    );
    expect(element1Calls.length).to.be.above(0);
    
    // Reset the stub for the next test
    listenerStub.reset();
    
    // Second evaluation for element2
    xpathManager.centralizedEvaluate({
      xpathExpression: '//node[@class="android.widget.Button"]',
      elementId: 'element2',
      updateUI: true
    });
    
    // Check that the listener was called with the correct event
    const element2Calls = listenerStub.getCalls().filter(
      call => call.args[0] === 'evaluationComplete' && 
             call.args[1].elementId === 'element2'
    );
    expect(element2Calls.length).to.be.above(0);
    
    // Restore original implementation
    xpathManager.notifyListeners = originalNotify;
  });
  
  it('should respect the highlight flag', function (done) {
    // Store the current implementation of notifyListeners to modify it
    const originalNotify = xpathManager.notifyListeners;
    
    // Override notifyListeners to make it synchronous for testing
    xpathManager.notifyListeners = function(eventType, data) {
      this.listeners.forEach(listener => {
        try {
          listener(eventType, data);
        } catch (error) {
          console.error('Error in XPath listener:', error);
        }
      });
    };
    
    // First evaluation without highlighting
    xpathManager.centralizedEvaluate({
      xpathExpression: '//node[@text="Hello"]',
      highlight: false,
      updateUI: true
    });
    
    // Check that highlightsChanged was not called
    const highlightChangedCalls = listenerStub.getCalls().filter(
      call => call.args[0] === 'highlightsChanged'
    );
    expect(highlightChangedCalls.length).to.equal(0);
    
    // Reset the stub for the next test
    listenerStub.reset();
    
    // Second evaluation with highlighting
    xpathManager.centralizedEvaluate({
      xpathExpression: '//node[@text="Hello"]',
      highlight: true,
      updateUI: true
    });
    
    // Check that highlightsChanged was called
    const afterHighlightChangedCalls = listenerStub.getCalls().filter(
      call => call.args[0] === 'highlightsChanged'
    );
    expect(afterHighlightChangedCalls.length).to.be.above(0);
    
    // Restore original implementation
    xpathManager.notifyListeners = originalNotify;
    done();
  });
  
  it('should prevent duplicate evaluations for the same element', function () {
    // Add elementId to activeEvaluations
    xpathManager.activeEvaluations.add('element4');
    
    // Try to evaluate for the same element
    const result = xpathManager.centralizedEvaluate({
      xpathExpression: '//node[@text="Hello"]',
      elementId: 'element4'
    });
    
    // Should indicate that evaluation is in progress
    expect(result.inProgress).to.be.true;
  });
  
  it('should clear highlights when requested', function () {
    // Store the current implementation of notifyListeners to modify it
    const originalNotify = xpathManager.notifyListeners;
    
    // Override notifyListeners to make it synchronous for testing
    xpathManager.notifyListeners = function(eventType, data) {
      this.listeners.forEach(listener => {
        try {
          listener(eventType, data);
        } catch (error) {
          console.error('Error in XPath listener:', error);
        }
      });
    };
    
    // First highlight some nodes
    xpathManager.centralizedEvaluate({
      xpathExpression: '//node[@text="Hello"]',
      highlight: true
    });
    
    // Reset stub
    listenerStub.reset();
    
    // Clear highlights
    xpathManager.clearHighlights();
    
    // Check that highlightsChanged was called with empty nodes
    const clearCalls = listenerStub.getCalls().filter(
      call => call.args[0] === 'highlightsChanged' && 
             Array.isArray(call.args[1].nodes) &&
             call.args[1].nodes.length === 0
    );
    expect(clearCalls.length).to.be.above(0);
    
    // Restore original implementation
    xpathManager.notifyListeners = originalNotify;
  });
});