# AI Module Home Components

This directory contains the components used for the AI Studio home screen and related functionality.

## Components

### AIModuleHome

The main entry component for the AI Module's home screen. It provides:
- Dashboard navigation to various features (Pages, Recordings, Tests, Classes)
- Tab-based navigation between different module features
- Integration with other AI Studio components

### PageTreeAdapter

A specialized adapter component that bridges between the AIModuleHome interface and the PageTree component:
- Transforms simplified page data into the format expected by PageTree
- Handles selection, editing, and deletion of pages
- Transforms tree operations into the format expected by parent components

### ModulePreferences

Provides interface for configuring AI Module settings:
- Recording settings (condensing options, thresholds)
- Analysis settings (transition detection, auto-analysis)
- General module preferences (UI settings, language preferences)

### ProjectsManager

Manages AI Studio projects:
- Lists recent projects
- Provides operations for creating, opening, and managing projects
- Handles project search and filtering

## Usage

Import the components from the `AIModuleHome` directory:

```jsx
import { 
  AIModuleHome, 
  PageTreeAdapter, 
  ModulePreferences,
  ProjectsManager 
} from './components/ai/AIModuleHome';
```

### Example: Using AIModuleHome

```jsx
<AIModuleHome
  inspectorState={inspectorState}
  navigateToModelConfig={() => {/* Navigation logic */}}
  navigateToRecordingView={(options) => {/* Navigate to recording view */}}
  navigateToPageDetail={(page) => {/* Navigate to page detail */}}
/>
```

### Example: Using PageTreeAdapter

```jsx
<PageTreeAdapter
  pages={pages}
  selectedIds={[selectedPageId]}
  onSelect={handlePageSelect}
  setPages={setPages}
/>
```

### Example: Using ModulePreferences

```jsx
<ModulePreferences />
```

### Example: Using ProjectsManager

```jsx
<ProjectsManager
  onProjectSelect={handleProjectSelect}
  onCreateProject={handleCreateProject}
  onImportProject={handleImportProject}
  fileOperations={fileOperations}
/>
```

## File Structure

```
AIModuleHome/
├── AIModuleHome.jsx       # Main component for the AI Module home screen
├── PageTreeAdapter.jsx    # Adapter for the page tree component
├── ModulePreferences.jsx  # Module settings management component
├── ProjectsManager.jsx    # Projects listing and management component
├── index.js               # Exports all components from the directory
└── README.md              # Documentation
```