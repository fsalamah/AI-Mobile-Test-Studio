// TreeUtils.js
import React from "react";
import { FolderOutlined } from "@ant-design/icons";

/**
 * Utility functions for handling tree data in the AppiumAnalysisPanel
 */

/**
 * Build tree data from pages and search term
 * @param {Array} pages - Array of page objects
 * @param {String} searchTerm - Term to filter pages by
 * @returns {Object} - Object containing treeData and expandedKeys
 */
export const buildTreeData = (pages, searchTerm) => {
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

    // First identify all module paths that match the search term
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

    // Then build the tree structure
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
                            // Create a new node with icon as a JSX element
                            node = {
                                title: part,
                                key: nodeKey,
                                children: [],
                                //icon: FolderOutlined , // Ensure this is a JSX element
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
                    // Create a page node without an icon property to avoid React rendering issues
                    const pageNode = {
                        title: page.name,
                        key: pageKey,
                        isLeaf: true,
                        isModule: false,
                        pageData: page
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

    // Sort nodes (modules first, then alphabetically)
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

    // Filter empty modules if search is active
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
    
    return { 
        treeData: finalTree, 
        expandedKeys: Array.from(expandedKeys) 
    };
};

/**
 * Generate a unique ID
 * @returns {String} - A unique ID
 */
export const generateId = () => `id_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;