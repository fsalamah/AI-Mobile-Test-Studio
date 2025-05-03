// SidePanel.jsx
import React from "react";
import { Layout, Button, Dropdown, Menu, Input } from "antd";
import {
    PlusOutlined,
    SaveOutlined,
    EllipsisOutlined,
    FolderOpenOutlined,
    SearchOutlined
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
        </Menu>
    );

    return (
        <Sider width={300} theme="light" style={{ 
            borderRight: '1px solid #f0f0f0', 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column' 
        }}>
            <div style={{ padding: '10px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ marginBottom: '10px', display: 'flex', gap: '8px' }}>
                    <Button 
                        icon={<PlusOutlined />} 
                        onClick={showNewPageModal} 
                        block 
                        type="primary" 
                        ghost
                    >
                        New Page
                    </Button>
                    <Dropdown overlay={menu} trigger={['click']}>
                        <Button icon={<EllipsisOutlined />} aria-label="File Actions" />
                    </Dropdown>
                </div>
                <Search 
                    placeholder="Search pages or modules..." 
                    allowClear 
                    onSearch={onSearchChange}
                    onChange={e => onSearchChange(e.target.value)} 
                    prefix={<SearchOutlined />} 
                />
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
    );
};

export default SidePanel;