// AppiumAnalysisPanel.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
    Button,
    message,
    Input,
    Modal,
    Spin,
    Typography,
    Space,
    Form,
    Progress,
    Layout,
    Divider,
    Dropdown,
    Menu
} from "antd";
import {
    PlusOutlined,
    FolderOutlined,
    SaveOutlined,
    EllipsisOutlined,
    ArrowLeftOutlined,
    FolderOpenOutlined,
    SearchOutlined
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { Logger as PipelineLogger } from "../../lib/ai/logger.js";

// Import refactored components
import PageTree from "./PageTree.jsx";
import PageDetailView from "./PageDetailView.jsx";
import PageXrayView from "./PageXrayView.jsx";
import CodeViewer from "./CodeViewer.jsx";
import AIProgressModal from "./AIProgressModal.jsx"; // Import the new AI Progress Modal
import { executePOMClassPipeline } from "../../lib/ai/PomPipeline.js";
import { executeXpathPipeline } from "../../lib/ai/pipeline.js";

const { Text, Title } = Typography;
const { Search } = Input;
const { Sider, Content } = Layout;

const generateId = () => `id_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;

export default function AppiumAnalysisPanel() {
    const [pages, setPages] = useState([]);
    const [selectedPageId, setSelectedPageId] = useState(null);
    const selectedPage = useMemo(() => pages.find(p => p.id === selectedPageId), [pages, selectedPageId]);
    const [currentView, setCurrentView] = useState('pageList');
    const [saving, setSaving] = useState(false);
    const [fileHandle, setFileHandle] = useState(null);
    const [newPageModalVisible, setNewPageModalVisible] = useState(false);
    const [editPageModalVisible, setEditPageModalVisible] = useState(false);
    const [editingPageData, setEditingPageData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedKeys, setExpandedKeys] = useState([]);
    const [autoExpandParent, setAutoExpandParent] = useState(true);
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [newPageForm] = Form.useForm();
    const [editPageForm] = Form.useForm();
    const [xrayViewMode,setXrayViewMode] = useState('default')
    // Replace basic progress modal with the AI progress modal
    const [aiProgressVisible, setAiProgressVisible] = useState(false);
    const [aiProgressMessage, setAiProgressMessage] = useState("");
    
    // Code Viewer state
    const [currentPageForCode, setCurrentPageForCode] = useState(null);
    const [codeLanguage, setCodeLanguage] = useState("java");
    const [codeTitle, setCodeTitle] = useState("Code Viewer");
    
    const dispatch = useDispatch();
    const inspectorState = useSelector((state) => state.inspector);

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
    const handleRegenerateLocators = async (page) => {
        if (!page || !page.aiAnalysis || !page.aiAnalysis.visualElements) {
          console.error("Cannot regenerate locators: Missing page or visual elements data");
          return;
        }
      
        // Subscribe to pipeline logs
        PipelineLogger.subscribe(handlePipelineLogs);
        
        try {
          // Show progress modal
          showAiProgressModal("Regenerating XPath locators...");
          
          // Get the visual elements from the page
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
          
          // Execute the XPath pipeline with visual elements
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
          
          // Important: Force a refresh of the XRay view with the updated page data
          setSelectedPageId(updatedPage.id);
          
          // Stay in XRay view with the updated locators
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
          // Unsubscribe from pipeline logs
          PipelineLogger.unsubscribe(handlePipelineLogs);
        }
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
    
    const navigateToPageXray = (viewMode='default') => {
        if (selectedPage) {
            setXrayViewMode(viewMode) 
            setCurrentView('pageXray');
        } else {
            message.error("No page selected");
        }
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
        if (!selectedPage) {
            message.error("No page selected");
            return;
        }
        
        // Check if code exists in the page's aiAnalysis
        if (selectedPage.aiAnalysis?.code) {
            viewCode(selectedPage, "java", `Page Object Model for ${selectedPage.name}`);
        } else {
            message.info("No code has been generated for this page yet. Please use 'Generate Code' first.");
        }
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
    
    const handlePipelineLogs = (log) => {
        // Update the AI progress message
        updateAiProgressMessage(log.message);
    };
    
    const handleOnProceedToPom = async (page) => {
        updatePage(page);
        
        // Subscribe to the logger before starting
        PipelineLogger.subscribe(handlePipelineLogs);
        
        // Show the AI progress modal at the start
        showAiProgressModal("Initializing AI code generation...");
        
        try {
            // Execute the POM pipeline
            const result = await executePOMClassPipeline(page);
            
            // Update the page with the results
            if (result) {
                // Ensure aiAnalysis object exists
                const updatedPage = { 
                    ...page,
                    aiAnalysis: {
                        ...(page.aiAnalysis || {}),
                        code: result
                    }
                };
                
                // Update the page state
                updatePage(updatedPage);
                
                // Set the current page for code
                setCurrentPageForCode(updatedPage);
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
            hideAiProgressModal();
        }
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
    
    // Handler for completing visual analysis
    const handleVisualAnalysisComplete = (updatedPage) => {
        // Update the page with the results
        updatePage(updatedPage);
        
        // Navigate to the X-ray view
        setCurrentView('pageXray');
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

    // Original buildTreeData function
    function buildTreeData(pages, searchTerm) {
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
    }
    
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

    return (
        <Layout style={{ height: '100vh', background: '#fff' }} >
            <Sider width={300} theme="light"  style={{ borderRight: '1px solid #f0f0f0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '10px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ marginBottom: '10px', display: 'flex', gap: '8px' }}>
                        <Button icon={<PlusOutlined />} onClick={showNewPageModal} block type="primary" ghost> New Page </Button>
                        <Dropdown overlay={ <Menu> <Menu.Item key="open" icon={<FolderOpenOutlined />} onClick={openSavedFile}> Open File... </Menu.Item> <Menu.Item key="save_location" icon={<SaveOutlined />} onClick={chooseFile}> Select Save Location... </Menu.Item> <Menu.Item key="save" icon={<SaveOutlined />} onClick={saveToFile} disabled={saving || pages.length === 0}> {saving ? "Saving..." : "Save Project"} </Menu.Item> </Menu> } trigger={['click']} >
                            <Button icon={<EllipsisOutlined />} aria-label="File Actions" />
                        </Dropdown>
                    </div>
                    <Search placeholder="Search pages or modules..." allowClear onSearch={setSearchTerm} onChange={e => setSearchTerm(e.target.value)} prefix={<SearchOutlined />} />
                </div>

                <div style={{ flexGrow: 1, overflowY: 'auto', padding: '0 10px 10px 10px' }}>
                    <PageTree
                        treeData={treeData}
                        selectedKeys={selectedKeys}
                        expandedKeys={expandedKeys}
                        autoExpandParent={autoExpandParent}
                        onSelect={handleTreeSelect}
                        onExpand={onTreeExpand}
                        onEdit={showEditPageModal}
                        onDelete={deletePage}
                        searchTerm={searchTerm}
                        pages={pages}
                    />
                </div>
            </Sider>
            
            <Content style={{ padding: '10px', overflowY: 'auto', background: '#f0f2f5' }}>
                {currentView === 'pageList' && !selectedPageId && (
                    <div style={{ textAlign: 'center', marginTop: '20vh' }}>
                        <Title level={4} type="secondary" style={{ marginTop: 16 }}>Select a Page</Title>
                        <Text type="secondary">Choose a page to view its states, or open a saved file.</Text>
                        <Divider/>
                        <Button icon={<FolderOpenOutlined />} onClick={openSavedFile}> Open Saved File... </Button>
                    </div>
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
                        // Pass the AI progress modal functions 
                        showAiProgressModal={showAiProgressModal}
                        updateAiProgressMessage={updateAiProgressMessage}
                        hideAiProgressModal={hideAiProgressModal}
                    />
                )}
                
                {currentView === 'pageList' && selectedPageId && (
                    <div style={{ textAlign: 'center', marginTop: '20vh' }}>
                        <ArrowLeftOutlined style={{ fontSize: '48px', color: '#d9d9d9' }}/>
                        <Title level={4} type="secondary" style={{ marginTop: 16 }}>Page Deselected</Title>
                        <Text type="secondary">Select the page again to view details.</Text>
                    </div>
                )}
                
                {currentView === 'pageXray' && selectedPageId && (
                    <PageXrayView
                        viewMode={xrayViewMode}
                        onRegenerateLocators={handleRegenerateLocators }
                        page={selectedPage}
                        onApplyChanges={updatePage}
                        onProceedToPom={handleOnProceedToPom}
                        onExit={() => navigateToPageDetail(selectedPageId)}
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
            
            {/* Use the new AI Progress Modal */}
            <AIProgressModal
                visible={aiProgressVisible}
                message={aiProgressMessage}
                allowCancel={false}
            />
            
            {/* Create New Page Modal */}
            <Modal title="Create New Page" visible={newPageModalVisible} onOk={createNewPage} onCancel={() => setNewPageModalVisible(false)} okText="Create" destroyOnClose >
                <Form form={newPageForm} layout="vertical" name="newPageForm">
                    <Form.Item name="name" label="Page Name" rules={[{ required: true, message: 'Please enter page name', whitespace: true }]}>
                        <Input placeholder="e.g., Login Screen" />
                    </Form.Item>
                    <Form.Item name="module" label="Module Path (Optional)" tooltip="Use '/' for hierarchy, e.g., Auth/Login">
                        <Input placeholder="e.g., Settings/Profile" />
                    </Form.Item>
                    <Form.Item name="description" label="Description (Optional)">
                        <Input.TextArea rows={3} placeholder="Page's purpose" />
                    </Form.Item>
                </Form>
            </Modal>
            
            {/* Edit Page Modal */}
            <Modal title={`Edit Page: ${editingPageData?.name || ''}`} visible={editPageModalVisible} onOk={editPage} onCancel={() => { setEditPageModalVisible(false); setEditingPageData(null); }} okText="Save Changes" destroyOnClose >
                <Form form={editPageForm} layout="vertical" name="editPageForm" initialValues={editingPageData}>
                    <Form.Item name="name" label="Page Name" rules={[{ required: true, message: 'Please enter page name', whitespace: true }]}>
                        <Input placeholder="e.g., Login Screen" />
                    </Form.Item>
                    <Form.Item name="module" label="Module Path (Optional)" tooltip="Use '/' for hierarchy, e.g., Auth/Login">
                        <Input placeholder="e.g., Settings/Profile" />
                    </Form.Item>
                    <Form.Item name="description" label="Description (Optional)">
                        <Input.TextArea rows={3} placeholder="Page's purpose" />
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
}