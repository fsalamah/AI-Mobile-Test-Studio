// RecordingView.jsx
import React, { useState, useEffect } from "react";

// Add custom scrollbar styles
const customScrollbarStyle = `
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f5f5f5;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #d9d9d9;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #bfbfbf;
}
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #d9d9d9 #f5f5f5;
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
    Tooltip
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
    ReloadOutlined
} from "@ant-design/icons";
import ActionRecorder from "../../lib/ai/actionRecorder";

const { Text, Title, Paragraph } = Typography;
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
        <Layout style={{ 
            height: '100vh', 
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden' // Prevent main container from scrolling
        }}>
            {/* Add custom scrollbar styles */}
            <style>{customScrollbarStyle}</style>
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
                overflow: 'hidden' // Content itself doesn't scroll
            }}>
                <Tabs 
                    defaultActiveKey="detailed" 
                    onChange={setActiveTab}
                    type="card"
                    style={{ 
                        margin: '16px 16px 0',
                        display: 'flex', 
                        flexDirection: 'column', 
                        height: 'calc(100% - 16px)'
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
                            <div style={{ display: 'flex', height: 'calc(100% - 50px)', overflow: 'hidden' }}>
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
                                        className="custom-scrollbar"
                                        style={{ 
                                            overflowY: 'auto', 
                                            height: '100%',
                                            padding: '0 2px'
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
                                            width: '35%', 
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
                                            
                                            <div className="custom-scrollbar" style={{ overflow: 'auto', padding: '16px', flex: 1, textAlign: 'center' }}>
                                                {detailedRecording[selectedEntryIndex].deviceArtifacts?.screenshotBase64 ? (
                                                    <img 
                                                        src={`data:image/png;base64,${detailedRecording[selectedEntryIndex].deviceArtifacts.screenshotBase64}`} 
                                                        alt={`Screenshot at ${new Date(detailedRecording[selectedEntryIndex].actionTime).toLocaleString()}`}
                                                        style={{ 
                                                            maxWidth: '100%',
                                                            maxHeight: 'calc(100vh - 220px)',
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
                                                height: '48px'
                                            }}>
                                                <Text strong>{new Date(detailedRecording[selectedEntryIndex].actionTime).toLocaleString()}</Text>
                                                {detailedRecording[selectedEntryIndex].action && (
                                                    <Text type="secondary">
                                                        {detailedRecording[selectedEntryIndex].action.action || 'Action Data'}
                                                    </Text>
                                                )}
                                            </div>
                                            
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <Tabs 
                                                    defaultActiveKey="action"
                                                    style={{ height: '100%' }}
                                                    tabPosition="top"
                                                    type="card"
                                                    size="middle"
                                                    tabBarStyle={{ 
                                                        margin: '0 12px',
                                                        marginTop: '12px',
                                                        background: '#f9f9f9',
                                                        borderRadius: '4px 4px 0 0'
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
                                                                <div className="custom-scrollbar" style={{ padding: '16px', height: 'calc(100% - 32px)', overflow: 'auto' }}>
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
                                                                <div className="custom-scrollbar" style={{ padding: '16px', height: 'calc(100% - 32px)', overflow: 'auto' }}>
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
                                                                <div className="custom-scrollbar" style={{ padding: '16px', height: 'calc(100% - 32px)', overflow: 'auto' }}>
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
                                            background: '#fafafa', 
                                            border: '1px dashed #d9d9d9', 
                                            borderRadius: '4px',
                                            maxWidth: '400px'
                                        }}>
                                            <InfoCircleOutlined style={{ fontSize: '32px', color: '#bfbfbf', marginBottom: '16px' }} />
                                            <div>
                                                <Text type="secondary">Select an entry from the list to view details</Text>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fafafa', border: '1px dashed #d9d9d9', borderRadius: '4px' }}>
                                <Text type="secondary">No actions have been recorded yet.</Text>
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
                                style={{ margin: '16px' }}
                                extra={
                                    <Text type="secondary">
                                        {standardRecordedActions.length} actions recorded
                                    </Text>
                                }
                            >
                                <pre style={{ 
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