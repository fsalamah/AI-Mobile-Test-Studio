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
    Input,
    Tabs
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
    RollbackOutlined,
    CopyOutlined
} from "@ant-design/icons";
import { FiAnchor} from "react-icons/fi";
import { BiSolidGraduation } from "react-icons/bi";
import { executeVisualPipeline, executeXpathPipeline } from "../../lib/ai/pipeline.js";
import { executePOMClassPipeline } from "../../lib/ai/PomPipeline.js";
import { Logger as PipelineLogger } from "../../lib/ai/logger.js";
import DevNameEditor from "./DevNamesEditor.tsx";
import CodeViewer from "./CodeViewer.jsx";
import FinalResizableTabsContainer from "../Xray/XrayRootComponent.jsx";

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
    showAiProgressModal,
    onSetCodeViewerVisiblity,
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

    // Tab-related state
    const [activeTab, setActiveTab] = useState('states'); // 'states', 'elements', 'locators', 'code'

    // Enhanced tab change handler
    const handleTabChange = (tabKey) => {
        // Set the active tab first to update UI
        setActiveTab(tabKey);

        // Load appropriate data for the selected tab
        if (tabKey === 'elements') {
            // Set loading state first
            setAiVisualResult(null);

            // Wait a short tick for UI to update, then load the data
            setTimeout(() => {
                if (selectedPage?.aiAnalysis?.visualElements) {
                    setAiVisualResult(selectedPage.aiAnalysis.visualElements);
                } else if (hasAiAnalysis) {
                    // Try to run the pipeline if we have some analysis but no visual elements
                    startAiPipeline();
                }
            }, 100);
        }
    }

    // Check if states exist for various button enables/disables
    const hasStates = selectedPage?.states?.length > 0;
    const hasAiAnalysis = !!selectedPage?.aiAnalysis;
    const hasGeneratedCode = !!selectedPage?.aiAnalysis?.code;
    const isDriverConnected = !!inspectorState?.driver;
    const isIOSDriver = isDriverConnected && inspectorState.driver.client.isIOS;
    const isAndroidDriver = isDriverConnected && inspectorState.driver.client.isAndroid;
    
    // This function is no longer needed since we're using tabs
    // but we keep it for compatibility
    const setCodeViewerVisible = (isVisible) => {
        if (isVisible) {
            setActiveTab('code');
        }
    }

    const handleViewExistingCode = () => {
        if (!selectedPage || !selectedPage.aiAnalysis?.code) {
            message.warn("No generated code available for this page.");
            return;
        }

        // Set current page for viewing code
        setCurrentPageForCode(selectedPage);

        // Switch to the code tab
        setActiveTab('code');
    };    

    // Handler for POM code generation
    const handleOnProceedToPom = async (page) => {
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
            // Switch to code tab to show the new code
            setActiveTab('code');

        } catch (error) {
            console.error("Error generating POM:", error);
            message.error(`Failed to generate Page Object Model: ${error.message || 'Unknown error'}`);
        } finally {
            PipelineLogger.unsubscribe(handlePipelineLogs);
            hideAiProgressModal();
        }
    };

    const handleRegenerateCode = async () => {
        // Show progress modal
        showAiProgressModal("Regenerating code...");

        try {
            // Call the same pipeline function used for POM generation
            await handleOnProceedToPom(selectedPage);

            // Stay on the code tab - it will be automatically updated
            message.success("Code regenerated successfully");
        } catch (error) {
            console.error("Error regenerating code:", error);
            message.error(`Failed to regenerate code: ${error.message || 'Unknown error'}`);
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

        // Switch to the elements tab first
        setActiveTab('elements');

        // Clear visual elements to show loading state
        setAiVisualResult(null);

        // Wait a bit for UI to update, then set the visual elements
        setTimeout(() => {
            setAiVisualResult(selectedPage.aiAnalysis.visualElements);
        }, 100);
    };

    // Function to view XPath analysis (used by toolbar button)
    const viewXPathAnalysis = () => {
        if (!selectedPage || !selectedPage.aiAnalysis?.locators) return;

        // Switch to the locators tab
        setActiveTab('locators');
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

        // Close the DevNameEditor modal if it was shown in a modal
        if (showDevNameEditor) {
            setShowDevNameEditor(false);
        }

        // Also update the current visual result for the tab view
        setAiVisualResult(updatedVisualElements);

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

        // Close the DevNameEditor modal if it was shown in a modal
        if (showDevNameEditor) {
            setShowDevNameEditor(false);
        }

        // Also update the current visual result for the tab view
        setAiVisualResult(updatedVisualElements);
        
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
            

            // Navigate to the XPath analysis tab instead of separate view
            setActiveTab('locators');

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
    
    const handleRegenerateDevNames = (fromTabView = false) => {
        // Different behavior based on where it was called from
        if (!fromTabView) {
            // If called from the modal, hide the DevNameEditor first
            setShowDevNameEditor(false);

            // Then re-run the visual pipeline after a short delay
            setTimeout(() => {
                startAiPipeline();
            }, 100); // Short delay to ensure modal is closed before starting new pipeline
        } else {
            // If called from the tab view, just clear the results and run the pipeline
            setAiVisualResult(null);
            startAiPipeline();
        }
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

    // Create the tab items for the tab component
    const tabItems = [
        {
            key: 'states',
            label: 'States',
            children: (
                states.length === 0 && !isCapturing ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff' }}>
                        <div style={{
                            maxWidth: '450px',
                            margin: '0 auto',
                            padding: '40px 20px',
                            background: '#fafafa',
                            border: '1px dashed #d9d9d9',
                            borderRadius: '8px'
                        }}>
                            <Text type="secondary" style={{ fontSize: '16px' }}>No states captured for "{selectedPage.name}" yet.</Text>
                            <div style={{ marginTop: '24px' }}>
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<AimOutlined />}
                                    onClick={() => startCapture()}
                                    disabled={isCapturing || !isDriverConnected}
                                    aria-label="Capture First State"
                                >
                                    Capture First State
                                </Button>
                                {!isDriverConnected && <Text type="warning" style={{ display: 'block', marginTop: 12 }}>(Connect driver to capture)</Text>}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
                        <List
                            grid={{ gutter: 20, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
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
                    </div>
                )
            )
        },
        {
            key: 'elements',
            label: 'Visual Elements',
            disabled: !hasAiAnalysis || !selectedPage?.aiAnalysis?.visualElements,
            children: (
                <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
                    {aiVisualResult ? (
                        <DevNameEditor
                            originalData={aiVisualResult}
                            onSave={handleDevNameSave}
                            onRegenerate={() => handleRegenerateDevNames(true)}
                            onProceedToXpath={proceedToAiXpath}
                            inTabView={true}
                        />
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 40px)', padding: '40px 20px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <Spin size="large" />
                                <Text style={{ display: 'block', marginTop: '16px', fontSize: '16px' }}>Loading visual elements...</Text>
                            </div>
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'locators',
            label: 'XPath Analysis',
            disabled: !hasAiAnalysis || !selectedPage?.aiAnalysis?.locators,
            children: (
                selectedPage?.aiAnalysis?.locators ? (
                    <div style={{
                        padding: '0',
                        height: '100%',
                        width: '100%',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <FinalResizableTabsContainer
                            page={selectedPage}
                            pageChanged={updatePage}
                            onExit={() => setActiveTab('states')}
                            onRegenerateLocators={startAiPipeline}
                            onProceedToPom={handleOnProceedToPom}
                            viewMode="tabbed-view"
                        />
                    </div>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <div style={{
                            textAlign: 'center',
                            maxWidth: '450px',
                            padding: '40px 20px',
                            background: '#fafafa',
                            border: '1px dashed #d9d9d9',
                            borderRadius: '8px'
                        }}>
                            <Text type="secondary" style={{ fontSize: '16px' }}>No XPath locators have been generated for this page yet.</Text>
                            <div style={{ marginTop: '24px' }}>
                                <Button
                                    type="primary"
                                    size="large"
                                    onClick={startAiPipeline}
                                >
                                    Generate XPath Locators
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            )
        },
        {
            key: 'code',
            label: 'Generated Code',
            disabled: !hasGeneratedCode,
            children: (
                selectedPage?.aiAnalysis?.code ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                        <CodeViewer
                            page={selectedPage}
                            language="java"
                            title="Generated Page Object Model"
                            onRegenerate={handleRegenerateCode}
                            onBack={() => {}}
                        />
                    </div>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <div style={{
                            textAlign: 'center',
                            maxWidth: '450px',
                            padding: '40px 20px',
                            background: '#fafafa',
                            border: '1px dashed #d9d9d9',
                            borderRadius: '8px'
                        }}>
                            <Text type="secondary" style={{ fontSize: '16px' }}>No code has been generated for this page yet.</Text>
                            <div style={{ marginTop: '24px' }}>
                                <Button
                                    type="primary"
                                    size="large"
                                    onClick={startAiPipeline}
                                >
                                    Generate Code
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            )
        }
    ];

    return (
        <>
            {/* Header with Title and Back Button */}
            <header style={{
                height: 'auto',
                padding: '8px 12px',
                background: '#fff',
                borderBottom: '1px solid #f0f0f0',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={navigateToPageList}
                        type="text"
                        aria-label="Back to page list"
                        title="Go back"
                        style={{ marginRight: '8px', padding: '4px 8px' }}
                    />
                    <Title level={4} style={{ margin: 0 }} ellipsis={{ tooltip: selectedPage.name }}>
                        {selectedPage.name}
                        {selectedPage.module && <Text type="secondary" style={{ marginLeft: 8, fontSize: '14px' }}>({selectedPage.module})</Text>}
                    </Title>
                </div>

                {/* Description row - displayed below the title */}
                {selectedPage.description && (
                    <Paragraph
                        type="secondary"
                        style={{
                            marginTop: 4,
                            marginBottom: 0,
                            paddingLeft: '36px'
                        }}
                        ellipsis={{ rows: 2 }}
                    >
                        {selectedPage.description}
                    </Paragraph>
                )}
            </header>

            {/* Toolbar - Separated from the header */}
            <div style={{
                padding: '16px',
                background: '#fafafa',
                borderBottom: '1px solid #f0f0f0',
                zIndex: 10,
                flexShrink: 0,
                marginBottom: '16px'
            }}>
                <Space wrap style={{ width: '100%', justifyContent: 'flex-start' }}>
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
                            Visual Analysis
                        </Button>
                    </Tooltip>

                    <Tooltip title="View detailed page element analysis">
                        <Button
                            icon={<FiAnchor />}
                            onClick={viewXPathAnalysis}
                            aria-label="View Page X-Ray Analysis"
                            disabled={!hasAiAnalysis}
                        >
                            XPath Analysis
                        </Button>
                    </Tooltip>

                    <Tooltip title={!hasGeneratedCode ? "Generate code first to view it" : "View Generated Test Code"}>
                        <Button
                            icon={<CodeOutlined />}
                            onClick={handleViewExistingCode}
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

            {/* Main Content - Tabbed Interface */}
            <div className="page-details-content" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100% - 130px)',
                overflow: 'hidden',
                marginTop: '8px',
                border: '1px solid #f0f0f0',
                borderRadius: '8px',
                background: '#fff'
            }}>
                <div className="tab-header" style={{
                    padding: '0 12px',
                    borderBottom: '1px solid #f0f0f0',
                    background: '#fafafa',
                    maxHeight: '44px',
                    minHeight: '44px',
                    overflow: 'hidden'
                }}>
                    <Tabs
                        activeKey={activeTab}
                        onChange={handleTabChange}
                        type="card"
                        className="recording-tabs custom-tabs"
                        tabBarStyle={{
                            marginBottom: 0,
                            marginTop: 3,
                            height: '40px'
                        }}
                        items={tabItems}
                    />
                </div>
                <div className="tab-content custom-scrollbar" style={{
                    flex: 1,
                    overflow: activeTab === 'locators' ? 'hidden' : 'auto',
                    position: 'relative',
                    height: 'calc(100% - 44px)'
                }}>
                    {tabItems.find(item => item.key === activeTab)?.children}
                </div>
            </div>

            {/* Add custom scrollbar styles */}
            <style>{`
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

                /* Custom tabs styling to match recorder */
                .custom-tabs .ant-tabs-nav::before {
                  border-bottom: none !important;
                }

                .custom-tabs .ant-tabs-tab {
                  border: none !important;
                  background: transparent !important;
                  padding: 8px 16px !important;
                  margin: 0 !important;
                  color: rgba(0, 0, 0, 0.65) !important;
                }

                .custom-tabs .ant-tabs-tab-active {
                  background: #fff !important;
                  border-top-left-radius: 8px !important;
                  border-top-right-radius: 8px !important;
                  border: 1px solid #f0f0f0 !important;
                  border-bottom: none !important;
                  font-weight: 500 !important;
                }

                .custom-tabs .ant-tabs-tab:hover {
                  color: #0071E3 !important;
                }

                .custom-tabs .ant-tabs-ink-bar {
                  display: none !important;
                }
            `}</style>

            {/* State Details Modal */}
            <Modal
                title={editingState?.id ? `Edit State: ${stateTitle}` : "New State Details"}
                open={stateDetailsModalVisible}
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
                open={viewCodeModalVisible}
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
                open={viewLocatorsModalVisible}
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
                open={showDevNameEditor}
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
                        onProceedToXpath={(updatedElements) => {
                            // We're in a modal, so we need to close it before proceeding
                            setShowDevNameEditor(false);
                            proceedToAiXpath(updatedElements);
                        }}
                        inTabView={false}
                    />
                )}
            </Modal>
        </>
    );
};

export default PageDetailView;