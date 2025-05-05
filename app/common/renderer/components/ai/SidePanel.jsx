// SidePanel.jsx
import React, { useState, useRef, useEffect } from "react";
import { Layout, Button, Dropdown, Menu, Input } from "antd";
import {
    PlusOutlined,
    SaveOutlined,
    EllipsisOutlined,
    FolderOpenOutlined,
    SearchOutlined,
    LeftOutlined,
    RightOutlined,
    RobotOutlined,
    SettingOutlined,
    HistoryOutlined,
    DeleteOutlined,
    FileOutlined
} from "@ant-design/icons";
import PageTree from "./PageTree.jsx";
import { getRecentProjects, removeRecentProject } from "./utils/FileOperationsUtils.js";

const { Sider } = Layout;
const { Search } = Input;

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
                    minWidth: isCollapsed ? '60px' : '200px',
                    height: '100%'
                }}
                ref={siderRef}
                collapsed={isCollapsed}
            >
                <div style={{ padding: '10px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ marginBottom: '10px', display: 'flex', gap: '8px' }}>
                        <Button 
                            icon={<PlusOutlined />} 
                            onClick={showNewPageModal} 
                            block 
                            type="primary" 
                            ghost
                        >
                            {!isCollapsed && 'New Page'}
                        </Button>
                        <Button 
                            icon={<RobotOutlined />} 
                            onClick={() => document.dispatchEvent(new CustomEvent('navigateToAiModelConfig'))} 
                            title="AI Model Configuration"
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
                            <Button icon={<EllipsisOutlined />} aria-label="File Actions" />
                        </Dropdown>
                    </div>
                    {!isCollapsed && (
                        <Search 
                            placeholder="Search pages or modules..." 
                            allowClear 
                            onSearch={onSearchChange}
                            onChange={e => onSearchChange(e.target.value)} 
                            prefix={<SearchOutlined />} 
                        />
                    )}
                </div>

                <div style={{ flexGrow: 1, overflowY: 'auto', padding: '0 10px 10px 10px' }}>
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
        </div>
    );
};

export default SidePanel;