// RecordingView.jsx
import React, { useState, useEffect } from "react";
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
    Switch
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
    EyeInvisibleOutlined
} from "@ant-design/icons";
import ActionRecorder from "../../lib/ai/actionRecorder";

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

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
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <Text type="secondary">Select an entry to view details</Text>
                </div>
            );
        }

        const entry = detailedRecording[selectedEntryIndex];
        const screenshot = entry.deviceArtifacts?.screenshotBase64;
        
        return (
            <div style={{ padding: '10px' }}>
                <Title level={5}>Entry #{selectedEntryIndex + 1} - {new Date(entry.actionTime).toLocaleString()}</Title>
                
                {screenshot && (
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <img 
                            src={`data:image/png;base64,${screenshot}`} 
                            alt={`Screenshot at ${new Date(entry.actionTime).toLocaleString()}`}
                            style={{ maxWidth: '100%', maxHeight: '400px', border: '1px solid #d9d9d9' }}
                        />
                    </div>
                )}
                
                <Tabs 
                    defaultActiveKey="action"
                    items={[
                        {
                            key: 'action',
                            label: 'Action',
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

    return (
        <>
            <div style={{ marginBottom: '20px', paddingBottom: '0px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <Space align="center">
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={navigateBack}
                            type="text"
                            aria-label="Back"
                            title="Go back"
                        />
                        <Title level={4} style={{ margin: 0 }}>
                            Session Recording
                            {(standardIsRecording || ActionRecorder.isRecording()) && 
                              <Text type="danger" style={{ marginLeft: 8, fontSize: '14px' }}>(Recording in progress)</Text>}
                        </Title>
                    </Space>
                    <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0, paddingLeft: '36px' }}>
                        Record and view inspector actions with page source and screenshots
                    </Paragraph>
                </div>
                <Space wrap>
                    {!standardIsRecording ? (
                        <Button
                            type="primary"
                            icon={<VideoCameraOutlined />}
                            onClick={handleStartRecording}
                            loading={loading}
                            disabled={!inspectorState?.driver}
                        >
                            Start Recording
                        </Button>
                    ) : (
                        <Button
                            type="primary"
                            danger
                            icon={<PauseCircleOutlined />}
                            onClick={handlePauseRecording}
                            loading={loading}
                        >
                            Pause Recording
                        </Button>
                    )}
                    <Upload 
                        beforeUpload={handleLoadRecording}
                        showUploadList={false}
                        accept=".json"
                    >
                        <Button icon={<UploadOutlined />}>Load Recording</Button>
                    </Upload>
                    <Button
                        icon={<ClearOutlined />}
                        onClick={handleClearRecording}
                        disabled={(!standardRecordedActions || standardRecordedActions.length === 0) && 
                                (!detailedRecording || detailedRecording.length === 0)}
                    >
                        Clear Recording
                    </Button>
                    <Button
                        icon={<CopyOutlined />}
                        onClick={copyToClipboard}
                        disabled={(!standardRecordedActions || standardRecordedActions.length === 0) && 
                                 (!detailedRecording || detailedRecording.length === 0)}
                    >
                        {copied ? "Copied!" : "Copy JSON"}
                    </Button>
                    <Button
                        icon={<SaveOutlined />}
                        onClick={saveToFile}
                        disabled={(!standardRecordedActions || standardRecordedActions.length === 0) && 
                                 (!detailedRecording || detailedRecording.length === 0)}
                    >
                        Save to File
                    </Button>
                </Space>
            </div>

            <Tabs 
                defaultActiveKey="detailed" 
                onChange={setActiveTab}
                type="card"
                style={{ marginTop: '16px' }}
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
                            <div style={{ display: 'flex', height: 'calc(70vh)' }}>
                                {/* Left panel - Entries list */}
                                <div style={{ width: '30%', borderRight: '1px solid #f0f0f0', overflowY: 'auto' }}>
                                    <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fafafa' }}>
                                        <Text strong>Recording Entries</Text>
                                        <Space>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>Show Condensed</Text>
                                            <Switch 
                                                checked={showCondensed}
                                                onChange={setShowCondensed}
                                                checkedChildren={<EyeOutlined />}
                                                unCheckedChildren={<EyeInvisibleOutlined />}
                                                size="small"
                                            />
                                        </Space>
                                    </div>
                                    {detailedRecording
                                        .filter(entry => showCondensed || !entry.isCondensed)
                                        .map((entry, index) => {
                                            const isSelected = selectedEntryIndex === index;
                                            const hasScreenshot = !!entry.deviceArtifacts?.screenshotBase64;
                                            const realIndex = detailedRecording.indexOf(entry);
                                            
                                            return (
                                                <div 
                                                    key={realIndex}
                                                    onClick={() => setSelectedEntryIndex(realIndex)}
                                                    style={{
                                                        padding: '10px',
                                                        borderBottom: '1px solid #f0f0f0',
                                                        backgroundColor: isSelected ? '#e6f7ff' : (entry.isCondensed ? '#f9f9f9' : 'transparent'),
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        opacity: entry.isCondensed ? 0.7 : 1
                                                    }}
                                                >
                                                    <div style={{ width: '100%' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <span><strong>#{realIndex + 1}</strong> - {new Date(entry.actionTime).toLocaleTimeString()}</span>
                                                            {entry.isCondensed && <Text type="secondary" style={{ fontSize: '11px' }}>Condensed</Text>}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                                            {entry.action ? `Action: ${entry.action.action || 'Unknown'}` : 'State change'}
                                                        </div>
                                                    </div>
                                                    {hasScreenshot && <FileImageOutlined style={{ color: '#1890ff', marginLeft: '8px' }}/>}
                                                </div>
                                            );
                                        })}
                                </div>
                                
                                {/* Right panel - Entry details */}
                                <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                                    {renderEntryDetails()}
                                </div>
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
                                    maxHeight: '60vh'
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
        </>
    );
};

export default RecordingView;