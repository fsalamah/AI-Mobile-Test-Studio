# AI Module Code Organization

## Overview

This document outlines the proposed code organization for separating the AI module into three distinct components:

1. **AI Backend Service**: Standalone HTTP server for AI processing
2. **AI Studio Frontend**: Dedicated application for AI analysis
3. **Appium Inspector Integration**: Export functionality in Appium Inspector

## 1. AI Backend Service

### Directory Structure

```
/ai-backend/
├── src/
│   ├── api/                 # API layer
│   │   ├── controllers/     # Request handlers
│   │   ├── middlewares/     # Express middlewares
│   │   ├── routes/          # Route definitions
│   │   └── validation/      # Request validation schemas
│   ├── config/              # Configuration
│   │   ├── default.js       # Default config
│   │   └── index.js         # Config loader
│   ├── core/                # Core application logic
│   │   ├── ai/              # AI service integrations
│   │   ├── pipelines/       # Processing pipelines
│   │   ├── processors/      # Data processors
│   │   └── schemas/         # Data validation schemas
│   ├── services/            # Business logic services
│   │   ├── analysis-service.js
│   │   ├── code-service.js
│   │   ├── job-service.js
│   │   ├── locator-service.js
│   │   └── storage-service.js
│   ├── utils/               # Utilities
│   │   ├── file-utils.js
│   │   ├── logger.js
│   │   └── xml-utils.js
│   ├── app.js               # Express app setup
│   └── server.js            # Server entry point
├── data/                    # Data storage
│   ├── uploads/             # Temporary uploaded files
│   ├── projects/            # Project data
│   └── exports/             # Generated exports
├── tests/                   # Tests
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── fixtures/            # Test fixtures
├── .env                     # Environment variables
├── .env.example             # Example env file
├── .gitignore               # Git ignore file
├── Dockerfile               # Docker configuration
├── docker-compose.yml       # Docker compose config
├── package.json             # Dependencies
└── README.md                # Documentation
```

### API Structure

```javascript
// src/api/routes/index.js
import { Router } from 'express';
import analysisRoutes from './analysis-routes.js';
import locatorRoutes from './locator-routes.js';
import codeRoutes from './code-routes.js';
import jobRoutes from './job-routes.js';
import projectRoutes from './project-routes.js';
import { authenticateApiKey } from '../middlewares/auth.js';

const router = Router();

// API health check
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// API routes with authentication
router.use('/analysis', authenticateApiKey, analysisRoutes);
router.use('/locators', authenticateApiKey, locatorRoutes);
router.use('/code', authenticateApiKey, codeRoutes);
router.use('/jobs', authenticateApiKey, jobRoutes);
router.use('/projects', authenticateApiKey, projectRoutes);

export default router;
```

### Core Services Organization

```javascript
// src/core/ai/ai-service.js
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { CONFIG } from '../../config/index.js';
import { Logger } from '../../utils/logger.js';
import {
  createOsSpecifVisualElementSchema,
  createXpathLocatorSchema,
  createXpathRepairSchema
} from '../schemas/index.js';

export class AIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: CONFIG.ai.apiKey,
      baseURL: CONFIG.ai.baseUrl,
    });
  }

  async analyzeVisualElements(model, prompt, possibleStateIds, n = 3, temperature = 0) {
    try {
      Logger.log(`Calling ${model} for visual element analysis`);
      return await this.client.chat.completions.create({
        model,
        messages: [prompt],
        temperature,
        n,
        top_p: 0.1,
        response_format: zodResponseFormat(
          createOsSpecifVisualElementSchema(possibleStateIds),
          "VisualPageAnalysis"
        ),
      });
    } catch (error) {
      Logger.error(`Error calling ${model}:`, error);
      throw error;
    }
  }

  // Other methods similarly modified...
}
```

### Pipeline Organization

```javascript
// src/core/pipelines/visual-pipeline.js
import { CONFIG } from '../../config/index.js';
import { Logger } from '../../utils/logger.js';
import { PromptBuilder } from '../processors/prompt-builder.js';
import { ElementProcessor } from '../processors/element-processor.js';
import { AIService } from '../ai/ai-service.js';
import { StorageService } from '../../services/storage-service.js';

const aiService = new AIService();
const storageService = new StorageService();

export async function executeVisualPipeline(page, osVersions, jobId = null) {
  try {
    Logger.log("Starting visual elements extraction...", "info");
    // Pipeline implementation...
  } catch (error) {
    Logger.error("Error in visual pipeline:", error);
    throw error;
  }
}

// Other pipeline functions...
```

## 2. AI Studio Frontend

### Directory Structure

```
/ai-studio/
├── public/                  # Static assets
│   ├── index.html           # HTML entry point
│   ├── favicon.ico          # Favicon
│   └── manifest.json        # PWA manifest
├── src/
│   ├── api/                 # API client
│   │   ├── ai-service.js    # AI backend API client
│   │   ├── auth.js          # Authentication handling
│   │   └── types.js         # API type definitions
│   ├── components/          # React components
│   │   ├── App/             # App container
│   │   ├── Layout/          # Layout components
│   │   ├── Project/         # Project management
│   │   ├── Analysis/        # Analysis components
│   │   ├── Elements/        # Element management
│   │   ├── Code/            # Code generation
│   │   ├── Settings/        # Settings UI
│   │   └── shared/          # Shared components
│   ├── contexts/            # React contexts
│   │   ├── ProjectContext.js
│   │   ├── AnalysisContext.js
│   │   └── SettingsContext.js
│   ├── services/            # Frontend services
│   │   ├── import-export.js # Import/export handling
│   │   ├── storage.js       # Local storage
│   │   └── telemetry.js     # Usage tracking
│   ├── utils/               # Utilities
│   │   ├── file-utils.js    # File handling
│   │   ├── format-utils.js  # Data formatting
│   │   └── validation.js    # Input validation
│   ├── App.jsx              # Main app component
│   ├── index.jsx            # Entry point
│   └── styles.css           # Global styles
├── electron/                # Electron-specific code
│   ├── main.js              # Main process
│   ├── preload.js           # Preload script
│   └── menu.js              # Application menu
├── .env                     # Environment variables
├── .gitignore               # Git ignore file
├── package.json             # Dependencies
├── electron-builder.json    # Electron build config
└── README.md                # Documentation
```

### API Client Organization

```javascript
// src/api/ai-service.js
import axios from 'axios';
import { getApiConfig } from './config.js';

export class AIServiceClient {
  constructor() {
    const config = getApiConfig();
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      timeout: 30000
    });
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => this.handleApiError(error)
    );
  }
  
  // Error handling
  handleApiError(error) {
    // Format and log error
    console.error('API Error:', error);
    
    // Throw standardized error
    throw {
      message: error.response?.data?.message || error.message || 'Unknown error',
      status: error.response?.status,
      data: error.response?.data,
      original: error
    };
  }
  
  // API methods
  async analyzeVisualElements(page, osVersions) {
    try {
      const response = await this.client.post('/analysis/visual', {
        page,
        osVersions
      });
      
      return response.data;
    } catch (error) {
      console.error('Analysis error:', error);
      throw error;
    }
  }
  
  async generateLocators(elements, platform) {
    try {
      const response = await this.client.post('/locators/generate', {
        elements,
        platform
      });
      
      return response.data;
    } catch (error) {
      console.error('Locator generation error:', error);
      throw error;
    }
  }
  
  // Other API methods...
}

// Create singleton instance
export const aiService = new AIServiceClient();
```

### Component Organization

```jsx
// src/components/Analysis/AnalysisPanel.jsx
import React, { useState, useEffect, useContext } from 'react';
import { message, Spin } from 'antd';
import { ProjectContext } from '../../contexts/ProjectContext';
import { aiService } from '../../api/ai-service';
import ElementList from './ElementList';
import ScreenshotViewer from './ScreenshotViewer';
import AnalysisControls from './AnalysisControls';
import ProgressDisplay from '../shared/ProgressDisplay';

export default function AnalysisPanel({ pageId }) {
  const { getPageById, updatePage } = useContext(ProjectContext);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [page, setPage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  
  // Load page data
  useEffect(() => {
    if (pageId) {
      const pageData = getPageById(pageId);
      setPage(pageData);
    }
  }, [pageId]);
  
  // Start analysis
  const handleStartAnalysis = async (options) => {
    if (!page) return;
    
    setLoading(true);
    setProgress(10);
    
    try {
      // Get platforms from options or detect from page
      const platforms = options.platforms || detectPlatformsFromPage(page);
      
      // Update progress
      setProgress(20);
      
      // Call analysis API
      const result = await aiService.analyzeVisualElements(page, platforms);
      
      // Update progress
      setProgress(90);
      
      // Update page with results
      const updatedPage = {
        ...page,
        aiAnalysis: {
          ...(page.aiAnalysis || {}),
          visualElements: result.elements,
          timestamp: new Date().toISOString()
        }
      };
      
      // Save updated page
      await updatePage(updatedPage);
      setPage(updatedPage);
      setAnalysisResult(result);
      
      // Complete
      setProgress(100);
      message.success('Analysis completed successfully');
    } catch (error) {
      console.error('Analysis error:', error);
      message.error(`Analysis failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to detect platforms
  const detectPlatformsFromPage = (page) => {
    const platforms = new Set();
    
    if (page.states) {
      page.states.forEach(state => {
        if (state.versions) {
          Object.keys(state.versions).forEach(platform => {
            platforms.add(platform.toLowerCase());
          });
        }
      });
    }
    
    return Array.from(platforms);
  };
  
  // Render component
  return (
    <div className="analysis-panel">
      {loading && <ProgressDisplay percent={progress} />}
      
      <AnalysisControls 
        onStartAnalysis={handleStartAnalysis}
        disabled={loading || !page}
      />
      
      {page && (
        <div className="analysis-content">
          <ScreenshotViewer page={page} result={analysisResult} />
          <ElementList page={page} result={analysisResult} />
        </div>
      )}
    </div>
  );
}
```

## 3. Appium Inspector Integration

### Export Component

```jsx
// app/common/renderer/components/Inspector/ExportMenu.jsx
import React, { useState } from 'react';
import { Dropdown, Menu, Button, Modal, Form, Input, Select } from 'antd';
import { ExportOutlined, DownOutlined } from '@ant-design/icons';
import { exportSessionToFile } from '../../utils/export-utils';

export const ExportMenu = ({
  sourceXML,
  screenshot,
  sessionCapabilities,
  sessionId,
  deviceInfo
}) => {
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportType, setExportType] = useState('file');
  const [form] = Form.useForm();
  
  // Handle menu click
  const handleMenuClick = ({ key }) => {
    setExportType(key);
    setExportModalVisible(true);
  };
  
  // Handle export submission
  const handleExport = async (values) => {
    const { stateName, stateDescription } = values;
    
    try {
      if (exportType === 'file') {
        // Export to file
        await exportSessionToFile({
          stateName,
          stateDescription,
          sourceXML,
          screenshot,
          sessionCapabilities,
          sessionId,
          deviceInfo
        });
      } else if (exportType === 'aistudio') {
        // Export directly to AI Studio
        // Implementation depends on chosen integration approach
      }
      
      setExportModalVisible(false);
    } catch (error) {
      console.error('Export error:', error);
      message.error(`Export failed: ${error.message}`);
    }
  };
  
  // Export dropdown menu
  const menu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item key="file">Export to File</Menu.Item>
      <Menu.Item key="aistudio">Send to AI Studio</Menu.Item>
    </Menu>
  );
  
  return (
    <>
      <Dropdown overlay={menu}>
        <Button type="primary">
          <ExportOutlined /> Export <DownOutlined />
        </Button>
      </Dropdown>
      
      <Modal
        title={exportType === 'file' ? 'Export to File' : 'Send to AI Studio'}
        visible={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleExport} layout="vertical">
          <Form.Item
            name="stateName"
            label="State Name"
            rules={[{ required: true, message: 'Please name this app state' }]}
          >
            <Input placeholder="e.g., Login Screen, Home Page" />
          </Form.Item>
          
          <Form.Item
            name="stateDescription"
            label="State Description"
          >
            <Input.TextArea placeholder="Optional description of this app state" />
          </Form.Item>
          
          {exportType === 'aistudio' && (
            <Form.Item
              name="serverUrl"
              label="AI Studio Server"
            >
              <Input placeholder="http://localhost:3000" />
            </Form.Item>
          )}
          
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Export
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
```

### Export Utility Implementation

```javascript
// app/common/renderer/utils/export-utils.js
import { dialog } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Export session to file
export const exportSessionToFile = async ({
  stateName,
  stateDescription,
  sourceXML,
  screenshot,
  sessionCapabilities,
  sessionId,
  deviceInfo
}) => {
  try {
    // Prepare export data
    const exportData = createExportData({
      stateName,
      stateDescription,
      sourceXML,
      screenshot,
      sessionCapabilities,
      sessionId,
      deviceInfo
    });
    
    // Generate default filename
    const sanitizedStateName = stateName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
    const platform = (deviceInfo.platform || 'unknown').toLowerCase();
    const defaultFileName = `${sanitizedStateName}_${platform}_${timestamp}.appiumstate.json`;
    
    // Show save dialog
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Session State',
      defaultPath: defaultFileName,
      filters: [
        { name: 'Appium State Files', extensions: ['appiumstate.json'] },
        { name: 'JSON Files', extensions: ['json'] }
      ]
    });
    
    if (canceled) {
      return { success: false, message: 'Export canceled' };
    }
    
    // Write file
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
    
    return {
      success: true,
      message: 'Session exported successfully',
      filePath
    };
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};

// Helper to create export data
export const createExportData = ({
  stateName,
  stateDescription,
  sourceXML,
  screenshot,
  sessionCapabilities,
  sessionId,
  deviceInfo
}) => {
  return {
    metadata: {
      version: "1.0",
      timestamp: new Date().toISOString(),
      source: "appium-inspector",
      sessionId: sessionId || uuidv4()
    },
    device: {
      platform: (deviceInfo.platform || 'unknown').toLowerCase(),
      platformVersion: deviceInfo.platformVersion || 'unknown',
      deviceName: deviceInfo.deviceName || 'unknown',
      udid: deviceInfo.udid || 'unknown'
    },
    app: {
      packageName: sessionCapabilities?.appPackage || deviceInfo?.bundleId || 'unknown',
      activity: sessionCapabilities?.appActivity || 'unknown'
    },
    state: {
      name: stateName,
      description: stateDescription || '',
      sourceXml: sourceXML,
      screenshot: screenshot
    },
    capabilities: sessionCapabilities || {}
  };
};

// Optionally add direct integration with AI Studio
export const sendToAIStudio = async (exportData, serverUrl) => {
  // Implementation depends on chosen integration approach
};
```

## Shared Models and Types

To ensure consistency across all three components, define shared data models:

### 1. Page Model

```typescript
// shared/models/Page.ts
export interface Page {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  states: State[];
  metadata?: Record<string, any>;
}

export interface State {
  id: string;
  title: string;
  description?: string;
  versions: Record<string, StateVersion>;
}

export interface StateVersion {
  screenShot: string; // base64
  pageSource: string; // XML
  deviceInfo?: DeviceInfo;
}

export interface DeviceInfo {
  platform: string;
  platformVersion: string;
  deviceName: string;
  udid?: string;
}
```

### 2. Element Model

```typescript
// shared/models/Element.ts
export interface Element {
  id?: string;
  devName: string;
  name: string;
  description: string;
  value: string;
  isDynamicValue?: boolean;
  stateId: string;
  platform?: string;
}

export interface ElementWithLocator extends Element {
  xpath: XPathInfo;
  alternativeXpaths?: XPathInfo[];
}

export interface XPathInfo {
  xpathExpression: string;
  numberOfMatches?: number;
  matchingNodes?: string[];
  isValid?: boolean;
  success?: boolean;
}
```

### 3. API Request/Response Models

```typescript
// shared/models/Api.ts
// Request models
export interface AnalysisRequest {
  page: Page;
  osVersions: string[];
}

export interface LocatorRequest {
  elements: Element[];
  pageSource: string;
  platform: string;
}

export interface RepairRequest {
  elements: ElementWithLocator[];
  pageSource: string;
  platform: string;
}

export interface CodeGenerationRequest {
  page: Page;
  elements: ElementWithLocator[];
  language: string;
  framework?: string;
}

// Response models
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface JobResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error?: ApiError;
}
```

## Package Structure for Shared Code

For code that needs to be shared between components, create separate packages:

### Shared Models Package

```
/ai-shared-models/
├── src/
│   ├── index.ts             # Main exports
│   ├── page.ts              # Page model
│   ├── element.ts           # Element model
│   ├── api.ts               # API models
│   └── utils/               # Shared utilities
│       ├── validation.ts    # Validation helpers
│       └── conversion.ts    # Format conversion
├── package.json             # Package config
└── README.md                # Documentation
```

### Shared Protocol Package

```
/ai-protocol/
├── src/
│   ├── index.ts             # Main exports
│   ├── file-format.ts       # File format definitions
│   ├── export-format.ts     # Export format validators
│   └── import-format.ts     # Import format converters
├── package.json             # Package config
└── README.md                # Documentation
```

## Code Migration Strategy

To minimize disruption, follow this migration strategy:

### Phase 1: Extract Shared Models

1. Create the shared models package
2. Define core data models
3. Ensure backward compatibility

### Phase 2: Extract Backend Services

1. Create backend service project
2. Move core AI functionality
3. Implement HTTP API layer
4. Add authentication and error handling

### Phase 3: Create AI Studio Frontend

1. Create new AI Studio project
2. Implement API client
3. Build core UI components
4. Add import/export functionality

### Phase 4: Add Export to Appium Inspector

1. Create export component
2. Implement file export
3. Add direct integration option

### Phase 5: Testing and Integration

1. Test components independently
2. Test end-to-end workflow
3. Address cross-component issues

## Best Practices for Shared Code

1. **Version Compatibility**
   - Version all shared packages
   - Follow semantic versioning
   - Maintain backward compatibility

2. **Code Reuse**
   - Use dependency injection for services
   - Create pure utility functions
   - Avoid framework-specific dependencies

3. **Testing**
   - Write tests for shared code
   - Test integration points thoroughly
   - Use mock objects for cross-component testing

4. **Documentation**
   - Document all public interfaces
   - Include examples
   - Maintain architecture diagrams

## TypeScript Support

To improve code quality and maintainability, use TypeScript throughout:

```typescript
// api/ai-service.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, AnalysisRequest, ElementWithLocator } from 'ai-shared-models';

export class AIServiceClient {
  private client: AxiosInstance;
  
  constructor(baseUrl: string, apiKey: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    });
  }
  
  async analyzeVisualElements(
    request: AnalysisRequest
  ): Promise<ApiResponse<ElementWithLocator[]>> {
    try {
      const response: AxiosResponse<ApiResponse<ElementWithLocator[]>> = 
        await this.client.post('/analysis/visual', request);
      
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  
  private handleApiError(error: any): Error {
    // Error handling implementation
    return new Error(error.message);
  }
}
```