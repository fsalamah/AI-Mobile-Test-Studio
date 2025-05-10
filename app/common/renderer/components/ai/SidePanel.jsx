// SidePanel.jsx
import React, { useState, useRef, useEffect, useMemo } from "react";
import { Layout, Button, Dropdown, Menu, Input, Tabs, Typography, Tooltip, Tag, Space, message, Modal, Form, Checkbox, Tree } from 'antd';
import {
    PlusOutlined,
    SaveOutlined,
    EllipsisOutlined,
    FolderOpenOutlined,
    FolderOutlined,
    SearchOutlined,
    LeftOutlined,
    RightOutlined,
    RobotOutlined,
    SettingOutlined,
    HistoryOutlined,
    DeleteOutlined,
    FileOutlined,
    VideoCameraOutlined,
    BookOutlined,
    FileTextOutlined,
    AppstoreOutlined,
    CodeOutlined,
    LayoutOutlined,
    ProjectOutlined,
    ImportOutlined,
    ExportOutlined,
    SortAscendingOutlined,
    ClockCircleOutlined,
    DownOutlined,
    TagOutlined,
    EditOutlined,
    EyeOutlined
} from '@ant-design/icons';
import PageTree from "./PageTree.jsx";
import { getRecentProjects, removeRecentProject } from "./utils/FileOperationsUtils.js";
import ActionRecorder from "../../lib/ai/actionRecorder";
import RecordingService from "../../lib/ai/recordingService";

const { Sider } = Layout;
const { Search } = Input;
const { TabPane } = Tabs;
const { Text, Paragraph } = Typography;

const SidePanel = ({
    pages,
    treeData,
    selectedKeys,
    expandedKeys,
    autoExpandParent,
    searchTerm,
    onSearchChange,
    onTreeSelect,
    onTreeExpand,
    onEditPage,
    onDeletePage,
    onCreatePage,
    fileOperations,
    saving,
    projectId,
    isCollapsed: externalIsCollapsed,
    onCollapseChange
}) => {
    // Get recordings from the project
    const [recordings, setRecordings] = useState([]);
    // State for recording search
    const [recordingSearchTerm, setRecordingSearchTerm] = useState('');
    // Context menu for recordings (similar to page tree)
    const [recordingContextMenuVisible, setRecordingContextMenuVisible] = useState(false);
    const [recordingContextMenuPosition, setRecordingContextMenuPosition] = useState({ x: 0, y: 0 });
    const [selectedRecording, setSelectedRecording] = useState(null);

    // Load recordings when component mounts
    useEffect(() => {
        // Initial load
        refreshRecordings();

        // Set up interval to refresh recordings every 5 seconds
        const refreshInterval = setInterval(refreshRecordings, 5000);

        // Clean up interval on unmount
        return () => {
            clearInterval(refreshInterval);
        };
    }, []);

    // Function to refresh recordings
    const refreshRecordings = () => {
        try {
            const projectRecordings = RecordingService.getRecordingsFromProject();
            setRecordings(projectRecordings);
        } catch (error) {
            console.error("Error refreshing recordings:", error);
        }
    };

    // Filter recordings based on search term
    const filteredRecordings = useMemo(() => {
        if (!recordingSearchTerm) return recordings;

        const searchLower = recordingSearchTerm.toLowerCase();
        return recordings.filter(recording =>
            recording.name.toLowerCase().includes(searchLower) ||
            (recording.module && recording.module.toLowerCase().includes(searchLower)) ||
            (recording.description && recording.description.toLowerCase().includes(searchLower))
        );
    }, [recordings, recordingSearchTerm]);

    // Handle search in recordings tab
    const handleRecordingSearch = (value) => {
        setRecordingSearchTerm(value);
    };

    // Handle right-click on recording tree node
    const handleRecordingRightClick = ({ event, node }) => {
        event.preventDefault();
        event.stopPropagation();

        // Only show context menu for recording nodes, not module nodes
        if (!node.isModule) {
            setRecordingContextMenuPosition({ x: event.clientX, y: event.clientY });
            setSelectedRecording(node.scenarioData);
            setRecordingContextMenuVisible(true);
        }
    };

    // Hide context menu when clicked elsewhere
    const handleOutsideRecordingClick = () => {
        setRecordingContextMenuVisible(false);
    };

    // Add event listener for outside clicks
    useEffect(() => {
        if (recordingContextMenuVisible) {
            document.addEventListener('click', handleOutsideRecordingClick);
        }
        return () => {
            document.removeEventListener('click', handleOutsideRecordingClick);
        };
    }, [recordingContextMenuVisible]);

    // Create context menu for recordings
    const recordingContextMenu = selectedRecording && (
        <div
            style={{
                position: 'fixed',
                top: recordingContextMenuPosition.y,
                left: recordingContextMenuPosition.x,
                zIndex: 1000,
                display: recordingContextMenuVisible ? 'block' : 'none',
                boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08)',
                background: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                minWidth: '180px',
                border: '1px solid rgba(0, 0, 0, 0.06)'
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <Menu style={{ border: 'none' }}>
                <Menu.Item
                    key="load"
                    icon={<EyeOutlined style={{ color: '#0071E3' }} />}
                    onClick={() => {
                        setRecordingContextMenuVisible(false);

                        try {
                            // Load the recording from the project
                            RecordingService.loadRecordingFromProject(selectedRecording.id);

                            // Navigate to recording view, passing a parameter to keep the side panel visible
                            document.dispatchEvent(new CustomEvent('navigateToRecordingView', {
                                detail: { keepSidePanelVisible: true }
                            }));

                            // Show success message
                            message.success(`"${selectedRecording.name}" loaded successfully`);
                        } catch (error) {
                            message.error(`Failed to load recording: ${error.message}`);
                        }
                    }}
                >
                    Load Recording
                </Menu.Item>
                <Menu.Item
                    key="export"
                    icon={<ExportOutlined style={{ color: '#0071E3' }} />}
                    onClick={() => {
                        setRecordingContextMenuVisible(false);

                        try {
                            // Load the recording data
                            const recording = RecordingService.loadRecordingFromProject(selectedRecording.id);

                            // Get the recording data from ActionRecorder
                            const recordingData = ActionRecorder.getRecording();

                            if (!recordingData || recordingData.length === 0) {
                                message.error("No recording data to export");
                                return;
                            }

                            // Create and download JSON file
                            const blob = new Blob([JSON.stringify(recordingData, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${selectedRecording.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
                            link.click();
                            URL.revokeObjectURL(url);

                            message.success(`"${selectedRecording.name}" exported successfully`);
                        } catch (error) {
                            message.error(`Failed to export recording: ${error.message}`);
                        }
                    }}
                >
                    Export Recording
                </Menu.Item>
                <Menu.Item
                    key="edit"
                    icon={<EditOutlined style={{ color: '#0071E3' }} />}
                    onClick={() => {
                        setRecordingContextMenuVisible(false);

                        // Show edit modal with recording details
                        let editedName = selectedRecording.name;
                        let editedModule = selectedRecording.module || '';
                        let editedDescription = selectedRecording.description || '';

                        Modal.confirm({
                            title: 'Edit Recording Details',
                            content: (
                                <div style={{ marginTop: '16px' }}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Recording Name*</label>
                                        <Input
                                            defaultValue={selectedRecording.name}
                                            placeholder="Enter recording name"
                                            onChange={(e) => {
                                                editedName = e.target.value;
                                                // Enable/disable OK button based on validation
                                                const confirmButton = document.querySelector('.ant-modal-confirm-btns button.ant-btn-primary');
                                                if (confirmButton) {
                                                    confirmButton.disabled = !editedName.trim();
                                                }
                                            }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Module (Optional)</label>
                                        <Input
                                            defaultValue={selectedRecording.module || ''}
                                            placeholder="e.g., Login, Dashboard, etc."
                                            onChange={(e) => {
                                                editedModule = e.target.value;
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Description (Optional)</label>
                                        <Input.TextArea
                                            defaultValue={selectedRecording.description || ''}
                                            placeholder="Describe this recording"
                                            rows={3}
                                            onChange={(e) => {
                                                editedDescription = e.target.value;
                                            }}
                                        />
                                    </div>
                                </div>
                            ),
                            okText: 'Save Changes',
                            okButtonProps: {
                                disabled: false, // Initially enabled since name is pre-filled
                            },
                            cancelText: 'Cancel',
                            onOk: () => {
                                message.info('Editing recording details is not yet implemented');
                                // Here you would update the recording with the new details
                                // You would need to add this feature to recordingService.js
                                return Promise.resolve();
                            },
                            width: 500,
                            centered: true,
                            maskClosable: false,
                            icon: <EditOutlined style={{ color: '#0071E3' }} />
                        });
                    }}
                >
                    Edit Recording
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                    key="delete"
                    icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />}
                    onClick={() => {
                        setRecordingContextMenuVisible(false);

                        // Show enhanced safety confirmation for deletion
                        Modal.confirm({
                            title: `Are you sure you want to delete "${selectedRecording.name}"?`,
                            content: (
                                <div>
                                    <p>This action cannot be undone and will permanently delete this recording.</p>
                                    <p style={{ marginTop: '12px' }}>
                                        <Input
                                            placeholder={`Type "${selectedRecording.name}" to confirm`}
                                            style={{ marginTop: '8px' }}
                                            onChange={(e) => {
                                                const confirmButton = document.querySelector('.ant-modal-confirm-btns button.ant-btn-primary');
                                                if (confirmButton) {
                                                    confirmButton.disabled = e.target.value !== selectedRecording.name;
                                                }
                                            }}
                                        />
                                    </p>
                                </div>
                            ),
                            okText: 'Delete Recording',
                            okButtonProps: {
                                danger: true,
                                disabled: true // Initially disabled until user types confirmation
                            },
                            cancelText: 'Cancel',
                            onOk: () => {
                                try {
                                    // Delete the recording from the project
                                    RecordingService.deleteRecordingFromProject(selectedRecording.id);

                                    // Refresh recordings list
                                    refreshRecordings();

                                    // Show success message
                                    message.success(`"${selectedRecording.name}" deleted successfully`);
                                    return Promise.resolve();
                                } catch (error) {
                                    message.error(`Failed to delete recording: ${error.message}`);
                                    return Promise.reject(error.message);
                                }
                            },
                            icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
                            width: 500,
                            centered: true,
                            maskClosable: false
                        });
                    }}
                    danger
                >
                    Delete Recording
                </Menu.Item>
            </Menu>
        </div>
    );

    // Generate tree data for recordings
    const generateRecordingTreeData = (recordingsList) => {
        // If no recordings match search, return empty array
        if (recordingsList.length === 0) {
            return [];
        }

        // Group recordings by module
        const recordingsByModule = {};

        // Default module for recordings without a module
        const defaultModule = 'General';

        // Group recordings by module
        recordingsList.forEach(recording => {
            const module = recording.module || defaultModule;
            if (!recordingsByModule[module]) {
                recordingsByModule[module] = [];
            }
            recordingsByModule[module].push(recording);
        });

        // Sort modules alphabetically
        const sortedModules = Object.keys(recordingsByModule).sort();

        // Generate tree data
        return sortedModules.map(module => {
            const recordings = recordingsByModule[module];

            // Sort recordings by timestamp (newest first)
            recordings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            return {
                key: `module-${module}`,
                title: module,
                isModule: true,
                children: recordings.map(recording => ({
                    key: recording.id,
                    title: recording.name,
                    isModule: false,
                    scenarioData: recording
                }))
            };
        });
    };
    const showNewPageModal = () => {
        // This will be handled by PageOperations component
        document.dispatchEvent(new CustomEvent('showNewPageModal'));
    };

    // State to hold recent projects
    const [recentProjects, setRecentProjects] = useState([]);
    
    // Load recent projects when component mounts or when operations occur
    useEffect(() => {
        // Set up an interval to refresh recent projects every 5 seconds
        setRecentProjects(getRecentProjects());
        
        const refreshInterval = setInterval(() => {
            setRecentProjects(getRecentProjects());
        }, 5000);
        
        // Also refresh when menu is opened
        const handleMenuOpen = () => {
            setRecentProjects(getRecentProjects());
        };
        
        // Clean up interval on unmount
        return () => {
            clearInterval(refreshInterval);
        };
    }, []);
    
    // Handler for opening a recent project
    const handleOpenRecentProject = (projectName) => {
        if (fileOperations.openRecentProject) {
            fileOperations.openRecentProject(projectName);
        }
    };
    
    // Handler for removing a project from recent list
    const handleRemoveRecentProject = (e, projectName) => {
        e.stopPropagation(); // Prevent the menu item click from propagating
        
        // Remove from list
        const updatedProjects = removeRecentProject(projectName);
        setRecentProjects(updatedProjects);
    };

    const menu = (
        <Menu>
            <Menu.Item 
                key="open" 
                icon={<FolderOpenOutlined />} 
                onClick={fileOperations.openSavedFile}
            >
                Open File...
            </Menu.Item>
            <Menu.Item 
                key="save_location" 
                icon={<SaveOutlined />} 
                onClick={fileOperations.chooseFile}
            >
                Select Save Location...
            </Menu.Item>
            <Menu.Item 
                key="save" 
                icon={<SaveOutlined />} 
                onClick={fileOperations.saveToFile} 
                disabled={saving || pages.length === 0}
            >
                {saving ? "Saving..." : "Save Project"}
            </Menu.Item>
            
            {/* Recent Projects Submenu */}
            {recentProjects.length > 0 && (
                <Menu.SubMenu 
                    key="recent_projects" 
                    icon={<HistoryOutlined />} 
                    title="Recent Projects"
                >
                    {recentProjects.map((project, index) => (
                        <Menu.Item 
                            key={`recent_${index}`}
                            icon={<FileOutlined />}
                            onClick={() => handleOpenRecentProject(project.name)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {project.name}
                                </span>
                                <Button 
                                    type="text" 
                                    size="small" 
                                    danger 
                                    icon={<DeleteOutlined />}
                                    style={{ padding: '0 4px', marginLeft: '8px' }}
                                    onClick={(e) => handleRemoveRecentProject(e, project.name)}
                                    title="Remove from recent projects"
                                />
                            </div>
                        </Menu.Item>
                    ))}
                </Menu.SubMenu>
            )}
            
            <Menu.Divider />
            
            <Menu.Item 
                key="ai_models" 
                icon={<RobotOutlined />} 
                onClick={() => document.dispatchEvent(new CustomEvent('navigateToAiModelConfig'))}
            >
                AI Model Configuration
            </Menu.Item>
            
            {/* Show a return to inspector option if available */}
            {fileOperations.returnToInspector && (
                <Menu.Divider />
            )}
            {fileOperations.returnToInspector && (
                <Menu.Item 
                    key="return_to_inspector" 
                    icon={<LeftOutlined />} 
                    onClick={fileOperations.returnToInspector}
                >
                    Return to Inspector
                </Menu.Item>
            )}
        </Menu>
    );

    const [siderWidth, setSiderWidth] = useState(300);
    // Use external prop if provided, otherwise use local state
    const [isCollapsedInternal, setIsCollapsedInternal] = useState(false);
    // Give preference to external prop if it exists
    const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : isCollapsedInternal;
    const resizerRef = useRef(null);
    const siderRef = useRef(null);
    const containerRef = useRef(null);
    const isDraggingRef = useRef(false);
    const startXRef = useRef(0);
    const startWidthRef = useRef(0);

    // Handle resizer drag start
    const handleMouseDown = (e) => {
        isDraggingRef.current = true;
        startXRef.current = e.clientX;
        startWidthRef.current = siderWidth;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        // Add a class to body to change cursor during resize
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    };

    // Handle resizer drag
    const handleMouseMove = (e) => {
        if (!isDraggingRef.current) return;
        
        // Calculate new width based on delta movement
        const delta = e.clientX - startXRef.current;
        const newWidth = Math.max(60, Math.min(600, startWidthRef.current + delta));
        setSiderWidth(newWidth);
    };

    // Handle resizer drag end
    const handleMouseUp = () => {
        isDraggingRef.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        // Reset cursor
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };

    // Handle collapse button click
    const toggleCollapse = () => {
        const newCollapsedState = !isCollapsed;
        
        if (onCollapseChange) {
            // Use the parent's state management if available
            onCollapseChange(newCollapsedState);
        } else {
            // Otherwise use local state
            setIsCollapsedInternal(newCollapsedState);
        }
        
        // Set width based on state - 60px when collapsed, 300px when expanded
        setSiderWidth(newCollapsedState ? 60 : 300);
    };
    
    // Listen for collapse events from other components
    React.useEffect(() => {
        const handleCollapseSidePanel = (event) => {
            const newCollapsedState = event.detail?.collapse;
            
            if (newCollapsedState === true && !isCollapsed) {
                if (onCollapseChange) {
                    onCollapseChange(true);
                } else {
                    setIsCollapsedInternal(true);
                }
                // Set to 60px when collapsed (matches width in the screenshot)
                setSiderWidth(60);
            } else if (newCollapsedState === false && isCollapsed) {
                if (onCollapseChange) {
                    onCollapseChange(false);
                } else {
                    setIsCollapsedInternal(false);
                }
                setSiderWidth(300);
            }
        };
        
        document.addEventListener('collapseSidePanel', handleCollapseSidePanel);
        
        return () => {
            document.removeEventListener('collapseSidePanel', handleCollapseSidePanel);
        };
    }, [isCollapsed, onCollapseChange]);

    return (
        <div ref={containerRef} style={{ height: '100%', display: 'flex', position: 'relative' }}>
            {/* Main sidebar component */}
            <Sider
                width={siderWidth}
                theme="light"
                style={{
                    borderRight: '1px solid #f0f0f0',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'width 0.2s ease',
                    minWidth: isCollapsed ? '60px' : '240px',
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                }}
                ref={siderRef}
                collapsed={isCollapsed}
            >
                <div style={{
                    padding: '16px 10px 10px',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                    background: 'rgba(249, 249, 249, 0.8)'
                }}>
                    <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                        <Button
                            icon={<PlusOutlined />}
                            onClick={showNewPageModal}
                            block
                            type="primary"
                            style={{
                                borderRadius: '6px',
                                background: '#0071E3',
                                border: 'none',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                            }}
                        >
                            {!isCollapsed && 'New Item'}
                        </Button>
                        <Button
                            icon={<RobotOutlined />}
                            onClick={() => document.dispatchEvent(new CustomEvent('navigateToAiModelConfig'))}
                            title="AI Model Configuration"
                            style={{
                                borderRadius: '6px',
                                border: '1px solid rgba(0, 0, 0, 0.1)'
                            }}
                        />
                        <Dropdown
                            overlay={menu}
                            trigger={['click']}
                            onVisibleChange={(visible) => {
                                if (visible) {
                                    // Refresh recent projects list when dropdown is opened
                                    setRecentProjects(getRecentProjects());
                                }
                            }}
                        >
                            <Button
                                icon={<EllipsisOutlined />}
                                aria-label="File Actions"
                                style={{
                                    borderRadius: '6px',
                                    border: '1px solid rgba(0, 0, 0, 0.1)'
                                }}
                            />
                        </Dropdown>
                    </div>
                    {!isCollapsed && (
                        <Search
                            placeholder="Search..."
                            allowClear
                            onSearch={onSearchChange}
                            onChange={e => onSearchChange(e.target.value)}
                            prefix={<SearchOutlined />}
                            style={{
                                borderRadius: '8px',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                            }}
                        />
                    )}
                </div>

                {!isCollapsed && (
                    <Tabs
                        defaultActiveKey="pages"
                        style={{
                            flexGrow: 1,
                            overflow: 'hidden',
                            margin: '0',
                        }}
                        tabBarStyle={{
                            marginBottom: 0,
                            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                            paddingLeft: '10px',
                            height: '40px'
                        }}
                        tabBarGutter={20}
                    >
                        <TabPane
                            tab={
                                <span className="tab-with-icon">
                                    <LayoutOutlined />
                                    <span className="tab-title">Pages</span>
                                </span>
                            }
                            key="pages"
                        >
                            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '0 10px 10px 10px', height: 'calc(100% - 40px)' }}>
                                <PageTree
                                    treeData={treeData}
                                    selectedKeys={selectedKeys}
                                    expandedKeys={expandedKeys}
                                    autoExpandParent={autoExpandParent}
                                    onSelect={onTreeSelect}
                                    onExpand={onTreeExpand}
                                    onEdit={(pageData) => {
                                        document.dispatchEvent(new CustomEvent('showEditPageModal', {
                                            detail: { pageData }
                                        }));
                                    }}
                                    onDelete={onDeletePage}
                                    searchTerm={searchTerm}
                                    pages={pages}
                                    projectId={projectId}
                                />
                            </div>
                        </TabPane>
                        <TabPane
                            tab={
                                <span className="tab-with-icon">
                                    <BookOutlined />
                                    <span className="tab-title">Recordings</span>
                                </span>
                            }
                            key="recordings"
                        >
                            <div style={{ padding: '10px', overflowY: 'auto', height: 'calc(100% - 40px)' }}>
                                {/* Scenarios Toolbar */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '12px',
                                    paddingBottom: '8px',
                                    borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
                                }}>
                                    <div>
                                        <Button
                                            type="primary"
                                            icon={<PlusOutlined />}
                                            onClick={() => document.dispatchEvent(new CustomEvent('navigateToRecordingView', {
                                                detail: { keepSidePanelVisible: true }
                                            }))}
                                            style={{
                                                borderRadius: '6px',
                                                background: '#0071E3',
                                                border: 'none',
                                                marginRight: '8px'
                                            }}
                                        >
                                            New Recording
                                        </Button>
                                        <Button
                                            icon={<VideoCameraOutlined />}
                                            onClick={() => document.dispatchEvent(new CustomEvent('navigateToRecordingView', {
                                                detail: { keepSidePanelVisible: true }
                                            }))}
                                            style={{
                                                borderRadius: '6px',
                                                border: '1px solid rgba(0, 0, 0, 0.1)',
                                                marginRight: '8px'
                                            }}
                                        >
                                            Record Session
                                        </Button>
                                    </div>
                                    <div>
                                        <Dropdown
                                            overlay={
                                                <Menu>
                                                    <Menu.Item
                                                        key="import"
                                                        icon={<ImportOutlined />}
                                                        onClick={() => {
                                                            // Create a hidden file input for opening recording files
                                                            const fileInput = document.createElement('input');
                                                            fileInput.type = 'file';
                                                            fileInput.accept = '.json,.appiumsession';
                                                            fileInput.style.display = 'none';

                                                            fileInput.onchange = (e) => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                    const reader = new FileReader();
                                                                    reader.onload = () => {
                                                                        try {
                                                                            const content = reader.result;
                                                                            const parsedContent = JSON.parse(content);

                                                                            if (Array.isArray(parsedContent)) {
                                                                                // Prompt for recording details
                                                                                Modal.confirm({
                                                                                    title: 'Import Recording',
                                                                                    icon: <ImportOutlined />,
                                                                                    width: 500,
                                                                                    content: (
                                                                                        <div style={{ marginTop: '16px' }}>
                                                                                            <Form layout="vertical">
                                                                                                <Form.Item
                                                                                                    label="Recording Name"
                                                                                                    required
                                                                                                    rules={[{ required: true }]}
                                                                                                >
                                                                                                    <Input
                                                                                                        id="recording-name-input"
                                                                                                        defaultValue={file.name.replace(/\.[^/.]+$/, "")}
                                                                                                        placeholder="Enter recording name"
                                                                                                    />
                                                                                                </Form.Item>
                                                                                                <Form.Item label="Module (Optional)">
                                                                                                    <Input
                                                                                                        id="recording-module-input"
                                                                                                        placeholder="e.g., Login, Dashboard, etc."
                                                                                                    />
                                                                                                </Form.Item>
                                                                                                <Form.Item label="Description (Optional)">
                                                                                                    <Input.TextArea
                                                                                                        id="recording-description-input"
                                                                                                        rows={3}
                                                                                                        placeholder="Describe this recording"
                                                                                                    />
                                                                                                </Form.Item>
                                                                                            </Form>
                                                                                        </div>
                                                                                    ),
                                                                                    onOk: () => {
                                                                                        // Get values from form
                                                                                        const name = document.getElementById('recording-name-input').value;
                                                                                        const module = document.getElementById('recording-module-input').value;
                                                                                        const description = document.getElementById('recording-description-input').value;

                                                                                        if (!name) {
                                                                                            message.error('Recording name is required');
                                                                                            return Promise.reject('Recording name is required');
                                                                                        }

                                                                                        // Import recording to project
                                                                                        try {
                                                                                            const recording = RecordingService.importRecordingToProject({
                                                                                                data: parsedContent,
                                                                                                name,
                                                                                                module,
                                                                                                description
                                                                                            });

                                                                                            // Refresh recordings list
                                                                                            refreshRecordings();

                                                                                            // Clear existing recording in ActionRecorder
                                                                                            ActionRecorder.clearRecording();

                                                                                            // Add each entry from the loaded file to ActionRecorder
                                                                                            for (const entry of parsedContent) {
                                                                                                ActionRecorder.addEntry(entry);
                                                                                            }

                                                                                            // Navigate to recording view
                                                                                            document.dispatchEvent(new CustomEvent('navigateToRecordingView', {
                                                                                                detail: { keepSidePanelVisible: true }
                                                                                            }));

                                                                                            message.success(`"${name}" imported and saved to project`);
                                                                                            return Promise.resolve();
                                                                                        } catch (error) {
                                                                                            message.error(`Failed to import recording: ${error.message}`);
                                                                                            return Promise.reject(error.message);
                                                                                        }
                                                                                    },
                                                                                    okText: 'Import',
                                                                                    cancelText: 'Cancel'
                                                                                });
                                                                            } else {
                                                                                throw new Error("Invalid recording format. Expected an array.");
                                                                            }
                                                                        } catch (error) {
                                                                            message.error(`Failed to parse ${file.name}: ${error.message}`);
                                                                        }
                                                                    };
                                                                    reader.readAsText(file);
                                                                }

                                                                // Remove the input after use
                                                                document.body.removeChild(fileInput);
                                                            };

                                                            // Add to DOM and trigger click
                                                            document.body.appendChild(fileInput);
                                                            fileInput.click();
                                                        }}
                                                    >
                                                        Import Recording
                                                    </Menu.Item>
                                                    <Menu.Item
                                                        key="export_all"
                                                        icon={<ExportOutlined />}
                                                        onClick={() => {
                                                            const recording = ActionRecorder.getRecording();
                                                            if (!recording || recording.length === 0) {
                                                                message.warning("No recording data to export.");
                                                                return;
                                                            }

                                                            // Prompt for saving to project and file
                                                            Modal.confirm({
                                                                title: 'Save Recording',
                                                                icon: <SaveOutlined />,
                                                                width: 500,
                                                                content: (
                                                                    <div style={{ marginTop: '16px' }}>
                                                                        <Form layout="vertical">
                                                                            <Form.Item
                                                                                label="Recording Name"
                                                                                required
                                                                                rules={[{ required: true }]}
                                                                            >
                                                                                <Input
                                                                                    id="save-recording-name-input"
                                                                                    defaultValue={`Recording ${new Date().toLocaleString()}`}
                                                                                    placeholder="Enter recording name"
                                                                                />
                                                                            </Form.Item>
                                                                            <Form.Item label="Module (Optional)">
                                                                                <Input
                                                                                    id="save-recording-module-input"
                                                                                    placeholder="e.g., Login, Dashboard, etc."
                                                                                />
                                                                            </Form.Item>
                                                                            <Form.Item label="Description (Optional)">
                                                                                <Input.TextArea
                                                                                    id="save-recording-description-input"
                                                                                    rows={3}
                                                                                    placeholder="Describe this recording"
                                                                                />
                                                                            </Form.Item>
                                                                            <Form.Item>
                                                                                <Checkbox id="save-recording-to-file-checkbox" defaultChecked>
                                                                                    Also save as file
                                                                                </Checkbox>
                                                                            </Form.Item>
                                                                        </Form>
                                                                    </div>
                                                                ),
                                                                onOk: () => {
                                                                    // Get values from form
                                                                    const name = document.getElementById('save-recording-name-input').value;
                                                                    const module = document.getElementById('save-recording-module-input').value;
                                                                    const description = document.getElementById('save-recording-description-input').value;
                                                                    const saveToFile = document.getElementById('save-recording-to-file-checkbox').checked;

                                                                    if (!name) {
                                                                        message.error('Recording name is required');
                                                                        return Promise.reject('Recording name is required');
                                                                    }

                                                                    try {
                                                                        // Save to project
                                                                        const savedRecording = RecordingService.saveRecordingToProject({
                                                                            name,
                                                                            module,
                                                                            description
                                                                        });

                                                                        // Refresh recordings list
                                                                        refreshRecordings();

                                                                        // Also save to file if checked
                                                                        if (saveToFile) {
                                                                            const recordingData = JSON.stringify(recording, null, 2);
                                                                            const blob = new Blob([recordingData], { type: 'application/json' });
                                                                            const url = URL.createObjectURL(blob);
                                                                            const link = document.createElement('a');
                                                                            link.href = url;
                                                                            link.download = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
                                                                            link.click();
                                                                            URL.revokeObjectURL(url);
                                                                        }

                                                                        message.success(`Recording "${name}" saved ${saveToFile ? 'to project and file' : 'to project'}`);
                                                                        return Promise.resolve();
                                                                    } catch (error) {
                                                                        message.error(`Failed to save recording: ${error.message}`);
                                                                        return Promise.reject(error.message);
                                                                    }
                                                                },
                                                                okText: 'Save',
                                                                cancelText: 'Cancel'
                                                            });
                                                        }}
                                                    >
                                                        Export Current Recording
                                                    </Menu.Item>
                                                    <Menu.Divider />
                                                    <Menu.Item
                                                        key="sort_name"
                                                        icon={<SortAscendingOutlined />}
                                                        onClick={() => document.dispatchEvent(new CustomEvent('sortScenarios', { detail: { sortBy: 'name' }}))}
                                                    >
                                                        Sort by Name
                                                    </Menu.Item>
                                                    <Menu.Item
                                                        key="sort_date"
                                                        icon={<ClockCircleOutlined />}
                                                        onClick={() => document.dispatchEvent(new CustomEvent('sortScenarios', { detail: { sortBy: 'date' }}))}
                                                    >
                                                        Sort by Date
                                                    </Menu.Item>
                                                </Menu>
                                            }
                                            placement="bottomRight"
                                            trigger={['click']}
                                        >
                                            <Button
                                                icon={<EllipsisOutlined />}
                                                style={{
                                                    borderRadius: '6px',
                                                    border: '1px solid rgba(0, 0, 0, 0.1)'
                                                }}
                                            />
                                        </Dropdown>
                                    </div>
                                </div>

                                {/* Search Box */}
                                <div style={{ marginBottom: '16px' }}>
                                    <Search
                                        placeholder="Search scenarios..."
                                        allowClear
                                        value={recordingSearchTerm}
                                        onChange={(e) => handleRecordingSearch(e.target.value)}
                                        onSearch={handleRecordingSearch}
                                        style={{
                                            borderRadius: '8px',
                                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                        }}
                                    />
                                </div>

                                {/* Empty State - shown when no recordings exist */}
                                {recordings.length === 0 && (
                                    <div style={{
                                        textAlign: 'center',
                                        marginTop: '40px',
                                        padding: '24px',
                                        background: 'rgba(0, 0, 0, 0.02)',
                                        borderRadius: '8px',
                                        border: '1px dashed rgba(0, 0, 0, 0.1)'
                                    }}>
                                        <BookOutlined style={{ fontSize: '32px', color: '#0071E3', opacity: 0.5 }} />
                                        <Text style={{ display: 'block', marginTop: '16px', color: '#666', fontSize: '14px' }}>
                                            No recorded scenarios yet
                                        </Text>
                                        <Paragraph style={{ color: '#999', fontSize: '13px', marginTop: '8px' }}>
                                            Record app interactions to create test scenarios
                                        </Paragraph>
                                        <Space direction="vertical" style={{ width: '100%', marginTop: '16px' }}>
                                            <Button
                                                type="primary"
                                                icon={<PlusOutlined />}
                                                block
                                                onClick={() => document.dispatchEvent(new CustomEvent('navigateToRecordingView', {
                                                    detail: { keepSidePanelVisible: true }
                                                }))}
                                                style={{
                                                    borderRadius: '6px',
                                                    background: '#0071E3',
                                                    border: 'none'
                                                }}
                                            >
                                                Record New Scenario
                                            </Button>
                                            <Button
                                                icon={<ImportOutlined />}
                                                block
                                                onClick={() => {
                                                    // Create a hidden file input for opening recording files
                                                    const fileInput = document.createElement('input');
                                                    fileInput.type = 'file';
                                                    fileInput.accept = '.json,.appiumsession';
                                                    fileInput.style.display = 'none';

                                                    fileInput.onchange = (e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = () => {
                                                                try {
                                                                    const content = reader.result;
                                                                    const parsedContent = JSON.parse(content);

                                                                    if (Array.isArray(parsedContent)) {
                                                                        // Prompt for recording details
                                                                        Modal.confirm({
                                                                            title: 'Import Recording',
                                                                            icon: <ImportOutlined />,
                                                                            width: 500,
                                                                            content: (
                                                                                <div style={{ marginTop: '16px' }}>
                                                                                    <Form layout="vertical">
                                                                                        <Form.Item
                                                                                            label="Recording Name"
                                                                                            required
                                                                                            rules={[{ required: true }]}
                                                                                        >
                                                                                            <Input
                                                                                                id="recording-name-input2"
                                                                                                defaultValue={file.name.replace(/\.[^/.]+$/, "")}
                                                                                                placeholder="Enter recording name"
                                                                                            />
                                                                                        </Form.Item>
                                                                                        <Form.Item label="Module (Optional)">
                                                                                            <Input
                                                                                                id="recording-module-input2"
                                                                                                placeholder="e.g., Login, Dashboard, etc."
                                                                                            />
                                                                                        </Form.Item>
                                                                                        <Form.Item label="Description (Optional)">
                                                                                            <Input.TextArea
                                                                                                id="recording-description-input2"
                                                                                                rows={3}
                                                                                                placeholder="Describe this recording"
                                                                                            />
                                                                                        </Form.Item>
                                                                                    </Form>
                                                                                </div>
                                                                            ),
                                                                            onOk: () => {
                                                                                // Get values from form
                                                                                const name = document.getElementById('recording-name-input2').value;
                                                                                const module = document.getElementById('recording-module-input2').value;
                                                                                const description = document.getElementById('recording-description-input2').value;

                                                                                if (!name) {
                                                                                    message.error('Recording name is required');
                                                                                    return Promise.reject('Recording name is required');
                                                                                }

                                                                                // Import recording to project
                                                                                try {
                                                                                    const recording = RecordingService.importRecordingToProject({
                                                                                        data: parsedContent,
                                                                                        name,
                                                                                        module,
                                                                                        description
                                                                                    });

                                                                                    // Refresh recordings list
                                                                                    refreshRecordings();

                                                                                    // Clear existing recording in ActionRecorder
                                                                                    ActionRecorder.clearRecording();

                                                                                    // Add each entry from the loaded file to ActionRecorder
                                                                                    for (const entry of parsedContent) {
                                                                                        ActionRecorder.addEntry(entry);
                                                                                    }

                                                                                    // Navigate to recording view
                                                                                    document.dispatchEvent(new CustomEvent('navigateToRecordingView', {
                                                                                        detail: { keepSidePanelVisible: true }
                                                                                    }));

                                                                                    message.success(`"${name}" imported and saved to project`);
                                                                                    return Promise.resolve();
                                                                                } catch (error) {
                                                                                    message.error(`Failed to import recording: ${error.message}`);
                                                                                    return Promise.reject(error.message);
                                                                                }
                                                                            },
                                                                            okText: 'Import',
                                                                            cancelText: 'Cancel'
                                                                        });
                                                                    } else {
                                                                        throw new Error("Invalid recording format. Expected an array.");
                                                                    }
                                                                } catch (error) {
                                                                    message.error(`Failed to parse ${file.name}: ${error.message}`);
                                                                }
                                                            };
                                                            reader.readAsText(file);
                                                        }

                                                        // Remove the input after use
                                                        document.body.removeChild(fileInput);
                                                    };

                                                    // Add to DOM and trigger click
                                                    document.body.appendChild(fileInput);
                                                    fileInput.click();
                                                }}
                                                style={{
                                                    borderRadius: '6px',
                                                    border: '1px solid rgba(0, 0, 0, 0.1)'
                                                }}
                                            >
                                                Import Recording
                                            </Button>
                                        </Space>
                                    </div>
                                )}

                                {/* No search results state */}
                                {recordings.length > 0 && recordingSearchTerm && filteredRecordings.length === 0 && (
                                    <div style={{
                                        textAlign: 'center',
                                        marginTop: '40px',
                                        padding: '24px',
                                        background: 'rgba(0, 0, 0, 0.02)',
                                        borderRadius: '8px',
                                        border: '1px dashed rgba(0, 0, 0, 0.1)'
                                    }}>
                                        <SearchOutlined style={{ fontSize: '32px', color: '#0071E3', opacity: 0.5 }} />
                                        <Text style={{ display: 'block', marginTop: '16px', color: '#666', fontSize: '14px' }}>
                                            No recordings found matching "{recordingSearchTerm}"
                                        </Text>
                                        <Button
                                            type="link"
                                            onClick={() => setRecordingSearchTerm('')}
                                            style={{ marginTop: '8px' }}
                                        >
                                            Clear search
                                        </Button>
                                    </div>
                                )}

                                {/* Recording Tree - Shown when recordings exist and match search (if any) */}
                                {recordings.length > 0 && (!recordingSearchTerm || filteredRecordings.length > 0) && (
                                    <Tree
                                        showIcon={false}
                                        blockNode
                                        className="scenarios-tree apple-tree"
                                        style={{
                                            background: 'transparent',
                                            padding: '8px 0',
                                            borderRadius: '8px'
                                        }}
                                        switcherIcon={<DownOutlined style={{ fontSize: '10px', color: '#999' }} />}
                                        treeData={generateRecordingTreeData(filteredRecordings)}
                                        titleRender={(nodeData) => {
                                            const { title, isModule, scenarioData } = nodeData;

                                            if (isModule) {
                                                return (
                                                    <span className="tree-node-title-wrapper module-node" style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        fontWeight: '600',
                                                        fontSize: '13px',
                                                        color: '#666',
                                                        letterSpacing: '0.3px'
                                                    }}>
                                                        <FolderOutlined style={{ marginRight: '8px', color: '#0071E3' }} />
                                                        {title}
                                                    </span>
                                                );
                                            } else {
                                                return (
                                                    <span className="tree-node-title-wrapper scenario-node" style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        width: '100%',
                                                        borderRadius: '6px',
                                                        padding: '4px 0',
                                                        transition: 'background-color 0.15s ease'
                                                    }}>
                                                        <span
                                                            style={{
                                                                flexGrow: 1,
                                                                cursor: 'pointer',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                paddingRight: '5px',
                                                                fontSize: '13px',
                                                                fontWeight: '500',
                                                                display: 'flex',
                                                                alignItems: 'center'
                                                            }}
                                                            title={title}
                                                        >
                                                            <BookOutlined style={{ marginRight: '8px', fontSize: '14px', color: '#0071E3' }} />
                                                            {title}
                                                            {scenarioData.status === 'recording' && (
                                                                <Tag color="red" style={{ marginLeft: '8px', borderRadius: '4px', padding: '0 4px' }}>
                                                                    Recording
                                                                </Tag>
                                                            )}
                                                        </span>
                                                        <Space size="small" onClick={(e) => e.stopPropagation()} className="tree-node-actions" style={{
                                                            marginLeft: '8px',
                                                            opacity: '0',
                                                            transition: 'opacity 0.2s ease',
                                                        }}>
                                                            <Dropdown
                                                                overlay={
                                                                    <Menu>
                                                                        <Menu.Item key="edit" icon={<EditOutlined />}>
                                                                            Edit Recording
                                                                        </Menu.Item>
                                                                        <Menu.Item key="export" icon={<ExportOutlined />}>
                                                                            Export Recording
                                                                        </Menu.Item>
                                                                        <Menu.Divider />
                                                                        <Menu.Item key="delete" icon={<DeleteOutlined />} danger>
                                                                            Delete Recording
                                                                        </Menu.Item>
                                                                    </Menu>
                                                                }
                                                                trigger={['click']}
                                                            >
                                                                <Button
                                                                    size="small"
                                                                    type="text"
                                                                    icon={<EllipsisOutlined />}
                                                                    style={{
                                                                        borderRadius: '4px'
                                                                    }}
                                                                />
                                                            </Dropdown>
                                                        </Space>
                                                    </span>
                                                );
                                            }
                                        }}
                                        onSelect={(selectedKeys, { node }) => {
                                            // Only handle selection for recording nodes, not module nodes
                                            if (!node.isModule && node.scenarioData) {
                                                try {
                                                    // Load the recording from the project
                                                    RecordingService.loadRecordingFromProject(node.scenarioData.id);

                                                    // Navigate to recording view, passing a parameter to keep the side panel visible
                                                    document.dispatchEvent(new CustomEvent('navigateToRecordingView', {
                                                        detail: { keepSidePanelVisible: true }
                                                    }));

                                                    // Show success message
                                                    message.success(`"${node.scenarioData.name}" loaded successfully`);
                                                } catch (error) {
                                                    message.error(`Failed to load recording: ${error.message}`);
                                                }
                                            }
                                        }}
                                        onRightClick={handleRecordingRightClick}
                                    />
                                )}
                            </div>
                        </TabPane>
                        <TabPane
                            tab={
                                <span className="tab-with-icon">
                                    <FileTextOutlined />
                                    <span className="tab-title">Tests</span>
                                </span>
                            }
                            key="testcases"
                        >
                            <div style={{ padding: '16px', overflowY: 'auto', height: 'calc(100% - 40px)' }}>
                                <div style={{ textAlign: 'center', marginTop: '40px' }}>
                                    <FileTextOutlined style={{ fontSize: '32px', color: '#ccc' }} />
                                    <Text style={{ display: 'block', marginTop: '16px', color: '#999' }}>
                                        No test cases added
                                    </Text>
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        style={{
                                            marginTop: '16px',
                                            borderRadius: '6px',
                                            background: '#0071E3',
                                            border: 'none',
                                        }}
                                    >
                                        Add Test Case
                                    </Button>
                                </div>
                            </div>
                        </TabPane>
                        <TabPane
                            tab={
                                <span className="tab-with-icon">
                                    <CodeOutlined />
                                    <span className="tab-title">Classes</span>
                                </span>
                            }
                            key="classes"
                        >
                            <div style={{ padding: '16px', overflowY: 'auto', height: 'calc(100% - 40px)' }}>
                                <div style={{ textAlign: 'center', marginTop: '40px' }}>
                                    <CodeOutlined style={{ fontSize: '32px', color: '#ccc' }} />
                                    <Text style={{ display: 'block', marginTop: '16px', color: '#999' }}>
                                        No classes generated
                                    </Text>
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        style={{
                                            marginTop: '16px',
                                            borderRadius: '6px',
                                            background: '#0071E3',
                                            border: 'none',
                                        }}
                                    >
                                        Generate Classes
                                    </Button>
                                </div>
                            </div>
                        </TabPane>
                    </Tabs>
                )}

                {isCollapsed && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        marginTop: '20px',
                        gap: '16px'
                    }}>
                        <Tooltip title="Pages" placement="right">
                            <Button
                                type="text"
                                icon={<LayoutOutlined />}
                                style={{ fontSize: '18px' }}
                            />
                        </Tooltip>
                        <Tooltip title="Scenarios" placement="right">
                            <Button
                                type="text"
                                icon={<BookOutlined />}
                                style={{ fontSize: '18px' }}
                            />
                        </Tooltip>
                        <Tooltip title="Test Cases" placement="right">
                            <Button
                                type="text"
                                icon={<FileTextOutlined />}
                                style={{ fontSize: '18px' }}
                            />
                        </Tooltip>
                        <Tooltip title="Classes" placement="right">
                            <Button
                                type="text"
                                icon={<CodeOutlined />}
                                style={{ fontSize: '18px' }}
                            />
                        </Tooltip>
                    </div>
                )}
            </Sider>
            
            {/* Resizer component - positioned as a flex item right after the sidebar */}
            <div 
                ref={resizerRef}
                style={{
                    width: '8px',
                    height: '100%',
                    cursor: isCollapsed ? 'default' : 'ew-resize',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    marginLeft: '-8px', /* Pull back to overlap with sidebar edge */
                }}
                onMouseDown={isCollapsed ? null : handleMouseDown}
            >
                {/* Collapse/Expand button */}
                <Button 
                    type="text"
                    icon={isCollapsed ? <RightOutlined /> : <LeftOutlined />}
                    onClick={toggleCollapse}
                    style={{
                        position: 'absolute',
                        backgroundColor: '#f0f0f0',
                        border: '1px solid #d9d9d9',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        fontSize: '12px',
                        // Center the button in the divider
                        transform: 'translateX(-50%)',
                        left: '50%',
                        zIndex: 200
                    }}
                />
                {/* Visible divider line */}
                <div
                    style={{
                        width: '4px',
                        height: '100%',
                        backgroundColor: isDraggingRef.current ? '#1890ff' : '#f0f0f0',
                        transition: 'background-color 0.2s'
                    }}
                />
            </div>
            
            {/* Empty flex item to fill the remaining space */}
            <div style={{ flexGrow: 1, height: '100%' }} />

            {/* Render the recording context menu */}
            {recordingContextMenu}
        </div>
    );
};

export default SidePanel;