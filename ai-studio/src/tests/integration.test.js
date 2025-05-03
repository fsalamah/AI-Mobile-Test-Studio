/**
 * AI Studio - Integration Tests
 * 
 * This file contains integration tests for the full workflow between
 * Appium Inspector, AI Backend Service, and AI Studio Frontend.
 */

/* global describe, beforeAll, afterAll, it, expect */

// Mock data for tests
const mockAppiumSession = {
  sessionId: 'test-session-id',
  sessionInfo: {
    platformName: 'iOS',
    platformVersion: '15.0',
    deviceName: 'iPhone 12',
    automationName: 'XCUITest'
  },
  source: `<?xml version="1.0" encoding="UTF-8"?>
    <AppiumAUT>
      <XCUIElementTypeApplication type="XCUIElementTypeApplication" name="TestApp" label="TestApp" visible="true">
        <XCUIElementTypeWindow type="XCUIElementTypeWindow" visible="true">
          <XCUIElementTypeButton type="XCUIElementTypeButton" name="Login" label="Login" visible="true" x="150" y="300" width="100" height="44"/>
          <XCUIElementTypeTextField type="XCUIElementTypeTextField" name="Username" label="Username" visible="true" x="100" y="200" width="200" height="44"/>
          <XCUIElementTypeSecureTextField type="XCUIElementTypeSecureTextField" name="Password" label="Password" visible="true" x="100" y="250" width="200" height="44"/>
        </XCUIElementTypeWindow>
      </XCUIElementTypeApplication>
    </AppiumAUT>`,
  screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg=='
};

// Mock generated XPaths
const mockXPaths = [
  {
    devName: 'Login Button',
    description: 'Primary login button',
    xpath: {
      expression: '//XCUIElementTypeButton[@name="Login"]',
      success: true,
      numberOfMatches: 1
    }
  },
  {
    devName: 'Username Field',
    description: 'Username input field',
    xpath: {
      expression: '//XCUIElementTypeTextField[@name="Username"]',
      success: true,
      numberOfMatches: 1
    }
  },
  {
    devName: 'Password Field',
    description: 'Password input field',
    xpath: {
      expression: '//XCUIElementTypeSecureTextField[@name="Password"]',
      success: true,
      numberOfMatches: 1
    }
  }
];

// Mock generated code
const mockGeneratedCode = `
import io.appium.java_client.AppiumDriver;
import io.appium.java_client.MobileElement;
import org.junit.Test;

public class LoginPageTest {
    private AppiumDriver<MobileElement> driver;
    
    @Test
    public void testLogin() {
        MobileElement usernameField = driver.findElementByXPath("//XCUIElementTypeTextField[@name=\\"Username\\"]");
        usernameField.sendKeys("testuser");
        
        MobileElement passwordField = driver.findElementByXPath("//XCUIElementTypeSecureTextField[@name=\\"Password\\"]");
        passwordField.sendKeys("password");
        
        MobileElement loginButton = driver.findElementByXPath("//XCUIElementTypeButton[@name=\\"Login\\"]");
        loginButton.click();
    }
}
`;

// Mock Appium Bridge
class MockAppiumBridge {
  getAppiumSessionData() {
    return Promise.resolve(mockAppiumSession);
  }
  
  createPageFromAppiumSession(session) {
    return {
      id: 'test-page-id',
      name: session.sessionInfo.deviceName,
      description: `Created from Appium Inspector (${session.sessionInfo.platformName} ${session.sessionInfo.platformVersion})`,
      states: [
        {
          id: 'test-state-id',
          title: 'Main State',
          versions: {
            ios: {
              screenShot: session.screenshot,
              pageSource: session.source
            }
          }
        }
      ]
    };
  }
}

// Mock API Client
class MockApiClient {
  constructor() {
    this.jobCounter = 0;
  }
  
  healthCheck() {
    return Promise.resolve({ status: 'ok' });
  }
  
  startVisualAnalysis() {
    const jobId = `visual-job-${++this.jobCounter}`;
    return Promise.resolve({ data: { jobId, status: 'pending' } });
  }
  
  getJobStatus(jobId) {
    return Promise.resolve({ 
      data: { 
        jobId, 
        status: 'completed',
        result: mockXPaths
      } 
    });
  }
  
  generateCode() {
    const jobId = `code-job-${++this.jobCounter}`;
    return Promise.resolve({ data: { jobId, status: 'pending' } });
  }
  
  getGeneratedCode(jobId) {
    return Promise.resolve({ 
      data: { 
        jobId, 
        status: 'completed',
        result: {
          code: mockGeneratedCode,
          language: 'java',
          framework: 'junit4'
        }
      } 
    });
  }
}

// Test full workflow
describe('AI Studio Integration Tests', () => {
  let appiumBridge;
  let apiClient;
  
  beforeAll(() => {
    // Initialize mock objects
    appiumBridge = new MockAppiumBridge();
    apiClient = new MockApiClient();
    
    // Mock localStorage
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    
    // Mock console methods to avoid noise
    global.console.log = jest.fn();
    global.console.info = jest.fn();
    global.console.warn = jest.fn();
    global.console.error = jest.fn();
  });
  
  afterAll(() => {
    // Cleanup
    jest.restoreAllMocks();
  });
  
  it('should verify API connection', async () => {
    const healthCheck = await apiClient.healthCheck();
    expect(healthCheck).toBeDefined();
    expect(healthCheck.status).toBe('ok');
  });
  
  it('should import data from Appium Inspector', async () => {
    // Get session data from Appium Inspector
    const sessionData = await appiumBridge.getAppiumSessionData();
    
    // Verify session data
    expect(sessionData).toBeDefined();
    expect(sessionData.sessionId).toBe('test-session-id');
    expect(sessionData.sessionInfo.platformName).toBe('iOS');
    expect(sessionData.source).toContain('<AppiumAUT>');
    expect(sessionData.screenshot).toContain('data:image/png;base64,');
    
    // Create page from session data
    const page = appiumBridge.createPageFromAppiumSession(sessionData);
    
    // Verify page data
    expect(page).toBeDefined();
    expect(page.name).toBe('iPhone 12');
    expect(page.states).toHaveLength(1);
    expect(page.states[0].versions.ios.screenShot).toBe(sessionData.screenshot);
    expect(page.states[0].versions.ios.pageSource).toBe(sessionData.source);
  });
  
  it('should perform visual analysis on page', async () => {
    // Get session data and create page
    const sessionData = await appiumBridge.getAppiumSessionData();
    const page = appiumBridge.createPageFromAppiumSession(sessionData);
    
    // Start visual analysis
    const visualAnalysisResponse = await apiClient.startVisualAnalysis(page, ['ios']);
    
    // Verify job started
    expect(visualAnalysisResponse).toBeDefined();
    expect(visualAnalysisResponse.data.jobId).toBeDefined();
    expect(visualAnalysisResponse.data.status).toBe('pending');
    
    // Get job status
    const jobStatus = await apiClient.getJobStatus(visualAnalysisResponse.data.jobId);
    
    // Verify job completed
    expect(jobStatus).toBeDefined();
    expect(jobStatus.data.status).toBe('completed');
    expect(jobStatus.data.result).toEqual(mockXPaths);
  });
  
  it('should generate code for the page', async () => {
    // Get session data and create page
    const sessionData = await appiumBridge.getAppiumSessionData();
    const page = appiumBridge.createPageFromAppiumSession(sessionData);
    
    // Perform visual analysis
    const visualAnalysisResponse = await apiClient.startVisualAnalysis(page, ['ios']);
    const analysisResult = await apiClient.getJobStatus(visualAnalysisResponse.data.jobId);
    
    // Update page with analysis results
    page.elements = analysisResult.data.result;
    
    // Generate code
    const codeGenResponse = await apiClient.generateCode(page, 'java', 'junit4');
    
    // Verify code generation job started
    expect(codeGenResponse).toBeDefined();
    expect(codeGenResponse.data.jobId).toBeDefined();
    expect(codeGenResponse.data.status).toBe('pending');
    
    // Get code generation result
    const codeResult = await apiClient.getGeneratedCode(codeGenResponse.data.jobId);
    
    // Verify code generated
    expect(codeResult).toBeDefined();
    expect(codeResult.data.status).toBe('completed');
    expect(codeResult.data.result.code).toEqual(mockGeneratedCode);
    expect(codeResult.data.result.language).toBe('java');
    expect(codeResult.data.result.framework).toBe('junit4');
  });
  
  it('should complete full workflow from import to code generation', async () => {
    // STEP 1: Import from Appium Inspector
    const sessionData = await appiumBridge.getAppiumSessionData();
    const page = appiumBridge.createPageFromAppiumSession(sessionData);
    
    // STEP 2: Perform visual analysis
    const visualAnalysisResponse = await apiClient.startVisualAnalysis(page, ['ios']);
    const analysisResult = await apiClient.getJobStatus(visualAnalysisResponse.data.jobId);
    
    // Update page with analysis results
    page.elements = analysisResult.data.result;
    
    // STEP 3: Generate code
    const codeGenResponse = await apiClient.generateCode(page, 'java', 'junit4');
    const codeResult = await apiClient.getGeneratedCode(codeGenResponse.data.jobId);
    
    // Verify full workflow
    expect(page).toBeDefined();
    expect(page.name).toBe('iPhone 12');
    expect(page.elements).toEqual(mockXPaths);
    expect(codeResult.data.result.code).toEqual(mockGeneratedCode);
  });
});