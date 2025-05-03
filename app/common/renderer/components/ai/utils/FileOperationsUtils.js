// FileOperationsUtils.js
import { message } from "antd";
import { generateId } from "./TreeUtils";

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
    
    if (!handleToSave) {
        try {
            if (!window.showSaveFilePicker) {
                message.error("File System Access API is not supported. Please select file location first.");
                return false;
            }
            
            handleToSave = await window.showSaveFilePicker({
                suggestedName: `appium_pages_${new Date().toISOString().split('T')[0]}.json`,
                types: [{ description: "Appium Pages JSON", accept: { "application/json": [".json"] } }],
            });
            
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
        
        const writable = await handleToSave.createWritable();
        await writable.write(JSON.stringify(saveData, null, 2));
        await writable.close();
        
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