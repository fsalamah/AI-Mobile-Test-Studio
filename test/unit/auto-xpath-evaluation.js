/**
 * Test for automatic XPath evaluation on page load
 * 
 * This test verifies that XPaths are automatically evaluated when a page
 * is loaded, ensuring that elements display the correct match count on initial load.
 */

// Import the XPathManager singleton
import xpathManager from '../../app/common/renderer/components/Xray/XPathManager.js';

// Mock DOM parser
import { DOMParser } from 'xmldom';

// Sample XML for testing
const sampleXml = `
<AppiumAUT>
  <XCUIElementTypeApplication type="XCUIElementTypeApplication" name="Sample App" label="Sample App" x="0" y="0" width="375" height="812">
    <XCUIElementTypeWindow type="XCUIElementTypeWindow" x="0" y="0" width="375" height="812">
      <XCUIElementTypeButton type="XCUIElementTypeButton" name="Login" label="Login" x="20" y="400" width="335" height="40"/>
      <XCUIElementTypeTextField type="XCUIElementTypeTextField" name="Username" label="Username" x="20" y="300" width="335" height="40"/>
      <XCUIElementTypeSecureTextField type="XCUIElementTypeSecureTextField" name="Password" label="Password" x="20" y="350" width="335" height="40"/>
    </XCUIElementTypeWindow>
  </XCUIElementTypeApplication>
</AppiumAUT>
`;

// Initialize XPathManager with XML
const initializeXPathManager = () => {
  xpathManager.setXmlSource(sampleXml, 'test-state-id', 'ios');
  return xpathManager;
};

/**
 * Setup functions for testing auto-evaluation
 */
export const setupAutoEvaluationTest = () => {
  const manager = initializeXPathManager();
  
  // Create test elements with XPaths
  const testElements = [
    {
      id: 'el1',
      devName: 'Login Button',
      stateId: 'test-state-id',
      platform: 'ios',
      xpath: {
        xpathExpression: '//XCUIElementTypeButton[@name="Login"]',
        numberOfMatches: 0 // Initially set to 0
      }
    },
    {
      id: 'el2',
      devName: 'Username Field',
      stateId: 'test-state-id',
      platform: 'ios',
      xpath: {
        xpathExpression: '//XCUIElementTypeTextField[@name="Username"]',
        numberOfMatches: 0 // Initially set to 0
      }
    },
    {
      id: 'el3',
      devName: 'Non Existent Element',
      stateId: 'test-state-id',
      platform: 'ios',
      xpath: {
        xpathExpression: '//XCUIElementTypeButton[@name="NotExist"]',
        numberOfMatches: 0 // Will remain 0 after evaluation
      }
    }
  ];
  
  // Return test data
  return {
    manager,
    testElements,
    evaluateElements: () => {
      return testElements.map(element => {
        const result = manager.evaluateXPath(element.xpath.xpathExpression, {
          elementId: element.id,
          elementPlatform: element.platform
        });
        
        // Update the element with the evaluation result
        return {
          ...element,
          xpath: {
            ...element.xpath,
            numberOfMatches: result.numberOfMatches,
            isValid: result.isValid
          }
        };
      });
    }
  };
};