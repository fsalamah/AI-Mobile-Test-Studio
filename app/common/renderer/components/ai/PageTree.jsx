// PageTree.jsx
import React, { useState } from "react";
import { Tree, Typography, Button, Popconfirm, Tooltip, Space, Dropdown, Menu } from "antd";
import { 
  EditOutlined, 
  DeleteOutlined, 
  SettingOutlined, 
  RobotOutlined, 
  MoreOutlined,
  FolderOutlined,
  EllipsisOutlined
} from "@ant-design/icons";

const { Text } = Typography;

const PageTree = ({
    treeData,
    selectedKeys,
    expandedKeys,
    autoExpandParent,
    onSelect,
    onExpand,
    onEdit,
    onDelete,
    searchTerm,
    pages,
    projectId
}) => {
    

    const renderTreeNodeTitle = (nodeData) => {
        const { title, isModule, pageData } = nodeData;

        if (isModule) {
            return <span className="tree-node-title-wrapper">{title}</span>;
        } else {
            return (
                <span className="tree-node-title-wrapper page-node" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span
                        style={{ flexGrow: 1, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '5px' }}
                        title={title}
                    >
                        {title}
                    </span>
                    <Space size="small" onClick={e => e.stopPropagation()} className="tree-node-actions" style={{ marginLeft: '8px' }}>
                        <Tooltip title="Edit Page Details">
                            <Button size="small" type="text" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onEdit(pageData); }} />
                        </Tooltip>
                        
                        
                        <Tooltip title="Delete Page">
                            <Popconfirm
                                title={`Delete "${pageData.name}"?`}
                                description="All captured states will be deleted. This cannot be undone."
                                onConfirm={(e) => { e?.stopPropagation(); onDelete(pageData.id); }}
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

    return (
        <>
            {pages.length === 0 && !searchTerm ? (
                <Text type="secondary" style={{ textAlign: 'center', display: 'block', marginTop: 20 }}>
                    No pages created yet.
                </Text>
            ) : treeData.length === 0 && searchTerm ? (
                <Text type="secondary" style={{ textAlign: 'center', display: 'block', marginTop: 20 }}>
                    No pages found matching "{searchTerm}".
                </Text>
            ) : (
                <Tree
                    showIcon
                    blockNode
                    treeData={treeData}
                    onSelect={onSelect}
                    onExpand={onExpand}
                    expandedKeys={expandedKeys}
                    selectedKeys={selectedKeys}
                    autoExpandParent={autoExpandParent}
                    titleRender={renderTreeNodeTitle}
                    className="pages-tree"
                    style={{ background: 'transparent' }}
                />
            )}
            
            {/* Model Configuration Modal */}
        </>
    );
};

export default PageTree;