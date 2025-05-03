# AI Studio for Appium Inspector

<p align="center">
   <img alt="AI Studio" src="./app/common/renderer/assets/images/icon.png" width="200">
</p>
<p align="center">
   AI-powered assistant for mobile app test automation, integrated with Appium Inspector.
</p>

## Overview

AI Studio enhances Appium Inspector with artificial intelligence capabilities to help you create more robust and efficient mobile app tests. The key features include:

- **Automatic UI Element Identification**: AI identifies and classifies UI elements from app screenshots
- **Robust XPath Generation**: Create stable, maintainable XPath locators for UI elements
- **XPath Repair**: Fix broken or unreliable XPath expressions
- **Code Generation**: Generate Page Object Model (POM) code in various languages and frameworks
- **Project Organization**: Manage app screens, UI elements, and test artifacts

## Architecture

AI Studio consists of two main components that work with Appium Inspector:

```
┌─────────────────┐      ┌───────────────┐      ┌──────────────────┐
│                 │      │               │      │                  │
│ Appium Inspector│<────>│   AI Studio   │<────>│  AI Backend      │
│                 │      │               │      │  Service         │
└─────────────────┘      └───────────────┘      └──────────────────┘
                                                        │
                                                        ▼
                                              ┌──────────────────┐
                                              │                  │
                                              │    OpenAI API    │
                                              │                  │
                                              └──────────────────┘
```

- **AI Studio**: Frontend web application for interacting with AI features
- **AI Backend Service**: HTTP API that provides the AI-powered analysis and code generation
- Integration with Appium Inspector is designed to be minimal and non-invasive

## Setup and Installation

### Prerequisites

- Node.js 16+ and npm
- Docker and Docker Compose (for containerized deployment)
- OpenAI API key (for AI features)

### Development Setup

1. **Install dependencies for AI Backend Service**:
   ```bash
   cd ai-backend
   npm install
   ```

2. **Install dependencies for AI Studio**:
   ```bash
   cd ai-studio
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory:
   ```
   API_KEY=your-api-key-here
   OPENAI_API_KEY=your-openai-api-key-here
   ```

4. **Start the development servers**:
   ```bash
   # Terminal 1 - AI Backend Service
   cd ai-backend
   npm run dev
   
   # Terminal 2 - AI Studio
   cd ai-studio
   npm start
   ```

### Production Deployment

For production deployment, you can use Docker Compose:

```bash
# Build and start all containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all containers
docker-compose down
```

## Integration Methods

There are several ways to integrate Appium Inspector with AI Studio:

### 1. Bookmarklet (Zero-Modification)

The bookmarklet approach requires no changes to Appium Inspector:

1. Open AI Studio at http://localhost:3000/integration
2. Follow the instructions to install the "Send to AI Studio" bookmarklet
3. Use Appium Inspector as normal
4. When you want to analyze a screen, click the bookmarklet
5. The current screen data will be sent to AI Studio automatically

### 2. API Integration

For programmatic integration, use the AI Backend Service API:

```javascript
// Example API request to analyze a screen
const response = await fetch('http://localhost:3001/api/analysis/visual', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here'
  },
  body: JSON.stringify({
    page: {
      name: 'Login Screen',
      states: [
        {
          id: 'state-1',
          versions: {
            ios: {
              screenShot: 'base64-encoded-screenshot',
              pageSource: 'xml-source-code'
            }
          }
        }
      ]
    },
    platforms: ['ios']
  })
});

const { jobId } = await response.json();

// Then poll for results
const resultResponse = await fetch(`http://localhost:3001/api/jobs/${jobId}`, {
  headers: {
    'X-API-Key': 'your-api-key-here'
  }
});

const result = await resultResponse.json();
```

### 3. File Import/Export

You can also import and export session data between Appium Inspector and AI Studio:

1. In Appium Inspector, use the "File > Save As..." option to save a session file
2. In AI Studio, use the "Import" feature to import the saved session file
3. After analysis, you can export the results as a JSON file or generated code

## Usage Guide

### Visual Analysis

1. Import a page from Appium Inspector or create a new page
2. Navigate to the page in AI Studio
3. Click "Analyze Page" to identify UI elements
4. Review the identified elements and their properties
5. Make any necessary edits to element names, descriptions, etc.

### XPath Generation

1. After visual analysis, navigate to the XPaths tab
2. Review the generated XPath expressions for each element
3. Test the XPaths against the page source
4. If needed, click "Regenerate" to create new XPaths

### XPath Repair

1. For failing XPaths, click the "Fix" button
2. AI Studio will analyze the element and page source
3. A new, more robust XPath will be generated
4. Alternative XPaths will also be provided for consideration

### Code Generation

1. After finalizing elements and XPaths, go to the Code tab
2. Select your preferred language and framework
3. Click "Generate Code" to create a Page Object Model
4. Review and customize the generated code
5. Export the code to your test project

## API Documentation

The AI Backend Service provides a RESTful API with the following endpoints:

### Authentication

All API requests require authentication using an API key:

```
X-API-Key: your-api-key-here
```

### Analysis Endpoints

- `POST /api/analysis/visual` - Analyze visual elements in a page
- `POST /api/analysis/xpath` - Generate XPath locators for elements
- `POST /api/analysis/xpath/repair` - Repair failing XPath expressions
- `GET /api/analysis/progress/:operationId` - Get progress of analysis operation

### Code Generation Endpoints

- `POST /api/code/generate` - Generate code for a page
- `GET /api/code/languages` - Get supported languages and frameworks

### Job Management Endpoints

- `GET /api/jobs/:jobId` - Get job status and results
- `POST /api/jobs/:jobId/cancel` - Cancel a running job

## Contributing

Contributions to AI Studio are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests for your changes
5. Submit a pull request

## License

AI Studio is released under the same license as Appium Inspector (Apache 2.0).