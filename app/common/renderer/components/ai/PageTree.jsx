// PageTree.jsx
import { useState, useEffect } from 'react';
import { Tree, Typography, Button, Popconfirm, Tooltip, Space, Menu, message, Modal, Input } from 'antd';
import styles from '../Inspector/Inspector.module.css';
import {
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  DownOutlined,
  CopyOutlined,
  EyeOutlined
} from '@ant-design/icons';

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
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [selectedNode, setSelectedNode] = useState(null);

    // Handle right-click on tree node
    const handleRightClick = ({ event, node }) => {
        event.preventDefault();
        event.stopPropagation();

        // Only show context menu for page nodes, not module nodes
        if (!node.isModule) {
            setContextMenuPosition({ x: event.clientX, y: event.clientY });
            setSelectedNode(node);
            setContextMenuVisible(true);
        }
    };

    // Hide context menu when clicked elsewhere
    const handleOutsideClick = () => {
        setContextMenuVisible(false);
    };

    // Add event listener for outside clicks
    useEffect(() => {
        if (contextMenuVisible) {
            document.addEventListener('click', handleOutsideClick);
        }
        return () => {
            document.removeEventListener('click', handleOutsideClick);
        };
    }, [contextMenuVisible]);

    // Create context menu for right-click
    const contextMenu = selectedNode && (
        <div
            className={styles['context-menu']}
            style={{
                position: 'fixed',
                top: contextMenuPosition.y,
                left: contextMenuPosition.x,
                zIndex: 1000,
                display: contextMenuVisible ? 'block' : 'none',
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
                    key="edit"
                    icon={<EditOutlined style={{ color: '#0071E3' }} />}
                    onClick={() => {
                        setContextMenuVisible(false);

                        // Show enhanced edit modal with validation
                        const pageData = selectedNode.pageData;
                        let editedName = pageData.name;
                        let editedModule = pageData.module || '';
                        let editedDescription = pageData.description || '';

                        Modal.confirm({
                            title: 'Edit Page Details',
                            content: (
                                <div style={{ marginTop: '16px' }}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Page Name*</label>
                                        <Input
                                            defaultValue={pageData.name}
                                            placeholder="Enter page name"
                                            onChange={(e) => {
                                                editedName = e.target.value;
                                                // Enable/disable OK button based on validation
                                                const confirmButton = document.querySelector('.ant-modal-confirm-btns button.ant-btn-primary');
                                                if (confirmButton) {
                                                    confirmButton.disabled = !editedName.trim();
                                                }
                                            }}
                                            onPressEnter={(e) => e.preventDefault()} // Prevent form submission
                                        />
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Module (Optional)</label>
                                        <Input
                                            defaultValue={pageData.module || ''}
                                            placeholder="e.g., Auth, Dashboard, Settings"
                                            onChange={(e) => {
                                                editedModule = e.target.value;
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Description (Optional)</label>
                                        <Input.TextArea
                                            defaultValue={pageData.description || ''}
                                            placeholder="Describe the purpose of this page"
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
                                // Prepare updated page data
                                const updatedPageData = {
                                    ...pageData,
                                    name: editedName.trim(),
                                    module: editedModule.trim(),
                                    description: editedDescription.trim()
                                };

                                // Call the edit handler from parent component
                                onEdit(updatedPageData);
                            },
                            width: 500,
                            centered: true,
                            maskClosable: false,
                            icon: <EditOutlined style={{ color: '#0071E3' }} />
                        });
                    }}
                    style={{}}
                >
                    Edit Page
                </Menu.Item>
                <Menu.Item
                    key="view"
                    icon={<EyeOutlined style={{ color: '#0071E3' }} />}
                    onClick={() => {
                        setContextMenuVisible(false);
                        // Select the node to view it
                        onSelect([selectedNode.key], { node: selectedNode });
                    }}
                    style={{}}
                >
                    View Page
                </Menu.Item>
                <Menu.Item
                    key="duplicate"
                    icon={<CopyOutlined style={{ color: '#0071E3' }} />}
                    onClick={() => {
                        setContextMenuVisible(false);
                        // You could implement duplicate functionality here
                        message.info('Duplicate feature not implemented yet');
                    }}
                    style={{}}
                >
                    Duplicate
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                    key="delete"
                    icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />}
                    onClick={() => {
                        setContextMenuVisible(false);
                        const pageName = selectedNode.pageData.name;

                        // Enhanced safety: Show more detailed confirmation
                        Modal.confirm({
                            title: `Are you sure you want to delete "${pageName}"?`,
                            content: (
                                <div>
                                    <p>This action cannot be undone and will permanently delete:</p>
                                    <ul>
                                        <li>All captured states for this page</li>
                                        <li>Any AI-generated code for this page</li>
                                        <li>All locators and visual elements</li>
                                    </ul>
                                    <p style={{ marginTop: '12px' }}>
                                        <Input
                                            placeholder={`Type "${pageName}" to confirm`}
                                            style={{ marginTop: '8px' }}
                                            onChange={(e) => {
                                                const confirmButton = document.querySelector('.ant-modal-confirm-btns button.ant-btn-primary');
                                                if (confirmButton) {
                                                    confirmButton.disabled = e.target.value !== pageName;
                                                }
                                            }}
                                        />
                                    </p>
                                </div>
                            ),
                            okText: 'Delete Page',
                            okButtonProps: {
                                danger: true,
                                disabled: true // Initially disabled until user types confirmation
                            },
                            cancelText: 'Cancel',
                            onOk: () => {
                                onDelete(selectedNode.pageData.id);
                            },
                            icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
                            width: 500,
                            centered: true,
                            maskClosable: false,
                            okCancel: true,
                            zIndex: 1050
                        });
                    }}
                    danger
                    style={{}}
                >
                    Delete Page
                </Menu.Item>
            </Menu>
        </div>
    );

    const renderTreeNodeTitle = (nodeData) => {
        const { title, isModule, pageData } = nodeData;

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
                <span className="tree-node-title-wrapper page-node" style={{
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
                            fontWeight: '500'
                        }}
                        title={title}
                    >
                        {title}
                    </span>
                    <Space size="small" onClick={(e) => e.stopPropagation()} className="tree-node-actions" style={{
                        marginLeft: '8px',
                        opacity: '0',
                        transition: 'opacity 0.2s ease',
                        // Show on hover of parent node
                        ':hover': {
                            opacity: '1'
                        }
                    }}>
                        <Tooltip title="Edit Page Details">
                            <Button
                                size="small"
                                type="text"
                                icon={<EditOutlined />}
                                onClick={(e) => { e.stopPropagation(); onEdit(pageData); }}
                                style={{
                                    borderRadius: '4px',
                                    color: '#666'
                                }}
                            />
                        </Tooltip>

                        <Tooltip title="Delete Page">
                            <Popconfirm
                                title={`Delete "${pageData.name}"?`}
                                description="All captured states will be deleted. This cannot be undone."
                                onConfirm={(e) => { e?.stopPropagation(); onDelete(pageData.id); }}
                                onCancel={(e) => e?.stopPropagation()}
                                okText="Yes, Delete"
                                cancelText="No"
                                placement="right"
                                overlayStyle={{
                                    borderRadius: '8px',
                                    boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08)'
                                }}
                            >
                                <Button
                                    size="small"
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        borderRadius: '4px'
                                    }}
                                />
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
                    showIcon={false}
                    blockNode
                    treeData={treeData}
                    onSelect={onSelect}
                    onExpand={onExpand}
                    expandedKeys={expandedKeys}
                    selectedKeys={selectedKeys}
                    autoExpandParent={autoExpandParent}
                    titleRender={renderTreeNodeTitle}
                    className="pages-tree apple-tree"
                    style={{
                        background: 'transparent',
                        padding: '8px 0',
                        borderRadius: '8px'
                    }}
                    switcherIcon={<DownOutlined style={{ fontSize: '10px', color: '#999' }} />}
                    onRightClick={handleRightClick}
                />
            )}

            {/* Render the context menu */}
            {contextMenu}

            {/* Model Configuration Modal */}
        </>
    );
};

export default PageTree;