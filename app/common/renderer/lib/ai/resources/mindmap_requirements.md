# Mind Map Module Requirements Specification

## Overview
This document outlines the requirements for the Mind Map Module, an extension to Appium Inspector that enables visual test flow mapping, intelligent page detection, and automated test generation with real-time execution.

## 1. Core Functionality Requirements

### 1.1 Flow Recording & State Capture
- **REQ-1.1.1**: Intercept and record ALL Appium Inspector actions and events
- **REQ-1.1.2**: Capture full-resolution screenshots at the moment of each action
- **REQ-1.1.3**: Store complete page XML/DOM structure with each event
- **REQ-1.1.4**: Record detailed action metadata (type, target, parameters, timing)
- **REQ-1.1.5**: Maintain device context information (orientation, platform, session details)
- **REQ-1.1.6**: Provide user interface for manual page boundary marking during recording
- **REQ-1.1.7**: Prompt for page name and state description at user-defined boundaries
- **REQ-1.1.8**: Organize captured states chronologically with timestamp indexing
- **REQ-1.1.9**: Support pause, resume, and append to existing recordings
- **REQ-1.1.10**: Provide visual indicators and counters during active recording

#### Technical Details for Recording System
- **TECH-REC-1**: Hook into Appium Inspector's command execution pipeline to capture all actions before they're sent to the Appium server
- **TECH-REC-2**: Create snapshot data structure containing:
  ```typescript
  interface StateSnapshot {
    id: string;                      // Unique identifier
    timestamp: number;               // Unix timestamp with ms precision
    pageName: string | null;         // User-provided or AI-detected page name
    pageState: string | null;        // State descriptor (e.g., "LoggedIn", "Error")
    screenshot: {                    // Screenshot data
      base64: string;                // Base64-encoded image data
      format: string;                // Image format (png/jpeg)
      deviceWidth: number;           // Screen width in pixels
      deviceHeight: number;          // Screen height in pixels
      orientation: 'portrait' | 'landscape';
    };
    source: {                        // Page source data
      xml: string;                   // Raw XML/HTML source
      compressed: boolean;           // Whether source is compressed
      encoding: string;              // Encoding format if compressed
    };
    action: {                        // Action that led to this state
      type: string;                  // Action type (tap, swipe, sendKeys, etc.)
      elementId?: string;            // Target element ID if applicable
      xpath?: string;                // XPath to target element
      selector?: string;             // Other selector used
      value?: any;                   // Input value for sendKeys, coordinates for tap, etc.
      duration?: number;             // Action duration in ms
      commands?: Array<{             // Raw Appium commands sent
        method: string;
        endpoint: string;
        body: any;
      }>;
    };
    context: {                       // Session context
      sessionId: string;             // Appium session ID
      platform: string;              // iOS/Android/Web
      appPackage?: string;           // Android app package
      bundleId?: string;             // iOS bundle ID
      webUrl?: string;               // URL for web contexts
      capabilities: Record<string, any>; // Session capabilities
      viewportRect?: {               // Viewport information
        left: number;
        top: number;
        width: number;
        height: number;
      };
    };
    metadata: {                      // Additional metadata
      userDefined: boolean;          // Whether this was marked as a page boundary by user
      confidenceScore?: number;      // AI confidence in page boundary (0-100)
      tags: string[];                // User-defined tags
      notes: string;                 // User notes
      previousStateId?: string;      // ID of previous state in sequence
      nextStateId?: string;          // ID of next state in sequence
      groupId?: string;              // Page group this state belongs to
    };
  }
  ```

- **TECH-REC-3**: Implement state storage manager with the following capabilities:
  - In-memory compression of screenshots using WebP or optimized PNG
  - Periodic auto-save to prevent data loss
  - Serialization/deserialization for project storage
  - Efficient querying by timestamp, page name, or action type
  - Pagination support for large recording sessions

- **TECH-REC-4**: Create user interface components for recording:
  - Floating control panel with record/pause/stop buttons
  - Status indicator showing current recording state
  - Counter displaying number of actions recorded
  - "Mark Page" button with name/state input dialog
  - Keyboard shortcuts (Ctrl+M for marking pages, Ctrl+P for pause/resume)
  - Mini-timeline showing recent captures with thumbnails

- **TECH-REC-5**: Implement event handling system:
  - Intercept all Appium command executions
  - Listen for DOM mutations and navigation events
  - Track user interactions with Inspector UI
  - Detect system events (orientation changes, alerts, permissions)
  - Support custom event triggers for framework-specific events

- **TECH-REC-6**: Create recorder session management:
  - Support named recording sessions
  - Enable merging of multiple recording sessions
  - Provide branching for alternative flows
  - Allow selective inclusion/exclusion of recorded actions
  - Track recording session metadata (creator, date, device, etc.)

### 1.2 Page Boundary Detection
- **REQ-1.2.1**: Implement visual difference analysis between sequential screenshots
- **REQ-1.2.2**: Apply DOM structure comparison to detect significant page changes
- **REQ-1.2.3**: Detect navigation events and URL/activity/fragment changes
- **REQ-1.2.4**: Use time-based heuristics to identify potential page transitions
- **REQ-1.2.5**: Analyze element density and distribution changes
- **REQ-1.2.6**: Track header/footer element modifications as transition indicators
- **REQ-1.2.7**: Support ML-based page boundary detection with confidence scoring
- **REQ-1.2.8**: Send context data to AI service for boundary verification
- **REQ-1.2.9**: Present preliminary page grouping with confidence indicators
- **REQ-1.2.10**: Learn from user corrections to improve future detection

#### Technical Details for Page Boundary Detection
- **TECH-PBD-1**: Implement lightweight image comparison algorithm:
  - Perceptual hashing for quick similarity checks
  - Structural similarity index (SSIM) for detailed comparison
  - Region-based analysis focusing on key UI areas
  - Color histogram comparison for theme/section changes
  - Feature point matching for partial UI changes

- **TECH-PBD-2**: Create DOM analysis system:
  - Generate DOM fingerprints using element counts and hierarchies
  - Compare element IDs, classes, and attributes between states
  - Detect addition/removal of major container elements
  - Track changes in navigation elements and breadcrumbs
  - Identify form submissions and resulting page changes

- **TECH-PBD-3**: Implement AI integration for boundary analysis:
  - Batch processing of sequential states (3-5 states per request)
  - Include all context: screenshots, DOM, actions, timing
  - Prompt format: "Analyze these sequential app states and determine if a page transition occurred between them. Consider the action that led to each state and whether it typically causes navigation."
  - Response format: JSON with confidence scores and explanations
  - Feature extraction for ML model input when available

- **TECH-PBD-4**: Create page grouping algorithm:
  - Initial clustering based on similarity metrics
  - Hierarchical clustering with configurable thresholds
  - State graph construction with transition probabilities
  - Iterative refinement based on user feedback
  - Support for manual override and regrouping

### 1.3 Mind Map Visualization
- **REQ-1.3.1**: Display pages as nodes with representative screenshot thumbnails
- **REQ-1.3.2**: Show transitions as directional edges with action descriptions
- **REQ-1.3.3**: Support interactive graph visualization with zoom and pan
- **REQ-1.3.4**: Enable drag-and-drop reorganization of pages and flows
- **REQ-1.3.5**: Provide controls for merging and splitting pages
- **REQ-1.3.6**: Allow annotation of pages and transitions with custom notes
- **REQ-1.3.7**: Include timeline view showing chronological sequence
- **REQ-1.3.8**: Visualize alternate paths and conditional flows
- **REQ-1.3.9**: Support collapsible subflows for complex maps
- **REQ-1.3.10**: Enable export of visual mind map as image/PDF

### 1.4 Code Generation
- **REQ-1.4.1**: Generate Page Object Model classes from mind map nodes
- **REQ-1.4.2**: Create navigation methods from transition edges
- **REQ-1.4.3**: Implement element locators based on captured interactions
- **REQ-1.4.4**: Generate test cases from paths through the mind map
- **REQ-1.4.5**: Support WebdriverIO as primary code generation target
- **REQ-1.4.6**: Utilize language-agnostic core model for future expansion
- **REQ-1.4.7**: Adapt generated code to match existing project patterns
- **REQ-1.4.8**: Include assertions based on captured element states
- **REQ-1.4.9**: Generate robust waiting strategies and timeouts
- **REQ-1.4.10**: Support multiple selector strategies with fallbacks

#### Technical Details for Code Generation Architecture
- **TECH-CG-1**: Implement language-agnostic model using adapter pattern:
  ```typescript
  // Core interfaces independent of target language
  interface PageModel {
    id: string;
    name: string;
    elements: ElementModel[];
    actions: ActionModel[];
    navigationMethods: NavigationModel[];
  }
  
  interface ElementModel {
    id: string;
    name: string;
    locators: LocatorModel[];
    actions: ActionModel[];
    properties: Record<string, any>;
  }
  
  interface ActionModel {
    id: string;
    name: string;
    type: string;
    targetElement?: string; // Element ID
    parameters: ParameterModel[];
    returns?: string;
    description: string;
  }
  
  interface NavigationModel {
    id: string;
    name: string;
    sourcePage: string; // Page ID
    targetPage: string; // Page ID
    actions: string[]; // Action IDs
    conditions?: ConditionModel[];
  }
  
  interface LocatorModel {
    strategy: string; // xpath, css, id, etc.
    value: string;
    priority: number; // Priority order for fallback
    reliability: number; // Estimated reliability score 0-100
  }
  
  // Language-specific adapters
  interface CodeGeneratorAdapter {
    generatePageObject(page: PageModel): string;
    generateTestCase(flow: NavigationModel[]): string;
    generateConfig(): string;
    formatCode(code: string): string;
  }
  
  // Concrete implementations
  class WebdriverIOAdapter implements CodeGeneratorAdapter {
    // Implementation for WebdriverIO
  }
  
  class JavaAdapter implements CodeGeneratorAdapter {
    // Implementation for Java
  }
  ```

- **TECH-CG-2**: Implement WebdriverIO code generation with:
  - ES6/TypeScript module format
  - Page objects as classes with BasePage inheritance
  - Element getters with chainable selectors
  - Async/await pattern for all operations
  - Custom command extensions for complex actions
  - Strong typing with JSDoc or TypeScript
  - Allure reporting integration
  - Configurable assertion library support

### 1.5 Test Execution
- **REQ-1.5.1**: Execute generated tests against active Appium session
- **REQ-1.5.2**: Provide step-by-step execution mode
- **REQ-1.5.3**: Highlight current execution point in mind map
- **REQ-1.5.4**: Compare expected vs. actual execution paths
- **REQ-1.5.5**: Capture and display execution results and screenshots
- **REQ-1.5.6**: Identify and highlight failures with contextual information
- **REQ-1.5.7**: Allow hot code modification and re-execution
- **REQ-1.5.8**: Monitor execution timing and stability metrics
- **REQ-1.5.9**: Generate execution reports with pass/fail statistics
- **REQ-1.5.10**: Support debugging tools for test inspection

#### Technical Details for Test Execution
- **TECH-TE-1**: Implement WebdriverIO runtime environment:
  - In-memory test runner for direct execution
  - Session bridging to reuse active Appium connection
  - Instrumentation for step-by-step execution control
  - Breakpoint support and execution pausing
  - Live code evaluation and hot replacement
  - Isolated execution context per test run

- **TECH-TE-2**: Create execution visualization components:
  - Mind map overlay highlighting current node/edge
  - Path tracing showing execution history
  - Real-time screenshot comparison (expected vs. actual)
  - Execution metrics dashboard (timing, stability)
  - Error visualization with context highlighting
  - State inspection tools for debugging

## 2. Technical Requirements

### 2.1 Architecture
- **REQ-2.1.1**: Implement language-agnostic core model for test components
- **REQ-2.1.2**: Use adapter pattern for language-specific implementations
- **REQ-2.1.3**: Support bidirectional synchronization between mind map and code
- **REQ-2.1.4**: Maintain clean separation between UI and core logic
- **REQ-2.1.5**: Utilize reactive data flow for real-time updates

### 2.2 UI Components
- **REQ-2.2.1**: Build mind map editor using React components
- **REQ-2.2.2**: Implement graph visualization using D3.js or similar library
- **REQ-2.2.3**: Create code editor with syntax highlighting
- **REQ-2.2.4**: Design split-pane interface for map and code views
- **REQ-2.2.5**: Ensure responsive design for various screen sizes

### 2.3 Integration
- **REQ-2.3.1**: Hook into existing Appium Inspector recorder
- **REQ-2.3.2**: Integrate with WebdriverIO test runner
- **REQ-2.3.3**: Connect to AI service for enhanced page detection
- **REQ-2.3.4**: Support project template import/export
- **REQ-2.3.5**: Enable seamless switching between Inspector and Mind Map modes

### 2.4 Performance
- **REQ-2.4.1**: Optimize screenshot storage for minimal memory usage
- **REQ-2.4.2**: Ensure mind map rendering performance with large flows
- **REQ-2.4.3**: Support lazy loading for extended recording sessions
- **REQ-2.4.4**: Implement caching for AI analysis results
- **REQ-2.4.5**: Maintain responsive UI during recording and execution

### 2.5 Storage
- **REQ-2.5.1**: Create efficient serialization format for mind map data
- **REQ-2.5.2**: Support auto-save and recovery
- **REQ-2.5.3**: Implement project file format with all resources embedded
- **REQ-2.5.4**: Enable version history for mind map changes
- **REQ-2.5.5**: Support export/import of partial flows

## 3. AI Integration Requirements

### 3.1 Page Boundary Detection
- **REQ-3.1.1**: Submit sequential snapshots to AI for boundary analysis
- **REQ-3.1.2**: Include XML, screenshots, and action context in AI requests
- **REQ-3.1.3**: Receive confidence scores for potential page transitions
- **REQ-3.1.4**: Obtain AI explanations for boundary decisions
- **REQ-3.1.5**: Implement feedback loop for continuous learning

### 3.2 Element Identification
- **REQ-3.2.1**: Use AI to identify key interactive elements on each page
- **REQ-3.2.2**: Generate semantic names for elements based on context
- **REQ-3.2.3**: Identify element groups and patterns (forms, lists, etc.)
- **REQ-3.2.4**: Suggest robust selectors with multiple strategies
- **REQ-3.2.5**: Prioritize elements by importance to page functionality

### 3.3 Test Case Generation
- **REQ-3.3.1**: Request AI suggestions for test coverage priorities
- **REQ-3.3.2**: Generate meaningful test case names and descriptions
- **REQ-3.3.3**: Suggest appropriate assertions based on page context
- **REQ-3.3.4**: Identify edge cases and validation scenarios
- **REQ-3.3.5**: Recommend test data strategies for form inputs

### 3.4 Error Analysis
- **REQ-3.4.1**: Submit test failures to AI for root cause analysis
- **REQ-3.4.2**: Receive suggested fixes for failed tests
- **REQ-3.4.3**: Get explanations for unexpected application behavior
- **REQ-3.4.4**: Identify patterns in recurring failures
- **REQ-3.4.5**: Generate stability improvement recommendations

## 4. User Experience Requirements

### 4.1 Recording Flow
- **REQ-4.1.1**: Provide clear visual indicators for recording status
- **REQ-4.1.2**: Implement intuitive controls for starting/stopping recording
- **REQ-4.1.3**: Display real-time feedback during recording
- **REQ-4.1.4**: Support keyboard shortcuts for common recording actions
- **REQ-4.1.5**: Enable page marking and naming during active recording

### 4.2 Mind Map Editing
- **REQ-4.2.1**: Support intuitive drag-and-drop for page rearrangement
- **REQ-4.2.2**: Implement context menus for common operations
- **REQ-4.2.3**: Provide undo/redo functionality for all edits
- **REQ-4.2.4**: Enable direct editing of page and transition properties
- **REQ-4.2.5**: Support multi-select operations for batch editing

### 4.3 Code Interaction
- **REQ-4.3.1**: Provide syntax highlighting and code completion
- **REQ-4.3.2**: Enable direct code editing with validation
- **REQ-4.3.3**: Sync code changes back to mind map representation
- **REQ-4.3.4**: Highlight active code sections during test execution
- **REQ-4.3.5**: Support side-by-side comparison of generated vs. custom code

### 4.4 Test Execution
- **REQ-4.4.1**: Implement intuitive controls for test execution
- **REQ-4.4.2**: Provide clear visualization of test progress
- **REQ-4.4.3**: Display real-time results with failure highlights
- **REQ-4.4.4**: Enable pause, resume, and step-by-step execution
- **REQ-4.4.5**: Support quick navigation to failure points

### 4.5 Project Management
- **REQ-4.5.1**: Support named projects with multiple flows
- **REQ-4.5.2**: Implement save, open, and recent projects functionality
- **REQ-4.5.3**: Enable project templates and configuration
- **REQ-4.5.4**: Provide export options for various formats
- **REQ-4.5.5**: Support project-level settings and preferences

## 5. Implementation Phases

### Phase 1: Foundation
- Integrate with Appium Inspector recorder
- Implement basic state capture functionality
- Create simple visualization of captured states
- Develop core data models for mind map representation

### Phase 2: Core Functionality
- Implement initial page boundary detection algorithms
- Build interactive mind map editor
- Create WebdriverIO code generation
- Develop basic test execution capabilities

### Phase 3: Intelligence Layer
- Integrate with AI services for enhanced detection
- Implement learning from user corrections
- Add multi-language support framework
- Develop project integration capabilities

### Phase 4: Advanced Features
- Implement real-time test execution visualization
- Add advanced editing and annotation tools
- Create comprehensive reporting and analytics
- Build self-healing test capabilities

## 6. Constraints and Considerations

### 6.1 Technical Constraints
- Must integrate with existing Appium Inspector architecture
- Should support both Electron and web deployment
- Must handle various mobile platforms (iOS, Android) and web contexts
- Should minimize dependencies on external services where possible

### 6.2 Performance Considerations
- Large recording sessions may contain hundreds of actions
- Mind map visualization must remain responsive with complex flows
- AI analysis should not significantly delay the user experience
- Test execution must maintain connection with Appium server

### 6.3 Security Considerations
- Application screenshots may contain sensitive information
- Generated code should follow security best practices
- External AI service interactions must be secured appropriately
- User data and projects should be stored securely

### 6.4 Compatibility
- Must work with all Appium-supported platforms
- Should integrate with popular CI/CD systems
- Generated code should be compatible with standard test runners
- Mind map format should support future extensions