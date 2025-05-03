# Integration Points Between Appium Inspector and AI Service

## Overview

To enable a smooth workflow between Appium Inspector and the AI service, we need to define clear integration points that maintain separation while allowing efficient data exchange.

## Integration Approach

We recommend a file-based integration approach where:

1. Appium Inspector exports session data to standardized files
2. AI Studio imports these files for analysis
3. No direct API calls between applications (loose coupling)

## Data Exchange Format

### Session Export Format (JSON)

```json
{
  "metadata": {
    "version": "1.0",
    "timestamp": "2025-05-02T15:30:45.123Z",
    "source": "appium-inspector",
    "sessionId": "12345-abcde-67890"
  },
  "device": {
    "platform": "android",
    "platformVersion": "13",
    "deviceName": "Pixel 6",
    "udid": "emulator-5554"
  },
  "app": {
    "packageName": "com.example.myapp",
    "activity": "com.example.myapp.MainActivity"
  },
  "state": {
    "name": "Home Screen",
    "description": "Initial app landing page",
    "sourceXml": "<?xml version=\"1.0\"...>",
    "screenshot": "data:image/png;base64,iVBORw0KGgoA..."
  },
  "capabilities": {
    "platformName": "Android",
    "automationName": "UiAutomator2",
    "deviceName": "Android Emulator",
    "appPackage": "com.example.myapp",
    "appActivity": "com.example.myapp.MainActivity"
  }
}
```

## Integration Components

### 1. Appium Inspector Export Component

Add a component to export session state in the specified format:

```jsx
// In app/common/renderer/components/Inspector/ExportSession.jsx
import React from 'react';
import { Button, Modal, Input, Form } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { exportSessionToFile } from '../../utils/export-utils.js';

export const ExportSessionButton = ({ 
  sourceXML, 
  screenshot, 
  sessionCapabilities,
  sessionId,
  deviceInfo 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  
  const handleExport = async (values) => {
    const { stateName, stateDescription } = values;
    
    await exportSessionToFile({
      stateName,
      stateDescription,
      sourceXML,
      screenshot,
      sessionCapabilities,
      sessionId,
      deviceInfo
    });
    
    setModalVisible(false);
  };
  
  return (
    <>
      <Button 
        type="primary" 
        icon={<ExportOutlined />} 
        onClick={() => setModalVisible(true)}
      >
        Export for AI Analysis
      </Button>
      
      <Modal
        title="Export Session for AI Analysis"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
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

### 2. Export Utility Implementation

```javascript
// In app/common/renderer/utils/export-utils.js
import { dialog } from 'electron';
import fs from 'fs/promises';
import path from 'path';

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
    // Create export data in specified format
    const exportData = {
      metadata: {
        version: "1.0",
        timestamp: new Date().toISOString(),
        source: "appium-inspector",
        sessionId
      },
      device: {
        platform: deviceInfo.platform?.toLowerCase() || 'unknown',
        platformVersion: deviceInfo.platformVersion || 'unknown',
        deviceName: deviceInfo.deviceName || 'unknown',
        udid: deviceInfo.udid || 'unknown'
      },
      app: {
        packageName: sessionCapabilities.appPackage || deviceInfo.bundleId || 'unknown',
        activity: sessionCapabilities.appActivity || 'unknown'
      },
      state: {
        name: stateName,
        description: stateDescription || '',
        sourceXml: sourceXML,
        screenshot: screenshot
      },
      capabilities: sessionCapabilities
    };
    
    // Generate default filename
    const sanitizedStateName = stateName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
    const defaultFileName = `${sanitizedStateName}_${timestamp}.appiumstate.json`;
    
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
    
    // Save file
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
    
    return { 
      success: true, 
      message: 'Session exported successfully',
      filePath
    };
  } catch (error) {
    console.error('Error exporting session:', error);
    return {
      success: false,
      message: `Export failed: ${error.message}`,
      error
    };
  }
};
```

### 3. Adding Export Button to Inspector

```jsx
// In app/common/renderer/components/Inspector/Inspector.jsx

// Import the export button
import { ExportSessionButton } from './ExportSession.jsx';

// Add to the header buttons section
<div className={styles.inspectorHeaderButtons}>
  {/* Existing buttons */}
  <RefreshButton {...buttonProps} />
  <QuitSessionButton {...buttonProps} />
  
  {/* Add export button */}
  <ExportSessionButton 
    sourceXML={source}
    screenshot={screenshot}
    sessionCapabilities={caps}
    sessionId={sessionId}
    deviceInfo={serverStatus}
  />
</div>
```

### 4. AI Studio Import Component

```jsx
// In ai-studio/src/components/Import/ImportSessionFile.jsx
import React, { useState } from 'react';
import { Button, Upload, message, Progress } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { validateSessionFile, importSessionFromFile } from '../../services/import-service';

const { Dragger } = Upload;

export const ImportSessionFile = ({ onImportComplete }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const handleImport = async (file) => {
    setLoading(true);
    setProgress(10);
    
    try {
      // Validate file format
      const validationResult = await validateSessionFile(file);
      if (!validationResult.valid) {
        message.error(`Invalid file: ${validationResult.message}`);
        setLoading(false);
        return false;
      }
      
      // Update progress
      setProgress(30);
      
      // Import the file data
      const importResult = await importSessionFromFile(file);
      
      setProgress(100);
      message.success(`Imported "${importResult.state.name}" successfully!`);
      
      // Notify parent component
      if (onImportComplete) {
        onImportComplete(importResult);
      }
    } catch (error) {
      console.error('Import error:', error);
      message.error(`Import failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
    
    return false; // Prevent default upload behavior
  };
  
  return (
    <div>
      <Dragger
        name="file"
        multiple={false}
        beforeUpload={handleImport}
        showUploadList={false}
        accept=".json,.appiumstate.json"
        disabled={loading}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          Click or drag an Appium session file to import
        </p>
        <p className="ant-upload-hint">
          Import an exported session from Appium Inspector
        </p>
      </Dragger>
      
      {loading && (
        <Progress percent={progress} status="active" />
      )}
    </div>
  );
};
```

### 5. Import Service Implementation

```javascript
// In ai-studio/src/services/import-service.js
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Define validation schema for imported files
const sessionFileSchema = z.object({
  metadata: z.object({
    version: z.string(),
    timestamp: z.string(),
    source: z.string(),
    sessionId: z.string().optional()
  }),
  device: z.object({
    platform: z.string(),
    platformVersion: z.string(),
    deviceName: z.string(),
    udid: z.string().optional()
  }),
  state: z.object({
    name: z.string(),
    description: z.string().optional(),
    sourceXml: z.string(),
    screenshot: z.string()
  }),
  capabilities: z.record(z.any()).optional()
});

/**
 * Validates an imported session file
 */
export const validateSessionFile = async (file) => {
  try {
    // Read file content
    const content = await readFileAsText(file);
    const data = JSON.parse(content);
    
    // Validate with Zod schema
    sessionFileSchema.parse(data);
    
    return { valid: true };
  } catch (error) {
    console.error('Validation error:', error);
    
    return { 
      valid: false, 
      message: error instanceof z.ZodError 
        ? 'Invalid file format: ' + error.errors[0]?.message
        : 'Invalid file: ' + error.message
    };
  }
};

/**
 * Imports session data from a file
 */
export const importSessionFromFile = async (file) => {
  // Read and parse file
  const content = await readFileAsText(file);
  const data = JSON.parse(content);
  
  // Create page state object
  const pageId = uuidv4();
  const stateId = uuidv4();
  
  const page = {
    id: pageId,
    name: data.state.name,
    description: data.state.description || '',
    createdAt: new Date().toISOString(),
    states: [
      {
        id: stateId,
        title: data.state.name,
        description: data.state.description || '',
        versions: {
          [data.device.platform]: {
            screenShot: data.state.screenshot,
            pageSource: data.state.sourceXml
          }
        }
      }
    ],
    metadata: {
      source: data.metadata.source,
      originalSessionId: data.metadata.sessionId,
      device: data.device,
      capabilities: data.capabilities
    }
  };
  
  return page;
};

/**
 * Helper to read file as text
 */
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('File read error'));
    reader.readAsText(file);
  });
};
```

## Multiple State Support

To support capturing multiple states from the same app/session:

### 1. Enhanced Export Format

```json
{
  "metadata": {
    "version": "1.0",
    "timestamp": "2025-05-02T15:30:45.123Z",
    "source": "appium-inspector",
    "sessionId": "12345-abcde-67890",
    "projectId": "proj-uuid-1234", // Optional, for multi-state projects
    "sequenceNumber": 3 // Optional, for sequence in multi-state captures 
  },
  "device": { /* Same as before */ },
  "app": { /* Same as before */ },
  "state": { /* Same as before */ },
  "capabilities": { /* Same as before */ }
}
```

### 2. Project-Based Export UI

```jsx
// In app/common/renderer/components/Inspector/ProjectExport.jsx
import React, { useState, useEffect } from 'react';
import { Button, Modal, Input, Form, Select, Divider } from 'antd';
import { ProjectOutlined, PlusOutlined } from '@ant-design/icons';
import { getProjects, createProject, exportStateToProject } from '../../utils/project-utils.js';

export const ProjectExportButton = ({ 
  sourceXML, 
  screenshot, 
  sessionCapabilities,
  sessionId,
  deviceInfo 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  
  // Load existing projects
  useEffect(() => {
    if (modalVisible) {
      loadProjects();
    }
  }, [modalVisible]);
  
  const loadProjects = async () => {
    setLoading(true);
    const projectList = await getProjects();
    setProjects(projectList);
    setLoading(false);
  };
  
  const handleExport = async (values) => {
    const { projectId, stateName, stateDescription, createNewProject, newProjectName } = values;
    
    setLoading(true);
    
    try {
      let targetProjectId = projectId;
      
      // Create new project if requested
      if (createNewProject) {
        const newProject = await createProject(newProjectName);
        targetProjectId = newProject.id;
      }
      
      // Export the state to the selected project
      await exportStateToProject({
        projectId: targetProjectId,
        stateName,
        stateDescription,
        sourceXML,
        screenshot,
        sessionCapabilities,
        sessionId,
        deviceInfo
      });
      
      setModalVisible(false);
      message.success('State exported to project successfully');
    } catch (error) {
      console.error('Export error:', error);
      message.error(`Export failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Button 
        icon={<ProjectOutlined />} 
        onClick={() => setModalVisible(true)}
      >
        Export to Project
      </Button>
      
      <Modal
        title="Export to Project"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} onFinish={handleExport} layout="vertical">
          {/* Project selection */}
          <Form.Item 
            name="projectId" 
            label="Select Project"
            rules={[{ required: true, message: 'Please select a project or create new' }]}
          >
            <Select
              loading={loading}
              placeholder="Select a project"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Button 
                    type="link" 
                    icon={<PlusOutlined />}
                    onClick={() => form.setFieldsValue({ createNewProject: true })}
                  >
                    Create New Project
                  </Button>
                </>
              )}
            >
              {projects.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          {/* New project name (conditionally shown) */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.createNewProject !== currentValues.createNewProject
            }
          >
            {({ getFieldValue }) => 
              getFieldValue('createNewProject') ? (
                <Form.Item
                  name="newProjectName"
                  label="New Project Name"
                  rules={[{ required: true, message: 'Please enter project name' }]}
                >
                  <Input placeholder="e.g., My App Test" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          
          {/* State details */}
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
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Export
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
```

## Multi-Platform Support

To capture the same state across different platforms:

### 1. Export with Platform Tag

```javascript
// In export-utils.js
export const exportSessionToFile = async (exportData) => {
  // Generate filename with platform
  const platform = exportData.device.platform.toLowerCase();
  const defaultFileName = `${sanitizedStateName}_${platform}_${timestamp}.appiumstate.json`;
  
  // ... rest of function
};
```

### 2. AI Studio Platform Detection

Enhance the import service to detect and group states by platform:

```javascript
// In import-service.js
export const importSessionFromFile = async (file) => {
  // ... existing parsing code
  
  // Extract platform information
  const platform = data.device.platform.toLowerCase();
  
  // Create page object with platform-specific state version
  const page = {
    // ... other fields
    states: [
      {
        id: stateId,
        title: data.state.name,
        description: data.state.description || '',
        versions: {
          [platform]: {
            screenShot: data.state.screenshot,
            pageSource: data.state.sourceXml,
            deviceInfo: data.device
          }
        }
      }
    ]
  };
  
  return page;
};
```

### 3. Platform Merge Support

Add functionality to merge states from different platforms:

```javascript
// In ai-studio/src/services/page-service.js
export const mergePageStates = (existingPage, importedPage) => {
  // Extract the first (and only) state from the imported page
  const importedState = importedPage.states[0];
  const platform = Object.keys(importedState.versions)[0];
  
  // Check if we have a matching state by title
  const matchingStateIndex = existingPage.states.findIndex(
    s => s.title === importedState.title
  );
  
  if (matchingStateIndex >= 0) {
    // State with the same name exists, merge platform versions
    const existingState = existingPage.states[matchingStateIndex];
    
    // Check if this platform version already exists
    if (existingState.versions[platform]) {
      return {
        success: false,
        message: `Platform version ${platform} already exists for state "${importedState.title}"`
      };
    }
    
    // Add the new platform version
    existingPage.states[matchingStateIndex] = {
      ...existingState,
      versions: {
        ...existingState.versions,
        [platform]: importedState.versions[platform]
      }
    };
    
    return {
      success: true,
      message: `Added ${platform} version to existing state "${importedState.title}"`,
      page: existingPage
    };
  } else {
    // State doesn't exist, add it to the page
    existingPage.states.push(importedState);
    
    return {
      success: true,
      message: `Added new state "${importedState.title}" with ${platform} version`,
      page: existingPage
    };
  }
};
```

## API Integration Method (Alternative Approach)

As an alternative to file-based integration, a direct API approach could be implemented:

### 1. HTTP API Endpoint in AI Service

```javascript
// In ai-service/src/controllers/import-controller.js
export const importSessionController = {
  async importSession(req, res) {
    try {
      const { 
        sessionData, 
        projectId = null, 
        createNewProject = false,
        newProjectName = null
      } = req.body;
      
      // Validate session data
      if (!sessionData || !sessionData.state) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid session data'
        });
      }
      
      // Handle project logic
      let targetProjectId = projectId;
      if (createNewProject) {
        const newProject = await projectService.createProject({
          name: newProjectName || 'New Project',
          createdAt: new Date().toISOString()
        });
        targetProjectId = newProject.id;
      }
      
      // Process the import
      const result = await importService.processSessionImport(
        sessionData, 
        targetProjectId
      );
      
      return res.json({
        success: true,
        message: 'Session imported successfully',
        data: result
      });
    } catch (error) {
      console.error('Import error:', error);
      return res.status(500).json({
        success: false,
        message: `Import failed: ${error.message}`
      });
    }
  }
};
```

### 2. Appium Inspector Integration with API

```javascript
// In app/common/renderer/utils/ai-api.js
import axios from 'axios';

// AI service client
export class AIServiceClient {
  constructor(baseUrl = 'http://localhost:3000/api/v1') {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  async importSession(sessionData, options = {}) {
    try {
      const response = await this.client.post('/import/session', {
        sessionData,
        ...options
      });
      
      return response.data;
    } catch (error) {
      console.error('AI service error:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Error connecting to AI service'
      );
    }
  }
  
  // Other API methods...
}

// Create and export a singleton instance
export const aiService = new AIServiceClient();
```

## Direct Launch Integration (Advanced)

For a more seamless experience, Appium Inspector could directly launch AI Studio with the exported data:

### 1. URL Protocol Handler for AI Studio

Register a custom URL protocol handler in AI Studio:

```javascript
// In electron main process for AI Studio
import { app, protocol } from 'electron';
import { importSessionFromUrl } from './import-handler';

app.on('ready', () => {
  // Register protocol handler
  app.setAsDefaultProtocolClient('aistudio');
  
  // Handle protocol URLs
  app.on('open-url', (event, url) => {
    event.preventDefault();
    importSessionFromUrl(url);
  });
  
  // ... rest of app initialization
});
```

### 2. Launch Command from Appium Inspector

```javascript
// In app/common/renderer/utils/launch-utils.js
import { shell } from 'electron';
import { encodeDataForUrl } from './encoding-utils';

export const launchAIStudio = async (sessionData) => {
  try {
    // Encode the session data for URL
    const encodedData = encodeDataForUrl(sessionData);
    
    // Create URL with encoded data
    const url = `aistudio://import?data=${encodedData}`;
    
    // Launch with registered protocol
    await shell.openExternal(url);
    
    return { success: true };
  } catch (error) {
    console.error('Launch error:', error);
    return { 
      success: false, 
      message: `Failed to launch AI Studio: ${error.message}`
    };
  }
};
```

## Key Challenges and Solutions

### 1. Large File Handling

**Challenge:** Screenshots and XML can be large, leading to performance issues.

**Solution:**
- Compress screenshots before export
- Implement chunked file reading/writing
- Add progress indicators for large files

```javascript
// Example compression
export const compressScreenshot = async (base64Image) => {
  // Extract data and mime type
  const [header, data] = base64Image.split(',');
  const mimeType = header.match(/data:(.*);base64/)[1];
  
  // Convert to buffer
  const buffer = Buffer.from(data, 'base64');
  
  // Use image processing library to compress
  if (mimeType === 'image/png') {
    const compressedBuffer = await sharp(buffer)
      .png({ quality: 80, compressionLevel: 9 })
      .toBuffer();
    
    return `data:${mimeType};base64,${compressedBuffer.toString('base64')}`;
  }
  
  // Return original if no compression applied
  return base64Image;
};
```

### 2. Version Compatibility

**Challenge:** Ensuring compatibility as both applications evolve.

**Solution:**
- Version field in export format
- Backward compatibility handling
- Validation with clear error messages

```javascript
// In import service
const handleVersionCompatibility = (version) => {
  const currentVersion = '1.0';
  
  // Check major version
  const [major] = version.split('.');
  const [currentMajor] = currentVersion.split('.');
  
  if (parseInt(major) > parseInt(currentMajor)) {
    throw new Error(`File version ${version} is newer than supported version ${currentVersion}`);
  }
  
  // Handle specific version differences
  if (version === '0.9') {
    // Apply transformation for 0.9 format
  }
  
  return true;
};
```

### 3. Cross-Platform File Paths

**Challenge:** File paths differ across operating systems.

**Solution:**
- Use path normalization
- Store relative paths when possible
- Handle path differences in import/export logic

```javascript
import path from 'path';
import os from 'os';

export const normalizeFilePath = (filePath) => {
  // Convert to platform-specific path
  return path.normalize(filePath);
};

export const getDefaultSavePath = () => {
  // Create a consistent default path across platforms
  return path.join(os.homedir(), 'AppiumAI', 'exports');
};
```

### 4. Error Handling and Recovery

**Challenge:** Ensuring graceful failure and data recovery.

**Solution:**
- Comprehensive validation
- Auto-save during import/export
- Recovery options for interrupted operations

```javascript
export const safeImport = async (file) => {
  try {
    // Create temporary backup
    const backupFile = await createBackup(file);
    
    // Attempt import
    const result = await importSessionFromFile(file);
    
    // Clean up backup on success
    await cleanupBackup(backupFile);
    
    return result;
  } catch (error) {
    // Log error
    console.error('Import failed:', error);
    
    // Offer recovery from backup
    return {
      success: false,
      error: error.message,
      recovery: {
        available: true,
        backupFile,
        recoverFn: async () => recoverFromBackup(backupFile)
      }
    };
  }
};
```