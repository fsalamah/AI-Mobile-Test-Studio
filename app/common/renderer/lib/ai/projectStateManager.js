/**
 * Project State Manager
 * 
 * This module handles persisting AI Studio project state
 * across navigation and app sessions
 */

const PROJECT_STATE_KEY = 'appium_ai_studio_project_state';
const CURRENT_PAGE_KEY = 'appium_ai_studio_current_page';
const LAST_VIEW_KEY = 'appium_ai_studio_last_view';
const FILE_HANDLE_KEY = 'appium_ai_studio_file_handle';

// Cache to avoid frequent localStorage operations
let lastSavedState = {
  pages: null,
  selectedPageId: null,
  currentView: null,
  fileHandle: null,
  timestamp: 0
};

// Debounce timer
let saveTimer = null;

/**
 * Save the current project state to localStorage with optimizations
 * - Uses debouncing to prevent frequent saves
 * - Uses caching to avoid saving identical state
 * - Uses selective saves for large data
 * @param {Array} pages - Project pages array
 * @param {string} selectedPageId - Currently selected page ID
 * @param {string} currentView - Current view name
 * @param {Object} fileHandle - File handle object 
 */
export const saveProjectState = (pages, selectedPageId, currentView, fileHandle) => {
  // Clear any pending save operation
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  
  // Set a debounce timer (300ms delay) to avoid frequent saves
  saveTimer = setTimeout(() => {
    try {
      const now = Date.now();
      
      // Don't save too frequently (at least 2 seconds between full page saves)
      const shouldSavePages = !lastSavedState.pages || 
                             (now - lastSavedState.timestamp) > 2000 ||
                             pages.length !== lastSavedState.pages.length;
      
      // Only save pages if necessary (they're usually the largest part)
      if (shouldSavePages && pages && Array.isArray(pages)) {
        // Create a minimal version of pages for storage by removing large objects
        // that aren't necessary for restoring state
        const minimalPages = pages.map(page => {
          // Create a copy without huge node lists and raw data
          const { aiAnalysis, ...rest } = page;
          
          // Only keep essential analysis data
          const minimalAnalysis = aiAnalysis ? {
            // Keep all properties except node lists and raw data
            ...aiAnalysis,
            // Keep code generation results
            code: aiAnalysis.code,
            // Remove or minimize large data structures
            matchingNodes: aiAnalysis.matchingNodes ? 
              aiAnalysis.matchingNodes.length : 0, // Just keep the count
            visualElements: aiAnalysis.visualElements ?
              aiAnalysis.visualElements.map(el => ({
                id: el.id,
                devName: el.devName,
                name: el.name,
                // Omit large base64 data and raw XML
              })) : [],
          } : null;
          
          return {
            ...rest,
            aiAnalysis: minimalAnalysis,
            // Store any other essential page properties
          };
        });
        
        localStorage.setItem(PROJECT_STATE_KEY, JSON.stringify(minimalPages));
        lastSavedState.pages = [...pages]; // Cache full version
        lastSavedState.timestamp = now;
        console.log('AI Studio pages state saved (minimized for storage)');
      }

      // These are small and fast to save, so always update them
      if (selectedPageId !== lastSavedState.selectedPageId) {
        localStorage.setItem(CURRENT_PAGE_KEY, selectedPageId || '');
        lastSavedState.selectedPageId = selectedPageId;
      }

      if (currentView !== lastSavedState.currentView) {
        localStorage.setItem(LAST_VIEW_KEY, currentView || 'pageList');
        lastSavedState.currentView = currentView;
      }

      // Only save file handle if it changed
      if (fileHandle && JSON.stringify(fileHandle) !== JSON.stringify(lastSavedState.fileHandle)) {
        const fileHandleData = {
          path: fileHandle.path || null,
          name: fileHandle.name || null
        };
        localStorage.setItem(FILE_HANDLE_KEY, JSON.stringify(fileHandleData));
        lastSavedState.fileHandle = {...fileHandleData};
      }
      
    } catch (error) {
      console.error('Error saving project state:', error);
    }
  }, 300); // 300ms debounce
};

// Cache for loaded state
let cachedLoadedState = null;

/**
 * Load the project state from localStorage
 * @param {boolean} [forceReload=false] - Force reload from localStorage instead of using cache
 * @returns {Object} The loaded state
 */
export const loadProjectState = (forceReload = false) => {
  // Return cached version if available and not forcing reload
  if (cachedLoadedState && !forceReload) {
    console.log('Using cached project state (fast)');
    return {...cachedLoadedState};
  }
  
  try {
    // Only parse the large pages JSON if we don't have it cached or forcing reload
    const pagesString = localStorage.getItem(PROJECT_STATE_KEY);
    const pages = pagesString ? JSON.parse(pagesString) : [];

    // Load selected page ID
    const selectedPageId = localStorage.getItem(CURRENT_PAGE_KEY);

    // Load current view
    const currentView = localStorage.getItem(LAST_VIEW_KEY) || 'pageList';

    // Load file handle info
    const fileHandleString = localStorage.getItem(FILE_HANDLE_KEY);
    const fileHandle = fileHandleString ? JSON.parse(fileHandleString) : null;

    console.log('AI Studio project state loaded from localStorage');
    
    // Create the state object
    const loadedState = {
      pages,
      selectedPageId,
      currentView,
      fileHandle
    };
    
    // Cache for future use
    cachedLoadedState = {...loadedState};
    
    return loadedState;
  } catch (error) {
    console.error('Error loading project state:', error);
    return {
      pages: [],
      selectedPageId: null,
      currentView: 'pageList',
      fileHandle: null
    };
  }
};

/**
 * Clear the saved project state
 */
export const clearProjectState = () => {
  try {
    localStorage.removeItem(PROJECT_STATE_KEY);
    localStorage.removeItem(CURRENT_PAGE_KEY);
    localStorage.removeItem(LAST_VIEW_KEY);
    localStorage.removeItem(FILE_HANDLE_KEY);
    
    // Also clear the in-memory cache
    lastSavedState = {
      pages: null,
      selectedPageId: null,
      currentView: null,
      fileHandle: null,
      timestamp: 0
    };
    
    cachedLoadedState = null;
    
    // Clear any pending save operations
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    
    console.log('AI Studio project state cleared from localStorage and memory');
  } catch (error) {
    console.error('Error clearing project state:', error);
  }
};

/**
 * Check if there is saved project state
 * @returns {boolean} True if there's saved state
 */
export const hasSavedProjectState = () => {
  try {
    const pagesString = localStorage.getItem(PROJECT_STATE_KEY);
    return !!pagesString && pagesString !== '[]';
  } catch (error) {
    console.error('Error checking for saved project state:', error);
    return false;
  }
};