/**
 * AI Studio - End-to-End Tests
 * 
 * This file contains tests that verify the full workflow
 * from a user perspective using real components.
 */

/* global describe, beforeAll, afterAll, beforeEach, it, expect */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import mockStore from './mockStore';

// Mock components
import FileImporter from '../components/common/FileImporter';
import ProgressIndicator from '../components/common/ProgressIndicator';
import ElementCard from '../components/analysis/ElementCard';
import CodeEditor from '../components/common/CodeEditor';

// Mock API client
jest.mock('../services/apiClient', () => {
  return {
    getApiClient: jest.fn().mockReturnValue({
      healthCheck: jest.fn().mockResolvedValue({ status: 'ok' }),
      startVisualAnalysis: jest.fn().mockResolvedValue({ 
        data: { jobId: 'test-job-1', status: 'pending' } 
      }),
      getJobStatus: jest.fn().mockResolvedValue({
        data: { 
          jobId: 'test-job-1', 
          status: 'completed',
          result: [
            {
              devName: 'Login Button',
              description: 'Primary login button',
              xpath: {
                expression: '//XCUIElementTypeButton[@name="Login"]',
                success: true,
                numberOfMatches: 1
              }
            }
          ]
        }
      }),
      generateCode: jest.fn().mockResolvedValue({ 
        data: { jobId: 'test-job-2', status: 'pending' } 
      }),
      getGeneratedCode: jest.fn().mockResolvedValue({
        data: {
          status: 'completed',
          result: {
            code: 'public class LoginTest { }',
            language: 'java',
            framework: 'junit4'
          }
        }
      })
    })
  };
});

// Mock file utilities
jest.mock('../utils/fileUtils', () => {
  return {
    readFileAsDataURL: jest.fn().mockResolvedValue('data:image/png;base64,test'),
    readFileAsText: jest.fn().mockResolvedValue('<AppiumAUT></AppiumAUT>'),
    isImageFile: jest.fn().mockReturnValue(true),
    isXmlFile: jest.fn().mockReturnValue(true),
    isXmlString: jest.fn().mockReturnValue(true)
  };
});

describe('AI Studio E2E Tests', () => {
  let store;

  beforeAll(() => {
    // Mock window.URL
    window.URL.createObjectURL = jest.fn();
    window.URL.revokeObjectURL = jest.fn();
    
    // Mock clipboard API
    navigator.clipboard = {
      writeText: jest.fn().mockResolvedValue(undefined)
    };
    
    // Mock ResizeObserver
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    store = mockStore();
  });

  it('should render FileImporter component', async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <FileImporter visible={true} onClose={jest.fn()} />
        </BrowserRouter>
      </Provider>
    );
    
    // Check that the component renders
    expect(screen.getByText('Import to AI Studio')).toBeInTheDocument();
    
    // Check that import types are displayed
    expect(screen.getByText('Import from Appium Session')).toBeInTheDocument();
    expect(screen.getByText('Import from Screenshot and Source Files')).toBeInTheDocument();
    expect(screen.getByText('Import from JSON')).toBeInTheDocument();
  });

  it('should render ProgressIndicator component', () => {
    render(
      <ProgressIndicator 
        status="polling" 
        progress={50} 
        title="Analyzing Page" 
        description="AI is analyzing your page structure" 
      />
    );
    
    // Check that the component renders
    expect(screen.getByText('Analyzing Page')).toBeInTheDocument();
    expect(screen.getByText('AI is analyzing your page structure')).toBeInTheDocument();
    expect(screen.getByText('Status: In Progress')).toBeInTheDocument();
    expect(screen.getByText('50% Complete')).toBeInTheDocument();
  });

  it('should render ElementCard component', () => {
    const element = {
      devName: 'Login Button',
      name: 'Login',
      description: 'Primary login button',
      platform: 'ios',
      xpath: {
        expression: '//XCUIElementTypeButton[@name="Login"]',
        success: true,
        numberOfMatches: 1
      }
    };
    
    render(
      <ElementCard 
        element={element}
        onEdit={jest.fn()}
        onViewCode={jest.fn()}
        onCopyXPath={jest.fn()}
      />
    );
    
    // Check that the component renders
    expect(screen.getByText('Login Button')).toBeInTheDocument();
    expect(screen.getByText('Primary login button')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('IOS')).toBeInTheDocument();
  });

  it('should render CodeEditor component', () => {
    // Mock Monaco Editor
    jest.mock('react-monaco-editor', () => {
      return function MockMonacoEditor(props) {
        return (
          <div className="monaco-editor-mock">
            <textarea 
              value={props.value}
              onChange={(e) => props.onChange(e.target.value)}
            />
          </div>
        );
      };
    });
    
    render(
      <CodeEditor 
        value="public class LoginTest { }"
        language="java"
        height={300}
      />
    );
    
    // Due to how the Monaco editor is mocked, this test is limited
    expect(screen.getByText(/public class LoginTest/)).toBeInTheDocument();
  });

  it('should simulate a full workflow', async () => {
    // This test would simulate a complete user flow but would be complex in Jest
    // A more realistic approach would be using Cypress or Playwright for real E2E
    // Here we'll just verify store actions

    // Mock file upload
    const mockFile = new File(['dummy content'], 'screenshot.png', { type: 'image/png' });
    const mockXmlFile = new File(['<AppiumAUT></AppiumAUT>'], 'source.xml', { type: 'text/xml' });

    // Add a page to the store
    store.dispatch({
      type: 'ADD_PAGE',
      payload: {
        id: 'test-page-1',
        name: 'Login Screen',
        description: 'The main login screen',
        states: [
          {
            id: 'state-1',
            versions: {
              ios: {
                screenShot: 'data:image/png;base64,test',
                pageSource: '<AppiumAUT></AppiumAUT>'
              }
            }
          }
        ]
      }
    });

    // Verify page was added
    expect(store.getState().pages).toHaveLength(1);
    expect(store.getState().pages[0].name).toBe('Login Screen');

    // Start analysis
    store.dispatch({
      type: 'START_ANALYSIS',
      payload: {
        pageId: 'test-page-1',
        status: 'polling'
      }
    });

    // Verify analysis started
    expect(store.getState().analysis.status).toBe('polling');

    // Complete analysis
    store.dispatch({
      type: 'COMPLETE_ANALYSIS',
      payload: {
        pageId: 'test-page-1',
        result: [
          {
            devName: 'Login Button',
            xpath: {
              expression: '//button',
              success: true,
              numberOfMatches: 1
            }
          }
        ]
      }
    });

    // Verify analysis completed
    expect(store.getState().analysis.status).toBe('completed');
    expect(store.getState().analysis.result).toHaveLength(1);

    // Generate code
    store.dispatch({
      type: 'START_CODE_GENERATION',
      payload: {
        pageId: 'test-page-1',
        language: 'java',
        framework: 'junit4',
        status: 'polling'
      }
    });

    // Verify code generation started
    expect(store.getState().codeGeneration.status).toBe('polling');

    // Complete code generation
    store.dispatch({
      type: 'COMPLETE_CODE_GENERATION',
      payload: {
        pageId: 'test-page-1',
        result: {
          code: 'public class LoginTest { }',
          language: 'java',
          framework: 'junit4'
        }
      }
    });

    // Verify code generation completed
    expect(store.getState().codeGeneration.status).toBe('completed');
    expect(store.getState().codeGeneration.result.code).toContain('public class LoginTest');
  });
});