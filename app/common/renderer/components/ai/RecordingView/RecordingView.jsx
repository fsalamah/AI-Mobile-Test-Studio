import React, { useState, useEffect } from 'react';
import { Layout, Tabs, message, Card, Typography, Spin, Badge, Empty } from 'antd';
import { VideoCameraOutlined } from '@ant-design/icons';
import ActionRecorder from '../../../lib/ai/actionRecorder';
import { TransitionAnalysisPipeline } from '../../../lib/ai/transitionAnalysisPipeline';

// Import subcomponents directly from their files
import RecordingHeader from './RecordingHeader';
import RecordingToolbar from './RecordingToolbar';
import StatesList from './StatesList';
import ScreenshotViewer from './ScreenshotViewer';
import TransitionDetails from './TransitionDetails';
import PlaybackControls from './PlaybackControls';
import AIAnalysisView from './AIAnalysisView';

// Get scrollbar styles directly
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
`;

const { Content } = Layout;
const { Text, Title } = Typography;

const RecordingView = ({
  navigateBack,
  inspectorState,
  startRecording: standardStartRecording,
  pauseRecording: standardPauseRecording,
  clearRecording: standardClearRecording,
  isRecording: standardIsRecording,
  recordedActions: standardRecordedActions
}) => {
  // Component state
  const [loading, setLoading] = useState(false);
  const [detailedRecording, setDetailedRecording] = useState([]);
  const [selectedEntryIndex, setSelectedEntryIndex] = useState(null);
  const [activeTab, setActiveTab] = useState("detailed");
  const [showCondensed, setShowCondensed] = useState(true);
  const [hideNonTransitions, setHideNonTransitions] = useState(false);
  const [processingAI, setProcessingAI] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({
    isProcessing: false,
    current: 0,
    total: 0,
    percent: 0,
    message: ''
  });
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Resizing state
  const [columnWidths, setColumnWidths] = useState({
    list: '25%',
    screenshot: '35%',
    details: '40%'
  });
  const [isResizing, setIsResizing] = useState(null);

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
  
  // Reset when selected entry changes
  useEffect(() => {
    if (isResizing) {
      return;
    }
    
    // Handle mouse events for resizing panels
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

  // Recording control handlers
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

  // Copy recording to clipboard
  const copyToClipboard = () => {
    const recordingString = JSON.stringify(
      activeTab === "detailed" ? detailedRecording : standardRecordedActions, 
      null, 
      2
    );
    
    navigator.clipboard.writeText(recordingString).then(
      () => {
        return true;
      },
      (err) => {
        message.error(`Could not copy text: ${err}`);
        return false;
      }
    );
  };

  // Save recording to file
  const saveToFile = () => {
    try {
      const recordingData = JSON.stringify(detailedRecording, null, 2);
      const blob = new Blob([recordingData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `appium-recording-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      message.success("Recording saved to file");
    } catch (error) {
      message.error(`Failed to save recording: ${error.message}`);
    }
  };

  // Load recording from file
  const handleLoadRecording = (fileContent) => {
    try {
      const parsedContent = JSON.parse(fileContent);
      
      if (Array.isArray(parsedContent)) {
        // Clear existing recording
        ActionRecorder.clearRecording();
        
        // Add each entry from the loaded file
        for (const entry of parsedContent) {
          ActionRecorder.addEntry(entry);
        }
        
        // Update the detailed recording state
        setDetailedRecording(ActionRecorder.getRecording());
        
        // Select the first entry
        if (parsedContent.length > 0) {
          setSelectedEntryIndex(0);
        }
        
        return true;
      } else {
        throw new Error("Invalid recording format. Expected an array.");
      }
    } catch (error) {
      message.error(`Failed to load recording: ${error.message}`);
      return false;
    }
  };

  // Process recording with AI
  const handleProcessWithAI = async () => {
    if (detailedRecording.length === 0) {
      message.warning("No recording data to process.");
      return;
    }
    
    try {
      setProcessingAI(true);
      setAnalysisProgress({
        isProcessing: true,
        current: 0,
        total: detailedRecording.length,
        percent: 0,
        message: 'Preparing to analyze transitions...'
      });
      
      // Progress callback
      const onProgress = (current, total, message) => {
        const percent = Math.round((current / total) * 100);
        setAnalysisProgress({
          isProcessing: true,
          current,
          total,
          percent,
          message: message || `Analyzing transition ${current} of ${total}`
        });
      };
      
      // Create a copy of the recording to avoid mutating the original
      const updatedRecording = [...detailedRecording];
      
      // Call the pipeline to analyze all transitions at once
      // The pipeline now handles batching and concurrency internally
      const transitions = await TransitionAnalysisPipeline.analyzeTransitions(
        updatedRecording,
        { 
          // Let the pipeline determine the batch size and concurrency
          // based on the configuration in config.js
          batch: updatedRecording.length <= 20, // Use batch mode for smaller sets
          onProgress // Pass the progress callback
        }
      );
      
      console.log(`Received ${transitions.length} transition results`);
      
      // Update the detailed recording with the results
      setDetailedRecording(updatedRecording);
      
      message.success("AI analysis complete!");
    } catch (error) {
      console.error("Error processing with AI:", error);
      message.error(`Failed to process with AI: ${error.message}`);
    } finally {
      setProcessingAI(false);
      setAnalysisProgress({
        isProcessing: false,
        current: 0,
        total: 0,
        percent: 0,
        message: ''
      });
    }
  };

  // Get the currently selected entry
  const selectedEntry = selectedEntryIndex !== null ? detailedRecording[selectedEntryIndex] : null;

  // Render the UI
  return (
    <Layout className="recording-view-container">
      {/* Header with controls */}
      <RecordingHeader 
        navigateBack={navigateBack}
        isRecording={standardIsRecording}
        onStartRecording={handleStartRecording}
        onPauseRecording={handlePauseRecording}
        onClearRecording={handleClearRecording}
        recordingControlsDisabled={loading}
      />
      
      <Content style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="recording-tabs"
          type="card"
          tabPosition="top"
          style={{ height: '100%' }}
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
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Toolbar */}
                  <RecordingToolbar
                    detailedRecording={detailedRecording}
                    handleProcessWithAI={handleProcessWithAI}
                    saveToFile={saveToFile}
                    copyToClipboard={copyToClipboard}
                    handleLoadRecording={handleLoadRecording}
                    processingAI={processingAI}
                    analysisProgress={analysisProgress}
                  />
                  
                  {/* Playback Controls */}
                  <PlaybackControls 
                    detailedRecording={detailedRecording}
                    selectedEntryIndex={selectedEntryIndex}
                    setSelectedEntryIndex={setSelectedEntryIndex}
                    isPlaying={isPlaying}
                    setIsPlaying={setIsPlaying}
                  />
                  
                  {/* Main content area with 3-column layout */}
                  <div 
                    className="recording-view-detailed-container" 
                    style={{ 
                      display: 'flex', 
                      flex: 1,
                      overflow: 'hidden' 
                    }}
                  >
                    {/* Column 1 - States List */}
                    <StatesList 
                      detailedRecording={detailedRecording}
                      selectedEntryIndex={selectedEntryIndex}
                      setSelectedEntryIndex={setSelectedEntryIndex}
                      showCondensed={showCondensed}
                      setShowCondensed={setShowCondensed}
                      hideNonTransitions={hideNonTransitions}
                      setHideNonTransitions={setHideNonTransitions}
                      columnWidths={columnWidths}
                      setIsResizing={setIsResizing}
                      isPlaying={isPlaying}
                    />
                    
                    {/* Column 2 - Screenshot */}
                    <ScreenshotViewer 
                      selectedEntry={selectedEntry}
                      selectedEntryIndex={selectedEntryIndex}
                      detailedRecording={detailedRecording}
                      setSelectedEntryIndex={setSelectedEntryIndex}
                      columnWidths={columnWidths}
                      setIsResizing={setIsResizing}
                    />
                    
                    {/* Column 3 - Transition Details */}
                    <TransitionDetails 
                      selectedEntry={selectedEntry}
                      selectedEntryIndex={selectedEntryIndex}
                      columnWidths={columnWidths}
                      handleProcessWithAI={handleProcessWithAI}
                      processingAI={processingAI}
                    />
                  </div>
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