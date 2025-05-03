// centralized-xpath-evaluation.spec.js
// Unit tests for the centralized XPath evaluation system

import { expect } from 'chai';
import sinon from 'sinon';

// Import the XPathManager singleton
import xpathManager from '../../app/common/renderer/components/Xray/XPathManager';

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
  let listenerStub;
  
  beforeEach(function () {
    // Reset the XPathManager state
    xpathManager.xmlSource = '';
    xpathManager.currentStateId = '';
    xpathManager.currentPlatform = '';
    xpathManager.activeEvaluations.clear();
    xpathManager.lastEvaluationResults.clear();
    xpathManager.xmlDocCache.clear();
    xpathManager.highlightedNodes = [];
    
    // Set up XML source
    xpathManager.setXmlSource(MOCK_XML, 'test-state', 'android');
    
    // Set up a listener stub
    listenerStub = sinon.stub();
    xpathManager.listeners = [listenerStub];
  });
  
  afterEach(function () {
    // Clean up
    xpathManager.listeners = [];
    sinon.restore();
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
    // First evaluation for element1
    xpathManager.centralizedEvaluate({
      xpathExpression: '//node[@class="android.widget.TextView"]',
      elementId: 'element1',
      updateUI: true
    });
    
    // Check that the listener was called with the correct event
    expect(listenerStub.calledWithMatch('evaluationComplete', {
      elementId: 'element1'
    })).to.be.true;
    
    // Reset the stub for the next test
    listenerStub.reset();
    
    // Second evaluation for element2
    xpathManager.centralizedEvaluate({
      xpathExpression: '//node[@class="android.widget.Button"]',
      elementId: 'element2',
      updateUI: true
    });
    
    // Check that the listener was called with the correct event
    expect(listenerStub.calledWithMatch('evaluationComplete', {
      elementId: 'element2'
    })).to.be.true;
  });
  
  it('should respect the highlight flag', function () {
    // First evaluation without highlighting
    xpathManager.centralizedEvaluate({
      xpathExpression: '//node[@text="Hello"]',
      highlight: false,
      updateUI: true
    });
    
    // Check that highlightsChanged was not called
    expect(listenerStub.calledWithMatch('highlightsChanged')).to.be.false;
    
    // Reset the stub for the next test
    listenerStub.reset();
    
    // Second evaluation with highlighting
    xpathManager.centralizedEvaluate({
      xpathExpression: '//node[@text="Hello"]',
      highlight: true,
      updateUI: true
    });
    
    // Check that highlightsChanged was called
    expect(listenerStub.calledWithMatch('highlightsChanged')).to.be.true;
  });
  
  it('should cache evaluation results', function () {
    // Spy on the centralizedEvaluate method
    const evaluateSpy = sinon.spy(xpathManager, 'centralizedEvaluate');
    
    // First evaluation
    const result1 = xpathManager.centralizedEvaluate({
      xpathExpression: '//node[@text="Hello"]'
    });
    
    // Second evaluation of the same XPath
    const result2 = xpathManager.centralizedEvaluate({
      xpathExpression: '//node[@text="Hello"]'
    });
    
    // Check that the internal evaluation was only called once
    // (The second call should use the cached result)
    expect(evaluateSpy.callCount).to.equal(2);
    
    // But both results should be the same
    expect(result1.numberOfMatches).to.equal(result2.numberOfMatches);
    expect(result1.isValid).to.equal(result2.isValid);
  });
  
  it('should handle errors gracefully', function () {
    // Invalid XPath expression
    const result = xpathManager.centralizedEvaluate({
      xpathExpression: '//node[',
      elementId: 'element3',
      updateUI: true
    });
    
    // Result should indicate failure
    expect(result.isValid).to.be.false;
    expect(result.success).to.be.false;
    expect(result.error).to.exist;
    
    // Check that evaluationError was called
    expect(listenerStub.calledWithMatch('evaluationError')).to.be.true;
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
    expect(listenerStub.calledWithMatch('highlightsChanged', {
      nodes: []
    })).to.be.true;
  });
});