import React, { useState, useEffect } from "react";
import { Button, List, message, Input, Modal, Tabs, Spin, Card, Dropdown, Menu, Typography, Space, Popconfirm } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { PlusOutlined, SaveOutlined, DeleteOutlined, EditOutlined, EllipsisOutlined, StarOutlined, StarFilled } from "@ant-design/icons";

const { TabPane } = Tabs;
const { Text, Title } = Typography;

export default function AppiumAnalysisPanel() {
  // Main data structure: pages contain states
  const [pages, setPages] = useState([]);
  const [activePage, setActivePage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fileHandle, setFileHandle] = useState(null);
  const [capturingProgress, setCapturingProgress] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Modal states
  const [newPageModalVisible, setNewPageModalVisible] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [currentState, setCurrentState] = useState(null);
  const [stateTitle, setStateTitle] = useState("");
  const [stateDescription, setStateDescription] = useState("");
  const [editPageModalVisible, setEditPageModalVisible] = useState(false);
  const [editPageName, setEditPageName] = useState("");
  const [editPageId, setEditPageId] = useState(null);

  const dispatch = useDispatch();
  const inspectorState = useSelector((state) => state.inspector);

  // Generate unique IDs
  const generateId = () => `id_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;

  useEffect(() => {
    // Set the first page as active if available and none is selected
    if (pages.length > 0 && activePage === null) {
      setActivePage(pages[0].id);
    }
  }, [pages, activePage]);

  const createNewPage = () => {
    if (!newPageName.trim()) {
      message.error("Page name cannot be empty");
      return;
    }

    const newPage = {
      id: generateId(),
      name: newPageName,
      states: [],
      createdAt: new Date().toISOString()
    };

    setPages([...pages, newPage]);
    setActivePage(newPage.id);
    setNewPageName("");
    setNewPageModalVisible(false);
    message.success(`Page "${newPageName}" created`);
  };

  const editPage = () => {
    if (!editPageName.trim()) {
      message.error("Page name cannot be empty");
      return;
    }

    setPages(pages.map(page => 
      page.id === editPageId 
        ? { ...page, name: editPageName }
        : page
    ));
    
    setEditPageModalVisible(false);
    message.success(`Page renamed to "${editPageName}"`);
  };

  const deletePage = (pageId) => {
    const updatedPages = pages.filter(page => page.id !== pageId);
    setPages(updatedPages);
    
    // If the active page was deleted, set the first available page as active
    if (pageId === activePage && updatedPages.length > 0) {
      setActivePage(updatedPages[0].id);
    } else if (updatedPages.length === 0) {
      setActivePage(null);
    }
    
    message.success("Page deleted");
  };

  const captureState = async () => {
    console.log("Capturing state...");
    console.log(inspectorState);
    if (!activePage) {
      message.error("Please create or select a page first");
      return;
    }

    try {
      setIsCapturing(true);
      setCapturingProgress(0);
      
      if (!inspectorState?.driver) {
        throw new Error("Driver is not initialized in the Redux state.");
      }

      // Simulate progress for better UX feedback
      const progressInterval = setInterval(() => {
        setCapturingProgress(prev => {
          const next = prev + 20;
          return next < 90 ? next : prev;
        });
      }, 300);
      
      // Capture all the data we need
      setCapturingProgress(20);
      const screenShot = await inspectorState.driver.takeScreenshot();
      
      setCapturingProgress(40);
      const pageSource = await inspectorState.driver.getPageSource();
      
      setCapturingProgress(60);
      const currentContextName = await inspectorState.driver.getContext();
      
      setCapturingProgress(80);
      const sessionDetails = await inspectorState.driver.getSession();
      
      clearInterval(progressInterval);
      setCapturingProgress(100);

      const newState = {
        id: generateId(),
        timeStamp: new Date().toISOString(),
        screenShot: screenShot,
        pageSource: pageSource,
        contextName: currentContextName,
        sessionDetails: sessionDetails,
        title: "New State", // Generic title instead of time-based
        description: "", // Empty description by default
        isDefault: false // To be determined later
      };

      // Update the pages array with the new state
      setPages(prevPages => {
        const updatedPages = [...prevPages];
        const pageIndex = updatedPages.findIndex(page => page.id === activePage);
        
        if (pageIndex !== -1) {
          const updatedPage = { ...updatedPages[pageIndex] };
          
          // If this is the first state, make it default
          if (updatedPage.states.length === 0) {
            newState.isDefault = true;
          }
          
          updatedPage.states = [...updatedPage.states, newState];
          updatedPages[pageIndex] = updatedPage;
        }
        
        return updatedPages;
      });

      // If this is the first state, it's automatically the default
      // Otherwise, prompt for title and description
      setCurrentState(newState);
      if (pages.find(page => page.id === activePage).states.length > 0) {
        setStateTitle(newState.title);
        setStateDescription("");
        setStateModalVisible(true);
      }
      
      message.success("Captured new state.");
    } catch (err) {
      console.error("Error capturing state:", err);
      message.error("Failed to capture state: " + err.message);
    } finally {
      setIsCapturing(false);
      setCapturingProgress(0);
    }
  };

  const saveStateDetails = () => {
    if (!stateTitle.trim()) {
      message.error("State title cannot be empty");
      return;
    }

    setPages(prevPages => {
      const updatedPages = [...prevPages];
      const pageIndex = updatedPages.findIndex(page => page.id === activePage);
      
      if (pageIndex !== -1) {
        const updatedPage = { ...updatedPages[pageIndex] };
        const stateIndex = updatedPage.states.findIndex(state => state.id === currentState.id);
        
        if (stateIndex !== -1) {
          const updatedStates = [...updatedPage.states];
          updatedStates[stateIndex] = {
            ...updatedStates[stateIndex],
            title: stateTitle,
            description: stateDescription
          };
          
          updatedPage.states = updatedStates;
          updatedPages[pageIndex] = updatedPage;
        }
      }
      
      return updatedPages;
    });

    setStateModalVisible(false);
    message.success("State details saved");
  };

  const toggleDefaultState = (pageId, stateId) => {
    setPages(prevPages => {
      const updatedPages = [...prevPages];
      const pageIndex = updatedPages.findIndex(page => page.id === pageId);
      
      if (pageIndex !== -1) {
        const updatedPage = { ...updatedPages[pageIndex] };
        
        // Reset all states to non-default and set the selected one as default
        updatedPage.states = updatedPage.states.map(state => ({
          ...state,
          isDefault: state.id === stateId
        }));
        
        updatedPages[pageIndex] = updatedPage;
      }
      
      return updatedPages;
    });
    
    message.success("Default state updated");
  };

  const editState = (pageId, stateId) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    
    const state = page.states.find(s => s.id === stateId);
    if (!state) return;
    
    setCurrentState(state);
    setStateTitle(state.title);
    setStateDescription(state.description);
    setStateModalVisible(true);
  };

  const deleteState = (pageId, stateId) => {
    setPages(prevPages => {
      const updatedPages = [...prevPages];
      const pageIndex = updatedPages.findIndex(page => page.id === pageId);
      
      if (pageIndex !== -1) {
        const updatedPage = { ...updatedPages[pageIndex] };
        const stateToDelete = updatedPage.states.find(state => state.id === stateId);
        const wasDefault = stateToDelete?.isDefault || false;
        
        // Filter out the state to delete
        updatedPage.states = updatedPage.states.filter(state => state.id !== stateId);
        
        // If we deleted the default state and there are other states, make the first one default
        if (wasDefault && updatedPage.states.length > 0) {
          updatedPage.states[0].isDefault = true;
        }
        
        updatedPages[pageIndex] = updatedPage;
      }
      
      return updatedPages;
    });
    
    message.success("State deleted");
  };

  const chooseFile = async () => {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: "appium.pages.json",
        types: [
          {
            description: "Appium Pages JSON",
            accept: { "application/json": [".json"] },
          },
        ],
      });
      setFileHandle(handle);
      message.success("Selected file to save analysis.");
    } catch (err) {
      console.error("File picker error:", err);
      if (err.name !== 'AbortError') {
        message.error("File selection failed: " + err.message);
      }
    }
  };

  const saveToFile = async () => {
    if (!fileHandle) return message.error("No file selected");
    if (pages.length === 0) return message.error("No pages to save");
    
    setSaving(true);
    try {
      const file = await fileHandle.getFile();
      let content = "";
      try {
        content = await file.text();
      } catch (e) {
        content = "";
      }
      
      const json = content ? JSON.parse(content) : { pages: [] };
      
      // Replace the entire pages array or merge based on your requirements
      json.pages = pages;
      json.lastSaved = new Date().toISOString();
      
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(json, null, 2));
      await writable.close();
      message.success("Saved analysis file successfully.");
    } catch (err) {
      console.error("Save error:", err);
      message.error("Failed to save file: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const openSavedFile = async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: "Appium Pages JSON",
            accept: { "application/json": [".json"] },
          },
        ],
      });
      
      const file = await fileHandle.getFile();
      const content = await file.text();
      const json = JSON.parse(content);
      
      if (json.pages && Array.isArray(json.pages)) {
        setPages(json.pages);
        setFileHandle(fileHandle);
        message.success("Loaded pages from file.");
        
        // Set active page to the first one if available
        if (json.pages.length > 0) {
          setActivePage(json.pages[0].id);
        }
      } else {
        message.error("Invalid file format");
      }
    } catch (err) {
      console.error("File open error:", err);
      if (err.name !== 'AbortError') {
        message.error("File opening failed: " + err.message);
      }
    }
  };

  // Render state list for a specific page
  const renderStates = (pageId) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return <Text>No page selected</Text>;
    
    if (page.states.length === 0) {
      return <Text>No states captured for this page yet.</Text>;
    }
    
    return (
      <List
        grid={{ gutter: 16, column: 4 }} // Changed from 2 to 4 columns as requested
        dataSource={page.states}
        renderItem={(state) => (
          <List.Item>
            <Card
              title={
                <Space>
                  {state.isDefault && <StarFilled style={{ color: "#faad14" }} />}
                  {state.title}
                </Space>
              }
              extra={
                <Dropdown
                  overlay={
                    <Menu>
                      <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => editState(pageId, state.id)}>
                        Edit Details
                      </Menu.Item>
                      {/* Explicit 'Set as Default' option regardless of current status */}
                      <Menu.Item 
                        key="default" 
                        icon={<StarOutlined />} 
                        onClick={() => toggleDefaultState(pageId, state.id)}
                      >
                        Set as Default
                      </Menu.Item>
                      <Menu.Item 
                        key="delete" 
                        icon={<DeleteOutlined />} 
                        danger
                      >
                        <Popconfirm
                          title="Are you sure you want to delete this state?"
                          onConfirm={() => deleteState(pageId, state.id)}
                          okText="Yes"
                          cancelText="No"
                        >
                          Delete State
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
              style={{ width: '100%' }}
            >
              {state.description && (
                <div className="mb-3">
                  <Text>{state.description}</Text>
                </div>
              )}
              <div>
                <img
                  src={`data:image/png;base64,${state.screenShot}`}
                  alt={`Screenshot for ${state.title}`}
                  style={{ maxWidth: "100%", maxHeight: "200px", objectFit: "contain" }}
                />
              </div>
              {/* Timestamp moved under the screenshot as requested */}
              <div className="mt-2">
                <Text type="secondary">{new Date(state.timeStamp).toLocaleString()}</Text>
              </div>
            </Card>
          </List.Item>
        )}
      />
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <Title level={4}>Appium Page Analysis</Title>
        <Space>
          <Button onClick={openSavedFile}>Open File</Button>
          <Button onClick={chooseFile}>Select Save Location</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={saveToFile}
            disabled={pages.length === 0 || !fileHandle}
            loading={saving}
          >
            Save Analysis
          </Button>
        </Space>
      </div>

      {/* Tabs for Pages with Add button */}
      <div className="page-tabs-container">
        <Tabs 
          activeKey={activePage || ''}
          onChange={setActivePage}
          type="editable-card"
          onEdit={(targetKey, action) => {
            if (action === 'add') {
              setNewPageModalVisible(true);
            }
          }}
          tabBarExtraContent={
            <Button 
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setNewPageModalVisible(true)}
            >
              New Page
            </Button>
          }
        >
          {pages.map(page => (
            <TabPane 
              tab={
                <Dropdown
                  overlay={
                    <Menu>
                      <Menu.Item 
                        key="edit" 
                        icon={<EditOutlined />} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditPageId(page.id);
                          setEditPageName(page.name);
                          setEditPageModalVisible(true);
                        }}
                      >
                        Rename
                      </Menu.Item>
                      <Menu.Item 
                        key="delete" 
                        icon={<DeleteOutlined />} 
                        danger
                      >
                        <Popconfirm
                          title="Delete this page and all its states?"
                          onConfirm={(e) => {
                            e.stopPropagation();
                            deletePage(page.id);
                          }}
                          okText="Yes"
                          cancelText="No"
                        >
                          Delete
                        </Popconfirm>
                      </Menu.Item>
                    </Menu>
                  }
                  trigger={['contextMenu']}
                >
                  <span>{page.name}</span>
                </Dropdown>
              } 
              key={page.id}
            >
              <div className="page-content space-y-4">
                <div className="flex justify-between items-center">
                  <Button 
                    type="primary" 
                    onClick={captureState}
                    disabled={isCapturing}
                  >
                    📸 Capture State
                  </Button>
                  <Text type="secondary">
                    {page.states.length} state{page.states.length !== 1 ? 's' : ''} captured
                  </Text>
                </div>
                
                {/* Capture Progress */}
                {isCapturing && (
                  <div className="my-4">
                    <Text>Capturing state...</Text>
                    <Spin size="small" className="ml-2" />
                    <div className="mt-2">
                      <div className="h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${capturingProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* States List */}
                <div className="mt-4">
                  {renderStates(page.id)}
                </div>
              </div>
            </TabPane>
          ))}
        </Tabs>
        
        {pages.length === 0 && !newPageModalVisible && (
          <div className="text-center p-8">
            <Text type="secondary">No pages created yet. Create your first page to start capturing states.</Text>
            <div className="mt-4">
              <Button type="primary" onClick={() => setNewPageModalVisible(true)}>
                Create First Page
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Page Modal */}
      <Modal
        title="Create New Page"
        visible={newPageModalVisible}
        onOk={createNewPage}
        onCancel={() => setNewPageModalVisible(false)}
      >
        <div className="mb-4">
          <Text>Enter a name for the new page:</Text>
        </div>
        <Input
          placeholder="Page Name"
          value={newPageName}
          onChange={(e) => setNewPageName(e.target.value)}
          autoFocus
        />
      </Modal>

      {/* Edit Page Modal */}
      <Modal
        title="Rename Page"
        visible={editPageModalVisible}
        onOk={editPage}
        onCancel={() => setEditPageModalVisible(false)}
      >
        <div className="mb-4">
          <Text>Enter a new name for the page:</Text>
        </div>
        <Input
          placeholder="Page Name"
          value={editPageName}
          onChange={(e) => setEditPageName(e.target.value)}
          autoFocus
        />
      </Modal>

      {/* State Details Modal */}
      <Modal
        title="State Details"
        visible={stateModalVisible}
        onOk={saveStateDetails}
        onCancel={() => setStateModalVisible(false)}
      >
        <div className="mb-4">
          <Text>Enter title and description for this state:</Text>
        </div>
        <div className="mb-4">
          <Input
            placeholder="State Title"
            value={stateTitle}
            onChange={(e) => setStateTitle(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <Input.TextArea
            placeholder="Description (optional)"
            value={stateDescription}
            onChange={(e) => setStateDescription(e.target.value)}
            rows={4}
          />
        </div>
      </Modal>
    </div>
  );
}