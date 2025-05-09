// RecordingView.jsx
import React, { useState, useEffect } from "react";

// Add custom scrollbar styles with useEffect
const scrollbarStyleId = 'custom-scrollbar-styles';
const customScrollbarStyle = `
/* Custom scrollbar styles */
/* WebKit browsers (Chrome, Safari) */
.custom-scrollbar::-webkit-scrollbar {
  width: 14px !important;
  height: 14px !important;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f0f0f0 !important;
  border-radius: 0 !important;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #c1c1c1 !important;
  border-radius: 7px !important;
  border: 3px solid #f0f0f0 !important;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #a0a0a0 !important;
}
.custom-scrollbar::-webkit-scrollbar-corner {
  background: #f0f0f0 !important;
}
/* Firefox and other browsers */
.custom-scrollbar {
  scrollbar-width: thin !important;
  scrollbar-color: #c1c1c1 #f0f0f0 !important;
}
/* Force scrollbars to be visible */
.force-scrollbar {
  overflow-y: scroll !important;
  min-height: 100px !important;
}
/* Ensure tab panels are properly sized */
.ant-tabs-tabpane {
  height: 100% !important;
  overflow: hidden !important;
}
.ant-tabs-content {
  height: 100% !important;
  flex: 1 !important;
  display: flex !important;
}
.ant-tabs-tabpane-active {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
}
.ant-tabs-content-holder {
  overflow: hidden !important;
  height: 100% !important;
}
.recording-tabs .ant-tabs-nav {
  margin-bottom: 0 !important;
}
.recording-tabs .ant-tabs-content-holder, .analysis-tabs .ant-tabs-content-holder {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}
.recording-tabs, .analysis-tabs {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  margin-bottom: 0 !important;
}

.analysis-tabs .ant-tabs-content {
  height: 100% !important;
  flex: 1 !important;
}

.analysis-tabs .ant-tabs-tabpane {
  height: 100% !important;
}
/* Ensure content fits properly */
.recording-view-container {
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
  overflow: hidden !important;
  position: absolute !important;
  top: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
}
/* Pulse animation for playback */
@keyframes playback-pulse {
  0% { background-color: #e6f7ff; }
  50% { background-color: #bae7ff; }
  100% { background-color: #e6f7ff; }
}
.playback-active {
  animation: playback-pulse 1.5s infinite ease-in-out;
}

/* Flow steps timeline customizations */
.flow-steps-timeline .ant-timeline-item {
  padding-bottom: 20px !important;
}

.flow-steps-timeline .ant-timeline-item-tail {
  height: calc(100% - 10px) !important;
  left: 88px !important; /* Keep connector line aligned with dots */
}

.flow-steps-timeline .ant-timeline-item-label {
  width: 80px !important;
  text-align: left !important;
  padding-right: 8px !important;
  position: absolute !important;
  left: 0 !important; /* Ensure label starts at the far left */
}

.flow-steps-timeline .ant-timeline-item-head {
  left: 88px !important; /* Position dots consistently */
}

.flow-steps-timeline .ant-timeline-item-content {
  left: 100px !important;
  margin-left: 8px !important;
  width: calc(100% - 120px) !important;
  margin-top: -4px !important;
  text-align: left !important;
  position: relative !important; /* Ensure proper positioning relative to timeline */
}
`;

import {
    Button,
    Card,
    Typography,
    Space,
    message,
    Spin,
    Tabs,
    Select,
    Upload,
    Switch,
    Row,
    Col,
    Divider,
    Layout,
    Badge,
    Tooltip,
    Radio,
    Timeline,
    Collapse
} from "antd";
import {
    ArrowLeftOutlined,
    VideoCameraOutlined,
    PauseCircleOutlined,
    ClearOutlined,
    CopyOutlined,
    SaveOutlined,
    FileImageOutlined,
    UploadOutlined,
    EyeOutlined,
    EyeInvisibleOutlined,
    InfoCircleOutlined,
    SettingOutlined,
    DownloadOutlined,
    FilterOutlined,
    ReloadOutlined,
    RobotOutlined,
    ThunderboltOutlined,
    CodeOutlined,
    ExperimentOutlined,
    OrderedListOutlined
} from "@ant-design/icons";
import ActionRecorder from "../../lib/ai/actionRecorder";
import { TransitionAnalysisPipeline } from "../../lib/ai/transitionAnalysisPipeline";

const { Text, Title, Paragraph } = Typography;

// Helper function to syntax highlight JSON
const syntaxHighlightJson = (json) => {
    // If it's not a string (already an object), stringify it
    if (typeof json !== 'string') {
        json = JSON.stringify(json, null, 2);
    }
    
    // Replace specific JSON syntax elements with HTML spans
    return json
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, 
            function (match) {
                let cls = 'number'; // default is number
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'key'; // it's a key
                        match = match.replace(/"/g, '').replace(/:$/, '');
                        return '<span style="color: #9cdcfe;">"' + match + '"</span><span style="color: #d4d4d4;">:</span>';
                    } else {
                        cls = 'string'; // it's a string
                        return '<span style="color: #ce9178;">' + match + '</span>';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'boolean'; // it's a boolean
                    return '<span style="color: #569cd6;">' + match + '</span>';
                } else if (/null/.test(match)) {
                    cls = 'null'; // it's null
                    return '<span style="color: #569cd6;">' + match + '</span>';
                } else {
                    // it's a number
                    return '<span style="color: #b5cea8;">' + match + '</span>';
                }
            }
        )
        .replace(/\{/g, '<span style="color: #d4d4d4;">{</span>')
        .replace(/\}/g, '<span style="color: #d4d4d4;">}</span>')
        .replace(/\[/g, '<span style="color: #d4d4d4;">[</span>')
        .replace(/\]/g, '<span style="color: #d4d4d4;">]</span>')
        .replace(/,/g, '<span style="color: #d4d4d4;">,</span>');
};
const { Option } = Select;
const { Header, Content } = Layout;

const RecordingView = ({
    navigateBack,
    inspectorState,
    startRecording: standardStartRecording,
    pauseRecording: standardPauseRecording,
    clearRecording: standardClearRecording,
    isRecording: standardIsRecording,
    recordedActions: standardRecordedActions
}) => {
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [detailedRecording, setDetailedRecording] = useState([]);
    const [selectedEntryIndex, setSelectedEntryIndex] = useState(null);
    const [activeTab, setActiveTab] = useState("recording");
    const [showCondensed, setShowCondensed] = useState(true); // State to control condensed states visibility
    const [hideNonTransitions, setHideNonTransitions] = useState(false); // State to control visibility of non-transition states
    const [screenshotDimensions, setScreenshotDimensions] = useState({ width: 'auto', height: 'auto' });
    const [processingAI, setProcessingAI] = useState(false);
    const [aiViewMode, setAiViewMode] = useState('raw');
    const [groupByPage, setGroupByPage] = useState(true);
    const [analysisProgress, setAnalysisProgress] = useState({
        isProcessing: false,
        current: 0,
        total: 0,
        percent: 0,
        message: ''
    });
    // Column width state for resizable panels
    const [columnWidths, setColumnWidths] = useState({
        list: '25%',      // Left sidebar with state list
        screenshot: '35%', // Middle panel with screenshot
        details: '40%'     // Right panel with tabs
    });
    const [isResizing, setIsResizing] = useState(null); // Tracks which divider is being resized
    
    // Playback related states
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1000); // milliseconds between state changes
    const [playbackIntervalId, setPlaybackIntervalId] = useState(null);

    // Add custom scrollbar styles on component mount
    useEffect(() => {
        // Check if the style element already exists
        let styleElement = document.getElementById(scrollbarStyleId);
        
        if (!styleElement) {
            // Create style element if it doesn't exist
            styleElement = document.createElement('style');
            styleElement.id = scrollbarStyleId;
            styleElement.textContent = customScrollbarStyle;
            document.head.appendChild(styleElement);
        }
        
        // Cleanup function
        return () => {
            // Only remove if we created it
            const styleToRemove = document.getElementById(scrollbarStyleId);
            if (styleToRemove) {
                document.head.removeChild(styleToRemove);
            }
        };
    }, []);

    // Subscribe to ActionRecorder updates
    useEffect(() => {
        const unsubscribe = ActionRecorder.subscribe(({ type, recording }) => {
            if (['ENTRY_ADDED', 'RECORDING_STARTED', 'RECORDING_CLEARED'].includes(type)) {
                setDetailedRecording([...recording]);
            }
        });
        
        // Initial state
        setDetailedRecording(ActionRecorder.getRecording());
        
        return () => unsubscribe();
    }, []);

    // Monitor inspector state changes to record changes
    useEffect(() => {
        if (ActionRecorder.isRecording()) {
            // Record changes in source/screenshot even without explicit actions
            ActionRecorder.recordAction(inspectorState);
        }
    }, [inspectorState?.sourceXML, inspectorState?.screenshot]);
    
    // Reset screenshot dimensions when selected entry changes
    useEffect(() => {
        setScreenshotDimensions({ width: 'auto', height: 'auto' });
        setAiViewMode('raw'); // Reset to raw JSON view as preferred
    }, [selectedEntryIndex]);
    
    // Playback control functions
    const startPlayback = () => {
        if (detailedRecording.length === 0 || isPlaying) return;
        
        // If we're at the end or no state is selected, start from the beginning
        if (selectedEntryIndex === null || selectedEntryIndex >= detailedRecording.length - 1) {
            setSelectedEntryIndex(0);
        }
        
        setIsPlaying(true);
        
        // Create interval to advance through states
        const intervalId = setInterval(() => {
            setSelectedEntryIndex(prevIndex => {
                // If we're at the end, stop playback
                if (prevIndex === null || prevIndex >= detailedRecording.length - 1) {
                    clearInterval(intervalId);
                    setIsPlaying(false);
                    setPlaybackIntervalId(null);
                    return prevIndex; // Keep the last index
                }
                
                // Otherwise, advance to the next state
                return prevIndex + 1;
            });
        }, playbackSpeed);
        
        setPlaybackIntervalId(intervalId);
    };
    
    const pausePlayback = () => {
        if (playbackIntervalId) {
            clearInterval(playbackIntervalId);
            setPlaybackIntervalId(null);
        }
        setIsPlaying(false);
    };
    
    const stopPlayback = () => {
        pausePlayback();
        setSelectedEntryIndex(0); // Return to first state
    };
    
    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (playbackIntervalId) {
                clearInterval(playbackIntervalId);
            }
        };
    }, [playbackIntervalId]);
    
    // Handle mouse events for resizing panels
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            
            // Get container bounds
            const container = document.querySelector('.recording-view-detailed-container');
            if (!container) return;
            
            const containerRect = container.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const mouseX = e.clientX - containerRect.left;
            
            // Calculate percentage position
            const positionPercent = (mouseX / containerWidth) * 100;
            
            // Apply limits to prevent panels from becoming too small
            if (isResizing === 'list-screenshot') {
                // Limit list width between 15% and 40%
                if (positionPercent < 15 || positionPercent > 40) return;
                
                // Update list and screenshot widths
                setColumnWidths(prev => ({
                    ...prev,
                    list: `${positionPercent}%`,
                    screenshot: `${parseFloat(prev.screenshot) + (parseFloat(prev.list) - positionPercent)}%`
                }));
            } else if (isResizing === 'screenshot-details') {
                // Calculate combined width of list and screenshot
                const combinedWidth = parseFloat(columnWidths.list) + parseFloat(columnWidths.screenshot);
                
                // Limit screenshot width (combined with list) between 30% and 75%
                if (positionPercent < 30 || positionPercent > 75) return;
                
                // Update screenshot and details widths
                setColumnWidths(prev => ({
                    ...prev,
                    screenshot: `${positionPercent - parseFloat(prev.list)}%`,
                    details: `${100 - positionPercent}%`
                }));
            }
        };
        
        const handleMouseUp = () => {
            if (isResizing) {
                setIsResizing(null);
                document.body.style.cursor = 'default';
                document.body.style.userSelect = 'auto';
            }
        };
        
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            // Set cursor and prevent text selection during resize
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }
        
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, columnWidths]);

    const handleStartRecording = async () => {
        try {
            setLoading(true);
            // Start the standard recording
            await standardStartRecording();
            // Start our detailed recording
            ActionRecorder.startRecording();
            // Initial capture of the current state
            ActionRecorder.recordAction(inspectorState);
            message.success("Recording started. Perform actions in the Inspector to record them.");
        } catch (error) {
            message.error(`Failed to start recording: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handlePauseRecording = async () => {
        try {
            setLoading(true);
            // Pause standard recording
            await standardPauseRecording();
            // Stop our detailed recording
            ActionRecorder.stopRecording();
            message.success("Recording paused. You can resume recording or clear the current recording.");
        } catch (error) {
            message.error(`Failed to pause recording: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleClearRecording = async () => {
        try {
            setLoading(true);
            // Clear standard recording
            await standardClearRecording();
            // Clear detailed recording
            ActionRecorder.clearRecording();
            setSelectedEntryIndex(null);
            message.success("Recording cleared.");
        } catch (error) {
            message.error(`Failed to clear recording: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        const recordingString = JSON.stringify(
            activeTab === "detailed" ? detailedRecording : standardRecordedActions, 
            null, 
            2
        );
        
        navigator.clipboard.writeText(recordingString).then(
            () => {
                setCopied(true);
                message.success("Recording data copied to clipboard!");
                setTimeout(() => setCopied(false), 2000);
            },
            (err) => {
                message.error(`Could not copy text: ${err}`);
            }
        );
    };
    
    const handleProcessWithAI = async () => {
        if (!detailedRecording || detailedRecording.length === 0) {
            message.error("No recording data to process");
            return;
        }
        
        try {
            setProcessingAI(true);
            
            // Initialize progress state
            setAnalysisProgress({
                isProcessing: true,
                current: 0,
                total: detailedRecording.length,
                percent: 0,
                message: "Preparing data..."
            });
            
            // Create a copy of the recording to update
            let updatedRecording = [...detailedRecording];
            
            if (updatedRecording.length > 0) {
                // Make all states have the aiAnalysis attribute but set to null
                updatedRecording = updatedRecording.map(state => ({
                    ...state,
                    aiAnalysis: null,
                    aiAnalysisRaw: null
                }));
                
                setAnalysisProgress(prev => ({
                    ...prev,
                    message: "Analyzing transitions...",
                    percent: 5
                }));
                
                // NEW APPROACH: Process transitions using the optimized batch processing
                // The TransitionAnalysisPipeline now handles concurrency, batching, and order preservation
                
                // Map to track which states have been updated with analysis
                const updatedStateIndices = new Set();
                
                try {
                    // Update progress indicator
                    setAnalysisProgress(prev => ({
                        ...prev,
                        message: "Analyzing transitions with optimized batch processing...",
                        percent: 5
                    }));
                    
                    // Setup progress callback for the analysis process
                    const onProgress = (current, total) => {
                        setAnalysisProgress(prev => ({
                            ...prev,
                            current: current,
                            percent: 5 + Math.round((current / total) * 90),
                            message: `Analyzing transition ${current} of ${total}`
                        }));
                    };
                    
                    console.log(`Starting optimized transition analysis for ${updatedRecording.length - 1} transitions`);
                    
                    // Call the pipeline to analyze all transitions at once
                    // The pipeline now handles batching and concurrency internally
                    const transitions = await TransitionAnalysisPipeline.analyzeTransitions(
                        updatedRecording,
                        { 
                            // Let the pipeline determine the batch size and concurrency
                            // based on the configuration in config.js
                            batch: updatedRecording.length <= 20, // Use batch mode for smaller sets
                            onProgress: onProgress // Pass the progress callback
                        }
                    );
                    
                    console.log(`Received ${transitions.length} transition results`);
                    
                    // Process each transition result
                    for (let i = 0; i < transitions.length; i++) {
                        const transition = transitions[i];
                        
                        // The transition describes the change TO state i+1
                        // So we associate it with the TO state (i+1)
                        const stateIndex = i + 1;
                        
                        if (stateIndex < updatedRecording.length) {
                            // Get the state to update
                            const realState = updatedRecording[stateIndex];
                            
                            // Mark this state as updated
                            updatedStateIndices.add(stateIndex);
                            
                            // Format analysis info for the state
                            const actionType = realState.action?.action || 'State Change';
                            const elementTarget = realState.action?.element?.text || 
                                               realState.action?.element?.resourceId || 
                                               transition.actionTarget || 
                                               'Unknown Element';
                            
                            // Update the state with the transition analysis
                            updatedRecording[stateIndex] = {
                                ...realState,
                                aiAnalysis: formatTransitionToMarkdown(transition, realState, actionType, elementTarget, stateIndex, updatedRecording.length),
                                aiAnalysisRaw: transition
                            };
                        }
                    }
                } catch (error) {
                    console.error("Error during transition analysis batch process:", error);
                    message.error("Error analyzing transitions. Some transitions may be incomplete.");
                }
                
                // Special handling for the first state
                // First state has no "from" state, so use a simplified analysis
                if (!updatedStateIndices.has(0) && updatedRecording.length > 0) {
                    const firstState = updatedRecording[0];
                    
                    // Create a simplified transition for the first state
                    const initialTransition = {
                        fromActionTime: firstState.actionTime,
                        toActionTime: firstState.actionTime,
                        hasTransition: false, // No actual transition for first state
                        transitionDescription: "Initial application state",
                        technicalActionDescription: "Application startup",
                        actionTarget: "Application",
                        actionValue: null,
                        stateName: "InitialState",
                        isPageChanged: false,
                        isSamePageDifferentState: false,
                        currentPageName: "Initial Page",
                        currentPageDescription: "The initial state of the application at the start of the recording session",
                        inferredUserActivity: "Starting application session"
                    };
                    
                    // Format analysis for first state
                    const actionType = firstState.action?.action || 'Application Start';
                    const elementTarget = firstState.action?.element?.text || 
                                      firstState.action?.element?.resourceId || 
                                      'Application';
                    
                    // Update the first state
                    updatedRecording[0] = {
                        ...firstState,
                        aiAnalysis: formatTransitionToMarkdown(initialTransition, firstState, actionType, elementTarget, 0, updatedRecording.length),
                        aiAnalysisRaw: initialTransition
                    };
                    
                    updatedStateIndices.add(0);
                }
                
                // Check if any states were not updated and log them
                const missingStateIndices = [];
                for (let i = 0; i < updatedRecording.length; i++) {
                    if (!updatedStateIndices.has(i)) {
                        missingStateIndices.push(i);
                        
                        console.log(`Creating placeholder analysis for state ${i} (not updated by any transition)`);
                        
                        // Create a placeholder analysis for states that didn't get analyzed
                        const state = updatedRecording[i];
                        const actionType = state.action?.action || 'State Change';
                        const elementTarget = state.action?.element?.text || 
                                            state.action?.element?.resourceId || 
                                            'Unknown Element';
                        
                        // Create placeholder transition data
                        const placeholderTransition = {
                            fromActionTime: state.actionTime,
                            toActionTime: state.actionTime,
                            hasTransition: false,
                            transitionDescription: "Missing transition analysis - please reprocess",
                            technicalActionDescription: "No analysis data available",
                            actionTarget: elementTarget,
                            actionValue: null,
                            stateName: "MissingAnalysis",
                            isPageChanged: false,
                            isSamePageDifferentState: false,
                            currentPageName: "Unknown page",
                            currentPageDescription: "No analysis was generated for this state",
                            inferredUserActivity: "Unknown activity"
                        };
                        
                        // Update the state with placeholder data
                        updatedRecording[i] = {
                            ...state,
                            aiAnalysis: formatTransitionToMarkdown(placeholderTransition, state, actionType, elementTarget, i, updatedRecording.length),
                            aiAnalysisRaw: placeholderTransition
                        };
                    }
                }
                
                // Log missing states
                if (missingStateIndices.length > 0) {
                    console.warn(`Added placeholder analysis for ${missingStateIndices.length} states: ${missingStateIndices.join(', ')}`);
                    message.warning(`Some states (${missingStateIndices.length}) did not receive analysis. Added placeholders.`);
                }
                
                // Generate final report
                console.log("AI Analysis Processing Report:");
                console.log(`- Total states: ${updatedRecording.length}`);
                console.log(`- States with analysis: ${updatedRecording.length - missingStateIndices.length}`);
                console.log(`- States with placeholders: ${missingStateIndices.length}`);
            }
            
            // Now run page disambiguation to standardize page names
            setAnalysisProgress(prev => ({
                ...prev,
                message: "Standardizing page names...",
                percent: 90
            }));
            
            try {
                // Import the RecordedStatesDisambiguationPipeline
                const { RecordedStatesDisambiguationPipeline } = await import('../../lib/ai/statesDisambiguationPipeline.js');
                
                // Extract transition results - this is the AI analysis raw data
                const transitions = updatedRecording
                    .filter(state => state.aiAnalysisRaw)
                    .map(state => state.aiAnalysisRaw);
                
                // Run the disambiguation pipeline
                console.log(`Running page disambiguation on ${transitions.length} transitions`);
                
                // Only run if we have enough transitions with page names
                if (transitions.length > 1) {
                    const disambiguationResults = await RecordedStatesDisambiguationPipeline.disambiguatePageNames(transitions);
                    
                    // Log the results
                    console.log("Page Disambiguation Results:", disambiguationResults);
                    const renamedCount = disambiguationResults.statistics?.renamedPageCount || 0;
                    console.log(`Standardized page names: ${renamedCount} pages were renamed`);
                    
                    // Log detailed information about renamed pages
                    console.log("\n========== DISAMBIGUATED PAGE NAMES ==========");
                    
                    // Create a mapping of original to standardized names for renamed pages
                    const renamedPages = {};
                    
                    // Group all unique pages that were renamed
                    disambiguationResults.standardizedFlow.forEach(step => {
                        if (step.wasRenamed) {
                            if (!renamedPages[step.standardizedPageName]) {
                                renamedPages[step.standardizedPageName] = new Set();
                            }
                            renamedPages[step.standardizedPageName].add(step.originalPageName);
                        }
                    });
                    
                    // Log each set of renamed pages
                    Object.entries(renamedPages).forEach(([standardizedName, originalNames]) => {
                        const originalNamesArray = Array.from(originalNames);
                        console.log(`standardized: "${standardizedName}"`);
                        console.log(`  original names: ${originalNamesArray.map(name => `"${name}"`).join(', ')}`);
                        
                        // Find a step with this standardized name to get the reason
                        const exampleStep = disambiguationResults.standardizedFlow.find(
                            step => step.wasRenamed && step.standardizedPageName === standardizedName
                        );
                        
                        if (exampleStep?.reason) {
                            console.log(`  reason: ${exampleStep.reason}`);
                        }
                        console.log('');
                    });
                    
                    // Log pages that weren't renamed (unique non-renamed pages)
                    const unchangedPages = new Set();
                    disambiguationResults.standardizedFlow.forEach(step => {
                        if (!step.wasRenamed) {
                            unchangedPages.add(step.standardizedPageName);
                        }
                    });
                    
                    if (unchangedPages.size > 0) {
                        console.log("\n--- Unchanged Page Names ---");
                        Array.from(unchangedPages).forEach(pageName => {
                            console.log(`"${pageName}"`);
                        });
                    }
                    
                    console.log("==============================================\n");
                    
                    // Update the recording with standardized page names from the updated transitions
                    updatedRecording = updatedRecording.map(state => {
                        if (!state.aiAnalysisRaw) return state;
                        
                        // Find the corresponding transition in the updated transitions
                        const matchingTransition = disambiguationResults.updatedTransitions.find(t => 
                            t.fromActionTime === state.aiAnalysisRaw.fromActionTime && 
                            t.toActionTime === state.aiAnalysisRaw.toActionTime
                        );
                        
                        if (!matchingTransition) return state;
                        
                        // Update the state's raw analysis with standardized page info
                        const updatedAnalysisRaw = {
                            ...state.aiAnalysisRaw,
                            originalPageName: matchingTransition.originalPageName,
                            currentPageName: matchingTransition.currentPageName,
                            standardizedPageDescription: matchingTransition.standardizedPageDescription,
                            standardizedPageComponents: matchingTransition.standardizedPageComponents,
                            standardizedPageFunction: matchingTransition.standardizedPageFunction,
                            wasRenamed: matchingTransition.wasRenamed || false
                        };
                        
                        // Regenerate the markdown with updated page info
                        const actionType = state.action?.action || 'State Change';
                        const elementTarget = state.action?.element?.text || 
                                           state.action?.element?.resourceId || 
                                           updatedAnalysisRaw.actionTarget || 
                                           'Unknown Element';
                        
                        // Return updated state
                        return {
                            ...state,
                            aiAnalysisRaw: updatedAnalysisRaw,
                            aiAnalysis: formatTransitionToMarkdown(updatedAnalysisRaw, state, actionType, elementTarget, 
                                updatedRecording.indexOf(state), updatedRecording.length)
                        };
                    });
                    
                    setAnalysisProgress(prev => ({
                        ...prev,
                        message: "Page names standardized",
                        percent: 95
                    }));
                    
                    // Show success message about page standardization
                    if (renamedCount > 0) {
                        message.success(`Standardized page names: ${renamedCount} pages were renamed for consistency`);
                    } else {
                        message.info("All page names were already consistent - no changes needed");
                    }
                } else {
                    console.log("Not enough transitions with page names for disambiguation");
                }
            } catch (disambiguationError) {
                console.error("Error during page disambiguation:", disambiguationError);
                message.warning("Page name standardization failed, but analysis results are still available");
            }
            
            // Update the recording with AI analysis
            setDetailedRecording(updatedRecording);
            
            // Complete the progress
            setAnalysisProgress(prev => ({
                ...prev,
                message: "Analysis complete",
                percent: 100,
                current: updatedRecording.length
            }));
            
            // Show success message and after 2 seconds remove the progress indicator
            message.success("AI analysis completed successfully");
            setTimeout(() => {
                setAnalysisProgress(prev => ({
                    ...prev,
                    isProcessing: false
                }));
            }, 2000);
            
            // If we have a selected entry, make sure we force a re-render
            if (selectedEntryIndex !== null) {
                // Force a selection update
                const currentIndex = selectedEntryIndex;
                setSelectedEntryIndex(null);
                setTimeout(() => setSelectedEntryIndex(currentIndex), 10);
            }
        } catch (error) {
            console.error("Error processing with AI:", error);
            
            // Set progress as error
            setAnalysisProgress(prev => ({
                ...prev,
                message: "Processing failed",
                isProcessing: false
            }));
            
            message.error(`Failed to process recording with AI: ${error.message}`);
        } finally {
            setProcessingAI(false);
        }
    };
    
    // Helper function to format transition analysis as markdown
    const formatTransitionToMarkdown = (transition, state, actionType, elementTarget, index, totalStates) => {
        // Convert hasTransition boolean to user-friendly status
        const transitionStatus = transition.hasTransition 
            ? "✅ Significant state change detected"
            : "ℹ️ Minor UI update - no significant state change";
            
        // Format page change status for better readability
        let pageChangeStatus = "No page change";
        if (transition.isPageChanged) {
            pageChangeStatus = "✅ Full page change";
        } else if (transition.isSamePageDifferentState) {
            pageChangeStatus = "↻ Same page with state change";
        }
        
        // Format state name with proper styling
        const stateEmoji = getStateEmoji(transition.stateName);
        
        return `## AI Analysis of ${actionType} Action

### State Information
- **Current State:** ${stateEmoji} ${transition.stateName || 'Unknown State'}
- **Target Element:** ${elementTarget}
- **UI Path:** ${state.action?.element?.xpath || 'N/A'}
- **Action Time:** ${new Date(state.actionTime).toLocaleString()}

### Transition Details
- **Status:** ${transitionStatus}
- **Transition Description:** ${transition.transitionDescription || 'No description available'}
- **Technical Action:** ${transition.technicalActionDescription || 'No action description available'}
- **Element Target:** ${transition.actionTarget || 'Unknown target'}
- **Input Value:** ${transition.actionValue || 'No value'}
- **Page Change:** ${pageChangeStatus}

### Page Information
- **Current Page:** ${transition.currentPageName || 'Unknown page'}${transition.wasRenamed ? ` (renamed from "${transition.originalPageName}")` : ''}
- **Page Description:** ${transition.standardizedPageDescription || transition.currentPageDescription || 'No description available'}
- **Page Function:** ${transition.standardizedPageFunction || 'Not specified'}
- **User Activity:** ${transition.inferredUserActivity || 'Unknown activity'}

### Test Code Recommendation
\`\`\`java
// Generated test code for ${actionType} action on ${transition.currentPageName} (${transition.stateName})
public void test${actionType.replace(/\s+/g, '')}On${(transition.currentPageName || 'UnknownPage').replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')}() {
    // Find element using optimized selector
    WebElement element = driver.findElement(By.xpath("${state.action?.element?.xpath || '//android.view.View'}"));
    
    // Perform the ${actionType.toLowerCase()} action
    ${generateCodeForAction(actionType, transition.actionValue)}
    
    // Add appropriate assertion here
    ${generateAssertionForTransition(transition)}
    
    // Verify the expected state after action
    ${generateStateVerification(transition.stateName)}
}
\`\`\`

### Reliability Assessment
- **Element Identification:** ${getRatingEmoji('High')} High
- **Action Replayability:** ${getRatingEmoji('Medium')} Medium
- **Test Stability:** ${getRatingEmoji('Medium')} Medium

### Suggested Improvements
- Consider adding wait conditions before interacting with element
- Add more specific assertions to validate state after action
- ${getImprovementSuggestion(transition, actionType)}
`;
    };
    
    // Helper functions for formatTransitionToMarkdown
    const generateCodeForAction = (actionType, value) => {
        actionType = actionType.toLowerCase();
        
        if (actionType.includes('tap') || actionType.includes('click')) {
            return 'element.click();';
        } else if (actionType.includes('input') || actionType.includes('type') || actionType.includes('send')) {
            return `element.sendKeys("${value || 'sample text'}");`;
        } else if (actionType.includes('swipe') || actionType.includes('scroll')) {
            return `// Perform swipe action using TouchActions\nTouchActions action = new TouchActions(driver);\naction.scroll(element, 0, 100).perform();`;
        } else if (actionType.includes('long')) {
            return `// Perform long press using TouchActions\nTouchActions action = new TouchActions(driver);\naction.longPress(element).perform();`;
        } else if (actionType.includes('select')) {
            return `// Select option\nSelect select = new Select(element);\nselect.selectByVisibleText("${value || 'Option 1'}");`;
        } else {
            return 'element.click(); // Generic action';
        }
    };
    
    const generateAssertionForTransition = (transition) => {
        if (transition.isPageChanged) {
            return `// Verify navigation to new page\nWebElement newPageElement = driver.findElement(By.xpath("//some-identifier"));\nAssert.assertTrue("Navigation to ${transition.currentPageName} failed", newPageElement.isDisplayed());`;
        } else if (transition.isSamePageDifferentState) {
            return `// Verify state change on same page\nAssert.assertTrue("State change verification failed", \n    driver.findElement(By.xpath("//state-indicator")).getText().contains("new state"));`;
        } else {
            return `// Verify element state after action\nAssert.assertTrue("Element state verification failed", element.isEnabled());`;
        }
    };
    
    const getRatingEmoji = (rating) => {
        switch(rating) {
            case 'High':
                return '🟢';
            case 'Medium':
                return '🟡';
            case 'Low':
                return '🔴';
            default:
                return '⚪';
        }
    };
    
    const getImprovementSuggestion = (transition, actionType) => {
        if (transition.isPageChanged) {
            return `Add explicit wait for the new page "${transition.currentPageName}" to load`;
        } else if (actionType.toLowerCase().includes('input')) {
            return 'Validate input field contents after entering data';
        } else if (actionType.toLowerCase().includes('swipe') || actionType.toLowerCase().includes('scroll')) {
            return 'Add explicit verification that the intended element is visible after scrolling';
        } else {
            return 'Consider adding retry logic for intermittent failures';
        }
    };
    
    // Function to generate state verification code based on state name
    const generateStateVerification = (stateName) => {
        if (!stateName) return 'Assert.assertTrue("State verification", true);';
        
        const stateNameLower = stateName.toLowerCase();
        
        if (stateNameLower.includes('error')) {
            return `Assert.assertTrue("Error message is displayed", driver.findElement(By.id("error-message")).isDisplayed());`;
        } else if (stateNameLower.includes('form')) {
            return `Assert.assertTrue("Form is in ${stateName} state", driver.findElement(By.id("form-container")).isDisplayed());`;
        } else if (stateNameLower.includes('swipe') || stateNameLower.includes('scroll')) {
            return `// Verify scrolled state\nJavaScriptExecutor js = (JavaScriptExecutor) driver;\nAssert.assertTrue("Content is scrolled", (Boolean)js.executeScript("return (window.innerHeight + window.scrollY) >= document.body.offsetHeight"));`;
        } else if (stateNameLower.includes('initial')) {
            return `Assert.assertTrue("Page is in initial state", driver.findElement(By.id("initial-content")).isDisplayed());`;
        } else {
            return `// Verify the ${stateName} state\nAssert.assertTrue("Element is in expected state", element.isEnabled());`;
        }
    };
    
    // Get appropriate emoji for different state types
    const getStateEmoji = (stateName) => {
        if (!stateName) return '⚪';
        
        const stateNameLower = stateName.toLowerCase();
        
        if (stateNameLower.includes('error')) {
            return '🔴';
        } else if (stateNameLower.includes('initial')) {
            return '🟢';
        } else if (stateNameLower.includes('loading')) {
            return '🔄';
        } else if (stateNameLower.includes('scroll') || stateNameLower.includes('swipe')) {
            return '↕️';
        } else if (stateNameLower.includes('form')) {
            return '📝';
        } else if (stateNameLower.includes('expand')) {
            return '🔍';
        } else if (stateNameLower.includes('select') || stateNameLower.includes('chosen')) {
            return '✅';
        } else {
            return '🔹';
        }
    };
    
    // Helper function to format final state analysis
    const formatFinalStateToMarkdown = (state, actionType) => {
        // For the final state, we create an artificial stateName 
        const finalStateName = "FinalViewState";
        const stateEmoji = getStateEmoji("final");
        
        return `## AI Analysis of Final State

### Final State Information
- **Current State:** ${stateEmoji} ${finalStateName}
- **Last Action:** ${actionType}
- **Final Screen:** ${state.deviceArtifacts?.sessionDetails?.activity || 'Unknown Screen'}
- **Timestamp:** ${new Date(state.actionTime).toLocaleString()}

### Element Information
- **Last Element:** ${state.action?.element?.elementId || 'No element information'}
- **UI Path:** ${state.action?.element?.xpath || 'N/A'}

### Page Information
- **Current Page:** ${state.deviceArtifacts?.sessionDetails?.activity || 'Final Page View'}
- **Page Description:** The final page state reached after completing all user interactions in this recording session.

### Test Code Recommendation
\`\`\`java
// Generated assertions for final state (${finalStateName})
public void verifyFinalState() {
    // Verify the final state is correct
    WebElement finalElement = driver.findElement(By.xpath("${state.action?.element?.xpath || '//android.view.View'}"));
    Assert.assertTrue("Final state should be visible", finalElement.isDisplayed());
    
    // Check for any page-specific elements to confirm we're on the correct page
    WebElement pageSpecificElement = driver.findElement(By.id("page-specific-id"));
    Assert.assertTrue("Page-specific element should be visible", pageSpecificElement.isDisplayed());
    
    // Verify completed workflow state
    ${generateStateVerification(finalStateName)}
    
    // Log test completion
    System.out.println("Test workflow completed successfully");
}
\`\`\`

### Test Completion Analysis
- ✅ Test sequence recorded successfully
- ✅ All key interactions were captured
- ℹ️ Final state verification recommended

### Reliability Assessment
- **Test Stability:** ${getRatingEmoji('High')} High
- **Results Determinism:** ${getRatingEmoji('High')} High

### Next Steps
- Add proper test setup and teardown
- Consider adding wait conditions before interactions
- Implement proper test reporting
- Add error handling and recovery logic
- Generate complete test suite with all recorded transitions
`;
    };
    
    
    const saveToFile = () => {
        try {
            const recordingData = activeTab === "detailed" ? detailedRecording : standardRecordedActions;
            const dataStr = JSON.stringify(recordingData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const exportFileDefaultName = `appium-recording-${timestamp}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            message.success("Recording saved to file");
        } catch (error) {
            message.error(`Failed to save recording: ${error.message}`);
        }
    };
    
    // Handle loading a recording from file
    const handleLoadRecording = async (file) => {
        try {
            const fileReader = new FileReader();
            
            fileReader.onload = (event) => {
                try {
                    const fileContent = event.target.result;
                    const jsonData = JSON.parse(fileContent);
                    
                    if (!Array.isArray(jsonData)) {
                        throw new Error('Invalid recording format. Expected an array of actions.');
                    }
                    
                    // Check if it's a standard recording or detailed recording
                    const isDetailedRecording = jsonData.length > 0 && 
                                               (jsonData[0].deviceArtifacts || 
                                                jsonData[0].actionTime);
                    
                    if (isDetailedRecording) {
                        // Check if any elements are missing the isCondensed flag
                        let missingCondensedFlag = false;
                        for (let i = 0; i < jsonData.length; i++) {
                            if (jsonData[i].isCondensed === undefined) {
                                missingCondensedFlag = true;
                                break;
                            }
                        }
                        
                        if (missingCondensedFlag) {
                            message.info('Some entries missing condensed state flags - applying condensing logic');
                        }
                        
                        // Always apply detectCondensed=true to ensure proper condensed state flags
                        ActionRecorder.loadRecording(jsonData, { detectCondensed: true });
                        
                        // Make sure we preserve AI analysis data if present
                        const loadedRecording = ActionRecorder.getRecording();
                        
                        // Check if the loaded recording has AI analysis data
                        const hasAiAnalysis = loadedRecording.some(entry => entry.aiAnalysis || entry.aiAnalysisRaw);
                        
                        // If AI analysis data is present, ensure it's properly preserved
                        if (hasAiAnalysis) {
                            console.log("AI Analysis data detected in loaded recording");
                            
                            // Make sure all entries have the proper AI analysis structure
                            const processedRecording = loadedRecording.map(entry => {
                                // If this entry has AI analysis data
                                if (entry.aiAnalysis || entry.aiAnalysisRaw) {
                                    return {
                                        ...entry,
                                        // Ensure aiAnalysisRaw is an object, not a string
                                        aiAnalysisRaw: typeof entry.aiAnalysisRaw === 'string' 
                                            ? JSON.parse(entry.aiAnalysisRaw) 
                                            : entry.aiAnalysisRaw
                                    };
                                }
                                return entry;
                            });
                            
                            // Replace the recording with the processed version
                            ActionRecorder.loadRecording(processedRecording);
                            
                            // Log success message for AI analysis
                            console.log("AI Analysis data successfully restored");
                        }
                        
                        setDetailedRecording(ActionRecorder.getRecording());
                        setActiveTab('detailed');
                        
                        // Check condensed stats
                        const allRecordings = ActionRecorder.getRecording();
                        const totalRecordings = allRecordings.length;
                        
                        // Explicitly count entries marked as condensed
                        let condensed = 0;
                        for (let i = 0; i < allRecordings.length; i++) {
                            if (allRecordings[i].isCondensed === true) {
                                condensed++;
                            }
                        }
                        
                        const condensedPercentage = totalRecordings > 0 ? Math.round((condensed / totalRecordings) * 100) : 0;
                        
                        console.log("Condensed entries check:", allRecordings.map((e, i) => {
                            return `Entry ${i}: isCondensed=${e.isCondensed}`;
                        }).join('\n'));
                        
                        message.success(`Recording loaded: ${totalRecordings} total entries (${condensed} condensed, ${condensedPercentage}%)`);
                    } else {
                        // Try to convert standard recording to detailed format
                        try {
                            const convertedRecording = jsonData.map((action, index) => {
                                // Create a basic detailed recording entry from standard action
                                return {
                                    actionTime: Date.now() + (index * 1000), // Generate sequential timestamps
                                    action: action, // Store the original action data
                                    deviceArtifacts: {
                                        sessionDetails: {},
                                        screenshotBase64: null,
                                        pageSource: null,
                                        currentContext: null
                                    },
                                    isCondensed: false // Mark as not condensed by default
                                };
                            });
                            
                            // Load the converted recording
                            ActionRecorder.loadRecording(convertedRecording);
                            setDetailedRecording(ActionRecorder.getRecording());
                            setActiveTab('detailed');
                            
                            message.success(`Standard recording converted and loaded: ${jsonData.length} actions imported`);
                        } catch (conversionError) {
                            console.error('Error converting standard recording:', conversionError);
                            message.warning('Standard recording format detected, but loading encountered errors. Some features may not work properly.');
                        }
                    }
                } catch (err) {
                    message.error(`Error parsing recording file: ${err.message}`);
                }
            };
            
            fileReader.onerror = () => {
                message.error('Error reading the file');
            };
            
            fileReader.readAsText(file);
        } catch (error) {
            message.error(`Failed to load recording: ${error.message}`);
        }
        
        // Don't upload the file
        return false;
    };

    // Helper to render a selected entry details
    const renderEntryDetails = () => {
        if (selectedEntryIndex === null || !detailedRecording[selectedEntryIndex]) {
            return (
                <div style={{ 
                    padding: '40px 20px', 
                    textAlign: 'center', 
                    background: '#fafafa', 
                    border: '1px dashed #d9d9d9', 
                    borderRadius: '4px',
                    margin: '20px',
                    height: 'calc(100% - 40px)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <InfoCircleOutlined style={{ fontSize: '32px', color: '#bfbfbf', marginBottom: '16px' }} />
                    <div>
                        <Text type="secondary">Select an entry from the list to view details</Text>
                    </div>
                </div>
            );
        }

        const entry = detailedRecording[selectedEntryIndex];
        const screenshot = entry.deviceArtifacts?.screenshotBase64;
        
        // Get previous and next entries for navigation
        const hasPrevious = selectedEntryIndex > 0;
        const hasNext = selectedEntryIndex < detailedRecording.length - 1;
        
        return (
            <div style={{ padding: '20px' }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    borderBottom: '1px solid #f0f0f0',
                    paddingBottom: '12px'
                }}>
                    <Space align="center">
                        <Badge 
                            count={selectedEntryIndex + 1} 
                            style={{ backgroundColor: '#1890ff' }} 
                            overflowCount={999}
                        />
                        <Title level={4} style={{ margin: 0 }}>
                            {new Date(entry.actionTime).toLocaleString()}
                        </Title>
                        {entry.isCondensed && (
                            <Badge 
                                count="CONDENSED" 
                                style={{ 
                                    backgroundColor: '#faad14',
                                    fontSize: '12px',
                                    fontWeight: 'normal'
                                }} 
                            />
                        )}
                    </Space>
                    
                    <Space>
                        <Tooltip title="Previous entry">
                            <Button 
                                type="text" 
                                icon={<ArrowLeftOutlined />} 
                                disabled={!hasPrevious}
                                onClick={() => setSelectedEntryIndex(selectedEntryIndex - 1)}
                            />
                        </Tooltip>
                        <Tooltip title="Next entry">
                            <Button 
                                type="text" 
                                icon={<ArrowLeftOutlined style={{ transform: 'rotate(180deg)' }} />} 
                                disabled={!hasNext}
                                onClick={() => setSelectedEntryIndex(selectedEntryIndex + 1)}
                            />
                        </Tooltip>
                    </Space>
                </div>
                
                {screenshot && (
                    <Card 
                        title="Screenshot" 
                        style={{ marginBottom: '16px' }}
                        extra={
                            <Tooltip title="Download screenshot">
                                <Button 
                                    type="text" 
                                    icon={<DownloadOutlined />} 
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = `data:image/png;base64,${screenshot}`;
                                        link.download = `screenshot-${selectedEntryIndex + 1}-${new Date(entry.actionTime).getTime()}.png`;
                                        link.click();
                                    }}
                                />
                            </Tooltip>
                        }
                    >
                        <div style={{ textAlign: 'center' }}>
                            <img 
                                src={`data:image/png;base64,${screenshot}`} 
                                alt={`Screenshot at ${new Date(entry.actionTime).toLocaleString()}`}
                                style={{ 
                                    maxWidth: '100%',
                                    maxHeight: '400px',
                                    border: '1px solid #d9d9d9',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                                }}
                            />
                        </div>
                    </Card>
                )}
                
                <Tabs 
                    defaultActiveKey="action"
                    items={[
                        {
                            key: 'action',
                            label: (
                                <span>
                                    <Badge status={entry.action ? "processing" : "default"} />
                                    Action Data
                                </span>
                            ),
                            children: (
                                <pre style={{ 
                                    backgroundColor: '#f5f5f5', 
                                    padding: '16px', 
                                    borderRadius: '4px', 
                                    overflow: 'auto',
                                    maxHeight: '300px'
                                }}>
                                    {JSON.stringify(entry.action, null, 2) || "No action data"}
                                </pre>
                            )
                        },
                        {
                            key: 'source',
                            label: 'Page Source',
                            children: (
                                <pre style={{ 
                                    backgroundColor: '#f5f5f5', 
                                    padding: '16px', 
                                    borderRadius: '4px', 
                                    overflow: 'auto',
                                    maxHeight: '300px',
                                    fontSize: '12px'
                                }}>
                                    {entry.deviceArtifacts?.pageSource || "No page source available"}
                                </pre>
                            )
                        },
                        {
                            key: 'session',
                            label: 'Session Details',
                            children: (
                                <pre style={{ 
                                    backgroundColor: '#f5f5f5', 
                                    padding: '16px', 
                                    borderRadius: '4px', 
                                    overflow: 'auto',
                                    maxHeight: '300px'
                                }}>
                                    {JSON.stringify(entry.deviceArtifacts?.sessionDetails, null, 2) || "No session details available"}
                                </pre>
                            )
                        }
                    ]}
                />
            </div>
        );
    };

    // Function to render the toolbar with action buttons
    const renderToolbar = () => {
        const hasRecordings = (standardRecordedActions && standardRecordedActions.length > 0) || 
                            (detailedRecording && detailedRecording.length > 0);
        
        // Count condensed entries for the badge
        const condensedCount = detailedRecording.filter(entry => entry.isCondensed).length;
        
        return (
            <Row gutter={[16, 16]} align="middle">
                {/* Recording Controls Group */}
                <Col>
                    <Space>
                        {!standardIsRecording ? (
                            <Tooltip title={!inspectorState?.driver ? "Connect to a device first" : "Start recording session"}>
                                <Button
                                    type="primary"
                                    icon={<VideoCameraOutlined />}
                                    onClick={handleStartRecording}
                                    loading={loading}
                                    disabled={!inspectorState?.driver}
                                >
                                    Start Recording
                                </Button>
                            </Tooltip>
                        ) : (
                            <Tooltip title="Pause current recording">
                                <Button
                                    type="primary"
                                    danger
                                    icon={<PauseCircleOutlined />}
                                    onClick={handlePauseRecording}
                                    loading={loading}
                                >
                                    Pause Recording
                                </Button>
                            </Tooltip>
                        )}
                        <Tooltip title="Clear all recordings">
                            <Button
                                icon={<ClearOutlined />}
                                onClick={handleClearRecording}
                                disabled={!hasRecordings}
                            >
                                Clear
                            </Button>
                        </Tooltip>
                    </Space>
                </Col>
                
                <Divider type="vertical" style={{ height: '24px' }} />
                
                {/* File Operations Group */}
                <Col>
                    <Space>
                        <Upload 
                            beforeUpload={handleLoadRecording}
                            showUploadList={false}
                            accept=".json"
                        >
                            <Tooltip title="Load recording from JSON file">
                                <Button icon={<UploadOutlined />}>Load</Button>
                            </Tooltip>
                        </Upload>
                        <Tooltip title="Save recording to JSON file">
                            <Button
                                icon={<DownloadOutlined />}
                                onClick={saveToFile}
                                disabled={!hasRecordings}
                            >
                                Save
                            </Button>
                        </Tooltip>
                        <Tooltip title="Copy recording data as JSON">
                            <Button
                                icon={<CopyOutlined />}
                                onClick={copyToClipboard}
                                disabled={!hasRecordings}
                            >
                                {copied ? "Copied!" : "Copy"}
                            </Button>
                        </Tooltip>
                    </Space>
                </Col>
                
                <Divider type="vertical" style={{ height: '24px' }} />
                
                {/* AI Processing Group */}
                <Col>
                    <Tooltip title="Process recording with AI using parallel batches">
                        <Button
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            onClick={handleProcessWithAI}
                            loading={processingAI}
                            disabled={!hasRecordings || analysisProgress.isProcessing}
                            style={{ background: '#722ED1', borderColor: '#722ED1' }}
                        >
                            Process with AI
                        </Button>
                    </Tooltip>
                </Col>
                
                <Divider type="vertical" style={{ height: '24px' }} />
                
                {/* View Controls Group */}
                <Col>
                    <Space align="center">
                        <Tooltip title={showCondensed ? "Hide condensed states" : "Show condensed states"}>
                            <Badge count={condensedCount} size="small" offset={[-5, 0]}>
                                <Switch 
                                    checked={showCondensed}
                                    onChange={setShowCondensed}
                                    checkedChildren={<EyeOutlined />}
                                    unCheckedChildren={<EyeInvisibleOutlined />}
                                    disabled={!hasRecordings}
                                />
                            </Badge>
                        </Tooltip>
                        <Text type="secondary">
                            Condensed States
                        </Text>
                    </Space>
                </Col>
                <Col>
                    <Space align="center" style={{ marginLeft: '16px' }}>
                        <Tooltip title={hideNonTransitions ? "Show all states" : "Hide non-transition states"}>
                            <Switch 
                                checked={hideNonTransitions}
                                onChange={setHideNonTransitions}
                                checkedChildren={<FilterOutlined />}
                                unCheckedChildren={<FilterOutlined />}
                                disabled={!hasRecordings}
                            />
                        </Tooltip>
                        <Text type="secondary">
                            Hide Non-Transitions
                        </Text>
                    </Space>
                </Col>
                
                {/* Stats Section */}
                <Col flex="auto" style={{ textAlign: 'right' }}>
                    {hasRecordings && (
                        <Space>
                            <Badge count={detailedRecording.length} style={{ backgroundColor: '#52c41a' }} />
                            <Text type="secondary">Total Events</Text>
                            
                            {condensedCount > 0 && (
                                <>
                                    <Divider type="vertical" />
                                    <Badge count={condensedCount} style={{ backgroundColor: '#faad14' }} />
                                    <Text type="secondary">Condensed</Text>
                                </>
                            )}
                            
                            {detailedRecording.some(state => state.aiAnalysisRaw) && (
                                <>
                                    <Divider type="vertical" />
                                    <Badge 
                                        count={detailedRecording.filter(state => state.aiAnalysisRaw?.hasTransition).length} 
                                        style={{ backgroundColor: '#1890ff' }} 
                                    />
                                    <Text type="secondary">Transitions</Text>
                                </>
                            )}
                            
                            {/* AI Analysis Progress */}
                            {analysisProgress.isProcessing && (
                                <>
                                    <Divider type="vertical" />
                                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
                                        {/* Use the explicitly imported Progress component */}
                                        <div style={{ 
                                            width: 30, 
                                            height: 30, 
                                            borderRadius: '50%', 
                                            background: '#f0f0f0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            position: 'relative',
                                            marginRight: '8px'
                                        }}>
                                            {/* Simple circular progress indicator */}
                                            <div style={{
                                                position: 'absolute',
                                                width: '100%',
                                                height: '100%',
                                                borderRadius: '50%',
                                                background: `conic-gradient(#722ED1 ${analysisProgress.percent}%, transparent 0%)`,
                                                transform: 'rotate(-90deg)'
                                            }} />
                                            <div style={{
                                                position: 'absolute',
                                                width: '80%',
                                                height: '80%',
                                                borderRadius: '50%',
                                                background: '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '10px',
                                                fontWeight: 'bold'
                                            }}>
                                                {analysisProgress.percent}%
                                            </div>
                                        </div>
                                        <div>
                                            <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                                                {analysisProgress.message || 'Processing...'}
                                            </Text>
                                            <Text strong style={{ fontSize: '12px' }}>
                                                {analysisProgress.current} of {analysisProgress.total}
                                            </Text>
                                        </div>
                                    </div>
                                </>
                            )}
                        </Space>
                    )}
                </Col>
            </Row>
        );
    };

    return (
        <Layout className="recording-view-container" style={{ 
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden' // Prevent main container from scrolling
        }}>
            {/* Header with Title and Back Button */}
            <Header style={{ 
                height: 'auto', 
                padding: '8px 12px',
                background: '#fff', 
                borderBottom: '1px solid #f0f0f0',
                flexShrink: 0 // Prevent header from shrinking
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={navigateBack}
                        type="text"
                        aria-label="Back"
                        title="Go back"
                        style={{ marginRight: '8px', padding: '4px 8px' }}
                    />
                    <Title level={4} style={{ margin: 0 }}>
                        Session Recording
                        {(standardIsRecording || ActionRecorder.isRecording()) && 
                        <Text type="danger" style={{ marginLeft: 8 }}>(Recording in progress)</Text>}
                    </Title>
                </div>
            </Header>
            
            {/* Toolbar */}
            <div style={{ 
                padding: '16px',
                background: '#fafafa', 
                borderBottom: '1px solid #f0f0f0',
                zIndex: 10,
                flexShrink: 0 // Prevent toolbar from shrinking
            }}>
                {renderToolbar()}
            </div>
            
            {/* Main Content - Fill available space */}
            <Content style={{ 
                padding: 0, // Remove padding to maximize space
                flexGrow: 1,
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'hidden', // Content itself doesn't scroll
                position: 'relative',
                flex: '1 1 auto',
                minHeight: 0
            }}>
                <Tabs 
                    defaultActiveKey="detailed" 
                    onChange={setActiveTab}
                    type="card"
                    className="recording-tabs"
                    style={{ 
                        margin: '8px 8px 0',
                        display: 'flex', 
                        flexDirection: 'column', 
                        height: 'calc(100% - 8px)',
                        overflow: 'hidden',
                        flex: 1
                    }}
                    items={[
                    {
                        key: 'transitions',
                        label: 'Transitions',
                        children: loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <Spin />
                                <div style={{ marginTop: '16px' }}>
                                    <Text type="secondary">Processing transitions...</Text>
                                </div>
                            </div>
                        ) : detailedRecording.length > 0 ? (
                            <div className="recording-view-detailed-container" style={{ 
                                display: 'flex', 
                                height: 'calc(100% - 8px)', 
                                overflow: 'hidden',
                                minHeight: '500px',
                                flex: 1,
                                margin: 0,
                                position: 'relative'
                            }}>
                                {/* Column 1 - Transitions list */}
                                <div style={{ 
                                    width: columnWidths.list, 
                                    borderRight: '1px solid #f0f0f0', 
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ 
                                        padding: '12px 16px',
                                        borderBottom: '1px solid #f0f0f0',
                                        backgroundColor: '#fafafa',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: 'auto'
                                    }}>
                                        <div style={{ 
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '8px'
                                        }}>
                                            <Space>
                                                <Badge 
                                                    count={detailedRecording.length > 1 ? detailedRecording.length - 1 : 0} 
                                                    style={{ backgroundColor: '#1890ff' }}
                                                />
                                                <Text strong>State Transitions</Text>
                                            </Space>
                                            <Space>
                                                <Tooltip title={showCondensed ? "Hide condensed states" : "Show condensed states"}>
                                                    <Switch 
                                                        checked={showCondensed}
                                                        onChange={setShowCondensed}
                                                        checkedChildren={<EyeOutlined />}
                                                        unCheckedChildren={<EyeInvisibleOutlined />}
                                                        size="small"
                                                    />
                                                </Tooltip>
                                                <Tooltip title={hideNonTransitions ? "Show all states" : "Hide non-transition states"}>
                                                    <Switch 
                                                        checked={hideNonTransitions}
                                                        onChange={setHideNonTransitions}
                                                        checkedChildren={<FilterOutlined />}
                                                        unCheckedChildren={<FilterOutlined />}
                                                        size="small"
                                                    />
                                                </Tooltip>
                                            </Space>
                                        </div>
                                        
                                        {/* Playback controls */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            backgroundColor: '#f5f5f5',
                                            padding: '6px 8px',
                                            borderRadius: '4px'
                                        }}>
                                            <Space>
                                                <Tooltip title={isPlaying ? "Pause playback" : "Start playback"}>
                                                    <Button
                                                        type="primary"
                                                        size="small"
                                                        icon={isPlaying ? <PauseCircleOutlined /> : <VideoCameraOutlined />}
                                                        onClick={isPlaying ? pausePlayback : startPlayback}
                                                        disabled={detailedRecording.length <= 1}
                                                    >
                                                        {isPlaying ? "Pause" : "Play"}
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip title="Stop playback and return to first state">
                                                    <Button
                                                        size="small"
                                                        icon={<ClearOutlined />}
                                                        onClick={stopPlayback}
                                                        disabled={detailedRecording.length <= 1 || (!isPlaying && selectedEntryIndex === 0)}
                                                    >
                                                        Stop
                                                    </Button>
                                                </Tooltip>
                                            </Space>
                                            
                                            <Space>
                                                <Text type="secondary" style={{ fontSize: '12px' }}>Speed:</Text>
                                                <Select
                                                    size="small"
                                                    value={playbackSpeed}
                                                    onChange={(value) => setPlaybackSpeed(value)}
                                                    style={{ width: '100px' }}
                                                    disabled={isPlaying}
                                                >
                                                    <Option value={2000}>Slow</Option>
                                                    <Option value={1000}>Normal</Option>
                                                    <Option value={500}>Fast</Option>
                                                    <Option value={250}>Very Fast</Option>
                                                </Select>
                                            </Space>
                                        </div>
                                    </div>
                                    <div 
                                        className="custom-scrollbar force-scrollbar"
                                        style={{ 
                                            height: 'calc(100% - 95px)', // Subtract header height including playback controls
                                            padding: '0 2px',
                                            background: '#fafafa'
                                        }}
                                    >
                                        {/* Generate transition items - for each consecutive pair of states */}
                                        {detailedRecording.length > 1 && 
                                            Array.from({ length: detailedRecording.length - 1 }, (_, i) => {
                                                // For each index i, we're showing the transition from state i to i+1
                                                const fromState = detailedRecording[i];
                                                const toState = detailedRecording[i + 1];
                                                
                                                // Skip if either state is condensed and we're not showing condensed states
                                                if (!showCondensed && (fromState.isCondensed || toState.isCondensed)) {
                                                    return null;
                                                }
                                                
                                                // Skip if hiding non-transitions and this state doesn't have a significant transition
                                                if (hideNonTransitions && toState.aiAnalysisRaw && !toState.aiAnalysisRaw.hasTransition) {
                                                    return null;
                                                }
                                                
                                                // Check if this transition is selected (if either from or to state is selected)
                                                // Check if this transition is selected or is currently being played back
                                                const isSelected = selectedEntryIndex === i || selectedEntryIndex === i + 1;
                                                const isPlayingCurrent = isPlaying && selectedEntryIndex === i + 1;
                                                
                                                // Get transition info from the TO state's AI analysis
                                                const hasAiAnalysis = !!toState.aiAnalysisRaw;
                                                
                                                // Determine if this is a significant transition
                                                const hasTransition = toState.aiAnalysisRaw?.hasTransition || false;
                                                const isPageChanged = toState.aiAnalysisRaw?.isPageChanged || false;
                                                const isStateChanged = toState.aiAnalysisRaw?.isSamePageDifferentState || false;
                                                
                                                // Get action info
                                                const actionType = toState.action?.action || fromState.action?.action || 'State Change';
                                                const elementTarget = toState.action?.element?.text || 
                                                                    toState.action?.element?.resourceId || 
                                                                    (toState.aiAnalysisRaw?.actionTarget || 'Unknown Element');
                                                
                                                // Transition description
                                                let transitionDescription = toState.aiAnalysisRaw?.transitionDescription || 
                                                                        `${actionType} on ${elementTarget}`;
                                                                        
                                                // Format state names
                                                const fromStateName = fromState.aiAnalysisRaw?.stateName || 'State';
                                                const toStateName = toState.aiAnalysisRaw?.stateName || 'State';
                                                
                                                // Determine transition item color based on transition type
                                                let statusColor = '#1890ff'; // Default blue
                                                if (hasAiAnalysis) {
                                                    if (isPageChanged) statusColor = '#52c41a'; // Green for page changes
                                                    else if (isStateChanged) statusColor = '#722ED1'; // Purple for state changes
                                                    else if (hasTransition) statusColor = '#faad14'; // Orange for other transitions
                                                }
                                                
                                                return (
                                                    <div 
                                                        key={`transition-${i}`}
                                                        onClick={() => setSelectedEntryIndex(i + 1)} // Select the TO state when clicking on a transition
                                                        className={isPlayingCurrent ? 'playback-active' : ''}
                                                        style={{
                                                            padding: '10px 12px',
                                                            borderLeft: isSelected ? `3px solid ${statusColor}` : '3px solid transparent',
                                                            borderBottom: '1px solid #f0f0f0',
                                                            backgroundColor: isSelected ? '#f9f9f9' : 'transparent',
                                                            cursor: 'pointer',
                                                            opacity: (fromState.isCondensed || toState.isCondensed) ? 0.8 : 1,
                                                            transition: 'all 0.2s ease',
                                                            minHeight: '60px',
                                                            display: 'flex',
                                                            position: 'relative',
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        <div style={{ 
                                                            width: '24px', 
                                                            height: '24px', 
                                                            borderRadius: '50%', 
                                                            backgroundColor: isSelected ? statusColor : '#f0f0f0',
                                                            color: isSelected ? '#fff' : '#595959',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '12px',
                                                            fontWeight: 'bold',
                                                            marginRight: '8px',
                                                            flexShrink: 0,
                                                            marginTop: '2px'
                                                        }}>
                                                            {i + 1}
                                                        </div>
                                                        
                                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                                            {/* Transition description */}
                                                            <div style={{ 
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                fontWeight: 500,
                                                                color: statusColor,
                                                                fontSize: '12px',
                                                                lineHeight: '1.4',
                                                                marginBottom: '4px'
                                                            }}>
                                                                {transitionDescription}
                                                            </div>
                                                            
                                                            {/* From/To state names */}
                                                            {hasAiAnalysis && (
                                                                <div style={{ 
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    marginBottom: '4px',
                                                                    fontSize: '11px',
                                                                }}>
                                                                    <span style={{ color: '#8c8c8c' }}>
                                                                        <strong>{fromStateName}</strong>
                                                                    </span>
                                                                    <span style={{ 
                                                                        margin: '0 4px', 
                                                                        color: statusColor,
                                                                        fontSize: '14px' 
                                                                    }}>
                                                                        →
                                                                    </span>
                                                                    <span style={{ color: statusColor, fontWeight: 500 }}>
                                                                        <strong>{toStateName}</strong>
                                                                    </span>
                                                                </div>
                                                            )}
                                                            
                                                            {/* Timestamp */}
                                                            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                                                                {new Date(toState.actionTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                            </div>
                                                        </div>
                                                        
                                                        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '4px', alignItems: 'center', justifyContent: 'center' }}>
                                                            {/* Playback indicator */}
                                                            {isPlayingCurrent && (
                                                                <Badge 
                                                                    status="processing" 
                                                                    text={<Text style={{ fontSize: '11px', color: '#1890ff' }}>Playing</Text>} 
                                                                    style={{ marginBottom: '2px' }}
                                                                />
                                                            )}
                                                            
                                                            {/* Transition type indicators */}
                                                            {hasAiAnalysis && (
                                                                <>
                                                                    {isPageChanged && (
                                                                        <Badge 
                                                                            status="success" 
                                                                            text={<Text style={{ fontSize: '11px' }}>Page Change</Text>} 
                                                                            style={{ marginBottom: '2px' }}
                                                                        />
                                                                    )}
                                                                    {isStateChanged && (
                                                                        <Badge 
                                                                            status="processing" 
                                                                            text={<Text style={{ fontSize: '11px' }}>State Change</Text>} 
                                                                            style={{ marginBottom: '2px' }}
                                                                        />
                                                                    )}
                                                                    {hasTransition && !isPageChanged && !isStateChanged && (
                                                                        <Badge 
                                                                            status="warning" 
                                                                            text={<Text style={{ fontSize: '11px' }}>UI Change</Text>} 
                                                                            style={{ marginBottom: '2px' }}
                                                                        />
                                                                    )}
                                                                </>
                                                            )}
                                                            
                                                            {/* Condensed indicator */}
                                                            {(fromState.isCondensed || toState.isCondensed) && (
                                                                <Badge 
                                                                    status="default" 
                                                                    text={<Text style={{ fontSize: '11px', color: '#d9d9d9' }}>Condensed</Text>} 
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }).filter(Boolean) // Remove null entries (filtered condensed states)
                                        }
                                    </div>
                                </div>
                                
                                {/* Resizable divider between list and screenshot */}
                                <div 
                                    className="resize-handle resize-handle-list"
                                    style={{
                                        width: '5px',
                                        cursor: 'col-resize',
                                        background: '#f0f0f0',
                                        position: 'relative',
                                        zIndex: 1,
                                        transition: 'background-color 0.2s',
                                        boxShadow: isResizing === 'list-screenshot' ? '0 0 5px rgba(24, 144, 255, 0.5)' : 'none'
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setIsResizing('list-screenshot');
                                    }}
                                >
                                    <div 
                                        style={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            width: '1px',
                                            height: '20px',
                                            background: '#d9d9d9'
                                        }}
                                    />
                                </div>
                                
                                {selectedEntryIndex !== null && detailedRecording[selectedEntryIndex] ? (
                                    <>
                                        {/* Column 2 - Screenshot */}
                                        <div style={{ 
                                            width: columnWidths.screenshot,
                                            borderRight: '1px solid #f0f0f0',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{ 
                                                padding: '12px 16px',
                                                borderBottom: '1px solid #f0f0f0',
                                                backgroundColor: '#fafafa',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                height: '48px'
                                            }}>
                                                <Space>
                                                    <Badge 
                                                        count={selectedEntryIndex + 1} 
                                                        style={{ backgroundColor: '#1890ff' }}
                                                    />
                                                    <Text strong>Screenshot</Text>
                                                    {detailedRecording[selectedEntryIndex].isCondensed && (
                                                        <Badge 
                                                            count="CONDENSED" 
                                                            style={{ backgroundColor: '#faad14', fontSize: '12px' }}
                                                        />
                                                    )}
                                                </Space>
                                                
                                                <Space>
                                                    <Tooltip title="Previous entry">
                                                        <Button 
                                                            type="text" 
                                                            icon={<ArrowLeftOutlined />}
                                                            disabled={selectedEntryIndex === 0}
                                                            onClick={() => setSelectedEntryIndex(selectedEntryIndex - 1)}
                                                            size="small"
                                                        />
                                                    </Tooltip>
                                                    <Tooltip title="Next entry">
                                                        <Button 
                                                            type="text" 
                                                            icon={<ArrowLeftOutlined style={{ transform: 'rotate(180deg)' }} />}
                                                            disabled={selectedEntryIndex === detailedRecording.length - 1}
                                                            onClick={() => setSelectedEntryIndex(selectedEntryIndex + 1)}
                                                            size="small"
                                                        />
                                                    </Tooltip>
                                                    
                                                    {detailedRecording[selectedEntryIndex].deviceArtifacts?.screenshotBase64 && (
                                                        <Tooltip title="Download screenshot">
                                                            <Button 
                                                                type="text" 
                                                                icon={<DownloadOutlined />}
                                                                size="small"
                                                                onClick={() => {
                                                                    const entry = detailedRecording[selectedEntryIndex];
                                                                    const screenshot = entry.deviceArtifacts?.screenshotBase64;
                                                                    const link = document.createElement('a');
                                                                    link.href = `data:image/png;base64,${screenshot}`;
                                                                    link.download = `screenshot-${selectedEntryIndex + 1}-${new Date(entry.actionTime).getTime()}.png`;
                                                                    link.click();
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    )}
                                                </Space>
                                            </div>
                                            
                                            <div style={{ 
                                                padding: '0', 
                                                height: 'calc(100% - 48px)', // Subtract header height
                                                minHeight: '300px', // Ensure minimum height for container
                                                textAlign: 'center',
                                                background: '#ffffff',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                overflow: 'hidden'
                                            }}>
                                                {detailedRecording[selectedEntryIndex].deviceArtifacts?.screenshotBase64 ? (
                                                    <img 
                                                        src={`data:image/png;base64,${detailedRecording[selectedEntryIndex].deviceArtifacts.screenshotBase64}`} 
                                                        alt={`Screenshot at ${new Date(detailedRecording[selectedEntryIndex].actionTime).toLocaleString()}`}
                                                        style={{ 
                                                            maxWidth: '100%',
                                                            height: '100%', 
                                                            objectFit: 'contain',
                                                            border: '1px solid #d9d9d9',
                                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                                                        }}
                                                    />
                                                ) : (
                                                    <div style={{ 
                                                        display: 'flex', 
                                                        flexDirection: 'column', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        height: '100%',
                                                        color: '#bfbfbf'
                                                    }}>
                                                        <FileImageOutlined style={{ fontSize: '64px', marginBottom: '16px' }} />
                                                        <Text type="secondary">No screenshot available</Text>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Resizable divider between screenshot and details */}
                                        <div 
                                            className="resize-handle resize-handle-details"
                                            style={{
                                                width: '5px',
                                                cursor: 'col-resize',
                                                background: '#f0f0f0',
                                                position: 'relative',
                                                zIndex: 1,
                                                transition: 'background-color 0.2s',
                                                boxShadow: isResizing === 'screenshot-details' ? '0 0 5px rgba(24, 144, 255, 0.5)' : 'none'
                                            }}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setIsResizing('screenshot-details');
                                            }}
                                        >
                                            <div 
                                                style={{
                                                    position: 'absolute',
                                                    top: '50%',
                                                    left: '50%',
                                                    transform: 'translate(-50%, -50%)',
                                                    width: '1px',
                                                    height: '20px',
                                                    background: '#d9d9d9'
                                                }}
                                            />
                                        </div>
                                        
                                        {/* Column 3 - Transition Details */}
                                        <div style={{ 
                                            width: columnWidths.details,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{ 
                                                padding: '12px 16px',
                                                borderBottom: '1px solid #f0f0f0',
                                                backgroundColor: '#fafafa',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                height: '48px',
                                                flexShrink: 0
                                            }}>
                                                <Space>
                                                    <Badge 
                                                        count={selectedEntryIndex} 
                                                        style={{ backgroundColor: '#1890ff' }}
                                                    />
                                                    <Text strong>Transition Details</Text>
                                                </Space>
                                                
                                                {selectedEntryIndex > 0 && detailedRecording[selectedEntryIndex]?.aiAnalysisRaw && (
                                                    <div>
                                                        {detailedRecording[selectedEntryIndex].aiAnalysisRaw.isPageChanged && (
                                                            <Badge 
                                                                status="success" 
                                                                text={<Text strong style={{ color: '#52c41a' }}>Page Change</Text>}
                                                            />
                                                        )}
                                                        {detailedRecording[selectedEntryIndex].aiAnalysisRaw.isSamePageDifferentState && !detailedRecording[selectedEntryIndex].aiAnalysisRaw.isPageChanged && (
                                                            <Badge 
                                                                status="processing" 
                                                                text={<Text strong style={{ color: '#1890ff' }}>State Change</Text>}
                                                            />
                                                        )}
                                                        {detailedRecording[selectedEntryIndex].aiAnalysisRaw.hasTransition && 
                                                         !detailedRecording[selectedEntryIndex].aiAnalysisRaw.isPageChanged && 
                                                         !detailedRecording[selectedEntryIndex].aiAnalysisRaw.isSamePageDifferentState && (
                                                            <Badge 
                                                                status="warning" 
                                                                text={<Text strong style={{ color: '#faad14' }}>UI Change</Text>}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div style={{ flex: 1, overflow: 'hidden', maxHeight: 'calc(100% - 48px)' }}>
                                                {detailedRecording[selectedEntryIndex].aiAnalysisRaw ? (
                                                    <div className="custom-scrollbar force-scrollbar" style={{ 
                                                        padding: '16px', 
                                                        height: 'calc(100% - 32px)',
                                                        background: '#ffffff'
                                                    }}>
                                                        <Tabs 
                                                            defaultActiveKey="analysis" 
                                                            type="card"
                                                            style={{ 
                                                                height: '100%',
                                                                display: 'flex',
                                                                flexDirection: 'column'
                                                            }}
                                                            className="analysis-tabs"
                                                            items={[
                                                                {
                                                                    key: 'analysis',
                                                                    label: (
                                                                        <span>
                                                                            <ExperimentOutlined style={{ marginRight: '4px' }} />
                                                                            Transition Analysis
                                                                        </span>
                                                                    ),
                                                                    children: (
                                                                        <Card 
                                                                            style={{ marginBottom: '16px' }}
                                                                            headStyle={{ backgroundColor: '#f9f0ff', borderBottom: '1px solid #d3adf7' }}
                                                                            bodyStyle={{ padding: '16px' }}
                                                                            bordered={false}
                                                                        >
                                                            <Space direction="vertical" style={{ width: '100%' }}>
                                                                <div>
                                                                    <Text strong>Transition Description:</Text>
                                                                    <div style={{ marginTop: '4px', padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
                                                                        <Text>{detailedRecording[selectedEntryIndex].aiAnalysisRaw.transitionDescription}</Text>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div>
                                                                    <Text strong>Technical Action:</Text>
                                                                    <div style={{ marginTop: '4px', padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
                                                                        <Text>{detailedRecording[selectedEntryIndex].aiAnalysisRaw.technicalActionDescription}</Text>
                                                                    </div>
                                                                </div>
                                                                
                                                                <Row gutter={16}>
                                                                    <Col span={12}>
                                                                        <Text strong>Element Target:</Text>
                                                                        <div style={{ marginTop: '4px', padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
                                                                            <Text>{detailedRecording[selectedEntryIndex].aiAnalysisRaw.actionTarget || 'None'}</Text>
                                                                        </div>
                                                                    </Col>
                                                                    <Col span={12}>
                                                                        <Text strong>Input Value:</Text>
                                                                        <div style={{ marginTop: '4px', padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
                                                                            <Text>{detailedRecording[selectedEntryIndex].aiAnalysisRaw.actionValue || 'None'}</Text>
                                                                        </div>
                                                                    </Col>
                                                                </Row>
                                                                
                                                                <Divider style={{ margin: '12px 0' }} />
                                                                
                                                                <div>
                                                                    <Text strong>State Information:</Text>
                                                                    <Row gutter={16} style={{ marginTop: '8px' }}>
                                                                        <Col span={12}>
                                                                            <Space>
                                                                                <Badge status="processing" />
                                                                                <Text>State Name:</Text>
                                                                            </Space>
                                                                            <div style={{ marginTop: '4px', padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
                                                                                <Text>{detailedRecording[selectedEntryIndex].aiAnalysisRaw.stateName || 'Unknown'}</Text>
                                                                            </div>
                                                                        </Col>
                                                                        <Col span={12}>
                                                                            <Space>
                                                                                <Badge status="processing" />
                                                                                <Text>Page Name:</Text>
                                                                            </Space>
                                                                            <div style={{ marginTop: '4px', padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
                                                                                <Text>{detailedRecording[selectedEntryIndex].aiAnalysisRaw.currentPageName || 'Unknown'}</Text>
                                                                            </div>
                                                                        </Col>
                                                                    </Row>
                                                                </div>
                                                                
                                                                <div>
                                                                    <Text strong>Transition Type:</Text>
                                                                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                                                        <Badge 
                                                                            status={detailedRecording[selectedEntryIndex].aiAnalysisRaw.isPageChanged ? "success" : "default"} 
                                                                            text={
                                                                                <Text 
                                                                                    style={{ 
                                                                                        color: detailedRecording[selectedEntryIndex].aiAnalysisRaw.isPageChanged ? '#52c41a' : 'rgba(0, 0, 0, 0.45)' 
                                                                                    }}
                                                                                >
                                                                                    Page Change
                                                                                </Text>
                                                                            } 
                                                                        />
                                                                        <Badge 
                                                                            status={detailedRecording[selectedEntryIndex].aiAnalysisRaw.isSamePageDifferentState ? "processing" : "default"} 
                                                                            text={
                                                                                <Text 
                                                                                    style={{ 
                                                                                        color: detailedRecording[selectedEntryIndex].aiAnalysisRaw.isSamePageDifferentState ? '#1890ff' : 'rgba(0, 0, 0, 0.45)' 
                                                                                    }}
                                                                                >
                                                                                    State Change
                                                                                </Text>
                                                                            } 
                                                                        />
                                                                        <Badge 
                                                                            status={detailedRecording[selectedEntryIndex].aiAnalysisRaw.hasTransition ? "warning" : "default"} 
                                                                            text={
                                                                                <Text 
                                                                                    style={{ 
                                                                                        color: detailedRecording[selectedEntryIndex].aiAnalysisRaw.hasTransition ? '#faad14' : 'rgba(0, 0, 0, 0.45)' 
                                                                                    }}
                                                                                >
                                                                                    Has Transition
                                                                                </Text>
                                                                            } 
                                                                        />
                                                                    </div>
                                                                </div>
                                                                
                                                                <Divider style={{ margin: '12px 0' }} />
                                                                
                                                                <div>
                                                                    <Text strong>User Activity:</Text>
                                                                    <div style={{ marginTop: '4px', padding: '12px', background: '#f9f0ff', borderRadius: '4px', border: '1px solid #d3adf7' }}>
                                                                        <Text>{detailedRecording[selectedEntryIndex].aiAnalysisRaw.inferredUserActivity || 'Unknown activity'}</Text>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div>
                                                                    <Text strong>Page Description:</Text>
                                                                    <div style={{ marginTop: '4px', padding: '12px', background: '#f9f0ff', borderRadius: '4px', border: '1px solid #d3adf7' }}>
                                                                        <Text>{detailedRecording[selectedEntryIndex].aiAnalysisRaw.currentPageDescription || 'No description available'}</Text>
                                                                    </div>
                                                                </div>
                                                            </Space>
                                                        </Card>
                                                                    )
                                                                },
                                                                {
                                                                    key: 'flow',
                                                                    label: (
                                                                        <span>
                                                                            <OrderedListOutlined style={{ marginRight: '4px' }} />
                                                                            Flow Steps
                                                                        </span>
                                                                    ),
                                                                    children: (
                                                                        <Card 
                                                                            style={{ 
                                                                                height: '100%',
                                                                                display: 'flex',
                                                                                flexDirection: 'column'
                                                                            }}
                                                                            headStyle={{ 
                                                                                backgroundColor: '#e6f7ff', 
                                                                                borderBottom: '1px solid #91d5ff',
                                                                                flex: '0 0 auto'
                                                                            }}
                                                                            bodyStyle={{ 
                                                                                padding: 0,
                                                                                flex: '1 1 auto',
                                                                                overflow: 'hidden'
                                                                            }}
                                                                            bordered={false}
                                                                            title={
                                                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                                    <OrderedListOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                                                                                    <span style={{ color: '#1890ff' }}>Complete User Flow</span>
                                                                                </div>
                                                                            }
                                                                        >
                                                                            <div style={{ height: '100%', overflow: 'hidden', width: '100%' }}>
                                                                                <div style={{ 
                                                                                        display: 'flex', 
                                                                                        justifyContent: 'flex-end', 
                                                                                        padding: '8px 16px',
                                                                                        borderBottom: '1px solid #f0f0f0'
                                                                                    }}>
                                                                                        <Switch 
                                                                                            checkedChildren="Group by Page" 
                                                                                            unCheckedChildren="Flat View" 
                                                                                            defaultChecked={true}
                                                                                            onChange={(checked) => {
                                                                                                // Store in state for the grouping option
                                                                                                setGroupByPage(checked);
                                                                                            }}
                                                                                            size="small"
                                                                                        />
                                                                                    </div>
                                                                                <Timeline 
                                                                                    mode="left" 
                                                                                    style={{ 
                                                                                        width: '100%', 
                                                                                        padding: '16px 0 100px 16px', 
                                                                                        height: 'calc(100% - 40px)', 
                                                                                        overflow: 'auto',
                                                                                        alignItems: 'flex-start'
                                                                                    }}
                                                                                    className="flow-steps-timeline"
                                                                                >
                                                                                    {detailedRecording.length > 1 && 
                                                                                        (() => {
                                                                                            // First prepare all timeline items without page grouping
                                                                                            const allTimelineItems = Array.from({ length: detailedRecording.length - 1 }, (_, i) => {
                                                                                                const toState = detailedRecording[i + 1];
                                                                                                
                                                                                                // Skip if condensed and we're not showing condensed states
                                                                                                if (!showCondensed && toState.isCondensed) {
                                                                                                    return null;
                                                                                                }
                                                                                                
                                                                                                // Skip if hiding non-transitions and this state doesn't have a significant transition
                                                                                                if (hideNonTransitions && toState.aiAnalysisRaw && !toState.aiAnalysisRaw.hasTransition) {
                                                                                                    return null;
                                                                                                }
                                                                                                
                                                                                                // Get transition info from the TO state's AI analysis
                                                                                                const hasAiAnalysis = !!toState.aiAnalysisRaw;
                                                                                                
                                                                                                // Get page name for grouping
                                                                                                const pageName = toState.aiAnalysisRaw?.currentPageName || 'Unknown Page';
                                                                                                
                                                                                                // Get action info
                                                                                                const actionType = toState.action?.action || 'State Change';
                                                                                                const elementTarget = toState.action?.element?.text || 
                                                                                                                    toState.action?.element?.resourceId || 
                                                                                                                    (toState.aiAnalysisRaw?.actionTarget || 'Unknown Element');
                                                                                                
                                                                                                // Transition description
                                                                                                let transitionDescription = toState.aiAnalysisRaw?.transitionDescription || 
                                                                                                                         `${actionType} on ${elementTarget}`;
                                                                                                
                                                                                                // Determine color based on transition type
                                                                                                let dotColor = '#1890ff'; // Default blue
                                                                                                if (hasAiAnalysis) {
                                                                                                    if (toState.aiAnalysisRaw.isPageChanged) dotColor = '#52c41a'; // Green for page changes
                                                                                                    else if (toState.aiAnalysisRaw.isSamePageDifferentState) dotColor = '#722ED1'; // Purple for state changes
                                                                                                    else if (toState.aiAnalysisRaw.hasTransition) dotColor = '#faad14'; // Orange for other transitions
                                                                                                }
                                                                                                
                                                                                                // Is this the current step?
                                                                                                const isCurrentStep = selectedEntryIndex === i + 1;
                                                                                                // Is this step currently being played back?
                                                                                                const isPlayingCurrent = isPlaying && selectedEntryIndex === i + 1;
                                                                                                
                                                                                                // Create and return an object with item details
                                                                                                const itemObject = {
                                                                                                    index: i,
                                                                                                    pageName,
                                                                                                    isPageChange: hasAiAnalysis && toState.aiAnalysisRaw.isPageChanged,
                                                                                                    dotColor,
                                                                                                    isCurrentStep,
                                                                                                    isPlayingCurrent,
                                                                                                    actionTime: toState.actionTime,
                                                                                                    transitionDescription
                                                                                                };
                                                                                                
                                                                                                // Add the timeline item component to the object
                                                                                                itemObject.timelineItem = (
                                                                                                    <Timeline.Item 
                                                                                                        key={`step-${i}`}
                                                                                                        color={dotColor}
                                                                                                        dot={<div style={{ 
                                                                                                            width: '16px', 
                                                                                                            height: '16px', 
                                                                                                            borderRadius: '50%', 
                                                                                                            background: dotColor,
                                                                                                            border: isCurrentStep ? '2px solid #fff' : 'none',
                                                                                                            boxShadow: isCurrentStep ? `0 0 0 2px ${dotColor}` : 'none'
                                                                                                        }} />}
                                                                                                        label={<div style={{ width: '80px', textAlign: 'left', whiteSpace: 'nowrap', paddingLeft: '2px' }}><Text type="secondary" style={{ fontSize: '12px' }}>{new Date(toState.actionTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text></div>}
                                                                                                        position="left"
                                                                                                    >
                                                                                                    <Card
                                                                                                        style={{ 
                                                                                                            marginBottom: '12px',
                                                                                                            borderColor: isCurrentStep ? '#adc6ff' : '#f0f0f0',
                                                                                                            backgroundColor: isCurrentStep ? '#f0f5ff' : '#fff',
                                                                                                            boxShadow: isCurrentStep ? '0 2px 8px rgba(24, 144, 255, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                                                                                                            transition: 'all 0.3s ease',
                                                                                                            width: '100%',
                                                                                                            maxWidth: '750px'
                                                                                                        }}
                                                                                                        hoverable
                                                                                                        size="small"
                                                                                                        onClick={() => setSelectedEntryIndex(i + 1)}
                                                                                                        title={
                                                                                                            <div style={{ 
                                                                                                                display: 'flex', 
                                                                                                                justifyContent: 'space-between', 
                                                                                                                alignItems: 'center'
                                                                                                            }}>
                                                                                                                <Text strong style={{ fontSize: '14px', color: dotColor }}>
                                                                                                                    {i+1}. {transitionDescription}
                                                                                                                </Text>
                                                                                                                
                                                                                                                <div>
                                                                                                                    {isPlayingCurrent && (
                                                                                                                        <Badge 
                                                                                                                            status="processing" 
                                                                                                                            text={<Text style={{ fontSize: '12px', color: '#1890ff' }}>Playing</Text>} 
                                                                                                                            style={{ marginRight: '8px' }}
                                                                                                                        />
                                                                                                                    )}
                                                                                                                    {toState.isCondensed && (
                                                                                                                        <Badge 
                                                                                                                            status="default" 
                                                                                                                            text={<Text style={{ fontSize: '12px', color: '#d9d9d9' }}>Condensed</Text>} 
                                                                                                                        />
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        }
                                                                                                    >
                                                                                                        <Collapse 
                                                                                                            ghost
                                                                                                            bordered={false}
                                                                                                            defaultActiveKey={[]}
                                                                                                            style={{ marginTop: '-12px', marginLeft: '-12px', marginRight: '-12px' }}
                                                                                                        >
                                                                                                            <Collapse.Panel 
                                                                                                                key="details" 
                                                                                                                header={
                                                                                                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                                                                                                        Show details
                                                                                                                    </Text>
                                                                                                                }
                                                                                                                style={{ borderBottom: 'none' }}
                                                                                                            >
                                                                                                                <div style={{ padding: '8px 0' }}>
                                                                                                                    {/* Technical description */}
                                                                                                                    {hasAiAnalysis && toState.aiAnalysisRaw.technicalActionDescription && (
                                                                                                                        <div style={{ 
                                                                                                                            padding: '8px', 
                                                                                                                            backgroundColor: '#f9f9f9', 
                                                                                                                            borderRadius: '4px',
                                                                                                                            marginBottom: '12px',
                                                                                                                            fontSize: '13px'
                                                                                                                        }}>
                                                                                                                            <Text type="secondary" strong style={{ display: 'block', marginBottom: '4px' }}>
                                                                                                                                Technical Action:
                                                                                                                            </Text>
                                                                                                                            <Text type="secondary">{toState.aiAnalysisRaw.technicalActionDescription}</Text>
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                    
                                                                                                                    {/* Element Information */}
                                                                                                                    {hasAiAnalysis && toState.aiAnalysisRaw.actionTarget && (
                                                                                                                        <div style={{ marginBottom: '12px' }}>
                                                                                                                            <Text type="secondary" strong style={{ display: 'block', marginBottom: '4px' }}>
                                                                                                                                Element Target:
                                                                                                                            </Text>
                                                                                                                            <div style={{ 
                                                                                                                                padding: '6px 8px', 
                                                                                                                                backgroundColor: '#f9f9f9', 
                                                                                                                                borderRadius: '4px',
                                                                                                                                fontSize: '13px'
                                                                                                                            }}>
                                                                                                                                <Text code>{toState.aiAnalysisRaw.actionTarget}</Text>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                    
                                                                                                                    {/* Input Value */}
                                                                                                                    {hasAiAnalysis && toState.aiAnalysisRaw.actionValue && (
                                                                                                                        <div style={{ marginBottom: '12px' }}>
                                                                                                                            <Text type="secondary" strong style={{ display: 'block', marginBottom: '4px' }}>
                                                                                                                                Input Value:
                                                                                                                            </Text>
                                                                                                                            <div style={{ 
                                                                                                                                padding: '6px 8px', 
                                                                                                                                backgroundColor: '#f9f9f9', 
                                                                                                                                borderRadius: '4px',
                                                                                                                                fontSize: '13px'
                                                                                                                            }}>
                                                                                                                                <Text code>{toState.aiAnalysisRaw.actionValue}</Text>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                    
                                                                                                                    {/* XPath information if available */}
                                                                                                                    {toState.action?.element?.xpath && (
                                                                                                                        <div style={{ marginBottom: '12px' }}>
                                                                                                                            <Text type="secondary" strong style={{ display: 'block', marginBottom: '4px' }}>
                                                                                                                                Element XPath:
                                                                                                                            </Text>
                                                                                                                            <div style={{ 
                                                                                                                                padding: '6px 8px', 
                                                                                                                                backgroundColor: '#f9f9f9', 
                                                                                                                                borderRadius: '4px',
                                                                                                                                fontSize: '13px',
                                                                                                                                maxWidth: '100%',
                                                                                                                                overflow: 'auto'
                                                                                                                            }}>
                                                                                                                                <Text code copyable ellipsis>{toState.action.element.xpath}</Text>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                    
                                                                                                                    {/* State and Page information */}
                                                                                                                    <Row gutter={16}>
                                                                                                                        {hasAiAnalysis && toState.aiAnalysisRaw.stateName && (
                                                                                                                            <Col span={12}>
                                                                                                                                <div style={{ marginBottom: '12px' }}>
                                                                                                                                    <Text type="secondary" strong style={{ display: 'block', marginBottom: '4px' }}>
                                                                                                                                        State:
                                                                                                                                    </Text>
                                                                                                                                    <div style={{ 
                                                                                                                                        padding: '6px 8px', 
                                                                                                                                        backgroundColor: '#f0f5ff', 
                                                                                                                                        borderRadius: '4px',
                                                                                                                                        borderLeft: '3px solid #1890ff',
                                                                                                                                        fontSize: '13px'
                                                                                                                                    }}>
                                                                                                                                        <Text>{toState.aiAnalysisRaw.stateName}</Text>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </Col>
                                                                                                                        )}
                                                                                                                        
                                                                                                                        {hasAiAnalysis && toState.aiAnalysisRaw.currentPageName && (
                                                                                                                            <Col span={12}>
                                                                                                                                <div style={{ marginBottom: '12px' }}>
                                                                                                                                    <Text type="secondary" strong style={{ display: 'block', marginBottom: '4px' }}>
                                                                                                                                        Page:
                                                                                                                                    </Text>
                                                                                                                                    <div style={{ 
                                                                                                                                        padding: '6px 8px', 
                                                                                                                                        backgroundColor: '#f6ffed', 
                                                                                                                                        borderRadius: '4px',
                                                                                                                                        borderLeft: '3px solid #52c41a',
                                                                                                                                        fontSize: '13px'
                                                                                                                                    }}>
                                                                                                                                        <Text>{toState.aiAnalysisRaw.currentPageName}</Text>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </Col>
                                                                                                                        )}
                                                                                                                    </Row>
                                                                                                                    
                                                                                                                    {/* Transition type indicators */}
                                                                                                                    <div style={{ marginBottom: '12px' }}>
                                                                                                                        <Text type="secondary" strong style={{ display: 'block', marginBottom: '4px' }}>
                                                                                                                            Transition Type:
                                                                                                                        </Text>
                                                                                                                        <Space>
                                                                                                                            <Badge 
                                                                                                                                status={toState.aiAnalysisRaw?.isPageChanged ? "success" : "default"} 
                                                                                                                                text={<Text style={{ fontSize: '12px', color: toState.aiAnalysisRaw?.isPageChanged ? '#52c41a' : '#00000073' }}>Page Change</Text>} 
                                                                                                                            />
                                                                                                                            <Badge 
                                                                                                                                status={toState.aiAnalysisRaw?.isSamePageDifferentState ? "processing" : "default"} 
                                                                                                                                text={<Text style={{ fontSize: '12px', color: toState.aiAnalysisRaw?.isSamePageDifferentState ? '#1890ff' : '#00000073' }}>State Change</Text>} 
                                                                                                                            />
                                                                                                                            <Badge 
                                                                                                                                status={toState.aiAnalysisRaw?.hasTransition && !toState.aiAnalysisRaw?.isPageChanged && !toState.aiAnalysisRaw?.isSamePageDifferentState ? "warning" : "default"} 
                                                                                                                                text={<Text style={{ fontSize: '12px', color: toState.aiAnalysisRaw?.hasTransition && !toState.aiAnalysisRaw?.isPageChanged && !toState.aiAnalysisRaw?.isSamePageDifferentState ? '#faad14' : '#00000073' }}>UI Change</Text>} 
                                                                                                                            />
                                                                                                                        </Space>
                                                                                                                    </div>
                                                                                                                    
                                                                                                                    {/* Timestamp */}
                                                                                                                    <div>
                                                                                                                        <Text type="secondary" strong style={{ display: 'block', marginBottom: '4px' }}>
                                                                                                                            Timestamp:
                                                                                                                        </Text>
                                                                                                                        <Text type="secondary">{new Date(toState.actionTime).toLocaleString()}</Text>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            </Collapse.Panel>
                                                                                                        </Collapse>
                                                                                                    </Card>
                                                                                                </Timeline.Item>
                                                                                            );
                                                                                            
                                                                                            return itemObject;
                                                                                        }).filter(Boolean);
                                                                                            
                                                                                            // Filter out null items
                                                                                            const validTimelineItems = allTimelineItems.filter(item => item !== null);
                                                                                            
                                                                                            // If grouping is disabled, return the flat list of timeline items
                                                                                            if (!groupByPage) {
                                                                                                return validTimelineItems.map(item => item.timelineItem);
                                                                                            }
                                                                                            
                                                                                            // Otherwise, group items by page
                                                                                            const pages = {};
                                                                                            
                                                                                            // Group items by page name
                                                                                            validTimelineItems.forEach(item => {
                                                                                                if (!pages[item.pageName]) {
                                                                                                    pages[item.pageName] = [];
                                                                                                }
                                                                                                pages[item.pageName].push(item);
                                                                                            });
                                                                                            
                                                                                            // Create an array of components from the grouped data
                                                                                            const groupedItems = [];
                                                                                            
                                                                                            // Process each page group
                                                                                            Object.entries(pages).forEach(([pageName, items], pageIndex) => {
                                                                                                // Add page header if there are multiple items on this page
                                                                                                if (items.length > 1) {
                                                                                                    // Find the first item where this page appears (usually a page change)
                                                                                                    const firstItemWithPage = items[0];
                                                                                                    
                                                                                                    // Add the page header with appropriate styling
                                                                                                    groupedItems.push(
                                                                                                        <Timeline.Item 
                                                                                                            key={`page-${pageIndex}`}
                                                                                                            color="#52c41a"
                                                                                                            dot={<div style={{ 
                                                                                                                width: '24px', 
                                                                                                                height: '24px', 
                                                                                                                display: 'flex',
                                                                                                                alignItems: 'center',
                                                                                                                justifyContent: 'center',
                                                                                                                background: '#f6ffed', 
                                                                                                                border: '2px solid #52c41a',
                                                                                                                borderRadius: '50%'
                                                                                                            }}>
                                                                                                                <FileImageOutlined style={{ fontSize: '14px', color: '#52c41a' }} />
                                                                                                            </div>}
                                                                                                            label={<div style={{ width: '80px', textAlign: 'left', whiteSpace: 'nowrap', paddingLeft: '2px' }}></div>}
                                                                                                        >
                                                                                                            <Card
                                                                                                                style={{ 
                                                                                                                    marginBottom: '12px',
                                                                                                                    backgroundColor: '#f6ffed',
                                                                                                                    borderColor: '#b7eb8f',
                                                                                                                    maxWidth: '750px'
                                                                                                                }}
                                                                                                                bodyStyle={{ padding: '12px 16px' }}
                                                                                                            >
                                                                                                                <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                                                                                                                    {pageName}
                                                                                                                </Text>
                                                                                                                <div style={{ fontSize: '13px', color: '#666' }}>
                                                                                                                    {items.length} actions on this page
                                                                                                                </div>
                                                                                                            </Card>
                                                                                                        </Timeline.Item>
                                                                                                    );
                                                                                                }
                                                                                                
                                                                                                // Add all items for this page
                                                                                                items.forEach(item => {
                                                                                                    groupedItems.push(item.timelineItem);
                                                                                                });
                                                                                            });
                                                                                            
                                                                                            return groupedItems;
                                                                                        })()}
                                                                                </Timeline>
                                                                            </div>
                                                                        </Card>
                                                                    )
                                                                }
                                                            ]}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div style={{ 
                                                        display: 'flex', 
                                                        flexDirection: 'column', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        height: '100%',
                                                        color: '#722ED1',
                                                        padding: '30px'
                                                    }}>
                                                        <div style={{
                                                            backgroundColor: '#f9f0ff',
                                                            borderRadius: '8px',
                                                            padding: '30px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            maxWidth: '500px',
                                                            border: '1px dashed #d3adf7'
                                                        }}>
                                                            <ExperimentOutlined style={{ fontSize: '64px', marginBottom: '16px', color: '#722ED1' }} />
                                                            <Text strong style={{ fontSize: '18px', color: '#722ED1', marginBottom: '10px' }}>
                                                                No Transition Analysis Available
                                                            </Text>
                                                            <Text style={{ fontSize: '14px', textAlign: 'center', marginBottom: '20px', color: '#333' }}>
                                                                This state hasn't been processed with AI yet.
                                                            </Text>
                                                            <Button
                                                                type="primary"
                                                                icon={<ThunderboltOutlined />}
                                                                onClick={handleProcessWithAI}
                                                                loading={processingAI}
                                                                style={{ background: '#722ED1', borderColor: '#722ED1' }}
                                                            >
                                                                Process with AI Now
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <div style={{ 
                                            padding: '40px 20px', 
                                            textAlign: 'center', 
                                            background: '#f9f9f9', 
                                            border: '1px dashed #1890ff', 
                                            borderRadius: '4px',
                                            maxWidth: '400px',
                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                                        }}>
                                            <InfoCircleOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                                            <div style={{ marginBottom: '8px' }}>
                                                <Text strong style={{ fontSize: '16px' }}>No Entry Selected</Text>
                                            </div>
                                            <Text type="secondary">Select an entry from the list on the left to view transitions</Text>
                                            <div style={{ marginTop: '16px' }}>
                                                <Button 
                                                    type="primary" 
                                                    size="small"
                                                    onClick={() => detailedRecording.length > 0 && setSelectedEntryIndex(0)}
                                                    disabled={detailedRecording.length === 0}
                                                >
                                                    Select First Entry
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '60px 40px', 
                                background: '#f9f9f9', 
                                border: '1px dashed #1890ff', 
                                borderRadius: '8px',
                                margin: '40px auto',
                                maxWidth: '500px'
                            }}>
                                <VideoCameraOutlined style={{ fontSize: '64px', color: '#1890ff', marginBottom: '24px' }} />
                                <div style={{ marginBottom: '16px' }}>
                                    <Title level={4}>No Transitions Recorded</Title>
                                    <Text type="secondary">Start recording to capture actions and transitions</Text>
                                </div>
                                <Button
                                    type="primary"
                                    icon={<VideoCameraOutlined />}
                                    onClick={handleStartRecording}
                                    size="large"
                                    disabled={!inspectorState?.driver || standardIsRecording}
                                >
                                    Start Recording
                                </Button>
                            </div>
                        )
                    },
                    {
                        key: 'detailed',
                        label: 'Detailed Recording',
                        children: loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <Spin />
                                <div style={{ marginTop: '16px' }}>
                                    <Text type="secondary">Processing recording actions...</Text>
                                </div>
                            </div>
                        ) : detailedRecording.length > 0 ? (
                            <div className="recording-view-detailed-container" style={{ 
                                display: 'flex', 
                                height: 'calc(100% - 8px)', 
                                overflow: 'hidden',
                                minHeight: '500px',
                                flex: 1,
                                margin: 0,
                                position: 'relative'
                            }}>
                                {/* Column 1 - Entries list */}
                                <div style={{ 
                                    width: columnWidths.list, 
                                    borderRight: '1px solid #f0f0f0', 
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ 
                                        padding: '12px 16px',
                                        borderBottom: '1px solid #f0f0f0',
                                        backgroundColor: '#fafafa',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        height: '48px'
                                    }}>
                                        <Space>
                                            <Badge 
                                                count={detailedRecording.length} 
                                                style={{ backgroundColor: '#1890ff' }}
                                            />
                                            <Text strong>Recorded States</Text>
                                        </Space>
                                        <Space>
                                            <Tooltip title={showCondensed ? "Hide condensed states" : "Show condensed states"}>
                                                <Switch 
                                                    checked={showCondensed}
                                                    onChange={setShowCondensed}
                                                    checkedChildren={<EyeOutlined />}
                                                    unCheckedChildren={<EyeInvisibleOutlined />}
                                                    size="small"
                                                />
                                            </Tooltip>
                                        </Space>
                                    </div>
                                    <div 
                                        className="custom-scrollbar force-scrollbar"
                                        style={{ 
                                            height: 'calc(100% - 95px)', // Subtract header height including playback controls
                                            padding: '0 2px',
                                            background: '#fafafa'
                                        }}
                                    >
                                        {detailedRecording
                                            .filter(entry => showCondensed || !entry.isCondensed)
                                            .map((entry, index) => {
                                                const isSelected = selectedEntryIndex === detailedRecording.indexOf(entry);
                                                const hasScreenshot = !!entry.deviceArtifacts?.screenshotBase64;
                                                const realIndex = detailedRecording.indexOf(entry);
                                                const hasAction = !!entry.action;
                                                
                                                return (
                                                    <div 
                                                        key={realIndex}
                                                        onClick={() => setSelectedEntryIndex(realIndex)}
                                                        style={{
                                                            padding: '8px 12px',
                                                            borderLeft: isSelected ? '3px solid #1890ff' : '3px solid transparent',
                                                            borderBottom: '1px solid #f0f0f0',
                                                            backgroundColor: isSelected ? '#e6f7ff' : (entry.isCondensed ? '#f9f9f9' : 'transparent'),
                                                            cursor: 'pointer',
                                                            opacity: entry.isCondensed ? 0.8 : 1,
                                                            transition: 'all 0.2s ease',
                                                            height: '40px',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        <div style={{ 
                                                            width: '24px', 
                                                            height: '24px', 
                                                            borderRadius: '50%', 
                                                            backgroundColor: isSelected ? '#1890ff' : '#f0f0f0',
                                                            color: isSelected ? '#fff' : '#595959',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '12px',
                                                            fontWeight: 'bold',
                                                            marginRight: '8px'
                                                        }}>
                                                            {realIndex + 1}
                                                        </div>
                                                        
                                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                                            <div style={{ 
                                                                display: 'flex', 
                                                                justifyContent: 'space-between',
                                                                fontSize: '11px',
                                                                lineHeight: '1.2'
                                                            }}>
                                                                <div style={{ 
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    fontWeight: 500,
                                                                    color: hasAction ? '#1890ff' : '#595959',
                                                                    maxWidth: 'calc(100% - 50px)'
                                                                }}>
                                                                    {entry.aiAnalysisRaw 
                                                                        ? `${entry.aiAnalysisRaw.currentPageName} - ${entry.aiAnalysisRaw.transitionDescription}`
                                                                        : hasAction 
                                                                            ? entry.action.action || 'Unknown' 
                                                                            : 'State change'
                                                                    }
                                                                </div>
                                                                <div style={{ color: '#8c8c8c', fontSize: '10px' }}>
                                                                    {new Date(entry.actionTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div style={{ display: 'flex', marginLeft: '4px' }}>
                                                            {entry.isCondensed && 
                                                                <Badge status="warning" style={{ marginRight: '6px' }} />
                                                            }
                                                            {hasScreenshot && 
                                                                <FileImageOutlined style={{ color: '#1890ff', fontSize: '12px' }}/>
                                                            }
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                                
                                {/* Resizable divider between list and screenshot */}
                                <div 
                                    className="resize-handle resize-handle-list"
                                    style={{
                                        width: '5px',
                                        cursor: 'col-resize',
                                        background: '#f0f0f0',
                                        position: 'relative',
                                        zIndex: 1,
                                        transition: 'background-color 0.2s',
                                        boxShadow: isResizing === 'list-screenshot' ? '0 0 5px rgba(24, 144, 255, 0.5)' : 'none'
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setIsResizing('list-screenshot');
                                    }}
                                >
                                    <div 
                                        style={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            width: '1px',
                                            height: '20px',
                                            background: '#d9d9d9'
                                        }}
                                    />
                                </div>
                                
                                {selectedEntryIndex !== null && detailedRecording[selectedEntryIndex] ? (
                                    <>
                                        {/* Column 2 - Screenshot */}
                                        <div style={{ 
                                            width: columnWidths.screenshot,
                                            borderRight: '1px solid #f0f0f0',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{ 
                                                padding: '12px 16px',
                                                borderBottom: '1px solid #f0f0f0',
                                                backgroundColor: '#fafafa',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                height: '48px'
                                            }}>
                                                <Space>
                                                    <Badge 
                                                        count={selectedEntryIndex + 1} 
                                                        style={{ backgroundColor: '#1890ff' }}
                                                    />
                                                    <Text strong>Screenshot</Text>
                                                    {detailedRecording[selectedEntryIndex].isCondensed && (
                                                        <Badge 
                                                            count="CONDENSED" 
                                                            style={{ backgroundColor: '#faad14', fontSize: '12px' }}
                                                        />
                                                    )}
                                                </Space>
                                                
                                                <Space>
                                                    <Tooltip title="Previous entry">
                                                        <Button 
                                                            type="text" 
                                                            icon={<ArrowLeftOutlined />}
                                                            disabled={selectedEntryIndex === 0}
                                                            onClick={() => setSelectedEntryIndex(selectedEntryIndex - 1)}
                                                            size="small"
                                                        />
                                                    </Tooltip>
                                                    <Tooltip title="Next entry">
                                                        <Button 
                                                            type="text" 
                                                            icon={<ArrowLeftOutlined style={{ transform: 'rotate(180deg)' }} />}
                                                            disabled={selectedEntryIndex === detailedRecording.length - 1}
                                                            onClick={() => setSelectedEntryIndex(selectedEntryIndex + 1)}
                                                            size="small"
                                                        />
                                                    </Tooltip>
                                                    
                                                    {detailedRecording[selectedEntryIndex].deviceArtifacts?.screenshotBase64 && (
                                                        <Tooltip title="Download screenshot">
                                                            <Button 
                                                                type="text" 
                                                                icon={<DownloadOutlined />}
                                                                size="small"
                                                                onClick={() => {
                                                                    const entry = detailedRecording[selectedEntryIndex];
                                                                    const screenshot = entry.deviceArtifacts?.screenshotBase64;
                                                                    const link = document.createElement('a');
                                                                    link.href = `data:image/png;base64,${screenshot}`;
                                                                    link.download = `screenshot-${selectedEntryIndex + 1}-${new Date(entry.actionTime).getTime()}.png`;
                                                                    link.click();
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    )}
                                                </Space>
                                            </div>
                                            
                                            <div style={{ 
                                                padding: '0', 
                                                height: 'calc(100% - 48px)', // Subtract header height
                                                minHeight: '300px', // Ensure minimum height for container
                                                textAlign: 'center',
                                                background: '#ffffff',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                overflow: 'hidden'
                                            }}>
                                                {detailedRecording[selectedEntryIndex].deviceArtifacts?.screenshotBase64 ? (
                                                    <img 
                                                        src={`data:image/png;base64,${detailedRecording[selectedEntryIndex].deviceArtifacts.screenshotBase64}`} 
                                                        alt={`Screenshot at ${new Date(detailedRecording[selectedEntryIndex].actionTime).toLocaleString()}`}
                                                        onLoad={(e) => {
                                                            // Get the container height
                                                            const containerHeight = e.target.parentElement.clientHeight;
                                                            
                                                            // Calculate the width based on aspect ratio
                                                            const aspectRatio = e.target.naturalWidth / e.target.naturalHeight;
                                                            const scaledWidth = containerHeight * aspectRatio;
                                                            
                                                            // Update the dimensions (but don't change column widths)
                                                            setScreenshotDimensions({
                                                                width: 'auto',
                                                                height: `${containerHeight}px`
                                                            });
                                                        }}
                                                        style={{ 
                                                            maxWidth: '100%',
                                                            height: '100%', 
                                                            objectFit: 'contain',
                                                            border: '1px solid #d9d9d9',
                                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                                                        }}
                                                    />
                                                ) : (
                                                    <div style={{ 
                                                        display: 'flex', 
                                                        flexDirection: 'column', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        height: '100%',
                                                        color: '#bfbfbf'
                                                    }}>
                                                        <FileImageOutlined style={{ fontSize: '64px', marginBottom: '16px' }} />
                                                        <Text type="secondary">No screenshot available</Text>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Resizable divider between screenshot and details */}
                                        <div 
                                            className="resize-handle resize-handle-details"
                                            style={{
                                                width: '5px',
                                                cursor: 'col-resize',
                                                background: '#f0f0f0',
                                                position: 'relative',
                                                zIndex: 1,
                                                transition: 'background-color 0.2s',
                                                boxShadow: isResizing === 'screenshot-details' ? '0 0 5px rgba(24, 144, 255, 0.5)' : 'none'
                                            }}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setIsResizing('screenshot-details');
                                            }}
                                        >
                                            <div 
                                                style={{
                                                    position: 'absolute',
                                                    top: '50%',
                                                    left: '50%',
                                                    transform: 'translate(-50%, -50%)',
                                                    width: '1px',
                                                    height: '20px',
                                                    background: '#d9d9d9'
                                                }}
                                            />
                                        </div>
                                        
                                        {/* Column 3 - Details with tabs */}
                                        <div style={{ 
                                            width: columnWidths.details,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{ 
                                                padding: '12px 16px',
                                                borderBottom: '1px solid #f0f0f0',
                                                backgroundColor: '#fafafa',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                height: '48px',
                                                flexShrink: 0
                                            }}>
                                                <Text strong>{new Date(detailedRecording[selectedEntryIndex].actionTime).toLocaleString()}</Text>
                                                {detailedRecording[selectedEntryIndex].action && (
                                                    <Text type="secondary">
                                                        {detailedRecording[selectedEntryIndex].action.action || 'Action Data'}
                                                    </Text>
                                                )}
                                            </div>
                                            
                                            <div style={{ flex: 1, overflow: 'hidden', maxHeight: 'calc(100% - 48px)' }}>
                                                <Tabs 
                                                    defaultActiveKey="action"
                                                    style={{ 
                                                        height: '100%',
                                                        display: 'flex',
                                                        flexDirection: 'column'
                                                    }}
                                                    tabPosition="top"
                                                    type="card"
                                                    size="middle"
                                                    tabBarStyle={{ 
                                                        margin: '0 12px',
                                                        marginTop: '12px',
                                                        background: '#f9f9f9',
                                                        borderRadius: '4px 4px 0 0',
                                                        flexShrink: 0
                                                    }}
                                                    items={[
                                                        {
                                                            key: 'action',
                                                            label: (
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <Badge status={detailedRecording[selectedEntryIndex].action ? "processing" : "default"} />
                                                                    <span style={{ fontWeight: 500 }}>Action Data</span>
                                                                </span>
                                                            ),
                                                            children: (
                                                                <div className="custom-scrollbar force-scrollbar" style={{ 
                                                                    padding: '16px', 
                                                                    height: 'calc(100% - 32px)',
                                                                    background: '#ffffff'
                                                                }}>
                                                                    <pre style={{ 
                                                                        backgroundColor: '#f5f5f5', 
                                                                        padding: '16px', 
                                                                        borderRadius: '4px', 
                                                                        overflow: 'auto',
                                                                        height: '100%',
                                                                        margin: 0,
                                                                        whiteSpace: 'pre-wrap',
                                                                        wordWrap: 'break-word'
                                                                    }}>
                                                                        {JSON.stringify(detailedRecording[selectedEntryIndex].action, null, 2) || "No action data"}
                                                                    </pre>
                                                                </div>
                                                            )
                                                        },
                                                        {
                                                            key: 'source',
                                                            label: (
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <FileImageOutlined />
                                                                    <span style={{ fontWeight: 500 }}>Page Source</span>
                                                                </span>
                                                            ),
                                                            children: (
                                                                <div className="custom-scrollbar force-scrollbar" style={{ 
                                                                    padding: '16px', 
                                                                    height: 'calc(100% - 32px)',
                                                                    background: '#ffffff'
                                                                }}>
                                                                    <pre style={{ 
                                                                        backgroundColor: '#f5f5f5', 
                                                                        padding: '16px', 
                                                                        borderRadius: '4px', 
                                                                        overflow: 'auto',
                                                                        height: '100%',
                                                                        margin: 0,
                                                                        fontSize: '12px',
                                                                        whiteSpace: 'pre-wrap',
                                                                        wordWrap: 'break-word'
                                                                    }}>
                                                                        {detailedRecording[selectedEntryIndex].deviceArtifacts?.pageSource || "No page source available"}
                                                                    </pre>
                                                                </div>
                                                            )
                                                        },
                                                        {
                                                            key: 'session',
                                                            label: (
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <InfoCircleOutlined />
                                                                    <span style={{ fontWeight: 500 }}>Session Details</span>
                                                                </span>
                                                            ),
                                                            children: (
                                                                <div className="custom-scrollbar force-scrollbar" style={{ 
                                                                    padding: '16px', 
                                                                    height: 'calc(100% - 32px)',
                                                                    background: '#ffffff'
                                                                }}>
                                                                    <pre style={{ 
                                                                        backgroundColor: '#f5f5f5', 
                                                                        padding: '16px', 
                                                                        borderRadius: '4px', 
                                                                        overflow: 'auto',
                                                                        height: '100%',
                                                                        margin: 0,
                                                                        whiteSpace: 'pre-wrap',
                                                                        wordWrap: 'break-word'
                                                                    }}>
                                                                        {JSON.stringify(detailedRecording[selectedEntryIndex].deviceArtifacts?.sessionDetails, null, 2) || "No session details available"}
                                                                    </pre>
                                                                </div>
                                                            )
                                                        },
                                                        {
                                                            key: 'aiAnalysis',
                                                            disabled: !detailedRecording[selectedEntryIndex].aiAnalysis,
                                                            label: (
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <ExperimentOutlined style={{ color: detailedRecording[selectedEntryIndex].aiAnalysis ? '#722ED1' : '#bfbfbf' }} />
                                                                    <span style={{ 
                                                                        fontWeight: 500,
                                                                        color: detailedRecording[selectedEntryIndex].aiAnalysis ? '#722ED1' : '#bfbfbf'
                                                                    }}>
                                                                        AI Analysis
                                                                    </span>
                                                                    {!detailedRecording[selectedEntryIndex].aiAnalysis && (
                                                                        <Badge 
                                                                            count="Not Available" 
                                                                            style={{ 
                                                                                backgroundColor: '#f0f0f0',
                                                                                color: '#bfbfbf',
                                                                                fontSize: '10px',
                                                                                fontWeight: 'normal',
                                                                                textTransform: 'uppercase'
                                                                            }} 
                                                                        />
                                                                    )}
                                                                </span>
                                                            ),
                                                            children: detailedRecording[selectedEntryIndex].aiAnalysis ? (
                                                                <div className="custom-scrollbar force-scrollbar" style={{ 
                                                                    padding: '16px', 
                                                                    height: 'calc(100% - 32px)',
                                                                    background: '#ffffff'
                                                                }}>
                                                                    {/* AI analysis view with mode toggle */}
                                                                    <>
                                                                        {/* Toggle button header */}
                                                                        <div style={{
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            alignItems: 'center',
                                                                            marginBottom: '12px',
                                                                            backgroundColor: '#f9f0ff', 
                                                                            padding: '8px 12px',
                                                                            borderRadius: '4px',
                                                                            border: '1px solid #d3adf7'
                                                                        }}>
                                                                            <div style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center'
                                                                            }}>
                                                                                <ExperimentOutlined style={{ fontSize: '18px', color: '#722ED1', marginRight: '8px' }} />
                                                                                <Text strong style={{ color: '#722ED1' }}>AI-Generated Analysis</Text>
                                                                            </div>
                                                                            
                                                                            <Space>
                                                                                <Text type="secondary" style={{ marginRight: '8px', fontSize: '13px' }}>View mode:</Text>
                                                                                <Radio.Group 
                                                                                    value={aiViewMode} 
                                                                                    onChange={(e) => setAiViewMode(e.target.value)}
                                                                                    size="small"
                                                                                    buttonStyle="solid"
                                                                                >
                                                                                    <Radio.Button value="formatted">
                                                                                        <CodeOutlined style={{ marginRight: '4px' }} />
                                                                                        Formatted
                                                                                    </Radio.Button>
                                                                                    <Radio.Button value="raw">
                                                                                        <span style={{ marginRight: '4px', fontFamily: 'monospace' }}>{"{}"}</span>
                                                                                        Raw JSON
                                                                                    </Radio.Button>
                                                                                </Radio.Group>
                                                                            </Space>
                                                                        </div>
                                                                        
                                                                        {/* Content based on view mode */}
                                                                        {aiViewMode === 'formatted' ? (
                                                                                    // Formatted view
                                                                                    <div style={{
                                                                                        backgroundColor: '#f9f0ff', 
                                                                                        padding: '20px', 
                                                                                        borderRadius: '6px', 
                                                                                        overflow: 'auto',
                                                                                        height: 'calc(100% - 50px)',
                                                                                        border: '1px solid #d3adf7',
                                                                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                                                                                    }}>
                                                                                        <div
                                                                                            style={{ 
                                                                                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                                                                fontSize: '14px',
                                                                                                lineHeight: '1.6',
                                                                                                whiteSpace: 'pre-wrap'
                                                                                            }}
                                                                                            dangerouslySetInnerHTML={{
                                                                                                __html: detailedRecording[selectedEntryIndex].aiAnalysis
                                                                                                    // Convert markdown headings to styled HTML
                                                                                                    .replace(/## (.*)/g, '<h2 style="color: #722ED1; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #d3adf7; padding-bottom: 8px;">$1</h2>')
                                                                                                    .replace(/### (.*)/g, '<h3 style="color: #722ED1; margin-top: 16px; margin-bottom: 8px;">$1</h3>')
                                                                                                    // Make code blocks look nicer
                                                                                                    .replace(/```java([\s\S]*?)```/g, '<div style="background-color: #f0f0f0; padding: 12px; border-radius: 4px; margin: 12px 0; border-left: 4px solid #722ED1;"><pre style="margin: 0; overflow-x: auto;">$1</pre></div>')
                                                                                                    // Style list items with purple bullets
                                                                                                    .replace(/- (.*)/g, '<div style="margin: 4px 0; padding-left: 8px; display: flex; align-items: flex-start;"><span style="color: #722ED1; margin-right: 8px;">•</span><span>$1</span></div>')
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                ) : (
                                                                                    // Raw JSON view
                                                                                    <div style={{
                                                                                        backgroundColor: '#1e1e1e', 
                                                                                        padding: '16px', 
                                                                                        borderRadius: '6px', 
                                                                                        overflow: 'auto',
                                                                                        height: 'calc(100% - 50px)',
                                                                                        border: '1px solid #444',
                                                                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                                                                                        color: '#d4d4d4'
                                                                                    }}>
                                                                                        <div style={{
                                                                                            display: 'flex',
                                                                                            justifyContent: 'space-between',
                                                                                            marginBottom: '12px',
                                                                                            borderBottom: '1px solid #444',
                                                                                            paddingBottom: '8px'
                                                                                        }}>
                                                                                            <Text strong style={{ color: '#c586c0' }}>
                                                                                                AI Analysis Raw Response
                                                                                            </Text>
                                                                                            <Button 
                                                                                                size="small" 
                                                                                                type="text"
                                                                                                icon={<CopyOutlined />}
                                                                                                onClick={() => {
                                                                                                    navigator.clipboard.writeText(
                                                                                                        JSON.stringify(detailedRecording[selectedEntryIndex].aiAnalysisRaw, null, 2)
                                                                                                    );
                                                                                                    message.success('JSON copied to clipboard!');
                                                                                                }}
                                                                                                style={{ color: '#d4d4d4' }}
                                                                                            >
                                                                                                Copy JSON
                                                                                            </Button>
                                                                                        </div>
                                                                                        
                                                                                        <pre style={{
                                                                                            margin: 0,
                                                                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                                                                            fontSize: '13px',
                                                                                            lineHeight: '1.5',
                                                                                            color: '#d4d4d4',
                                                                                            whiteSpace: 'pre-wrap',
                                                                                            wordWrap: 'break-word'
                                                                                        }}>
                                                                                            {detailedRecording[selectedEntryIndex].aiAnalysisRaw ? (
                                                                                                <div dangerouslySetInnerHTML={{
                                                                                                    __html: syntaxHighlightJson(JSON.stringify(detailedRecording[selectedEntryIndex].aiAnalysisRaw, null, 2))
                                                                                                }}/>
                                                                                            ) : (
                                                                                                "Raw JSON data not available"
                                                                                            )}
                                                                                        </pre>
                                                                                    </div>
                                                                                )}
                                                                    </>
                                                                </div>
                                                            ) : (
                                                                <div style={{ 
                                                                    display: 'flex', 
                                                                    flexDirection: 'column', 
                                                                    alignItems: 'center', 
                                                                    justifyContent: 'center',
                                                                    height: '100%',
                                                                    color: '#722ED1',
                                                                    padding: '30px',
                                                                }}>
                                                                    <div style={{
                                                                        backgroundColor: '#f9f0ff',
                                                                        borderRadius: '8px',
                                                                        padding: '30px',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        alignItems: 'center',
                                                                        maxWidth: '500px',
                                                                        border: '1px dashed #d3adf7'
                                                                    }}>
                                                                        <ExperimentOutlined style={{ fontSize: '64px', marginBottom: '16px', color: '#722ED1' }} />
                                                                        <Text strong style={{ fontSize: '18px', color: '#722ED1', marginBottom: '10px' }}>
                                                                            No AI Analysis Available
                                                                        </Text>
                                                                        <Text style={{ fontSize: '14px', textAlign: 'center', marginBottom: '20px', color: '#333' }}>
                                                                            This recording state hasn't been processed with AI yet.
                                                                        </Text>
                                                                        <div style={{ 
                                                                            backgroundColor: 'white', 
                                                                            padding: '15px', 
                                                                            borderRadius: '6px',
                                                                            border: '1px solid #d3adf7',
                                                                            marginBottom: '16px',
                                                                            width: '100%'
                                                                        }}>
                                                                            <Text strong style={{ display: 'block', marginBottom: '8px', color: '#222' }}>
                                                                                How to Generate AI Analysis:
                                                                            </Text>
                                                                            <ol style={{ paddingLeft: '20px', margin: '0', color: '#333' }}>
                                                                                <li style={{ marginBottom: '6px' }}>Complete your recording session</li>
                                                                                <li style={{ marginBottom: '6px' }}>Click the <Text strong style={{ color: '#722ED1' }}>Process with AI</Text> button in the toolbar</li>
                                                                                <li style={{ marginBottom: '6px' }}>Wait for the AI to analyze all transitions</li>
                                                                                <li>View detailed insights for each state</li>
                                                                            </ol>
                                                                        </div>
                                                                        <Button
                                                                            type="primary"
                                                                            icon={<ThunderboltOutlined />}
                                                                            onClick={handleProcessWithAI}
                                                                            loading={processingAI}
                                                                            style={{ background: '#722ED1', borderColor: '#722ED1' }}
                                                                        >
                                                                            Process with AI Now
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )
                                                        }
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <div style={{ 
                                            padding: '40px 20px', 
                                            textAlign: 'center', 
                                            background: '#f9f9f9', 
                                            border: '1px dashed #1890ff', 
                                            borderRadius: '4px',
                                            maxWidth: '400px',
                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                                        }}>
                                            <InfoCircleOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                                            <div style={{ marginBottom: '8px' }}>
                                                <Text strong style={{ fontSize: '16px' }}>No Entry Selected</Text>
                                            </div>
                                            <Text type="secondary">Select an entry from the list on the left to view its details</Text>
                                            <div style={{ marginTop: '16px' }}>
                                                <Button 
                                                    type="primary" 
                                                    size="small"
                                                    onClick={() => detailedRecording.length > 0 && setSelectedEntryIndex(0)}
                                                    disabled={detailedRecording.length === 0}
                                                >
                                                    Select First Entry
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '60px 40px', 
                                background: '#f9f9f9', 
                                border: '1px dashed #1890ff', 
                                borderRadius: '8px',
                                margin: '40px auto',
                                maxWidth: '500px',
                                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)'
                            }}>
                                <VideoCameraOutlined style={{ fontSize: '64px', color: '#1890ff', marginBottom: '24px' }} />
                                <div style={{ marginBottom: '16px' }}>
                                    <Title level={4}>No Actions Recorded</Title>
                                    <Text type="secondary" style={{ fontSize: '16px' }}>Start recording to capture actions and state changes</Text>
                                </div>
                                <div style={{ marginTop: '24px' }}>
                                    {!inspectorState?.driver ? (
                                        <div>
                                            <Badge status="warning" style={{ marginRight: '8px' }} />
                                            <Text type="warning" strong>Connect to a device in the Inspector to enable recording</Text>
                                        </div>
                                    ) : !standardIsRecording ? (
                                        <Button
                                            type="primary"
                                            icon={<VideoCameraOutlined />}
                                            onClick={handleStartRecording}
                                            size="large"
                                        >
                                            Start Recording
                                        </Button>
                                    ) : (
                                        <div>
                                            <Badge status="processing" style={{ marginRight: '8px' }} />
                                            <Text strong style={{ color: '#1890ff' }}>Recording is active. Perform actions in the Inspector to record them.</Text>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    },
                    {
                        key: 'recording',
                        label: 'Standard Recording',
                        children: loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <Spin />
                                <div style={{ marginTop: '16px' }}>
                                    <Text type="secondary">Processing recording actions...</Text>
                                </div>
                            </div>
                        ) : standardRecordedActions && standardRecordedActions.length > 0 ? (
                            <Card 
                                title="Recorded Actions" 
                                style={{ 
                                    margin: '8px',
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                                bodyStyle={{
                                    flex: 1,
                                    padding: '8px 16px',
                                    overflow: 'hidden'
                                }}
                                extra={
                                    <Text type="secondary">
                                        {standardRecordedActions.length} actions recorded
                                    </Text>
                                }
                            >
                                <pre className="custom-scrollbar" style={{ 
                                    backgroundColor: '#f5f5f5', 
                                    padding: '16px', 
                                    borderRadius: '4px', 
                                    overflow: 'auto',
                                    maxHeight: 'calc(100vh - 300px)'
                                }}>
                                    {JSON.stringify(standardRecordedActions, null, 2)}
                                </pre>
                            </Card>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fafafa', border: '1px dashed #d9d9d9', borderRadius: '4px' }}>
                                <Text type="secondary">No standard actions have been recorded yet.</Text>
                                <div style={{ marginTop: '16px' }}>
                                    {!inspectorState?.driver ? (
                                        <Text type="warning">Connect to a device in the Inspector to enable recording</Text>
                                    ) : !standardIsRecording ? (
                                        <Button
                                            type="primary"
                                            icon={<VideoCameraOutlined />}
                                            onClick={handleStartRecording}
                                        >
                                            Start Recording
                                        </Button>
                                    ) : (
                                        <Text>Recording is active. Perform actions in the Inspector to record them.</Text>
                                    )}
                                </div>
                            </div>
                        )
                    }
                ]}
                />
            </Content>
        </Layout>
    );
};

export default RecordingView;