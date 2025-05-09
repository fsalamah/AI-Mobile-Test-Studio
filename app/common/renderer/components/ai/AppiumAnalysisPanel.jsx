// AppiumAnalysisPanel.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Layout, message } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { Logger as PipelineLogger } from "../../lib/ai/logger.js";

// Import refactored components
import SidePanel from "./SidePanel.jsx";
import PageDetailView from "./PageDetailView.jsx";
import PageXrayView from "./PageXrayView.jsx";
import CodeViewer from "./CodeViewer.jsx";
import AIProgressModal from "./AIProgressModal.jsx";
import EmptyStateMessage from "./EmptyStateMessage.jsx";
import { PageOperations } from "./PageOperations.jsx";
import RecordingView from "./RecordingView.jsx";
import ModelConfigPage from "./ModelConfigPage.jsx";

// Import utilities
import { buildTreeData, generateId } from "./utils/TreeUtils.js";
import { 
    chooseFile, 
    saveToFile, 
    openSavedFile, 
    tryOpenLastFile,
    openRecentProject,
    getRecentProjects 
} from "./utils/FileOperationsUtils.js";

// Import AI pipeline functions
import { executePOMClassPipeline } from "../../lib/ai/PomPipeline.js";
import { executeXpathPipeline } from "../../lib/ai/pipeline.js";
// Model configuration provider for setting project context
import modelConfigProvider from "../../lib/ai/modelConfigProvider.js";

// Import Inspector actions for recording functionality
import { 
    startRecording as startRecordingAction, 
    pauseRecording as pauseRecordingAction, 
    clearRecording as clearRecordingAction,
    RECORD_ACTION
} from "../../actions/Inspector.js";

// Import our custom action recorder
import ActionRecorder from "../../lib/ai/actionRecorder.js";

// Import project state manager
import { saveProjectState, loadProjectState, hasSavedProjectState } from "../../lib/ai/projectStateManager.js";

const { Content } = Layout;

export default function AppiumAnalysisPanel({
    isEmbedded = false,
    inspectorXml = '',
    inspectorScreenshot = '',
    onClose = () => {}
}) {
    // Generate a unique project ID for this session
    const [projectId] = useState(() => `project_${generateId()}`);
    // Core state
    const [pages, setPages] = useState([]);
    const [selectedPageId, setSelectedPageId] = useState(null);
    const selectedPage = useMemo(() => pages.find(p => p.id === selectedPageId), [pages, selectedPageId]);
    const [currentView, setCurrentView] = useState('pageList');
    const [xrayViewMode, setXrayViewMode] = useState('default');
    const [showModelConfig, setShowModelConfig] = useState(false);
    
    // Search and tree state
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedKeys, setExpandedKeys] = useState([]);
    const [autoExpandParent, setAutoExpandParent] = useState(true);
    const [selectedKeys, setSelectedKeys] = useState([]);
    
    // File handling state
    const [fileHandle, setFileHandle] = useState(null);
    const [saving, setSaving] = useState(false);
    
    // AI Progress state
    const [aiProgressVisible, setAiProgressVisible] = useState(false);
    const [aiProgressMessage, setAiProgressMessage] = useState("");
    
    // Code Viewer state
    const [currentPageForCode, setCurrentPageForCode] = useState(null);
    const [codeLanguage, setCodeLanguage] = useState("java");
    const [codeTitle, setCodeTitle] = useState("Code Viewer");
    
    const dispatch = useDispatch();
    const inspectorState = useSelector((state) => state.inspector);
    
    // Monitor for Redux actions in the Inspector state
    useEffect(() => {
        // Check if we need to record any changes in the inspectorState's recordedActions
        if (ActionRecorder.isRecording() && inspectorState?.recordedActions?.length > 0) {
            const lastStandardAction = inspectorState.recordedActions[inspectorState.recordedActions.length - 1];
            // Record the latest action from the standard recorder to our detailed recorder
            ActionRecorder.recordAction(inspectorState, lastStandardAction);
        }
    }, [inspectorState?.recordedActions]);

    // Use the imported buildTreeData from TreeUtils
    const { treeData, expandedKeys: initialExpandedKeys } = useMemo(
        () => buildTreeData(pages, searchTerm),
        [pages, searchTerm]
    );
    
    // Load project state from localStorage on startup
    useEffect(() => {
        // Only try to load if there are no pages already in state
        if (pages.length === 0) {
            console.log("No pages loaded, checking for saved project state...");
            
            // Check if we have saved state in localStorage
            if (hasSavedProjectState()) {
                console.log("Found saved project state, loading...");
                const savedState = loadProjectState();
                
                // Restore pages
                if (savedState.pages && savedState.pages.length > 0) {
                    console.log(`Restoring ${savedState.pages.length} pages from saved state`);
                    setPages(savedState.pages);
                    
                    // Restore selected page and view if available
                    if (savedState.selectedPageId) {
                        console.log(`Restoring selected page: ${savedState.selectedPageId}`);
                        setSelectedPageId(savedState.selectedPageId);
                        
                        // Set the view if we have one saved
                        if (savedState.currentView) {
                            console.log(`Restoring view: ${savedState.currentView}`);
                            setCurrentView(savedState.currentView);
                            
                            // If we were in xray view, restore the mode
                            if (savedState.currentView === 'pageXray') {
                                setXrayViewMode('default');
                            }
                        }
                    }
                    
                    // Note on file handle: We don't actually restore the file handle object
                    // from localStorage because File System Access API handles cannot be
                    // serialized or preserved across sessions. We only store metadata
                    // about the file. The actual file handle will be re-requested when needed.
                    if (savedState.fileHandle) {
                        console.log("Note: Saved file handle info available, but will require user re-selection on save");
                        // We store only the metadata for reference, but the handle itself won't be valid
                        // The saveToFile function will handle requesting a new file handle when needed
                        setFileHandle(null);
                    }
                }
            } else {
                // Fall back to trying to open the last used file
                console.log("No saved state, trying to open last file...");
                tryOpenLastFile(setPages, setFileHandle, resetUIState);
            }
        }
    }, []);
    
    // Set project context in modelConfigProvider whenever it changes
    useEffect(() => {
        console.log("Setting model config project context to:", projectId);
        modelConfigProvider.setProjectContext(projectId);
        
        // Clean up when component unmounts
        return () => {
            modelConfigProvider.clearProjectContext();
        };
    }, [projectId]);
    
    // Setup event listeners for navigation
    useEffect(() => {
        const handleNavigateToAiModelConfig = () => {
            console.log("Navigating to AI Model Config");
            setShowModelConfig(true);
        };
        
        const handleNavigateToRecordingView = () => {
            console.log("Navigating to Recording View");
            setCurrentView('recordingView');
        };
        
        document.addEventListener('navigateToAiModelConfig', handleNavigateToAiModelConfig);
        document.addEventListener('navigateToRecordingView', handleNavigateToRecordingView);
        
        return () => {
            document.removeEventListener('navigateToAiModelConfig', handleNavigateToAiModelConfig);
            document.removeEventListener('navigateToRecordingView', handleNavigateToRecordingView);
        };
    }, []);

    // Update expanded keys when search term changes
    useEffect(() => {
        if (searchTerm && initialExpandedKeys.length > 0) {
            setExpandedKeys(initialExpandedKeys);
            setAutoExpandParent(true);
        } else if (!searchTerm) {
            setAutoExpandParent(false);
        }
    }, [searchTerm, initialExpandedKeys]);
    
    // Save project state on significant state changes only
    useEffect(() => {
        // Only save if we have pages and the change is significant
        if (pages.length > 0) {
            console.log("Saving page data to localStorage...");
            // Using the optimized saveProjectState which handles debouncing internally
            saveProjectState(pages, selectedPageId, currentView, fileHandle);
        }
    // Only trigger on page count changes or file handle changes to avoid excessive saves
    // The saveProjectState function will handle checking for other changes internally
    }, [pages.length, fileHandle]);
    
    // Save navigation state on view/selection changes (lightweight operation)
    useEffect(() => {
        // Only save navigation state when we have pages
        if (pages.length > 0 && (selectedPageId || currentView)) {
            // We're passing the full pages array, but the optimized saveProjectState 
            // will only save the non-page data in this case, which is very fast
            saveProjectState(pages, selectedPageId, currentView, fileHandle);
        }
    }, [selectedPageId, currentView]);

    // Handle selected page changes
    useEffect(() => {
        // If selected page no longer exists, reset view
        if (selectedPageId && !pages.some(p => p.id === selectedPageId)) {
            setSelectedPageId(null);
            setCurrentView('pageList');
            setSelectedKeys([]);
        }
        
        // Update selected keys and expanded keys when page is selected
        if (selectedPageId) {
            const pageKey = `page_${selectedPageId}`;
            if (!selectedKeys.includes(pageKey)) {
                setSelectedKeys([pageKey]);
                const pageData = pages.find(p => p.id === selectedPageId);
                if(pageData?.module) {
                    const pathParts = pageData.module.split('/').map(part => part.trim()).filter(part => part);
                    let currentPath = '';
                    const keysToExpand = new Set(expandedKeys);
                    pathParts.forEach((part, index) => {
                        currentPath = index === 0 ? part : `${currentPath}/${part}`;
                        keysToExpand.add(`module_${currentPath}`);
                    });
                    setExpandedKeys(Array.from(keysToExpand));
                    setAutoExpandParent(true);
                }
            }
        } else {
            if (selectedKeys.length > 0) {
                setSelectedKeys([]);
            }
        }
    }, [pages, selectedPageId]);

    // Reset UI state for file operations
    const resetUIState = () => {
        setCurrentView('pageList');
        setSelectedPageId(null);
        setSelectedKeys([]);
        setSearchTerm('');
        setExpandedKeys([]);
    };

    // Page navigation functions
    const navigateToPageDetail = (pageId) => {
        if (pageId) {
            setSelectedPageId(pageId);
            setCurrentView('pageDetail');
            setSelectedKeys([`page_${pageId}`]);
            
            // If we're coming from Xray view, restore previous sidebar state
            if (currentView === 'pageXray') {
                // Restore the sidebar to its previous state (expanded or collapsed)
                setIsSidePanelCollapsed(previousSidePanelState);
                
                // Also dispatch a custom event for other components
                document.dispatchEvent(new CustomEvent('collapseSidePanel', {
                    detail: { collapse: previousSidePanelState }
                }));
            }
        }
    };

    const navigateToPageList = () => {
        setSelectedPageId(null);
        setCurrentView('pageList');
        setSelectedKeys([]);
    };
    
    // Reference to SidePanel's collapse state
    const [isSidePanelCollapsed, setIsSidePanelCollapsed] = useState(false);
    // Store the previous state of the sidebar before entering Xray
    const [previousSidePanelState, setPreviousSidePanelState] = useState(false);
    
    const navigateToPageXray = (viewMode='default') => {
        if (selectedPage) {
            // Set view mode
            setXrayViewMode(viewMode);
            setCurrentView('pageXray');
            
            // Collapse the page tree by clearing expanded keys
            setExpandedKeys([]);
            
            // Store current sidebar state before collapsing it
            setPreviousSidePanelState(isSidePanelCollapsed);
            
            // Collapse the sidebar panel
            setIsSidePanelCollapsed(true);
            
            // Also trigger a custom event that the sidebar can listen for
            document.dispatchEvent(new CustomEvent('collapseSidePanel', {
                detail: { collapse: true }
            }));
        } else {
            message.error("No page selected");
        }
    };
    
    // Code viewer functions
    const viewCode = (page, language = "java", title = "Page Object Model") => {
        setCurrentPageForCode(page);
        setCodeLanguage(language);
        setCodeTitle(title);
        setCurrentView('codeViewer');
    };
    
    const navigateFromCodeViewer = () => {
        setCurrentView('pageDetail');
    };
    
    const viewExistingCode = () => {
        if (!selectedPage) {
            message.error("No page selected");
            return;
        }
        
        if (selectedPage.aiAnalysis?.code) {
            viewCode(selectedPage, "java", `Page Object Model for ${selectedPage.name}`);
        } else {
            message.info("No code has been generated for this page yet. Please use 'Generate Code' first.");
        }
    };
    
    const setCodeViewerVisible = () => {
        setCurrentPageForCode(selectedPage);
        setCurrentView('codeViewer');
    };
    
    // Page update function
    const updatePage = (updatedPage) => {
        setPages(prevPages => {
            const pageIndex = prevPages.findIndex(page => page.id === updatedPage.id);
            if (pageIndex === -1) {
                console.warn(`Page with ID ${updatedPage.id} not found.`);
                return prevPages;
            }

            const updatedPages = [...prevPages];
            updatedPages[pageIndex] = { ...updatedPages[pageIndex], ...updatedPage };
            return updatedPages;
        });
    };
    
    // AI Progress Modal control functions
    const showAiProgressModal = (message) => {
        setAiProgressMessage(message);
        setAiProgressVisible(true);
    };
    
    const updateAiProgressMessage = (message) => {
        setAiProgressMessage(message);
    };

    const hideAiProgressModal = () => {
        setAiProgressVisible(false);
        setAiProgressMessage("");
    };
    
    // AI Pipeline handling
    const handlePipelineLogs = (log) => {
        updateAiProgressMessage(log.message);
    };
    
    // Handle POM code generation
    const handleOnProceedToPom = async (page) => {
        updatePage(page);
        
        PipelineLogger.subscribe(handlePipelineLogs);
        showAiProgressModal("Initializing AI code generation...");
        
        try {
            const result = await executePOMClassPipeline(page);
            
            if (result) {
                const updatedPage = { 
                    ...page,
                    aiAnalysis: {
                        ...(page.aiAnalysis || {}),
                        code: result
                    }
                };
                
                updatePage(updatedPage);
                setCurrentPageForCode(updatedPage);
            }
            
            message.success("Page Object Model generated successfully");
            viewCode(page, "java", `Page Object Model for ${page.name}`);
            
        } catch (error) {
            console.error("Error generating POM:", error);
            message.error(`Failed to generate Page Object Model: ${error.message || 'Unknown error'}`);
        } finally {
            PipelineLogger.unsubscribe(handlePipelineLogs);
            hideAiProgressModal();
        }
    };
    
    // Handle locator regeneration
    const handleRegenerateLocators = async (page) => {
        if (!page || !page.aiAnalysis || !page.aiAnalysis.visualElements) {
          console.error("Cannot regenerate locators: Missing page or visual elements data");
          return;
        }
      
        PipelineLogger.subscribe(handlePipelineLogs);
        
        try {
          showAiProgressModal("Regenerating XPath locators...");
          
          const visualElements = page.aiAnalysis.visualElements;
          
          // Determine which platforms to generate for
          const platforms = [];
          if (page.states) {
            page.states.forEach(state => {
              if (state.versions?.ios && !platforms.includes('ios')) {
                platforms.push('ios');
              }
              if (state.versions?.android && !platforms.includes('android')) {
                platforms.push('android');
              }
            });
          }
          
          // Default to both platforms if none detected
          if (platforms.length === 0) {
            platforms.push('ios', 'android');
          }
          
          updateAiProgressMessage("AI analyzing interface structure and constructing robust locators...");
          const locators = await executeXpathPipeline(visualElements, platforms);
          
          // Create updated page object
          const updatedPage = { ...page };
          if (!updatedPage.aiAnalysis) {
            updatedPage.aiAnalysis = {};
          }
          
          // Update the locators in the page
          updatedPage.aiAnalysis.locators = locators;
          
          // Update the page in state
          updatePage(updatedPage);
          
          // Update progress
          updateAiProgressMessage("Locators regenerated successfully!");
          
          // Force a refresh of the XRay view with the updated page data
          setSelectedPageId(updatedPage.id);
          
          setTimeout(() => {
            hideAiProgressModal();
            
            // Force re-render of the XRay view by briefly changing the view and then changing back
            const currentXrayMode = xrayViewMode;
            setCurrentView('pageDetail');
            setTimeout(() => {
              setXrayViewMode(currentXrayMode);
              setCurrentView('pageXray');
            }, 50);
          }, 1000);
          
        } catch (error) {
          console.error("Error regenerating locators:", error);
          updateAiProgressMessage(`Error regenerating locators: ${error.message || 'Unknown error'}`);
          
          // Hide the modal after a delay
          setTimeout(() => {
            hideAiProgressModal();
          }, 2000);
        } finally {
          PipelineLogger.unsubscribe(handlePipelineLogs);
        }
    };
    
    // Handler for completing visual analysis
    const handleVisualAnalysisComplete = (updatedPage) => {
        updatePage(updatedPage);
        setXrayViewMode('pipeline-stage');
        setCurrentView('pageXray');
    };
    
    // Page operations handlers
    const handleCreatePage = (newPage) => {
        setPages(prevPages => [...prevPages, newPage].sort((a, b) => a.name.localeCompare(b.name)));
        message.success(`Page "${newPage.name}" created`);
    };

    const handleEditPage = (editedPage) => {
        setPages(prevPages => prevPages.map(page =>
            page.id === editedPage.id ? editedPage : page
        ));
        message.success(`Page "${editedPage.name}" updated`);
    };

    const handleDeletePage = (pageIdToDelete) => {
        const pageToDelete = pages.find(p => p.id === pageIdToDelete);
        if (!pageToDelete) return;
        
        setPages(prevPages => prevPages.filter(page => page.id !== pageIdToDelete));
        
        if (pageIdToDelete === selectedPageId) {
            setSelectedPageId(null);
            setCurrentView('pageList');
            setSelectedKeys([]);
        }
        
        message.success(`Page "${pageToDelete.name}" deleted`);
    };
    
    // File operations handlers
    const handleFileOperations = {
        chooseFile: async () => {
            await chooseFile(setFileHandle);
        },
        
        saveToFile: async () => {
            await saveToFile(pages, fileHandle, setFileHandle, setSaving);
        },
        
        openSavedFile: async () => {
            await openSavedFile(setPages, setFileHandle, resetUIState);
        },
        
        // Handler for opening a recent project
        openRecentProject: async (projectName) => {
            await openRecentProject(projectName, setPages, setFileHandle, resetUIState);
        },
        
        // Get recent projects list
        getRecentProjects: () => {
            return getRecentProjects();
        },
        
        // Handler for returning to inspector when embedded
        returnToInspector: () => {
            // Save state before closing
            saveProjectState(pages, selectedPageId, currentView, fileHandle);
            
            // Call the provided onClose callback
            onClose();
        }
    };
    
    // Tree handling functions
    const handleTreeSelect = (selectedKeysValue, info) => {
        const selectedKey = selectedKeysValue[0];
        if (selectedKey && selectedKey.startsWith('page_')) {
            const pageId = selectedKey.substring('page_'.length);
            if(selectedPageId !== pageId) { navigateToPageDetail(pageId); }
        } else if (selectedKey && selectedKey.startsWith('module_')) {
            setSelectedKeys(selectedKeysValue);
        } else {
            if (info.selected === false || (selectedKey && !selectedKey.startsWith('page_'))) {
                setSelectedKeys(selectedKeysValue || []);
                if (selectedPageId) {
                    setSelectedPageId(null);
                    setCurrentView('pageList');
                }
            }
        }
    };
    
    const onTreeExpand = (newExpandedKeys) => {
        setExpandedKeys(newExpandedKeys);
        setAutoExpandParent(false);
    };
    
    // If the model config page is shown, render only that
    if (showModelConfig) {
        return (
            <ModelConfigPage 
                projectId={projectId}
                onBack={() => setShowModelConfig(false)}
            />
        );
    }
    
    // If recording view is active, render it in full screen mode
    if (currentView === 'recordingView') {
        return (
            <RecordingView
                navigateBack={() => {
                    // Return to previous view or default to page list
                    if (selectedPageId) {
                        setCurrentView('pageDetail');
                    } else {
                        setCurrentView('pageList');
                    }
                }}
                inspectorState={inspectorState}
                startRecording={() => dispatch(startRecordingAction())}
                pauseRecording={() => dispatch(pauseRecordingAction())}
                clearRecording={() => dispatch(clearRecordingAction())}
                isRecording={inspectorState?.isRecording || false}
                recordedActions={inspectorState?.recordedActions || []}
            />
        );
    }
    
    // Otherwise render the normal layout
    return (
        <Layout style={{ height: '100vh', background: '#fff' }}>
            <SidePanel 
                pages={pages}
                treeData={treeData}
                selectedKeys={selectedKeys}
                expandedKeys={expandedKeys}
                autoExpandParent={autoExpandParent}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onTreeSelect={handleTreeSelect}
                onTreeExpand={onTreeExpand}
                onEditPage={handleEditPage}
                onDeletePage={handleDeletePage}
                onCreatePage={handleCreatePage}
                fileOperations={handleFileOperations}
                saving={saving}
                projectId={projectId}
                isCollapsed={isSidePanelCollapsed}
                onCollapseChange={setIsSidePanelCollapsed}
            />
            
            <Content style={{ padding: '10px', height: 'calc(100vh - 64px)', overflow: 'hidden', background: '#f0f2f5' }}>
                {currentView === 'pageList' && !selectedPageId && (
                    <EmptyStateMessage 
                        onOpenFile={handleFileOperations.openSavedFile} 
                    />
                )}
                
                {currentView === 'pageDetail' && selectedPageId && (
                    <PageDetailView
                        selectedPage={selectedPage}
                        navigateToPageList={navigateToPageList}
                        navigateToPageXray={navigateToPageXray}
                        viewExistingCode={viewExistingCode}
                        inspectorState={inspectorState}
                        updatePage={updatePage}
                        onVisualAnalysisComplete={handleVisualAnalysisComplete}
                        onSetCodeViewerVisiblity={setCodeViewerVisible}
                        showAiProgressModal={showAiProgressModal}
                        updateAiProgressMessage={updateAiProgressMessage}
                        hideAiProgressModal={hideAiProgressModal}
                    />
                )}
                
                {currentView === 'pageList' && selectedPageId && (
                    <EmptyStateMessage 
                        type="deselected"
                        onOpenFile={null}
                    />
                )}
                
                {currentView === 'pageXray' && selectedPageId && (
                    <PageXrayView
                        viewMode={xrayViewMode}
                        onRegenerateLocators={handleRegenerateLocators}
                        page={selectedPage}
                        onApplyChanges={updatePage}
                        onProceedToPom={handleOnProceedToPom}
                        onExit={(pageId) => {
                            // We're exiting Xray view - navigate to page detail which will restore sidebar state
                            navigateToPageDetail(pageId || selectedPageId);
                        }}
                    />
                )}
                
                {currentView === 'codeViewer' && currentPageForCode && (
                    <CodeViewer
                        page={selectedPage}
                        language={codeLanguage}
                        title={codeTitle}
                        onBack={() => navigateFromCodeViewer()}
                        onSave={updatePage}
                        onRegenerate={() => handleOnProceedToPom(currentPageForCode)}
                    />
                )}
            </Content>
            
            <AIProgressModal
                visible={aiProgressVisible}
                message={aiProgressMessage}
                allowCancel={false}
            />
            
            <PageOperations
                generateId={generateId}
                onCreatePage={handleCreatePage}
                onEditPage={handleEditPage}
            />
        </Layout>
    );
}