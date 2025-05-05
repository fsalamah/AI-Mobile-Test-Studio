# Implementation Structure Requirements

## Overview
This document outlines the structural requirements and architectural constraints for implementing the Mind Map module. It defines how the new code should be organized, where it should be placed, and key constraints to ensure we don't disrupt existing functionality.

## References
- [Mind Map Module Design](./mindmap_module_design.md) - Core design of the mind map feature
- [Recorder Implementation Plan](./recorder_implementation_plan.md) - Detailed plan for the recording module
- [Inspector Integration Analysis](./inspector_integration_analysis.md) - Analysis of integration points with Appium Inspector
- [Framework Strategy Thoughts](./framework_strategy_thoughts.md) - Considerations for test framework integration
- [Future UX Thoughts](./future_ux_thoughts.md) - UX considerations and future plans

## Directory Structure

### Base Directory
All new code must be placed under:
```
/app/common/renderer/components/ai/
```

### Module Organization
Each functional module must have its own dedicated folder:

```
/app/common/renderer/components/ai/
  ├── mindmap/                  # Mind Map feature components
  │   ├── components/           # React components for mind map UI
  │   ├── services/             # Mind map domain services
  │   ├── hooks/                # Custom React hooks
  │   └── types/                # TypeScript type definitions
  │
  ├── recorder/                 # Recorder functionality
  │   ├── components/           # UI components for recording
  │   ├── listeners/            # Event listener implementations
  │   ├── services/             # Recording services
  │   └── types/                # TypeScript type definitions
  │
  ├── codeGen/                  # Code generation module
  │   ├── components/           # UI for code display/editing
  │   ├── generators/           # Code generation implementations
  │   ├── adapters/             # Framework-specific adapters
  │   └── templates/            # Code templates
  │
  ├── execution/                # Test execution module
  │   ├── components/           # Execution UI components
  │   ├── runners/              # Test runner implementations
  │   └── services/             # Execution support services
  │
  ├── common/                   # Shared utilities and components
  │   ├── components/           # Reusable UI components
  │   ├── hooks/                # Shared custom hooks
  │   ├── utils/                # Utility functions
  │   └── types/                # Shared type definitions
  │
  └── integration/              # Inspector integration code
      ├── adapters/             # Integration adapters
      ├── events/               # Event manager implementation
      └── listeners/            # Primary event listeners
```

### Library Code
Core logic that doesn't directly relate to UI components should be placed in:
```
/app/common/renderer/lib/ai/mindmap/
```

This should include:
- Core data models
- State management
- Business logic
- Framework-agnostic services

## Implementation Constraints

### No Modification of Existing Code
1. **Existing Code Preservation**: Do NOT modify any existing Appium Inspector code unless absolutely necessary for integration purposes. If modifications are required:
   - They must be minimal
   - They must be non-intrusive
   - They must maintain backward compatibility
   - They must be thoroughly documented

2. **Extension Points**: Use the identified integration points in `Inspector.js` and `InspectorDriver.js` without modifying their core behavior.

### Integration Strategy
1. **Event-Based Integration**: Use event listeners to observe existing functionality rather than modifying it.

2. **Feature Toggling**: All new functionality must be toggleable to allow users to disable it if desired.

3. **Error Isolation**: Errors in new modules must not propagate to or affect existing Appium Inspector functionality.

4. **Performance Impact**: New code must not significantly impact the performance of existing features.

### Code Organization

1. **Module Boundaries**: Each module must have clear boundaries with well-defined interfaces.

2. **Type Definitions**: All interfaces and data structures must have TypeScript type definitions.

3. **Common Utilities**: Shared functionality should be placed in the `common` directory.

4. **Component Structure**: React components should follow this pattern:
   - One component per file
   - Component file named the same as the component
   - Props interface defined in the same file
   - Styles should use CSS modules or Ant Design theming

### State Management

1. **Module State**: Each module should manage its own internal state.

2. **Cross-Module Communication**: Communication between modules should occur through:
   - Event system
   - React context
   - Props passing
   - Shared services

3. **Persistence**: Each module should handle its own persistence needs.

### Testing Requirements

1. **Unit Testing**: All non-UI logic must have unit tests.

2. **Component Testing**: UI components must have component tests.

3. **Test Location**: Tests should be co-located with the code they test:
   ```
   /mindmap/services/PageBoundaryManager.ts
   /mindmap/services/__tests__/PageBoundaryManager.test.ts
   ```

4. **Test Independence**: Tests must not depend on external resources.

## Feature Exposure

### Entry Points
1. **Main Entry Point**: Create a top-level component at `/app/common/renderer/components/ai/MindMap.jsx` that serves as the primary integration point.

2. **Feature Toggle**: Implement a feature toggle in the Appium Inspector settings to enable/disable the Mind Map module.

3. **Menu Integration**: Add a menu item to access the Mind Map functionality.

### Phased Integration

1. **Phase 1**: Event listeners and data capture with minimal UI.
   
2. **Phase 2**: Mind Map visualization and basic editing.
   
3. **Phase 3**: Code generation and test execution.
   
4. **Phase 4**: Advanced features (AI-assisted boundary detection, etc.)

## Performance Requirements

1. **Memory Usage**: The Mind Map module must not increase memory usage by more than 20% over baseline Appium Inspector usage.

2. **Responsiveness**: UI interactions must remain responsive (< 100ms) even during recording.

3. **Startup Impact**: New code must not increase Appium Inspector startup time by more than 10%.

4. **Large Sessions**: The system must handle recording sessions with up to 1000 actions without significant performance degradation.

## Compatibility Requirements

1. **Electron Version**: New code must be compatible with the Electron version used by Appium Inspector.

2. **React Version**: Use the same React version as the main application.

3. **Node.js APIs**: Be cautious when using Node.js APIs directly - prefer using established patterns from the main application.

4. **Cross-Platform**: The implementation must work on all platforms supported by Appium Inspector (Windows, macOS, Linux).

## Documentation Requirements

1. **Code Documentation**: All public functions, classes, and interfaces must have JSDoc comments.

2. **README Files**: Each module directory must contain a README.md explaining its purpose and usage.

3. **Architecture Documentation**: Maintain up-to-date architecture documentation as the implementation progresses.

4. **User Documentation**: Create user-facing documentation for each feature as it's implemented.

## Conclusion

By adhering to these structural requirements and constraints, we can implement the Mind Map module in a way that integrates cleanly with the existing Appium Inspector while maintaining modularity, testability, and future extensibility. The clear module boundaries and organizational structure will facilitate collaboration and maintenance as the feature evolves.