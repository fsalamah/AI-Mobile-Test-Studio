// PageDetailView.jsx
import React, { useState } from "react";
import {
    Button,
    List,
    message,
    Modal,
    Spin,
    Card,
    Dropdown,
    Menu,
    Typography,
    Space,
    Popconfirm,
    Tooltip,
    Progress,
    Form,
    Input
} from "antd";
import {
    AimOutlined,
    ArrowLeftOutlined,
    AppleOutlined,
    AndroidOutlined,
    CodeSandboxOutlined,
    FileSearchOutlined,
    CodeOutlined,
    EditOutlined,
    EllipsisOutlined,
    StarOutlined,
    StarFilled,
    PlusCircleOutlined,
    DeleteOutlined,
    RollbackOutlined
} from "@ant-design/icons";
import { FiAnchor} from "react-icons/fi";
import { BiSolidGraduation } from "react-icons/bi";
import { executeVisualPipeline, executeXpathPipeline } from "../../lib/ai/pipeline.js";
import { Logger as PipelineLogger } from "../../lib/ai/logger.js";
import DevNameEditor from "./DevNamesEditor.js";

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const generateId = () => `id_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;

const PageDetailView = ({ 
    selectedPage, 
    navigateToPageList, 
    navigateToPageXray,
    viewExistingCode,
    inspectorState,
    updatePage,
    // Updated to use AI progress modal functions
    showAiProgressModal,onSetCodeViewerVisiblity,
    updateAiProgressMessage,
    hideAiProgressModal
}) => {
    const [isCapturing, setIsCapturing] = useState(false);
    const [capturingProgress, setCapturingProgress] = useState(0);
    const [captureStatusMessage, setCaptureStatusMessage] = useState('');
    const [captureTargetStateId, setCaptureTargetStateId] = useState(null);
    const [captureIntendedOs, setCaptureIntendedOs] = useState(null);
    const [stateDetailsModalVisible, setStateDetailsModalVisible] = useState(false);
    const [editingState, setEditingState] = useState(null);
    const [stateTitle, setStateTitle] = useState("");
    const [stateDescription, setStateDescription] = useState("");
    const [viewCodeModalVisible, setViewCodeModalVisible] = useState(false);
    const [viewLocatorsModalVisible, setViewLocatorsModalVisible] = useState(false);
    const [currentPageForCode, setCurrentPageForCode] = useState(null);
    const [aiVisualResult, setAiVisualResult] = useState(null);
    const [showDevNameEditor, setShowDevNameEditor] = useState(false);

    // Check if states exist for various button enables/disables
    const hasStates = selectedPage?.states?.length > 0;
    const hasAiAnalysis = !!selectedPage?.aiAnalysis;
    const hasGeneratedCode = !!selectedPage?.aiAnalysis?.code;
    const isDriverConnected = !!inspectorState?.driver;
    const isIOSDriver = isDriverConnected && inspectorState.driver.client.isIOS;
    const isAndroidDriver = isDriverConnected && inspectorState.driver.client.isAndroid;
    
    const setCodeViewerVisible = (isVisible)=>{
        onSetCodeViewerVisiblity(isVisible)
    }
const handleViewExistingCode = () => {
    if (!selectedPage || !selectedPage.aiAnalysis?.code) {
        message.warn("No generated code available for this page.");
        return;
    }
    
    // Set current page for viewing code
    setCurrentPageForCode(selectedPage);
    
    // Show the code viewer
    setCodeViewerVisible(true);
};    
const handleRegenerateCode = async () => {
    // Hide the code viewer
    setCodeViewerVisible(false);
    
    // Show progress modal
    showAiProgressModal("Regenerating code...");
    
    try {
        // ... Regeneration logic
        
        // Show the code viewer again with updated code
        setCurrentPageForCode(updatedPage);
        setCodeViewerVisible(true);
    } catch (error) {
        // ... Error handling
    } finally {
        hideAiProgressModal();
    }
};
// Function definitions for button actions
    const viewPageObjectModel = () => {
        if (!selectedPage) return;
        setCurrentPageForCode(selectedPage);
        setViewCodeModalVisible(true);
    };

    const startCapture = (targetStateId = null, intendedOs = null) => {
        if (!selectedPage?.id) {
             message.error("Please select a page before capturing a state.");
             return;
         }
         if (!inspectorState?.driver) {
             message.error("Driver not available. Cannot capture state.");
             return;
         }
        const actualOsType = inspectorState.driver.client.isIOS ? 'ios' : (inspectorState.driver.client.isAndroid ? 'android' : null);
        
        if (intendedOs && actualOsType && intendedOs !== actualOsType) {
            message.error(`Connect to an ${intendedOs.toUpperCase()} device/emulator to capture this version. Currently connected: ${actualOsType.toUpperCase()}.`);
            return;
        }
        
        setCaptureTargetStateId(targetStateId);
        setCaptureIntendedOs(intendedOs || actualOsType);
        
        captureState(targetStateId);
    };

    const captureState = async (targetStateId) => {
        if (!selectedPage?.id || !inspectorState?.driver || isCapturing) {
            if (isCapturing) message.warn("Capture already in progress.");
            return;
        }
        
        const osToCapture = captureIntendedOs || (inspectorState.driver.client.isIOS ? 'ios' : (inspectorState.driver.client.isAndroid ? 'android' : null));

        if (!osToCapture) {
            message.error("Could not determine the target OS for capture.");
            setCaptureTargetStateId(null);
            setCaptureIntendedOs(null);
            return;
        }

        const actualOsType = inspectorState.driver.client.isIOS ? 'ios' : 'android';

        if (osToCapture !== actualOsType) {
            message.error(`Driver OS mismatch. Expected ${osToCapture.toUpperCase()}, but connected to ${actualOsType.toUpperCase()}.`);
            setCaptureTargetStateId(null);
            setCaptureIntendedOs(null);
            return;
        }

        setIsCapturing(true);
        setCaptureStatusMessage(`Initializing capture for ${osToCapture.toUpperCase()}...`);
        setCapturingProgress(0);

        try {
            setCaptureStatusMessage(`Taking ${osToCapture.toUpperCase()} screenshot...`);
            setCapturingProgress(20);
            const screenShot = await inspectorState.driver.takeScreenshot();

            setCaptureStatusMessage(`Getting ${osToCapture.toUpperCase()} page source...`);
            setCapturingProgress(40);
            const pageSource = await inspectorState.driver.getPageSource();

            setCaptureStatusMessage(`Getting ${osToCapture.toUpperCase()} context...`);
            setCapturingProgress(60);
            const currentContextName = await inspectorState.driver.getContext();

            setCaptureStatusMessage(`Getting ${osToCapture.toUpperCase()} session details...`);
            setCapturingProgress(80);
            let sessionDetails = {};
            try {
                sessionDetails = await inspectorState.driver.getSession();
            } catch (sessionError) {
                console.warn("Could not get full session details:", sessionError);
                sessionDetails = inspectorState.driver.client.capabilities || {};
            }
            setCapturingProgress(100);
            setCaptureStatusMessage('Processing captured data...');

            const capturedVersionData = {
                screenShot,
                pageSource,
                contextName: currentContextName,
                sessionDetails: JSON.parse(JSON.stringify(sessionDetails)),
                timeStamp: new Date().toISOString()
            };

            const updatedPage = { ...selectedPage };
            const states = [...(updatedPage.states || [])];
            let stateUpdated = false;
            
            if (targetStateId) {
                const stateIndex = states.findIndex(state => state.id === targetStateId);
                if (stateIndex !== -1) {
                    const existingState = { ...states[stateIndex] };
                    const isRecapture = !!existingState.versions?.[osToCapture];

                    existingState.versions = {
                        ...(existingState.versions || {}),
                        [osToCapture]: capturedVersionData
                    };

                    states[stateIndex] = existingState;
                    message.success(`${isRecapture ? 'Recaptured' : 'Added'} ${osToCapture.toUpperCase()} version for state "${existingState.title}".`);
                    stateUpdated = true;
                }
            }

            if (!stateUpdated) {
                const newState = {
                    id: generateId(),
                    timeStamp: new Date().toISOString(),
                    versions: { [osToCapture]: capturedVersionData },
                    title: `New State`,
                    description: "",
                    isDefault: states.length === 0
                };
                states.push(newState);

                setEditingState(newState);
                setStateTitle(newState.title);
                setStateDescription(newState.description);
                setStateDetailsModalVisible(true);

                message.success(`Captured new state for ${osToCapture.toUpperCase()}. Please provide details.`);
            }
            
            updatedPage.states = states;
            updatePage(updatedPage);

        } catch (err) {
            console.error("Capture error:", err);
            message.error(`Failed to capture state: ${err.message || 'Unknown error'}`);
        } finally {
            setIsCapturing(false);
            setCapturingProgress(0);
            setCaptureStatusMessage('');
            setCaptureTargetStateId(null);
            setCaptureIntendedOs(null);
        }
    };
    
    const showEditStateModal = (state) => {
        setEditingState(state);
        setStateTitle(state.title);
        setStateDescription(state.description || "");
        setStateDetailsModalVisible(true);
    };

    const saveStateDetails = () => {
        if (!stateTitle.trim()) {
            message.error("State title cannot be empty");
            return;
        }
        if (!editingState) return;
        
        const updatedPage = { ...selectedPage };
        updatedPage.states = updatedPage.states.map(state =>
            state.id === editingState.id ? 
                { ...state, title: stateTitle.trim(), description: stateDescription.trim() } : 
                state
        );
        
        updatePage(updatedPage);
        setStateDetailsModalVisible(false);
        setEditingState(null);
        message.success("State details saved");
    };

    const toggleDefaultState = (stateId) => {
        const updatedPage = { ...selectedPage };
        let foundDefault = false;
        
        updatedPage.states = updatedPage.states.map(state => {
            const isNowDefault = state.id === stateId;
            if (isNowDefault) foundDefault = true;
            return { ...state, isDefault: isNowDefault };
        });
        
        if (!foundDefault && updatedPage.states.length > 0) {
            updatedPage.states[0].isDefault = true;
        }
        
        updatePage(updatedPage);
        message.success("Default state updated");
    };

    const deleteState = (stateId) => {
        const updatedPage = { ...selectedPage };
        const stateToDelete = updatedPage.states.find(state => state.id === stateId);
        
        if (!stateToDelete) return;

        const wasDefault = stateToDelete.isDefault || false;
        updatedPage.states = updatedPage.states.filter(state => state.id !== stateId);

        if (wasDefault && updatedPage.states.length > 0 && !updatedPage.states.some(s => s.isDefault)) {
            updatedPage.states[0].isDefault = true;
        }
        
        updatePage(updatedPage);
        message.success("State deleted");
    };

    const viewLocators = () => {
        if (!selectedPage || !selectedPage.aiAnalysis?.visualElements) return;
        
        // Set the AI visual result to the existing identified elements
        setAiVisualResult(selectedPage.aiAnalysis.visualElements);
        
        // Show the DevNameEditor with the stored visualElements
        setShowDevNameEditor(true);
    };    
    const handlePipelineLogs = (log) => {
        // Use the AI progress modal function
        updateAiProgressMessage(log.message);
    };
    
    const startAiPipeline = async () => {
        PipelineLogger.subscribe(handlePipelineLogs);
        try {
            // Use AI progress modal instead of basic progress popup
            showAiProgressModal("AI analyzing application interface structure...");
            
            // Clear any existing visual result when regenerating
            setAiVisualResult(null);
            
            // Execute the visual pipeline (model config handled by modelConfigProvider)
            const result = await executeVisualPipeline(selectedPage, ['ios', 'android']);
            setAiVisualResult(result);
            
            // Show the DevNameEditor with the results
            setShowDevNameEditor(true);
            
            message.success("Element detection completed successfully");
        } catch (e) {
            console.error("AI pipeline error:", e);
            message.error(`Error in AI processing: ${e.message || 'Unknown error'}`);
        } finally {
            PipelineLogger.unsubscribe(handlePipelineLogs);
            // Hide AI progress modal instead
            hideAiProgressModal();
        }
    };
    
    // Regular save handler for DevNameEditor
    const handleDevNameSave = (updatedVisualElements) => {
        // Update the selected page with the new visualElements
        const updatedPage = { ...selectedPage };
        if (!updatedPage.aiAnalysis) {
            updatedPage.aiAnalysis = {};
        }
        
        // Store the updated visual elements
        updatedPage.aiAnalysis.visualElements = updatedVisualElements;
        updatePage(updatedPage);
        
        // Close the DevNameEditor modal
        setShowDevNameEditor(false);
        message.success("Element names saved successfully");
    };
    
    const proceedToAiXpath = async (updatedVisualElements) => {
        // First ensure we have updated visual elements
        if (!updatedVisualElements || !Array.isArray(updatedVisualElements)) {
            message.error("Invalid visual elements data");
            return;
        }
        
        // Update the selected page with the new visualElements
        const updatedPage = { ...selectedPage };
        if (!updatedPage.aiAnalysis) {
            updatedPage.aiAnalysis = {};
        }
        
        // Store the updated visual elements
        updatedPage.aiAnalysis.visualElements = updatedVisualElements;
        
        // Explicitly save the page with updated visualElements before proceeding
        updatePage(updatedPage);
        message.info("Saving element names and proceeding to XPath generation...");
        
        // Close the DevNameEditor modal
        setShowDevNameEditor(false);
        
        // Start the XPath detection process
        PipelineLogger.subscribe(handlePipelineLogs);
        try {
            // Use AI progress modal with improved messaging
            showAiProgressModal("AI constructing neural model of interface elements...");
            
            // Use the updated visual elements for XPath generation
            const res = await executeXpathPipeline(updatedVisualElements, ['ios', 'android']);
            
            // Create a fresh copy of the page to ensure we have the latest data
            const finalUpdatedPage = { ...selectedPage };
            if (!finalUpdatedPage.aiAnalysis) {
                finalUpdatedPage.aiAnalysis = {};
            }
            
            // Ensure visualElements are saved
            finalUpdatedPage.aiAnalysis.visualElements = updatedVisualElements;
            
            // Store the XPath results
            finalUpdatedPage.aiAnalysis.locators = res;
            
            // Update the page with the new results
            updatePage(finalUpdatedPage);
            

            // Navigate to the XPath analysis view
            navigateToPageXray('pipeline-stage');
            
            message.success("XPath analysis completed successfully");
        } catch(e) {
            console.error("XPath pipeline error:", e);
            message.error(`Error in XPath processing: ${e.message || 'Unknown error'}`);
        } finally {
            // Hide AI progress modal
            hideAiProgressModal();
            PipelineLogger.unsubscribe(handlePipelineLogs);
        }
    };
    
    const handleRegenerateDevNames = () => {
        // Hide the DevNameEditor first
        setShowDevNameEditor(false);
        
        // Then re-run the visual pipeline
        setTimeout(() => {
            startAiPipeline();
        }, 100); // Short delay to ensure modal is closed before starting new pipeline
    };
    
    const getOsBadges = (state) => {
        const badges = [];
        if (state.versions?.ios) badges.push(
            <Tooltip title={`iOS Captured: ${new Date(state.versions.ios.timeStamp).toLocaleString()}`} key="ios">
                <AppleOutlined style={{ color: '#8c8c8c', fontSize: '16px', verticalAlign: 'middle' }} />
            </Tooltip>
        );
        if (state.versions?.android) badges.push(
            <Tooltip title={`Android Captured: ${new Date(state.versions.android.timeStamp).toLocaleString()}`} key="android">
                <AndroidOutlined style={{ color: '#73d13d', fontSize: '16px', verticalAlign: 'middle' }} />
            </Tooltip>
        );
        return <Space size="small">{badges}</Space>;
    };
    
    const getPlaceholderPageObjectModel = (pageName) => {
        return `// AI-Generated Page Object Model for "${pageName}"
import io.appium.java_client.AppiumDriver;
import io.appium.java_client.pagefactory.AppiumFieldDecorator;
import org.openqa.selenium.support.PageFactory;

public class ${pageName.replace(/\s+/g, '')}Page {
    private AppiumDriver driver;

    public ${pageName.replace(/\s+/g, '')}Page(AppiumDriver driver) {
        this.driver = driver;
        PageFactory.initElements(new AppiumFieldDecorator(driver), this);
    }

    public void navigateTo() {
        // Navigation logic
    }
};`;
    };

    if (!selectedPage) return <Text type="secondary">Select a page from the list to view its details.</Text>;

    const states = selectedPage.states || [];

    return (
        <>
            <div style={{ marginBottom: '20px', paddingBottom: '0px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <Space align="center">
                        <Button 
                            icon={<ArrowLeftOutlined />} 
                            onClick={navigateToPageList} 
                            type="text" 
                            aria-label="Back to page list"
                            title="Return to page list" 
                        />
                        <Title level={4} style={{ margin: 0 }} ellipsis={{ tooltip: selectedPage.name }}>
                            {selectedPage.name}
                            {selectedPage.module && <Text type="secondary" style={{ marginLeft: 8, fontSize: '14px' }}>({selectedPage.module})</Text>}
                        </Title>
                    </Space>
                    {selectedPage.description && <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0, paddingLeft: '36px' }} ellipsis={{ rows: 2}}>{selectedPage.description}</Paragraph>}
                </div>
                <Space wrap>
                    <Tooltip title={isDriverConnected ? "Capture New State for this Page" : "Connect a device to capture states"}>
                        <Button
                            type="primary"
                            icon={<AimOutlined />}
                            onClick={() => startCapture()}
                            disabled={isCapturing || !isDriverConnected}
                            loading={isCapturing && !captureTargetStateId}
                            aria-label="Capture State"
                        >
                            Capture State
                        </Button>
                    </Tooltip>
                    <Tooltip title="View Page Object Model">
                        {/* <Button 
                            icon={<CodeSandboxOutlined />} 
                            onClick={viewPageObjectModel}
                            aria-label="View Page Object Model"
                        >
                            View POM
                        </Button> */}
                    </Tooltip>
                    
                    <Tooltip title={!hasStates ? "Capture states before generating code" : "Execute AI code generation for this page"}>
                        <Button 
                            icon={<BiSolidGraduation />} 
                            onClick={startAiPipeline}
                            aria-label="Generate Code with AI"
                            disabled={!hasStates}
                        >
                            Generate Code
                        </Button>
                    </Tooltip>
                    <Tooltip title={!hasAiAnalysis || !selectedPage.aiAnalysis?.visualElements ? "Generate code first to view elements" : "View AI-Generated Element Locators"}>
    <Button 
        icon={<FileSearchOutlined />} 
        onClick={viewLocators}
        aria-label="View Element Locators"
        disabled={!hasAiAnalysis || !selectedPage.aiAnalysis?.visualElements}
    >
        Visual Analysis Elements
    </Button>
</Tooltip>
                    <Tooltip title="View detailed page element analysis">
                        <Button 
                            icon={<FiAnchor />} 
                            onClick={navigateToPageXray}
                            aria-label="View Page X-Ray Analysis"
                            disabled={!hasAiAnalysis}
                        >
                            View XPath Locators
                        </Button>
                    </Tooltip>
                    <Tooltip title={!hasGeneratedCode ? "Generate code first to view it" : "View Generated Test Code"}>
                    <Button 
    icon={<CodeOutlined />} 
    onClick={handleViewExistingCode} // Use our new function here
    disabled={!hasGeneratedCode}
    aria-label="View Generated Code"
>
    View Code
</Button>
                    </Tooltip>
                </Space>
            </div>

            {isCapturing && (
                <div style={{ marginBottom: '16px', padding: '10px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Spin spinning={true} size="small" />
                    <Text style={{ marginRight: 8 }}>{captureStatusMessage}</Text>
                    <Progress percent={capturingProgress} size="small" status="active" style={{ width: '150px' }} />
                </div>
            )}

            {states.length === 0 && !isCapturing ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fafafa', border: '1px dashed #d9d9d9', borderRadius: '4px' }}>
                    <Text type="secondary">No states captured for "{selectedPage.name}" yet.</Text>
                    <div style={{ marginTop: '16px' }}>
                        <Button
                            type="primary"
                            icon={<AimOutlined />}
                            onClick={() => startCapture()}
                            disabled={isCapturing || !isDriverConnected}
                            aria-label="Capture First State"
                        >
                            Capture First State
                        </Button>
                        {!isDriverConnected && <Text type="warning" style={{ marginLeft: 8 }}> (Connect driver to capture)</Text>}
                    </div>
                </div>
            ) : (
                <List
                    grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
                    dataSource={[...states].sort((a, b) => new Date(b.timeStamp) - new Date(a.timeStamp))}
                    renderItem={(state) => {
                        const hasIOS = !!state.versions?.ios;
                        const hasAndroid = !!state.versions?.android;

                        return (
                            <List.Item key={state.id}>
                                <Card
                                    className="state-card"
                                    title={
                                        <Space align="center">
                                            {state.isDefault && <Tooltip title="Default State"><StarFilled style={{ color: "#faad14", fontSize: '16px', verticalAlign: 'middle' }} /></Tooltip>}
                                            <Text ellipsis={{ tooltip: state.title }} style={{ maxWidth: 200 }}>{state.title}</Text>
                                            {getOsBadges(state)}
                                        </Space>
                                    }
                                    extra={
                                        <Dropdown
                                            overlay={
                                                <Menu>
                                                    <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => showEditStateModal(state)}>
                                                        Edit Details
                                                    </Menu.Item>
                                                    {!state.isDefault && (
                                                        <Menu.Item key="default" icon={<StarOutlined />} onClick={() => toggleDefaultState(state.id)}>
                                                            Set as Default
                                                        </Menu.Item>
                                                    )}
                                                    <Menu.SubMenu
                                                        key="captureVersion"
                                                        icon={<PlusCircleOutlined />}
                                                        title="Add/Recapture Version"
                                                        disabled={!isDriverConnected || isCapturing}
                                                    >
                                                        <Menu.Item
                                                            key="captureiOS"
                                                            icon={<AppleOutlined />}
                                                            onClick={() => startCapture(state.id, 'ios')}
                                                            disabled={!isIOSDriver || isCapturing}
                                                        >
                                                            {hasIOS ? "Recapture iOS" : "Add iOS"}
                                                        </Menu.Item>
                                                        <Menu.Item
                                                            key="captureAndroid"
                                                            icon={<AndroidOutlined />}
                                                            onClick={() => startCapture(state.id, 'android')}
                                                            disabled={!isAndroidDriver || isCapturing}
                                                        >
                                                            {hasAndroid ? "Recapture Android" : "Add Android"}
                                                        </Menu.Item>
                                                    </Menu.SubMenu>
                                                    <Menu.Divider />
                                                    <Menu.Item key="delete" icon={<DeleteOutlined />} danger>
                                                        <Popconfirm
                                                            title="Delete this state?"
                                                            description="Are you sure? This cannot be undone."
                                                            onConfirm={() => deleteState(state.id)}
                                                            okText="Yes, Delete" cancelText="No" placement="left"
                                                        >
                                                            <div style={{ width: '100%' }}>Delete State</div>
                                                        </Popconfirm>
                                                    </Menu.Item>
                                                </Menu>
                                            }
                                            trigger={['click']}
                                        >
                                            <Button 
                                                type="text" 
                                                icon={<EllipsisOutlined />} 
                                                aria-label="State Actions Menu"
                                                title="State Options"
                                            />
                                        </Dropdown>
                                    }
                                    hoverable
                                    style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                                    bodyStyle={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}
                                >
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                                        gap: '10px', marginBottom: '12px', padding: '10px 0', minHeight: '180px',
                                        background: '#f9f9f9', borderRadius: '4px', border: '1px solid #f0f0f0'
                                    }}>
                                        {hasIOS ? (
                                            <div style={{ textAlign: 'center', maxWidth: '45%' }}>
                                                <Text type="secondary" style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>iOS</Text>
                                                <img 
                                                    src={`data:image/png;base64,${state.versions.ios.screenShot}`} 
                                                    alt={`iOS Screenshot for ${state.title}`} 
                                                    style={{ maxWidth: "100%", maxHeight: "650px", objectFit: "contain", border: '1px solid #d9d9d9', borderRadius: '4px' }} 
                                                />
                                            </div>
                                        ) : <div style={{ width: '45%'}}></div>}
                                        
                                        {hasAndroid ? (
                                            <div style={{ textAlign: 'center', maxWidth: '45%' }}>
                                                <Text type="secondary" style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Android</Text>
                                                <img 
                                                    src={`data:image/png;base64,${state.versions.android.screenShot}`} 
                                                    alt={`Android Screenshot for ${state.title}`} 
                                                    style={{ maxWidth: "100%", maxHeight: "650px", objectFit: "contain", border: '1px solid #d9d9d9', borderRadius: '4px' }} 
                                                />
                                            </div>
                                        ) : <div style={{ width: '45%'}}></div>}
                                        
                                        {!hasIOS && !hasAndroid && (
                                            <div style={{ color: '#bfbfbf', textAlign: 'center', width: '100%' }}>No screenshots available</div>
                                        )}
                                    </div>

                                    {state.description ? (
                                        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }} style={{ marginBottom: '8px', flexGrow: 1 }}>
                                            {state.description}
                                        </Paragraph>
                                    ) : (<div style={{flexGrow: 1}}></div>)}

                                    <div style={{ marginTop: 'auto', borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
                                        <Text type="secondary" style={{ fontSize: '11px' }}>
                                            Created: {new Date(state.timeStamp).toLocaleString()}
                                        </Text>
                                    </div>
                                </Card>
                            </List.Item>
                        );
                    }}
                />
            )}
{/* CodeViewer Modal - This is the new modal for viewing code with the fixed CodeViewer component */}
{/* {codeViewerVisible && selectedPage && (
    <Modal
        title={`Generated Code: ${selectedPage.name}`}
        visible={codeViewerVisible}
        onCancel={() => setCodeViewerVisible(false)}
        width={800}
        footer={null}
        bodyStyle={{ padding: 0, height: '70vh' }}
    >
        <CodeViewer
            page={currentPageForCode}
            language="java"
            title="Generated Test Code"
            onBack={() => setCodeViewerVisible(false)}
            onSave={updatePage}
            onRegenerate={handleRegenerateCode}
        />
    </Modal>
)} */}
            {/* State Details Modal */}
            <Modal 
                title={editingState?.id ? `Edit State: ${stateTitle}` : "New State Details"} 
                visible={stateDetailsModalVisible} 
                onOk={saveStateDetails} 
                onCancel={() => { setStateDetailsModalVisible(false); setEditingState(null); }} 
                okText="Save Details"
                okButtonProps={{ 
                    disabled: !stateTitle.trim(),
                    title: !stateTitle.trim() ? "Title is required" : "Save state details"
                }}
                cancelButtonProps={{
                    title: "Cancel editing"
                }}
                width={600} 
                destroyOnClose
            >
                <Form layout="vertical">
                    <Form.Item label="State Title" required>
                        <Input value={stateTitle} onChange={e => setStateTitle(e.target.value)} placeholder="e.g., Initial View, Error Message" />
                    </Form.Item>
                    <Form.Item label="State Description (Optional)">
                        <TextArea rows={4} value={stateDescription} onChange={e => setStateDescription(e.target.value)} placeholder="Describe the specific condition" />
                    </Form.Item>
                    {editingState && (
                        <Form.Item label="Captured Versions">
                            {getOsBadges(editingState)}
                            {!editingState.versions?.ios && !editingState.versions?.android && <Text type="secondary">No versions captured.</Text>}
                        </Form.Item>
                    )}
                </Form>
            </Modal>

            {/* Code/POM View Modal */}
            <Modal
                title={`Page Object Model: ${currentPageForCode?.name || 'Page'}`}
                visible={viewCodeModalVisible}
                onCancel={() => setViewCodeModalVisible(false)}
                width={800}
                footer={null}
            >
                <pre style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '4px', overflow: 'auto' }}>
                    {currentPageForCode?.aiAnalysis?.code || getPlaceholderPageObjectModel(currentPageForCode?.name || 'Page')}
                </pre>
            </Modal>

            {/* Locators View Modal */}
            <Modal
                title={`Element Locators: ${currentPageForCode?.name || 'Page'}`}
                visible={viewLocatorsModalVisible}
                onCancel={() => setViewLocatorsModalVisible(false)}
                width={800}
                footer={null}
            >
                <pre style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '4px', overflow: 'auto' }}>
                    {JSON.stringify(currentPageForCode?.aiAnalysis?.locators || [], null, 2)}
                </pre>
            </Modal>

            {/* DevNameEditor Modal */}
            <Modal
                title={`Edit Element Names for ${selectedPage?.name || 'Page'}`}
                visible={showDevNameEditor}
                onCancel={() => setShowDevNameEditor(false)}
                width={900}
                footer={null}
                maskClosable={false}
                destroyOnClose
            >
                {aiVisualResult && (
                    <DevNameEditor 
                        originalData={aiVisualResult} 
                        onSave={handleDevNameSave}
                        onRegenerate={handleRegenerateDevNames}
                        onProceedToXpath={proceedToAiXpath} // This will receive updated visual elements directly
                    />
                )}
            </Modal>
        </>
    );
};

export default PageDetailView;