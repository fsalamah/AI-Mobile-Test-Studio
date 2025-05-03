// SidePanel.jsx
import React, { useState, useRef } from "react";
import { Layout, Button, Dropdown, Menu, Input } from "antd";
import {
    PlusOutlined,
    SaveOutlined,
    EllipsisOutlined,
    FolderOpenOutlined,
    SearchOutlined,
    LeftOutlined,
    RightOutlined
} from "@ant-design/icons";
import PageTree from "./PageTree.jsx";

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
    saving
}) => {
    const showNewPageModal = () => {
        // This will be handled by PageOperations component
        document.dispatchEvent(new CustomEvent('showNewPageModal'));
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
    const [isCollapsed, setIsCollapsed] = useState(false);
    const resizerRef = useRef(null);
    const siderRef = useRef(null);
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
        const delta = e.clientX - startXRef.current;
        const newWidth = Math.max(50, Math.min(600, startWidthRef.current + delta));
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
        if (isCollapsed) {
            setIsCollapsed(false);
            setSiderWidth(300); // Reset to default width when expanding
        } else {
            setIsCollapsed(true);
            setSiderWidth(0);
        }
    };

    return (
        <div style={{ position: 'relative', height: '100%', display: 'flex' }}>
            <Sider 
                width={siderWidth} 
                theme="light" 
                style={{ 
                    borderRight: '1px solid #f0f0f0', 
                    overflowY: 'auto', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: isCollapsed ? 'width 0.2s' : 'none'
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
                        <Dropdown overlay={menu} trigger={['click']}>
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
                    />
                </div>
            </Sider>
            
            {/* Resizer */}
            <div 
                ref={resizerRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: siderWidth,
                    width: '8px',
                    cursor: 'ew-resize',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                onMouseDown={handleMouseDown}
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
                        fontSize: '12px'
                    }}
                />
                <div
                    style={{
                        width: '4px',
                        height: '100%',
                        backgroundColor: isDraggingRef.current ? '#1890ff' : '#f0f0f0',
                        transition: 'background-color 0.2s'
                    }}
                />
            </div>
        </div>
    );
};

export default SidePanel;