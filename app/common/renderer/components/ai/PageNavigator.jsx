import React, { useState, useEffect, useMemo } from "react";
import {
    Button,
    Typography,
    Tree,
    Input,
    Dropdown,
    Menu,
    Tooltip,
    Popconfirm,
    Space,
    Layout
} from "antd";
import {
    PlusOutlined,
    SaveOutlined,
    DeleteOutlined,
    EditOutlined,
    EllipsisOutlined,
    FileTextOutlined,
    FolderOutlined,
    FolderOpenOutlined,
    CloudUploadOutlined,
    SearchOutlined
} from "@ant-design/icons";

const { Text } = Typography;
const { Search } = Input;
const { Sider } = Layout;

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

const PageNavigator = ({
    pages = [],
    selectedPageId = null,
    onSelectPage = () => {},
    onCreatePage = () => {},
    onEditPage = () => {},
    onDeletePage = () => {},
    onOpenFile = () => {},
    onSaveFile = () => {},
    onSelectSaveLocation = () => {},
    saving = false
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedKeys, setExpandedKeys] = useState([]);
    const [autoExpandParent, setAutoExpandParent] = useState(true);
    const [selectedKeys, setSelectedKeys] = useState([]);

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
            setSelectedKeys([]);
        }
        if (selectedPageId) {
            const pageKey = `page_${selectedPageId}`;
            if (!selectedKeys.includes(pageKey)) {
                setSelectedKeys([pageKey]);
                const pageData = pages.find(p => p.id === selectedPageId);
                if (pageData?.module) {
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
    }, [pages, selectedPageId, expandedKeys]);

    const handleTreeSelect = (selectedKeysValue, info) => {
        const selectedKey = selectedKeysValue[0];
        if (selectedKey && selectedKey.startsWith('page_')) {
            const pageId = selectedKey.substring('page_'.length);
            if (selectedPageId !== pageId && typeof onSelectPage === 'function') {
                onSelectPage(pageId);
            }
        } else if (selectedKey && selectedKey.startsWith('module_')) {
            setSelectedKeys(selectedKeysValue);
        } else {
            if ((info && info.selected === false) || (selectedKey && !selectedKey.startsWith('page_'))) {
                setSelectedKeys(selectedKeysValue || []);
                if (selectedPageId && typeof onSelectPage === 'function') {
                    onSelectPage(null);
                }
            }
        }
    };

    const onTreeExpand = (newExpandedKeys) => {
        setExpandedKeys(newExpandedKeys);
        setAutoExpandParent(false);
    };

    const renderTreeNodeTitle = (nodeData) => {
        const { title, key, isModule, pageData } = nodeData;

        if (isModule) {
            return <span className="tree-node-title-wrapper">{title}</span>;
        } else {
            return (
                <span className="tree-node-title-wrapper page-node" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span
                        style={{ flexGrow: 1, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '5px' }}
                        onClick={(e) => { e.stopPropagation(); onSelectPage(pageData.id); }}
                        title={title}
                    >
                        {title}
                    </span>
                    <Space size="small" onClick={e => e.stopPropagation()} className="tree-node-actions" style={{ marginLeft: '8px' }}>
                        <Tooltip title="Edit Page Details">
                            <Button size="small" type="text" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onEditPage(pageData); }} />
                        </Tooltip>
                        <Tooltip title="Delete Page">
                            <Popconfirm
                                title={`Delete "${pageData.name}"?`}
                                description="All captured states will be deleted. This cannot be undone."
                                onConfirm={(e) => { e?.stopPropagation(); onDeletePage(pageData.id); }}
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
        <Sider width={300} theme="light" style={{ borderRight: '1px solid #f0f0f0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ marginBottom: '10px', display: 'flex', gap: '8px' }}>
                    <Button 
                        icon={<PlusOutlined />} 
                        onClick={() => {
                            if (typeof onCreatePage === 'function') {
                                onCreatePage();
                            } else {
                                console.error("onCreatePage is not a function");
                            }
                        }} 
                        block type="primary" ghost
                    >
                        New Page
                    </Button>
                    <Dropdown 
                        overlay={
                            <Menu>
                                <Menu.Item 
                                    key="open" 
                                    icon={<FolderOpenOutlined />} 
                                    onClick={() => {
                                        if (typeof onOpenFile === 'function') {
                                            onOpenFile();
                                        } else {
                                            console.error("onOpenFile is not a function");
                                        }
                                    }}
                                >
                                    Open File...
                                </Menu.Item>
                <Menu.Item 
                                    key="save_location" 
                                    icon={<SaveOutlined />} 
                                    onClick={() => {
                                        if (typeof onSelectSaveLocation === 'function') {
                                            onSelectSaveLocation();
                                        } else {
                                            console.error("onSelectSaveLocation is not a function");
                                        }
                                    }}
                                >
                                    Select Save Location...
                                </Menu.Item>
                                <Menu.Item 
                                    key="save" 
                                    icon={<CloudUploadOutlined />} 
                                    onClick={() => {
                                        if (typeof onSaveFile === 'function') {
                                            onSaveFile();
                                        } else {
                                            console.error("onSaveFile is not a function");
                                        }
                                    }} 
                                    disabled={saving || pages.length === 0}
                                >
                                    {saving ? "Saving..." : "Save Project"}
                                </Menu.Item>
                            </Menu>
                        }
                        trigger={['click']}
                    >
                        <Button icon={<EllipsisOutlined />} aria-label="File Actions" />
                    </Dropdown>
                </div>
                <Search 
                    placeholder="Search pages or modules..." 
                    allowClear 
                    onSearch={setSearchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    prefix={<SearchOutlined />} 
                />
            </div>

            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '0 10px 10px 10px' }}>
                {pages.length === 0 && !searchTerm ? (
                    <Text type="secondary" style={{ textAlign: 'center', display: 'block', marginTop: 20 }}>
                        No pages created yet.
                    </Text>
                ) : treeData.length === 0 && searchTerm ? (
                    <Text type="secondary" style={{ textAlign: 'center', display: 'block', marginTop: 20 }}>
                        No pages found matching "${searchTerm}".
                    </Text>
                ) : (
                    <Tree
                        showIcon
                        blockNode
                        treeData={treeData}
                        onSelect={handleTreeSelect}
                        onExpand={onTreeExpand}
                        expandedKeys={expandedKeys}
                        selectedKeys={selectedKeys}
                        autoExpandParent={autoExpandParent}
                        titleRender={renderTreeNodeTitle}
                        className="pages-tree"
                        style={{ background: 'transparent' }}
                    />
                )}
            </div>
        </Sider>
    );
};

// At the end of the file, add PropTypes
PageNavigator.propTypes = {
    // Add prop types here if you're using prop-types library
};

// Add defaultProps
PageNavigator.defaultProps = {
    pages: [],
    selectedPageId: null,
    onSelectPage: () => console.log("onSelectPage not provided"),
    onCreatePage: () => console.log("onCreatePage not provided"),
    onEditPage: () => console.log("onEditPage not provided"),
    onDeletePage: () => console.log("onDeletePage not provided"),
    onOpenFile: () => console.log("onOpenFile not provided"),
    onSaveFile: () => console.log("onSaveFile not provided"),
    onSelectSaveLocation: () => console.log("onSelectSaveLocation not provided"),
    saving: false
};

export default PageNavigator;