# AI Module Architecture

## Overview

The Appium Inspector AI Module uses a layered architecture designed for modularity, extensibility, and maintainability.

## Architectural Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                               UI LAYER                                     │
├───────────┬───────────────┬───────────────┬───────────────┬───────────────┤
│           │               │               │               │               │
│RecordingView  PageDetailView  ElementList    XPathFixView    AIStudio     │
│           │               │               │               │               │
└───────────┴───────────┬───┴───────────────┴───────────────┴───────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         SERVICE MANAGEMENT LAYER                           │
├───────────┬───────────────┬───────────────┬───────────────┬───────────────┤
│           │               │               │               │               │
│ActionRecorder ModelManager  ProjectManager  AIServiceManager PageService  │
│           │               │               │               │               │
└───────────┴───────────────┴───────────┬───┴───────────────┴───────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                          PROCESSING PIPELINE LAYER                         │
├───────────┬───────────────┬───────────────┬───────────────┬───────────────┤
│           │               │               │               │               │
│TransitionAnalysis StatesDisambiguation PomPipeline XPathFixPipeline Visual│
│           │               │               │               │               │
└───────────┴───────────────┴───────────────┴───────────┬───┴───────────────┘
                                                        │
                                                        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                           CORE SERVICES LAYER                              │
├───────────┬───────────────┬───────────────┬───────────────┬───────────────┤
│           │               │               │               │               │
│ AIService    FileUtils      PromptBuilder   ElementProcessor XPathEvaluator│
│           │               │               │               │               │
└───────────┴───────────────┴───────────────┴───────────────┴───────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                │
├───────────┬───────────────┬───────────────┬───────────────┬───────────────┤
│           │               │               │               │               │
│Google Vertex AI  OpenAI API   Azure OpenAI    File System    Appium Driver│
│           │               │               │               │               │
└───────────┴───────────────┴───────────────┴───────────────┴───────────────┘
```

## Layer Responsibilities

### UI Layer

- **RecordingView**: Manages recording, playback, and visualization of app states
- **PageDetailView**: Displays detailed page analysis
- **ElementList**: Shows all identified elements with properties
- **XPathFixView**: Interface for XPath repair and testing
- **AIStudio**: Full-featured workspace for AI-assisted analysis

### Service Management Layer

- **ActionRecorder**: Records and manages app states and user actions
- **ModelManager**: Handles AI model selection and configuration
- **ProjectManager**: Manages project files and organization
- **AIServiceManager**: Coordinates access to AI services
- **PageService**: Manages page objects and relationships

### Processing Pipeline Layer

- **TransitionAnalysis**: Processes transitions between app states
- **StatesDisambiguation**: Standardizes page naming across sessions
- **PomPipeline**: Generates Page Object Models
- **XPathFixPipeline**: Repairs and optimizes XPath expressions
- **Visual**: Visual element identification and screenshot analysis

### Core Services Layer

- **AIService**: Direct interface to AI provider APIs
- **FileUtils**: File system operations for storage and retrieval
- **PromptBuilder**: Constructs optimized prompts for AI models
- **ElementProcessor**: Processes element properties and relationships
- **XPathEvaluator**: Evaluates and validates XPath expressions

### External Services

- **AI Provider APIs**: Google Vertex AI, OpenAI, Azure OpenAI
- **File System**: Local storage for projects and recordings
- **Appium Driver**: Connection to the Appium testing framework

## Data Flow

1. User initiates recording or imports existing recording
2. App states and actions are captured by ActionRecorder
3. User requests analysis (transition, POM, etc.)
4. Service managers coordinate the appropriate pipelines
5. Pipelines process data using core services
6. AIService communicates with external AI providers
7. Results are processed and stored
8. UI is updated to display analysis results

## Key Design Patterns

- **Factory Pattern**: For creating different types of analysis objects
- **Strategy Pattern**: For interchangeable AI processing approaches
- **Observer Pattern**: For state updates and event handling
- **Pipeline Pattern**: For sequential processing of data
- **Adapter Pattern**: For interfacing with different AI providers

## Configuration Flow

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│               │     │               │     │               │
│  config.js    ├────►│ ModelManager  ├────►│ AIService     │
│               │     │               │     │               │
└───────────────┘     └───────────────┘     └───────────────┘
       │                                            │
       │                                            │
       ▼                                            ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│               │     │               │     │               │
│ User Settings ├────►│ Pipeline      ├────►│ External API  │
│               │     │ Configuration │     │ Requests      │
└───────────────┘     └───────────────┘     └───────────────┘
```

This architecture provides a solid foundation for continued development and feature expansion.