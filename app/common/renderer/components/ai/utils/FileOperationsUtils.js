// FileOperationsUtils.js
import { message } from "antd";
import { generateId } from "./TreeUtils";
import { AI_SETTINGS_KEYS, saveAISetting, getAISetting } from "../../../lib/ai/aiSettings";

// Maximum number of recent projects to show
const MAX_RECENT_PROJECTS = 5;

/**
 * Adds a project to the list of recent projects
 * @param {string} name - Project filename
 * @param {string} path - Full path to project file (optional)
 */
export const addRecentProject = (name, path = null) => {
    try {
        if (!name) return;
        
        // Get existing recent projects
        const recentProjects = getRecentProjects();
        
        // Create new project entry
        const projectEntry = {
            name,
            path,
            lastOpened: Date.now()
        };
        
        // Remove this project if it already exists (to avoid duplicates)
        const filteredProjects = recentProjects.filter(p => 
            !(p.name === name && (!path || p.path === path))
        );
        
        // Add new entry at the beginning
        filteredProjects.unshift(projectEntry);
        
        // Limit to MAX_RECENT_PROJECTS
        const limitedProjects = filteredProjects.slice(0, MAX_RECENT_PROJECTS);
        
        // Save back to settings
        saveAISetting(AI_SETTINGS_KEYS.RECENT_PROJECTS, limitedProjects);
        
        return limitedProjects;
    } catch (error) {
        console.error("Error adding recent project:", error);
        return [];
    }
};

/**
 * Gets the list of recent projects
 * @returns {Array} List of recent projects
 */
export const getRecentProjects = () => {
    try {
        const recentProjects = getAISetting(AI_SETTINGS_KEYS.RECENT_PROJECTS);
        return Array.isArray(recentProjects) ? recentProjects : [];
    } catch (error) {
        console.error("Error getting recent projects:", error);
        return [];
    }
};

/**
 * Removes a project from the list of recent projects
 * @param {string} name - Project filename
 * @param {string} path - Full path to project file (optional)
 */
export const removeRecentProject = (name, path = null) => {
    try {
        if (!name) return;
        
        // Get existing recent projects
        const recentProjects = getRecentProjects();
        
        // Filter out the project to remove
        const filteredProjects = recentProjects.filter(p => 
            !(p.name === name && (!path || p.path === path))
        );
        
        // Save back to settings
        saveAISetting(AI_SETTINGS_KEYS.RECENT_PROJECTS, filteredProjects);
        
        return filteredProjects;
    } catch (error) {
        console.error("Error removing recent project:", error);
        return [];
    }
};

/**
 * Utility functions for file operations in the AppiumAnalysisPanel
 */

/**
 * Choose a file location for saving
 * @param {Function} setFileHandle - Function to set the file handle
 * @returns {Promise<Object|null>} - File handle or null if operation canceled/failed
 */
export const chooseFile = async (setFileHandle) => {
    try {
        if (!window.showSaveFilePicker) {
            message.error("File System Access API is not supported in this browser or context (requires HTTPS/localhost).");
            return null;
        }
        
        const handle = await window.showSaveFilePicker({
            suggestedName: `appium_pages_${new Date().toISOString().split('T')[0]}.json`,
            types: [{ description: "Appium Pages JSON", accept: { "application/json": [".json"] } }],
        });
        
        setFileHandle(handle);
        message.success(`Selected save location: ${handle.name}`);
        return handle;
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error("File picker error:", err);
            message.error(`File selection failed: ${err.message}`);
        }
        return null;
    }
};

/**
 * Save project data to a file
 * @param {Array} pages - Array of page objects to save
 * @param {Object} fileHandle - File handle to save to
 * @param {Function} setFileHandle - Function to set the file handle
 * @param {Function} setSaving - Function to set the saving state
 * @returns {Promise<boolean>} - True if saving was successful, false otherwise
 */
export const saveToFile = async (pages, fileHandle, setFileHandle, setSaving) => {
    let handleToSave = fileHandle;
    let needNewFileHandle = false;
    
    // Check if the file handle is valid first by attempting a permission check
    if (handleToSave) {
        try {
            // Try to verify that the handle is valid by checking permissions
            // This will fail if the handle is no longer valid (app was closed/reopened)
            await handleToSave.queryPermission({ mode: 'readwrite' });
        } catch (err) {
            console.warn("File handle is no longer valid, requesting a new one:", err);
            needNewFileHandle = true;
            handleToSave = null;
        }
    }
    
    // If we don't have a handle or it's invalid, request a new one
    if (!handleToSave || needNewFileHandle) {
        try {
            if (!window.showSaveFilePicker) {
                message.error("File System Access API is not supported. Please select file location first.");
                return false;
            }
            
            const options = {
                suggestedName: `appium_pages_${new Date().toISOString().split('T')[0]}.json`,
                types: [{ description: "Appium Pages JSON", accept: { "application/json": [".json"] } }],
            };
            
            // If we have a previous file name, suggest it
            const lastFileName = getAISetting(AI_SETTINGS_KEYS.LAST_PAGES_FILE_NAME);
            if (lastFileName) {
                options.suggestedName = lastFileName;
            }
            
            handleToSave = await window.showSaveFilePicker(options);
            setFileHandle(handleToSave);
        } catch (err) {
            if (err.name !== 'AbortError') { 
                message.error(`Failed to get save location: ${err.message}`); 
            }
            return false;
        }
    }

    if (pages.length === 0) {
        message.warn("No pages to save.");
        return false;
    }
    
    setSaving(true);
    
    try {
        const saveData = { 
            version: 2, 
            createdAt: new Date().toISOString(), 
            pages: pages 
        };
        
        try {
            const writable = await handleToSave.createWritable();
            await writable.write(JSON.stringify(saveData, null, 2));
            await writable.close();
        } catch (writeErr) {
            // If creating a writable stream fails, try one more time with a new file handle
            if (writeErr.message && (
                writeErr.message.includes('createWritable is not a function') || 
                writeErr.message.includes('permission') ||
                writeErr.message.includes('denied')
            )) {
                console.warn("Error writing to file, requesting new file handle:", writeErr);
                
                // Ask for a new file handle
                const options = {
                    suggestedName: handleToSave.name || `appium_pages_${new Date().toISOString().split('T')[0]}.json`,
                    types: [{ description: "Appium Pages JSON", accept: { "application/json": [".json"] } }],
                };
                
                handleToSave = await window.showSaveFilePicker(options);
                setFileHandle(handleToSave);
                
                // Try again with the new handle
                const writable = await handleToSave.createWritable();
                await writable.write(JSON.stringify(saveData, null, 2));
                await writable.close();
            } else {
                // If it's a different error, re-throw it
                throw writeErr;
            }
        }
        
        // Save file path to settings
        try {
            saveAISetting(AI_SETTINGS_KEYS.LAST_PAGES_FILE_NAME, handleToSave.name);
            // Some browsers may not expose file path for security reasons
            if (handleToSave.path) {
                saveAISetting(AI_SETTINGS_KEYS.LAST_PAGES_FILE_PATH, handleToSave.path);
            }
        } catch (settingsErr) {
            console.warn("Could not save file path to settings:", settingsErr);
        }
        
        // Add to recent projects
        addRecentProject(handleToSave.name, handleToSave.path || null);
        
        message.success(`Saved ${pages.length} page(s) successfully to ${handleToSave.name}.`);
        return true;
    } catch (err) {
        console.error("Save error:", err);
        message.error(`Failed to save file: ${err.message}`);
        setFileHandle(null);
        return false;
    } finally {
        setSaving(false);
    }
};

/**
 * Open a saved file
 * @param {Function} setPages - Function to set the pages state
 * @param {Function} setFileHandle - Function to set the file handle
 * @param {Function} resetUIState - Function to reset UI state
 * @returns {Promise<boolean>} - True if opening was successful, false otherwise
 */
export const openSavedFile = async (setPages, setFileHandle, resetUIState) => {
    try {
        if (!window.showOpenFilePicker) {
            message.error("File System Access API is not supported in this browser or context (requires HTTPS/localhost).");
            return false;
        }
        
        const [handle] = await window.showOpenFilePicker({
            types: [{ description: "Appium Pages JSON", accept: { "application/json": [".json"] } }],
        });
        
        const file = await handle.getFile();
        const content = await file.text();
        const jsonData = JSON.parse(content);

        if (jsonData && Array.isArray(jsonData.pages)) {
            const loadedPages = jsonData.pages.map(page => ({
                ...page,
                id: page.id || generateId(),
                states: (page.states || []).map(state => ({
                    ...state,
                    id: state.id || generateId(),
                    versions: state.versions || {}
                })),
                module: page.module || ''
            }));

            setPages(loadedPages);
            setFileHandle(handle);
            resetUIState();
            
            // Save file info to settings
            try {
                saveAISetting(AI_SETTINGS_KEYS.LAST_PAGES_FILE_NAME, file.name);
                // Some browsers may not expose file path for security reasons
                if (handle.path) {
                    saveAISetting(AI_SETTINGS_KEYS.LAST_PAGES_FILE_PATH, handle.path);
                }
            } catch (settingsErr) {
                console.warn("Could not save file path to settings:", settingsErr);
            }
            
            // Add to recent projects
            addRecentProject(file.name, handle.path || null);
            
            message.success(`Loaded ${loadedPages.length} page(s) from ${file.name}.`);
            return true;
        } else {
            message.error("Invalid file format. Could not find a 'pages' array.");
            return false;
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error("File open error:", err);
            message.error(`File opening failed: ${err.message}`);
        }
        return false;
    }
};

/**
 * Open a recent project by name
 * @param {string} projectName - Name of the project to open
 * @param {Function} setPages - Function to set the pages state 
 * @param {Function} setFileHandle - Function to set the file handle
 * @param {Function} resetUIState - Function to reset UI state
 * @returns {Promise<boolean>} - True if opening was successful, false otherwise
 */
export const openRecentProject = async (projectName, setPages, setFileHandle, resetUIState) => {
    try {
        if (!projectName) {
            return false;
        }

        // Get the list of recent projects
        const recentProjects = getRecentProjects();
        
        // Find the project by name
        const project = recentProjects.find(p => p.name === projectName);
        
        if (!project) {
            message.error(`Project "${projectName}" not found in recent projects.`);
            return false;
        }
        
        // Use the standard openSavedFile function which will handle file selection
        message.info(`Please select the project file: ${projectName}`);
        
        // We need to open manually because we can't persist file handles across sessions
        const success = await openSavedFile(setPages, setFileHandle, resetUIState);
        
        if (success) {
            // Update the lastOpened timestamp
            addRecentProject(project.name, project.path);
        }
        
        return success;
    } catch (err) {
        console.error("Error opening recent project:", err);
        message.error(`Failed to open recent project: ${err.message}`);
        return false;
    }
};

/**
 * Try to open the last used file on startup
 * @param {Function} setPages - Function to set the pages state 
 * @param {Function} setFileHandle - Function to set the file handle
 * @param {Function} resetUIState - Function to reset UI state
 * @returns {Promise<boolean>} - True if opening was successful, false otherwise
 */
export const tryOpenLastFile = async (setPages, setFileHandle, resetUIState) => {
    try {
        const fileName = getAISetting(AI_SETTINGS_KEYS.LAST_PAGES_FILE_NAME);
        if (!fileName) {
            console.log("No last file path found in settings");
            return false;
        }
        
        let fileHandle;
        
        try {
            // Try to directly access the file using the File System Access API
            // Note: In Electron context, this should work if the proper permissions are maintained
            if (window.showOpenFilePicker) {
                // Attempt to automatically open the file
                message.info(`Reopening last used file: ${fileName}`);
                
                try {
                    // In Electron, we can try to auto-open without user interaction
                    // if we have previously granted permissions
                    const [handle] = await window.showOpenFilePicker({
                        types: [{ description: "Appium Pages JSON", accept: { "application/json": [".json"] } }],
                        id: 'lastOpenedAIFile', // Use a consistent ID for permission persistence
                        startIn: 'downloads', // Start in downloads directory as a common location
                    });
                    
                    fileHandle = handle;
                } catch (err) {
                    if (err.name === 'AbortError') {
                        // User canceled the dialog, we'll ask them to select it manually
                        console.log("User canceled the file dialog");
                    } else if (err.name === 'SecurityError') {
                        // Permission denied, we'll need user interaction
                        console.log("Security error accessing file, need user selection");
                    } else {
                        throw err; // Re-throw unexpected errors
                    }
                }
            }
        } catch (accessErr) {
            console.log("Could not automatically reopen file:", accessErr);
        }
        
        if (fileHandle) {
            // We successfully got the file handle without user interaction
            const file = await fileHandle.getFile();
            const content = await file.text();
            const jsonData = JSON.parse(content);
            
            if (jsonData && Array.isArray(jsonData.pages)) {
                const loadedPages = jsonData.pages.map(page => ({
                    ...page,
                    id: page.id || generateId(),
                    states: (page.states || []).map(state => ({
                        ...state,
                        id: state.id || generateId(),
                        versions: state.versions || {}
                    })),
                    module: page.module || ''
                }));
                
                setPages(loadedPages);
                setFileHandle(fileHandle);
                resetUIState();
                
                // Add to recent projects
                addRecentProject(file.name, fileHandle.path || null);
                
                message.success(`Automatically loaded ${loadedPages.length} page(s) from ${file.name}.`);
                return true;
            }
        } else {
            // We couldn't automatically reopen the file, ask user to select it
            message.info(`Please select the last opened file: ${fileName}`);
            return await openSavedFile(setPages, setFileHandle, resetUIState);
        }
        
        return false;
    } catch (err) {
        console.error("Error trying to open last file:", err);
        message.error(`Failed to open last file: ${err.message}`);
        return false;
    }
};