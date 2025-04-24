import React, { useState, useEffect, useMemo } from "react";
import {
    Button,
    List,
    message,
    Input,
    Modal,
    Spin,
    Card,
    Dropdown,
    Menu,
    Typography,
    Space,
    Popconfirm,
    Tooltip,
    Tree,
    Form,
    Progress,
    Layout,
    Divider
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import {
    PlusOutlined,
    FolderOutlined,
    SaveOutlined,
    DeleteOutlined,
    EditOutlined,
    EllipsisOutlined,
    StarOutlined,
    StarFilled,
    AppleOutlined,
    AndroidOutlined,
    CodeOutlined,
    AimOutlined,
    PlusCircleOutlined,
    FileTextOutlined,
    ArrowLeftOutlined,
    FileSearchOutlined,
    CodeSandboxOutlined,
    CloudUploadOutlined,
    FolderOpenOutlined,
    SearchOutlined
} from "@ant-design/icons";
import {  BiSolidGraduation } from "react-icons/bi";
import { executeVisualPipeline,executeXpathPipeline } from "../../lib/ai/pipeline.js";
import {Logger as PipelineLogger} from "../../lib/ai/logger.js"
import XrayComponent from "./Xray.jsx";
import DevNamesEditorModal from "./Modals/DevNamesEditorModal.js";
import DevNameEditor from "./DevNamesEditor.js";
import CodeViewer from "./CodeViewer.jsx"; // Import the CodeViewer component

import { IoCardOutline } from "react-icons/io5";
import XPathHighlighter from './XPathHighlighter';

import ResizableTabs from "../Xray/ResizableTabs.jsx";
import XrayRootComponent from "../Xray/XrayRootComponent.jsx";
import {LocatorElementList} from "./LocatorElementList.js";
import FinalResizableTabsContainer from "../Xray/XrayRootComponent.jsx";
import { executePOMClassPipeline } from "../../lib/ai/PomPipeline.js";

//import Xray from "./Xray.jsx";
const { Text, Title, Paragraph } = Typography;
const { TextArea, Search } = Input;
const { Sider, Content } = Layout;

const generateId = () => `id_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;

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

const getPlaceholderLocators = (pageName) => {
  return `# AI-Generated Locators for "${pageName}"
## iOS Locators (Example)
- Login Button: XPath=//XCUIElementTypeButton[@name="login"]
- Username Field: accessibility id=username_input

## Android Locators (Example)
- Login Button: id=com.example.app:id/login_button
- Username Field: id=com.example.app:id/username_input
`;
};

const buildTreeData = (pages, searchTerm) => {
    const tree = [];
    const map = {};
    const expandedKeys = new Set();
    const lowerSearchTerm = searchTerm.toLowerCase().trim();

    const pageMatchesSearch = (page) => {
        if (!lowerSearchTerm) return true;
        return (
            page.name.toLowerCase().includes(lowerSearchTerm) ||
            (page.description && page.description.toLowerCase().includes(lowerSearchTerm)) ||
            (page.module && page.module.toLowerCase().includes(lowerSearchTerm))
        );
    };

    const filteredPages = pages.filter(pageMatchesSearch);
    const matchedModulePaths = new Set();

    filteredPages.forEach(page => {
        const modulePath = page.module || 'Uncategorized';
        const pathParts = modulePath.split('/').map(part => part.trim()).filter(part => part);
        let currentPath = '';
        pathParts.forEach((part, index) => {
            currentPath = index === 0 ? part : `${currentPath}/${part}`;
            matchedModulePaths.add(currentPath);
        });
        if (pathParts.length === 0 && pageMatchesSearch(page)) {
             matchedModulePaths.add('Uncategorized');
        }
    });

    pages.forEach(page => {
        const modulePath = page.module || 'Uncategorized';
        const pathParts = modulePath.split('/').map(part => part.trim()).filter(part => part);
        let currentLevel = tree;
        let currentPath = '';
        let parentKey = '';
        let canAddPage = pageMatchesSearch(page);
        let moduleBranchRelevant = false;

        if (pathParts.length === 0 && canAddPage) {
            moduleBranchRelevant = true;
        } else {
            let tempPathCheck = '';
            for (const part of pathParts) {
                tempPathCheck = tempPathCheck ? `${tempPathCheck}/${part}` : part;
                if (matchedModulePaths.has(tempPathCheck)) {
                    moduleBranchRelevant = true;
                    break;
                }
            }
        }

        if (moduleBranchRelevant) {
            let lastValidParentKey = '';

            if (pathParts.length === 0) {
                parentKey = 'module_Uncategorized';
                lastValidParentKey = parentKey;
            } else {
                pathParts.forEach((part, index) => {
                    currentPath = index === 0 ? part : `${currentPath}/${part}`;
                    const nodeKey = `module_${currentPath}`;

                    let shouldProcessModule = matchedModulePaths.has(currentPath) || (index === pathParts.length - 1 && canAddPage);

                    if (shouldProcessModule) {
                        if (lowerSearchTerm && parentKey && matchedModulePaths.has(currentPath)) {
                            expandedKeys.add(parentKey);
                        }

                        let node = map[nodeKey];
                        if (!node) {
                            node = {
                                title: part,
                                key: nodeKey,
                                children: [],
                                icon: <FolderOutlined />,
                                isModule: true,
                            };
                            map[nodeKey] = node;
                            const parentNode = map[parentKey];
                            if (parentNode) {
                                if (!parentNode.children.some(child => child.key === nodeKey)) {
                                    parentNode.children.push(node);
                                }
                            } else {
                                if (!tree.some(rootNode => rootNode.key === nodeKey)) {
                                    tree.push(node);
                                }
                            }
                        }
                        currentLevel = node.children;
                        parentKey = nodeKey;
                        lastValidParentKey = nodeKey;
                    } else {
                         currentLevel = null;
                         parentKey = nodeKey;
                    }
                });
            }

            if (canAddPage) {
                const pageKey = `page_${page.id}`;
                const targetLevel = pathParts.length === 0
                     ? tree
                     : (map[lastValidParentKey] ? map[lastValidParentKey].children : null);

                if (targetLevel && !targetLevel.some(child => child.key === pageKey)) {
                    const pageNode = {
                        title: page.name,
                        key: pageKey,
                        // icon: <FileTextOutlined />,
                        isLeaf: true,
                        isModule: false,
                        pageData: page,
                    };
                    targetLevel.push(pageNode);
                    map[pageKey] = pageNode;
                     if (lowerSearchTerm && lastValidParentKey && lastValidParentKey !== 'module_Uncategorized') {
                        expandedKeys.add(lastValidParentKey);
                    }
                }
            }
        }
    });

    const sortNodes = (nodes) => {
        nodes.sort((a, b) => {
            if (a.isModule && !b.isModule) return -1;
            if (!a.isModule && b.isModule) return 1;
            return a.title.localeCompare(b.title);
        });
        nodes.forEach(node => {
            if (node.children) sortNodes(node.children);
        });
    };
    sortNodes(tree);

    const filterEmptyModules = (nodes) => {
         if (!lowerSearchTerm) return nodes;

        return nodes.filter(node => {
            if (node.isModule) {
                if (node.children) {
                    node.children = filterEmptyModules(node.children);
                }
                const moduleNameMatches = lowerSearchTerm && node.title.toLowerCase().includes(lowerSearchTerm);
                return (node.children && node.children.length > 0) || moduleNameMatches;
            }
            return true;
        });
    };

     const finalTree = filterEmptyModules(tree);

    return { treeData: finalTree, expandedKeys: Array.from(expandedKeys) };
};

export default function AppiumAnalysisPanel() {
    const [pages, setPages] = useState([]);
    const [selectedPageId, setSelectedPageId] = useState(null);
    const selectedPage = useMemo(() => pages.find(p => p.id === selectedPageId), [pages, selectedPageId]);
    const [aiJsonResult, setAiJsonResult] = useState(null);
    const [aiVisualResult,setAiVisualResult] = useState(null)
    const [aiXpathResult,setAiXpathResult] = useState(null)
    const [currentView, setCurrentView] = useState('pageList');
    const [saving, setSaving] = useState(false);
    const [fileHandle, setFileHandle] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [capturingProgress, setCapturingProgress] = useState(0);
    const [captureStatusMessage, setCaptureStatusMessage] = useState('');
    const [captureTargetStateId, setCaptureTargetStateId] = useState(null);
    const [captureIntendedOs, setCaptureIntendedOs] = useState(null);
    const [newPageModalVisible, setNewPageModalVisible] = useState(false);
    const [editPageModalVisible, setEditPageModalVisible] = useState(false);
    const [stateDetailsModalVisible, setStateDetailsModalVisible] = useState(false);
    const [viewCodeModalVisible, setViewCodeModalVisible] = useState(false);
    const [viewLocatorsModalVisible, setViewLocatorsModalVisible] = useState(false);
    const [editingState, setEditingState] = useState(null);
    const [stateTitle, setStateTitle] = useState("");
    const [stateDescription, setStateDescription] = useState("");
    const [currentPageForCode, setCurrentPageForCode] = useState(null);
    const [editingPageData, setEditingPageData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedKeys, setExpandedKeys] = useState([]);
    const [autoExpandParent, setAutoExpandParent] = useState(true);
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [isXrayModalVisible,setIsXrayModalVisible] = useState([]);
    const dispatch = useDispatch();
    const inspectorState = useSelector((state) => state.inspector);
    const [newPageForm] = Form.useForm();
    const [editPageForm] = Form.useForm();
    const [viewXrayConfirmationModalVisible,setViewXrayConfirmationModalVisible] = useState(false);
    
    // New state variables for CodeViewer
    const [codeLanguage, setCodeLanguage] = useState("java");
    const [codeTitle, setCodeTitle] = useState("Code Viewer");
    
    // const [viewXrayModalVisible,setViewXrayModalVisible]=useState(false);
    const { treeData, expandedKeys: initialExpandedKeys } = useMemo(
        () => buildTreeData(pages, searchTerm),
        [pages, searchTerm]
    );

    useEffect(() => {
         if (searchTerm && initialExpandedKeys.length > 0) {
             setExpandedKeys(initialExpandedKeys);
             setAutoExpandParent(true);
         } else if (!searchTerm) {
             setAutoExpandParent(false);
         }
     }, [searchTerm, initialExpandedKeys]);

    useEffect(() => {
        if (selectedPageId && !pages.some(p => p.id === selectedPageId)) {
            setSelectedPageId(null);
            setCurrentView('pageList');
            setSelectedKeys([]);
        }
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

    const showNewPageModal = () => {
        newPageForm.resetFields();
        setNewPageModalVisible(true);
    };

    const createNewPage = async () => {
        try {
            const values = await newPageForm.validateFields();
            const newPage = {
                id: generateId(),
                name: values.name.trim(),
                description: values.description?.trim() || '',
                module: values.module?.trim().replace(/\/$/, '') || '',
                states: [],
                createdAt: new Date().toISOString()
            };
            setPages(prevPages => [...prevPages, newPage].sort((a, b) => a.name.localeCompare(b.name)));
            setNewPageModalVisible(false);
            message.success(`Page "${newPage.name}" created`);
        } catch (errorInfo) {
            console.log('Validation failed:', errorInfo);
            message.error("Please fill in the required fields.");
        }
    };

    const showEditPageModal = (pageData) => {
        setEditingPageData(pageData);
        editPageForm.setFieldsValue({
            name: pageData.name,
            description: pageData.description,
            module: pageData.module
        });
        setEditPageModalVisible(true);
    };

    const editPage = async () => {
        if (!editingPageData) return;
        try {
            const values = await editPageForm.validateFields();
            setPages(prevPages => prevPages.map(page =>
                page.id === editingPageData.id
                    ? {
                        ...page,
                        name: values.name.trim(),
                        description: values.description?.trim() || '',
                        module: values.module?.trim().replace(/\/$/, '') || '',
                    }
                    : page
            ));
            setEditPageModalVisible(false);
            message.success(`Page "${values.name.trim()}" updated`);
            setEditingPageData(null);
        } catch (errorInfo) {
            console.log('Validation failed:', errorInfo);
            message.error("Please fill in the required fields.");
        }
    };

    const deletePage = (pageIdToDelete) => {
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

    const navigateToPageDetail = (pageId) => {
        if (pageId) {
            setSelectedPageId(pageId);
            setCurrentView('pageDetail');
            setSelectedKeys([`page_${pageId}`]);
        }
    };

    const navigateToPageList = () => {
        setSelectedPageId(null);
        setCurrentView('pageList');
        setSelectedKeys([]);
    };
    
    const navigateToPageXray = () => {
        setCurrentView('pageXray')
    };
    
    // Function to view code with CodeViewer
    const viewCode = (page, language = "java", title = "Page Object Model") => {
        setCurrentPageForCode(page);
        setCodeLanguage(language);
        setCodeTitle(title);
        setCurrentView('codeViewer');
    };
    
    // Function to navigate back from code viewer
    const navigateFromCodeViewer = () => {
        setCurrentView('pageDetail');
    };
    
    // Function to view existing code
    const viewExistingCode = () => {
        if (!selectedPage) return;
        
        // Check if code exists in the page's aiAnalysis
        if (selectedPage.aiAnalysis?.code) {
            viewCode(selectedPage, "java", `Page Object Model for ${selectedPage.name}`);
        } else {
            message.info("No code has been generated for this page yet. Please use 'Generate Code' first.");
        }
    };
    
    const startCapture = (targetStateId = null, intendedOs = null) => {
        if (!selectedPageId) {
             message.error("Please select a page before capturing a state.");
             return;
         }
         if (!inspectorState?.driver) {
             message.error("Driver not available. Cannot capture state.");
             return;
         }
         console.log('inspectorState------------' ) 
         console.log(inspectorState)
        const actualOsType = inspectorState.driver.client.isIOS ? 'ios' : (inspectorState.driver.client.isAndroid ? 'android' : null);
         console.log("Actual OS Type:", actualOsType);
         console.log("Intended OS Type:", intendedOs);
        if (intendedOs && actualOsType && intendedOs !== actualOsType) {
            message.error(`Connect to an ${intendedOs.toUpperCase()} device/emulator to capture this version. Currently connected: ${actualOsType.toUpperCase()}.`);
            return;
        }
        console.log("Intended OS Type:", intendedOs);
        setCaptureTargetStateId(targetStateId);
        console.log("Capture Target State ID:", targetStateId);
        console.log("-------------captureTargetStateId-------------", captureTargetStateId);
        setCaptureIntendedOs(intendedOs || actualOsType);
        
        captureState(targetStateId);
    };
    const captureState = async (targetStateId) => {
         if (!selectedPageId || !inspectorState?.driver || isCapturing) {
             if (isCapturing) message.warn("Capture already in progress.");
             return;
         }
         console.log("-------------captureTargetStateId-------------", captureTargetStateId);
        //const targetStateId = captureTargetStateId;
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

            setPages(prevPages => {
                const updatedPages = [...prevPages];
                const pageIndex = updatedPages.findIndex(page => page.id === selectedPageId);
                if (pageIndex === -1) return prevPages;

                const currentPage = { ...updatedPages[pageIndex], states: [...(updatedPages[pageIndex].states || []) ]};

                let stateUpdated = false;
                console.log("targetStateId", targetStateId);
                if (targetStateId) {
                    const stateIndex = currentPage.states.findIndex(state => state.id === targetStateId);
                    if (stateIndex !== -1) {
                        const existingState = { ...currentPage.states[stateIndex] };
                        const isRecapture = !!existingState.versions?.[osToCapture];

                        existingState.versions = {
                            ...(existingState.versions || {}),
                            [osToCapture]: capturedVersionData
                        };

                        currentPage.states[stateIndex] = existingState;
                        updatedPages[pageIndex] = currentPage;

                        message.success(`${isRecapture ? 'Recaptured' : 'Added'} ${osToCapture.toUpperCase()} version for state "${existingState.title}".`);
                        stateUpdated = true;
                    }
                }

                if (!stateUpdated) {
                    const newState = {
                        id: generateId(),
                        timeStamp: new Date().toISOString(),
                        versions: { [osToCapture]: capturedVersionData },
                        title: `New State (${osToCapture.toUpperCase()}) ${new Date().toLocaleTimeString()}`,
                        description: "",
                        isDefault: currentPage.states.length === 0
                    };
                    currentPage.states.push(newState);
                    updatedPages[pageIndex] = currentPage;

                    setEditingState(newState);
                    setStateTitle(newState.title);
                    setStateDescription(newState.description);
                    setStateDetailsModalVisible(true);

                    message.success(`Captured new state for ${osToCapture.toUpperCase()}. Please provide details.`);
                }

                return updatedPages;
            });

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
    const getPageById = (pageId) => {
        return pages.find(page => page.id === pageId) || null;
    };

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
        setPages(prevPages => prevPages.map(page => {
            if (page.id !== selectedPageId) return page;
            const updatedStates = page.states.map(state =>
                state.id === editingState.id ? { ...state, title: stateTitle.trim(), description: stateDescription.trim() } : state
            );
            return { ...page, states: updatedStates };
        }));
        setStateDetailsModalVisible(false);
        setEditingState(null);
        message.success("State details saved");
    };

     const toggleDefaultState = (stateId) => {
         setPages(prevPages => prevPages.map(page => {
             if (page.id !== selectedPageId) return page;
             let foundDefault = false;
             const updatedStates = page.states.map(state => {
                 const isNowDefault = state.id === stateId;
                 if (isNowDefault) foundDefault = true;
                 return { ...state, isDefault: isNowDefault };
             });
             if (!foundDefault && updatedStates.length > 0) {
                 updatedStates[0].isDefault = true;
             }
             return { ...page, states: updatedStates };
         }));
         message.success("Default state updated");
     };

    const deleteState = (stateId) => {
        setPages(prevPages => prevPages.map(page => {
            if (page.id !== selectedPageId) return page;
            const stateToDelete = page.states.find(state => state.id === stateId);
            if (!stateToDelete) return page;

            const wasDefault = stateToDelete.isDefault || false;
            const remainingStates = page.states.filter(state => state.id !== stateId);

            if (wasDefault && remainingStates.length > 0 && !remainingStates.some(s => s.isDefault)) {
                remainingStates[0].isDefault = true;
            }
            return { ...page, states: remainingStates };
        }));
        message.success("State deleted");
    };

    const viewPageObjectModel = () => {
        if (!selectedPage) return;
        setCurrentPageForCode(selectedPage);
        setViewCodeModalVisible(true);
    };

    const viewLocators = () => {
        if (!selectedPage) return;
        setCurrentPageForCode(selectedPage);
        setViewLocatorsModalVisible(true);
    };
    
    const handlePipelineLogs = (log) => {
        updateProgressPopupMessage(log.message);
    };
       
    const startAiPipeline = async () => {
        PipelineLogger.subscribe(handlePipelineLogs);
        try {
            showProgressPopup("Initializing...");
            
            setAiVisualResult(await executeVisualPipeline(selectedPage, ['ios', 'android']));
            setViewLocatorsModalVisible(true);
        } catch (e) {
            console.log(e);
        } finally {
            PipelineLogger.unsubscribe(handlePipelineLogs);
            hideProgressPopup();
        }
    };
    
    const proceedToAiXpath = async (aiVisualResult) => {
        if(selectedPage['aiAnalysis'] == null)
            selectedPage['aiAnalysis'] = {};
        
        selectedPage['aiAnalysis']['visualElements'] = aiVisualResult;
        
        updatePage(selectedPage);
        setViewLocatorsModalVisible(false);
        PipelineLogger.subscribe(handlePipelineLogs);
        try {
            showProgressPopup("XPATH Detection starting...");
            const res = await executeXpathPipeline(aiVisualResult, ['ios', 'android']);
            console.log("res:", res);
            setAiXpathResult(res);
        
            // temporary before the final review for locators
            selectedPage['aiAnalysis']['locators'] = res;
            console.log("aiXpathResult:", aiXpathResult);
            updatePage(selectedPage);
            navigateToPageXray();
        } catch(e) {
            console.log(e);
        } finally {
            hideProgressPopup();
            PipelineLogger.unsubscribe(handlePipelineLogs);
        }
    };
    
    const handleXpathSave = (data) => {
        setAiXpathResult(aiXpathResult);
        selectedPage['aiAnalysis']['locators'] = aiXpathResult;
        
        updatePage(selectedPage);
    };
    
    const chooseFile = async () => {
        try {
            if (!window.showSaveFilePicker) {
                 message.error("File System Access API is not supported in this browser or context (requires HTTPS/localhost).");
                 return;
             }
            const handle = await window.showSaveFilePicker({
                suggestedName: `appium_pages_${new Date().toISOString().split('T')[0]}.json`,
                types: [{ description: "Appium Pages JSON", accept: { "application/json": [".json"] } }],
            });
            setFileHandle(handle);
            message.success(`Selected save location: ${handle.name}`);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("File picker error:", err);
                message.error(`File selection failed: ${err.message}`);
            }
        }
    };
    const [progressPopupVisible, setProgressPopupVisible] = useState(false);
    const [progressPopupMessage, setProgressPopupMessage] = useState("");

    const showProgressPopup = (message) => {
        setProgressPopupMessage(message);
        setProgressPopupVisible(true);
    };

    const updateProgressPopupMessage = (message) => {
        setProgressPopupMessage(message);
    };

    const hideProgressPopup = () => {
        setProgressPopupVisible(false);
        setProgressPopupMessage("");
    };

    // Example usage:
    // showProgressPopup("Initializing...");
    // updateProgressPopupMessage("Processing data...");
    // hideProgressPopup();
    
    const saveToFile = async () => {
        let handleToSave = fileHandle;
        if (!handleToSave) {
             try {
                  if (!window.showSaveFilePicker) {
                      message.error("File System Access API is not supported. Please select file location first.");
                      return;
                  }
                  handleToSave = await window.showSaveFilePicker({
                      suggestedName: `appium_pages_${new Date().toISOString().split('T')[0]}.json`,
                      types: [{ description: "Appium Pages JSON", accept: { "application/json": [".json"] } }],
                  });
                  setFileHandle(handleToSave);
              } catch (err) {
                  if (err.name !== 'AbortError') { message.error(`Failed to get save location: ${err.message}`); }
                  return;
              }
        }

        if (pages.length === 0) return message.warn("No pages to save.");
        setSaving(true);
        try {
            const saveData = { version: 2, createdAt: new Date().toISOString(), pages: pages };
            const writable = await handleToSave.createWritable();
            await writable.write(JSON.stringify(saveData, null, 2));
            await writable.close();
            message.success(`Saved ${pages.length} page(s) successfully to ${handleToSave.name}.`);
        } catch (err) {
            console.error("Save error:", err);
            message.error(`Failed to save file: ${err.message}`);
            setFileHandle(null);
        } finally {
            setSaving(false);
        }
    };

    const openSavedFile = async () => {
        try {
            if (!window.showOpenFilePicker) {
                 message.error("File System Access API is not supported in this browser or context (requires HTTPS/localhost).");
                 return;
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
                setCurrentView('pageList');
                setSelectedPageId(null);
                setSelectedKeys([]);
                setSearchTerm('');
                setExpandedKeys([]);
                message.success(`Loaded ${loadedPages.length} page(s) from ${file.name}.`);
            } else {
                message.error("Invalid file format. Could not find a 'pages' array.");
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("File open error:", err);
                message.error(`File opening failed: ${err.message}`);
            }
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
    
    // Updated POM generation function that shows the code viewer after generation
    const handleOnProceedToPom = async (page) => {
        onUpdateSelectedPage(page);
        
        // Subscribe to the logger before starting
        PipelineLogger.subscribe(handlePipelineLogs);
        
        // Show progress modal at the start
        showProgressPopup("Initializing code generation...");
        
        try {
            // Execute the POM pipeline
            const result = await executePOMClassPipeline(page);
            
            // Update the page with the results if needed
            if (result) {
                console.log(result);
                // Ensure aiAnalysis object exists
                if (!page.aiAnalysis) {
                    page.aiAnalysis = {};
                }
                // Store the generated code
                page.aiAnalysis.code = result;
                onUpdateSelectedPage(page);
            }
            
            message.success("Page Object Model generated successfully");
            
            // Show the code viewer with the generated code
            viewCode(page, "java", `Page Object Model for ${page.name}`);
            
        } catch (error) {
            console.error("Error generating POM:", error);
            message.error(`Failed to generate Page Object Model: ${error.message || 'Unknown error'}`);
        } finally {
            // Unsubscribe from the logger and hide the progress modal when done
            PipelineLogger.unsubscribe(handlePipelineLogs);
            hideProgressPopup();
        }
    };
    
    const onUpdateSelectedPage = (page) => {
        if (!page || !page.id) {
            console.warn("Cannot update page: Invalid page object or missing ID");
            return;
        }
        
        // Use the existing updatePage function to update the page in pages state
        updatePage(page);
        
        message.success(`Page "${page.name}" updated successfully`);
    };
    
    const fake = () => {
        navigateToPageXray();
    };
      
    const renderPageXray = () => {
        return (
            <FinalResizableTabsContainer 
                onApplyChanges={onUpdateSelectedPage}
                page={selectedPage}
                onProceedToPom={handleOnProceedToPom}
                pageChanged={onUpdateSelectedPage}
                onExit={navigateToPageDetail} 
            />
        );
    };
    
    const renderPageXrayModal = () => {
        return (
            <>
                <Button onClick={() => setIsXrayModalVisible(true)}>Open Modal</Button>
                
                <FinalResizableTabsContainer
                    visible={isXrayModalVisible}
                    page={selectedPage}
                    //onClose={() => setIsModalVisible(false)}
                    onProceedToPom={handleOnProceedToPom}
                    pageChanged={onUpdateSelectedPage}
                    onExit={navigateToPageDetail}  
                />
            </>
        );
    };
    
    // Render the CodeViewer component
    const renderCodeViewer = () => {
        if (!currentPageForCode) return null;
        
        return (
            <CodeViewer
                page={currentPageForCode}
                language={codeLanguage}
                title={codeTitle}
                onBack={navigateFromCodeViewer}
                onSave={onUpdateSelectedPage}
                onRegenerate={() => handleOnProceedToPom(currentPageForCode)}
            />
        );
    };
    
    const renderStatesList = () => {
        if (!selectedPage) return <Text type="secondary">Select a page from the list to view its details.</Text>;

        const states = selectedPage.states || [];

        return (
            <>
                <div style={{ marginBottom: '20px', paddingBottom: '0px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <Space align="center">
                            <Button icon={<ArrowLeftOutlined />} onClick={navigateToPageList} type="text" aria-label="Back to page list" />
                            <Title level={4} style={{ margin: 0 }} ellipsis={{ tooltip: selectedPage.name }}>
                                {selectedPage.name}
                                {selectedPage.module && <Text type="secondary" style={{ marginLeft: 8, fontSize: '14px' }}>({selectedPage.module})</Text>}
                            </Title>
                        </Space>
                        {selectedPage.description && <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0, paddingLeft: '36px' }} ellipsis={{ rows: 2}}>{selectedPage.description}</Paragraph>}
                    </div>
                    <Space wrap>
                        <Tooltip title="Capture New State for this Page">
                            <Button
                                type="primary"
                                icon={<AimOutlined />}
                                onClick={() => startCapture()}
                                disabled={isCapturing || !inspectorState?.driver}
                                loading={isCapturing && !captureTargetStateId}
                            >
                                Capture State
                            </Button>
                        </Tooltip>
                        <Tooltip title="View AI-Generated Page Object Model (Placeholder)">
                            <Button icon={<CodeSandboxOutlined />} onClick={viewPageObjectModel}>
                                View POM
                            </Button>
                        </Tooltip>
                        <Button icon={<IoCardOutline />} onClick={fake}>
                            FAKE
                        </Button>
                        <Tooltip title="Execute AI code generation processing for this page">
                            <Button icon={<BiSolidGraduation />} onClick={startAiPipeline}>
                                Generate Code
                            </Button>
                        </Tooltip>
                        <Tooltip title="View AI-Generated Locators (Placeholder)">
                            <Button icon={<FileSearchOutlined />} onClick={viewLocators}>
                                View Locators
                            </Button>
                        </Tooltip>
                        {/* Added View Code button */}
                        <Tooltip title="View Generated Code">
                            <Button 
                                icon={<CodeOutlined />} 
                                onClick={viewExistingCode}
                                disabled={!selectedPage?.aiAnalysis?.code}
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
                                disabled={isCapturing || !inspectorState?.driver}
                            >
                                Capture First State
                            </Button>
                            {!inspectorState?.driver && <Text type="warning" style={{ marginLeft: 8 }}> (Connect driver to capture)</Text>}
                        </div>
                    </div>
                ) : (
                    <List
                        grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
                        dataSource={[...states].sort((a, b) => new Date(b.timeStamp) - new Date(a.timeStamp))}
                        renderItem={(state) => {
                            const hasIOS = !!state.versions?.ios;
                            const hasAndroid = !!state.versions?.android;
                            const canCaptureIOS = inspectorState?.driver?.client?.isIOS;
                            const canCaptureAndroid = inspectorState?.driver?.client?.isAndroid;

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
                                                            disabled={!inspectorState?.driver || isCapturing}
                                                        >
                                                            <Menu.Item
                                                                key="captureiOS"
                                                                icon={<AppleOutlined />}
                                                                onClick={() => startCapture(state.id, 'ios')}
                                                                disabled={!canCaptureIOS || isCapturing}
                                                            >
                                                                {hasIOS ? "Recapture iOS" : "Add iOS"}
                                                            </Menu.Item>
                                                            <Menu.Item
                                                                key="captureAndroid"
                                                                icon={<AndroidOutlined />}
                                                                onClick={() => startCapture(state.id, 'android')}
                                                                disabled={!canCaptureAndroid || isCapturing}
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
                                                <Button type="text" icon={<EllipsisOutlined />} />
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
                                            {hasIOS ? ( <div style={{ textAlign: 'center', maxWidth: '45%' }}> <Text type="secondary" style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>iOS</Text> <img src={`data:image/png;base64,${state.versions.ios.screenShot}`} alt={`iOS Screenshot for ${state.title}`} style={{ maxWidth: "100%", maxHeight: "650px", objectFit: "contain", border: '1px solid #d9d9d9', borderRadius: '4px' }} /> </div> ) : <div style={{ width: '45%'}}></div> }
                                            {hasAndroid ? ( <div style={{ textAlign: 'center', maxWidth: '45%' }}> <Text type="secondary" style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Android</Text> <img src={`data:image/png;base64,${state.versions.android.screenShot}`} alt={`Android Screenshot for ${state.title}`} style={{ maxWidth: "100%", maxHeight: "650px", objectFit: "contain", border: '1px solid #d9d9d9', borderRadius: '4px' }} /> </div> ) : <div style={{ width: '45%'}}></div> }
                                            {!hasIOS && !hasAndroid && ( <div style={{ color: '#bfbfbf', textAlign: 'center', width: '100%' }}>No screenshots available</div> )}
                                        </div>

                                        {state.description ? ( <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }} style={{ marginBottom: '8px', flexGrow: 1 }}> {state.description} </Paragraph> ) : (<div style={{flexGrow: 1}}></div>) }

                                        <div style={{ marginTop: 'auto', borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
                                            <Text type="secondary" style={{ fontSize: '11px' }}> Created: {new Date(state.timeStamp).toLocaleString()} </Text>
                                        </div>
                                    </Card>
                                </List.Item>
                            );
                        }}
                    />
                )}
            </>
        );
    };

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
    
    const handleLocatorElementsChanged = (elements) => {
        alert('elements chgan');
        console.log(elements);
    };
    
    const onTreeExpand = (newExpandedKeys) => {
        setExpandedKeys(newExpandedKeys);
        setAutoExpandParent(false);
    };
    
    const renderTreeNodeTitle = (nodeData) => {
        const { title, key, isModule, pageData, icon } = nodeData;

        if (isModule) {
            return <span className="tree-node-title-wrapper">{title}</span>;
        } else {
            return (
                <span className="tree-node-title-wrapper page-node" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span
                        style={{ flexGrow: 1, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '5px' }}
                        onClick={(e) => { e.stopPropagation(); navigateToPageDetail(pageData.id); }}
                        title={title}
                    >
                        {title}
                    </span>
                    <Space size="small" onClick={e => e.stopPropagation()} className="tree-node-actions" style={{ marginLeft: '8px' }}>
                        <Tooltip title="Edit Page Details">
                            <Button size="small" type="text" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); showEditPageModal(pageData); }} />
                        </Tooltip>
                        <Tooltip title="Delete Page">
                            <Popconfirm
                                title={`Delete "${pageData.name}"?`}
                                description="All captured states will be deleted. This cannot be undone."
                                onConfirm={(e) => { e?.stopPropagation(); deletePage(pageData.id); }}
                                onCancel={(e) => e?.stopPropagation()}
                                okText="Yes, Delete" cancelText="No" placement="right"
                            >
                                <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                            </Popconfirm>
                        </Tooltip>
                    </Space>
                </span>
            );
        }
    };
    
    const sampleXML = `
    <bookstore>
      <book category="COOKING">
        <title lang="en">Everyday Italian</title>
        <author>Giada De Laurentiis</author>
        <year>2005</year>
        <price>30.00</price>
      </book>
      <book category="WEB">
        <title lang="en">Learning XML</title>
        <author>Erik T. Ray</author>
        <year>2003</year>
        <price>39.95</price>
      </book>
    </bookstore>
  `;
    return (
        <Layout style={{ height: '100vh', background: '#fff' }} >
            <Sider width={300} theme="light"  style={{ borderRight: '1px solid #f0f0f0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '10px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ marginBottom: '10px', display: 'flex', gap: '8px' }}>
                        <Button icon={<PlusOutlined />} onClick={showNewPageModal} block type="primary" ghost> New Page </Button>
                        <Dropdown overlay={ <Menu> <Menu.Item key="open" icon={<FolderOpenOutlined />} onClick={openSavedFile}> Open File... </Menu.Item> <Menu.Item key="save_location" icon={<SaveOutlined />} onClick={chooseFile}> Select Save Location... </Menu.Item> <Menu.Item key="save" icon={<CloudUploadOutlined />} onClick={saveToFile} disabled={saving || pages.length === 0}> {saving ? "Saving..." : "Save Project"} </Menu.Item> </Menu> } trigger={['click']} >
                            <Button icon={<EllipsisOutlined />} aria-label="File Actions" />
                        </Dropdown>
                    </div>
                    <Search placeholder="Search pages or modules..." allowClear onSearch={setSearchTerm} onChange={e => setSearchTerm(e.target.value)} prefix={<SearchOutlined />} />
                </div>

                <div style={{ flexGrow: 1, overflowY: 'auto', padding: '0 10px 10px 10px' }}>
                    {pages.length === 0 && !searchTerm ? (
                        <Text type="secondary" style={{ textAlign: 'center', display: 'block', marginTop: 20 }}> No pages created yet. </Text>
                    ) : treeData.length === 0 && searchTerm ? (
                        <Text type="secondary" style={{ textAlign: 'center', display: 'block', marginTop: 20 }}> No pages found matching "${searchTerm}". </Text>
                    ) : (
                        <Tree
                            showIcon blockNode treeData={treeData} onSelect={handleTreeSelect} onExpand={onTreeExpand}
                            expandedKeys={expandedKeys} selectedKeys={selectedKeys} autoExpandParent={autoExpandParent}
                            titleRender={renderTreeNodeTitle} className="pages-tree" style={{ background: 'transparent' }}
                        />
                    )}
                </div>
            </Sider>
            {/* <XPathHighlighter xmlString={sampleXML} /> */}
            
            <Content style={{ padding: '10px', overflowY: 'auto', background: '#f0f2f5' }}>
                {currentView === 'pageList' && !selectedPageId && (
                    <div style={{ textAlign: 'center', marginTop: '20vh' }}>
                        {/* <FileTextOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} /> */}
                        <Title level={4} type="secondary" style={{ marginTop: 16 }}>Select a Page</Title>
                        <Text type="secondary">Choose a page to view its states, or open a saved file.</Text>
                        <Divider/>
                        <Button icon={<FolderOpenOutlined />} onClick={openSavedFile}> Open Saved File... </Button>
                    </div>
                )}
                {currentView === 'pageDetail' && selectedPageId && renderStatesList()}
                {currentView === 'pageList' && selectedPageId && (
                    <div style={{ textAlign: 'center', marginTop: '20vh' }}> <ArrowLeftOutlined style={{ fontSize: '48px', color: '#d9d9d9' }}/> <Title level={4} type="secondary" style={{ marginTop: 16 }}>Page Deselected</Title> <Text type="secondary">Select the page again to view details.</Text> </div>
                )}
                {currentView === 'pageXray' && selectedPageId && renderPageXray()}
                {currentView === 'codeViewer' && renderCodeViewer()}
            </Content>
            
            <Modal
                visible={progressPopupVisible}
                footer={null}
                closable={false}
                centered
                bodyStyle={{ textAlign: "center", padding: "20px" }}
            >
                <Spin size="large" style={{ marginBottom: "16px" }} />
                <Text>{progressPopupMessage}</Text>
            </Modal>
            
            <Modal title="Create New Page" visible={newPageModalVisible} onOk={createNewPage} onCancel={() => setNewPageModalVisible(false)} okText="Create" destroyOnClose >
                <Form form={newPageForm} layout="vertical" name="newPageForm">
                    <Form.Item name="name" label="Page Name" rules={[{ required: true, message: 'Please enter page name', whitespace: true }]}>
                        <Input placeholder="e.g., Login Screen" />
                    </Form.Item>
                    <Form.Item name="module" label="Module Path (Optional)" tooltip="Use '/' for hierarchy, e.g., Auth/Login">
                        <Input placeholder="e.g., Settings/Profile" />
                    </Form.Item>
                    <Form.Item name="description" label="Description (Optional)">
                        <TextArea rows={3} placeholder="Page's purpose" />
                    </Form.Item>
                </Form>
            </Modal>
            
            <Modal title={`Edit Page: ${editingPageData?.name || ''}`} visible={editPageModalVisible} onOk={editPage} onCancel={() => { setEditPageModalVisible(false); setEditingPageData(null); }} okText="Save Changes" destroyOnClose >
                <Form form={editPageForm} layout="vertical" name="editPageForm" initialValues={editingPageData}>
                    <Form.Item name="name" label="Page Name" rules={[{ required: true, message: 'Please enter page name', whitespace: true }]}>
                        <Input placeholder="e.g., Login Screen" />
                    </Form.Item>
                    <Form.Item name="module" label="Module Path (Optional)" tooltip="Use '/' for hierarchy, e.g., Auth/Login">
                        <Input placeholder="e.g., Settings/Profile" />
                    </Form.Item>
                    <Form.Item name="description" label="Description (Optional)">
                        <TextArea rows={3} placeholder="Page's purpose" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal title={editingState?.id ? `Edit State: ${stateTitle}` : "New State Details"} visible={stateDetailsModalVisible} onOk={saveStateDetails} onCancel={() => { setStateDetailsModalVisible(false); setEditingState(null); }} okText="Save Details" width={600} destroyOnClose >
                <Form layout="vertical">
                    <Form.Item label="State Title" required> <Input value={stateTitle} onChange={e => setStateTitle(e.target.value)} placeholder="e.g., Initial View, Error Message" /> </Form.Item>
                    <Form.Item label="State Description (Optional)"> <TextArea rows={4} value={stateDescription} onChange={e => setStateDescription(e.target.value)} placeholder="Describe the specific condition" /> </Form.Item>
                    {editingState && ( <Form.Item label="Captured Versions"> {getOsBadges(editingState)} {!editingState.versions?.ios && !editingState.versions?.android && <Text type="secondary">No versions captured.</Text>} </Form.Item> )}
                </Form>
            </Modal>
            
            <Modal title={`Page locators for "${selectedPage?.name}"`} visible={viewXrayConfirmationModalVisible} onCancel={() => setViewXrayConfirmationModalVisible(false)} 
                footer={null} width="90vw" 
                bodyStyle={{ background: '#f8f8f8', color: '#abb2bf', fontFamily: 'monospace', maxHeight: '70vh', overflowY: 'auto' }} destroyOnClose >
                {/* <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}> {aiXpathResult!=null? JSON.stringify(aiXpathResult).toString() : 'No XPATHS Detected'} </pre> */}
                
                <FinalResizableTabsContainer 
                    onApplyChanges={onUpdateSelectedPage}
                    page={selectedPage}
                    onProceedToPom={handleOnProceedToPom}
                    pageChanged={onUpdateSelectedPage}
                    onExit={navigateToPageDetail}  
                />
            </Modal> 
            
            <Modal title={`Page Object Model for "${currentPageForCode?.name}"`} visible={viewCodeModalVisible} onCancel={() => setViewCodeModalVisible(false)} footer={null} width="70vw" bodyStyle={{ background: '#f8f8f8', color: '#abb2bf', fontFamily: 'monospace', maxHeight: '70vh', overflowY: 'auto' }} destroyOnClose >
                {/* <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}> {aiXpathResult!=null? JSON.stringify(aiXpathResult).toString() : 'No XPATHS Detected'} </pre> */}
                
                <LocatorElementList  
                    initialData={aiXpathResult ? aiXpathResult : (selectedPage?.aiAnalysis?.locators ? selectedPage?.aiAnalysis?.locators : [])}
                    onElementsChanged={handleLocatorElementsChanged}
                    onElementUpdated={handleLocatorElementsChanged}
                    onSave={handleXpathSave}
                />
            </Modal>

            <Modal title={`Locators for "${currentPageForCode?.name}"`} visible={viewLocatorsModalVisible} onCancel={() => setViewLocatorsModalVisible(false)} footer={null} width="60vw" bodyStyle={{ background: '#f8f8f8', color: '#333', fontFamily: 'monospace', maxHeight: '70vh', overflowY: 'auto' }} destroyOnClose >
                <DevNameEditor originalData={aiVisualResult ? aiVisualResult : (selectedPage?.aiAnalysis?.visualElements ? selectedPage?.aiAnalysis?.visualElements : [])} onSave={proceedToAiXpath}/>
                {/* <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}> {selectedPage?.aiAnalysis.visualElements ? JSON.stringify(selectedPage?.aiAnalysis.visualElements) : 'Please run AI Service to generate the locators'} </pre> */}
            </Modal>
            {/* <Modal title="Xray" visible={viewXrayModalVisible} >
                <Xray/>
            </Modal> */}
        </Layout>
    );
}