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
.recording-tabs .ant-tabs-content-holder {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
}
.recording-tabs {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  margin-bottom: 0 !important;
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
    Radio
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
    ExperimentOutlined
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
    const [screenshotDimensions, setScreenshotDimensions] = useState({ width: 'auto', height: 'auto' });
    const [processingAI, setProcessingAI] = useState(false);
    const [aiViewMode, setAiViewMode] = useState('raw');

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
            message.info("Processing recording with AI...");
            
            // Create a copy of the recording to update
            let updatedRecording = [...detailedRecording];
            
            // Use the actual TransitionAnalysisPipeline to analyze transitions
            message.info(`Starting transition analysis for ${updatedRecording.length} states...`);
            
            // Call the pipeline to analyze transitions
            const transitions = await TransitionAnalysisPipeline.analyzeTransitions(updatedRecording);
            
            // Process the transition results and update the recording
            // Important: First state (index 0) and last state (updatedRecording.length-1) should not have AI analysis
            // as there's no transition leading to the first state and no transition after the last state
            
            // First, make sure all states have the aiAnalysis attribute but set to null
            updatedRecording = updatedRecording.map(state => ({
                ...state,
                aiAnalysis: null,
                aiAnalysisRaw: null
            }));
            
            // Process each transition - NOTE: transitions array has length = states.length - 1
            for (let i = 0; i < transitions.length; i++) {
                const transition = transitions[i];
                
                // We assign the transition analysis to the TARGET state (not the source)
                // So the transition from state[0] to state[1] is assigned to state[1]
                const targetStateIndex = i + 1;
                
                // Skip the first state (no incoming transition) and last state (no outgoing transition)
                if (targetStateIndex <= 0 || targetStateIndex >= updatedRecording.length - 1) {
                    continue;
                }
                
                // Format transition info as markdown for the target state
                const targetState = updatedRecording[targetStateIndex];
                const actionType = targetState.action?.action || 'State Change';
                const elementTarget = targetState.action?.element?.text || 
                                     targetState.action?.element?.resourceId || 
                                     transition.actionTarget || 
                                     'Unknown Element';
                
                // Update the current state with AI analysis
                updatedRecording[targetStateIndex] = {
                    ...targetState,
                    aiAnalysis: formatTransitionToMarkdown(transition, targetState, actionType, elementTarget, targetStateIndex, updatedRecording.length),
                    aiAnalysisRaw: transition // Store the raw JSON data
                };
                
                message.info(`Processed transition for state ${targetStateIndex + 1} of ${updatedRecording.length}`);
            }
            
            // Final verification - make sure first and last states have aiAnalysis = null
            if (updatedRecording.length > 0) {
                // First state should have null analysis
                updatedRecording[0] = {
                    ...updatedRecording[0],
                    aiAnalysis: null,
                    aiAnalysisRaw: null
                };
                
                // Last state should have null analysis
                const lastIndex = updatedRecording.length - 1;
                updatedRecording[lastIndex] = {
                    ...updatedRecording[lastIndex],
                    aiAnalysis: null,
                    aiAnalysisRaw: null
                };
                
                message.info(`Verified first and last states have no analysis as expected`);
            }
            
            // Update the recording with AI analysis
            setDetailedRecording(updatedRecording);
            
            // If we have a selected entry, make sure we force a re-render
            if (selectedEntryIndex !== null) {
                // Force a selection update
                const currentIndex = selectedEntryIndex;
                setSelectedEntryIndex(null);
                setTimeout(() => setSelectedEntryIndex(currentIndex), 10);
            }
            
            message.success("Recording processed successfully with AI");
        } catch (error) {
            message.error(`Failed to process recording with AI: ${error.message}`);
            console.error("Error processing with AI:", error);
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
        
        return `## AI Analysis of ${actionType} Action

### Element Information
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
- **Current Page:** ${transition.currentPageName || 'Unknown page'}
- **Page Description:** ${transition.currentPageDescription || 'No description available'}
- **User Activity:** ${transition.inferredUserActivity || 'Unknown activity'}

### Test Code Recommendation
\`\`\`java
// Generated test code for ${actionType} action
public void test${actionType.replace(/\s+/g, '')}() {
    // Find element using optimized selector
    WebElement element = driver.findElement(By.xpath("${state.action?.element?.xpath || '//android.view.View'}"));
    
    // Perform the ${actionType.toLowerCase()} action
    ${generateCodeForAction(actionType, transition.actionValue)}
    
    // Add appropriate assertion here
    ${generateAssertionForTransition(transition)}
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
    
    // Helper function to format final state analysis
    const formatFinalStateToMarkdown = (state, actionType) => {
        return `## AI Analysis of Final State

### Final State Information
- **Last Action:** ${actionType}
- **Final Screen:** ${state.deviceArtifacts?.sessionDetails?.activity || 'Unknown Screen'}
- **Timestamp:** ${new Date(state.actionTime).toLocaleString()}

### Element Information
- **Last Element:** ${state.action?.element?.elementId || 'No element information'}
- **UI Path:** ${state.action?.element?.xpath || 'N/A'}

### Test Code Recommendation
\`\`\`java
// Generated assertion for final state
public void verifyFinalState() {
    // Verify the final state is correct
    WebElement finalElement = driver.findElement(By.xpath("${state.action?.element?.xpath || '//android.view.View'}"));
    Assert.assertTrue("Final state should be visible", finalElement.isDisplayed());
    
    // Check for any page-specific elements to confirm we're on the correct page
    WebElement pageSpecificElement = driver.findElement(By.id("page-specific-id"));
    Assert.assertTrue("Page-specific element should be visible", pageSpecificElement.isDisplayed());
}
\`\`\`

### Test Completion Analysis
- ✅ Test sequence recorded successfully
- ✅ All key interactions were captured
- ℹ️ Final state verification recommended

### Next Steps
- Add proper test setup and teardown
- Consider adding wait conditions before interactions
- Implement proper test reporting
- Add error handling and recovery logic
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
                        // Load into standard recording - we need to dispatch to Redux
                        // This would require specific Redux actions for standard recording
                        // which we don't have direct control over here
                        message.info('Standard recording format detected, but loading is not fully supported');
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
                    <Tooltip title="Process recording with AI to generate test code">
                        <Button
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            onClick={handleProcessWithAI}
                            loading={processingAI}
                            disabled={!hasRecordings}
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
                            <div style={{ 
                                display: 'flex', 
                                height: 'calc(100% - 8px)', 
                                overflow: 'hidden',
                                minHeight: '500px',
                                flex: 1,
                                margin: 0
                            }}>
                                {/* Column 1 - Entries list */}
                                <div style={{ 
                                    width: '25%', 
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
                                            height: 'calc(100% - 48px)', // Subtract header height
                                            padding: '0 2px',
                                            borderRight: '1px solid #f0f0f0',
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
                                                                    {hasAction 
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
                                
                                {selectedEntryIndex !== null && detailedRecording[selectedEntryIndex] ? (
                                    <>
                                        {/* Column 2 - Screenshot */}
                                        <div style={{ 
                                            width: screenshotDimensions.width, 
                                            minWidth: '300px', // Provide a reasonable minimum width
                                            maxWidth: '45%',  // Ensure it doesn't take up too much space
                                            borderRight: '1px solid #f0f0f0',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden',
                                            flexShrink: 0,
                                            transition: 'width 0.3s ease-in-out' // Smooth transition when width changes
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
                                                            
                                                            // Update the dimensions
                                                            setScreenshotDimensions({
                                                                width: `${scaledWidth}px`,
                                                                height: `${containerHeight}px`
                                                            });
                                                        }}
                                                        style={{ 
                                                            width: 'auto',
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
                                        
                                        {/* Column 3 - Details with tabs */}
                                        <div style={{ 
                                            flex: 1,
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
                                                                        margin: 0
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
                                                                        fontSize: '12px'
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
                                                                        margin: 0
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
                                                                            count={selectedEntryIndex === 0 || selectedEntryIndex === detailedRecording.length - 1 ? 
                                                                                "First/Last State" : "Not Available"} 
                                                                            style={{ 
                                                                                backgroundColor: selectedEntryIndex === 0 || selectedEntryIndex === detailedRecording.length - 1 ? 
                                                                                    '#87d068' : '#f0f0f0',
                                                                                color: selectedEntryIndex === 0 || selectedEntryIndex === detailedRecording.length - 1 ? 
                                                                                    '#fff' : '#bfbfbf',
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
                                                                                        <span role="img" aria-label="json" style={{ marginRight: '4px' }}>{ }</span>
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
                                                                                            color: '#d4d4d4'
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
                                                                            {selectedEntryIndex === 0 ? 
                                                                                "This is the first state in the recording sequence. First states don't have AI analysis because there is no transition leading to them." :
                                                                            selectedEntryIndex === detailedRecording.length - 1 ?
                                                                                "This is the last state in the recording sequence. Last states don't have AI analysis because there is no transition after them." :
                                                                                "This recording state hasn't been processed with AI yet."}
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
                                                                        {!(selectedEntryIndex === 0 || selectedEntryIndex === detailedRecording.length - 1) && (
                                                                            <Button
                                                                                type="primary"
                                                                                icon={<ThunderboltOutlined />}
                                                                                onClick={handleProcessWithAI}
                                                                                loading={processingAI}
                                                                                style={{ background: '#722ED1', borderColor: '#722ED1' }}
                                                                            >
                                                                                Process with AI Now
                                                                            </Button>
                                                                        )}
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