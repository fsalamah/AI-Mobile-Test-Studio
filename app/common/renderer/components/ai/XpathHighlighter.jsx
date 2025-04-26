import React, { useState, useEffect, useRef } from 'react';
import {
    Input,
    Button,
    Checkbox,
    Space,
    Select,
    Typography,
    message,
    Spin,
    Divider,
    Tooltip
} from 'antd';
import { 
    SearchOutlined, 
    DownOutlined, 
    RightOutlined, 
    ExpandAltOutlined, 
    ShrinkOutlined 
} from '@ant-design/icons';

const { Text } = Typography;

// Main XML Viewer component
export default function XMLViewer({
    initialXml = '',
    onXPathMatch = null,
    initialXPathVersion = '1.0',
    initialXPath = '',
    onXPathChange = null
}) {
    const [xml, setXml] = useState(initialXml);
    const [parsedXml, setParsedXml] = useState(null);
    const [xpath, setXpath] = useState(initialXPath);
    const [xpathVersion, setXPathVersion] = useState(initialXPathVersion);
    const [matches, setMatches] = useState([]);
    const [matchedNodes, setMatchedNodes] = useState([]); // Store actual node references
    const [showAttributes, setShowAttributes] = useState(true);
    const [expandedNodes, setExpandedNodes] = useState({});
    const [error, setError] = useState(null);
    const [lineMap, setLineMap] = useState([]);
    const viewerRef = useRef(null);
    const firstMatchRef = useRef(null);
    const lineHeightRef = useRef(18); // Reduced line height for compact view
    const [scrollAttempts, setScrollAttempts] = useState(0); // Track scroll attempts

    // Method to update XML from outside the component
    const updateXml = (newXml) => {
        setXml(newXml);
    };

    // Method to update XPath version from outside the component
    const updateXPathVersion = (version) => {
        setXPathVersion(version);
    };

    // Custom setXpath function to handle both internal state and external callback
    const handleXPathChange = (newXPath) => {
        setXpath(newXPath);
        // Notify external components if callback provided
        if (onXPathChange && typeof onXPathChange === 'function') {
            onXPathChange(newXPath);
        }
    };
    
    // Effect to update internal state when initialXPath prop changes
    useEffect(() => {
        setXpath(initialXPath);
    }, [initialXPath]);

    // Method to evaluate an XPath expression and return results
    const evaluateXPathExpression = (xpathToEvaluate) => {
        // Set the xpath in the search box
        handleXPathChange(xpathToEvaluate);
        
        // If XML hasn't been parsed yet
        if (!parsedXml) {
            return {
                xpathExpression: xpathToEvaluate,
                numberOfMatches: 0,
                matchingNodes: [],
                isValid: false
            };
        }
        
        try {
            // Ensure we have a valid XPath query
            const xpathQuery = xpathToEvaluate.trim() || '/';
            const result = evaluateXPath(
                xpathQuery,
                parsedXml,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
            );
            
            const matchingNodesList = [];
            for (let i = 0; i < result.snapshotLength; i++) {
                matchingNodesList.push(result.snapshotItem(i));
            }
            
            return {
                xpathExpression: xpathToEvaluate,
                numberOfMatches: result.snapshotLength,
                matchingNodes: matchingNodesList,
                isValid: true
            };
        } catch (error) {
            return {
                xpathExpression: xpathToEvaluate,
                numberOfMatches: 0,
                matchingNodes: [],
                isValid: false
            };
        }
    };

    // Expose methods to external code
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.xmlViewer = {
                updateXml,
                updateXPathVersion,
                setXPathQuery: handleXPathChange,
                getXPathQuery: () => xpath,
                evaluateXPathExpression
            };
        }
        return () => {
            if (typeof window !== 'undefined') {
                delete window.xmlViewer;
            }
        };
    }, [xpath]); // Add xpath to dependency array to ensure getXPathQuery returns the latest value

    // Parse XML string to DOM
    useEffect(() => {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, "text/xml");

            // Check for parsing errors
            const parseError = xmlDoc.getElementsByTagName("parsererror");
            if (parseError.length > 0) {
                setParsedXml(null);
                setError("XML parsing error: " + parseError[0].textContent);
            } else {
                setParsedXml(xmlDoc);
                setError(null);
                // Initialize expanded state for the root element
                setExpandedNodes({ "node-0": true });
                
                // Generate more accurate line mapping
                generateLineMapping(xmlDoc);
            }
        } catch (error) {
            setParsedXml(null);
            setError("XML parsing error: " + error.message);
        }
    }, [xml]);

    // Generate a mapping between XML nodes and line numbers
    const generateLineMapping = (xmlDoc) => {
        const lines = xml.split('\n');
        const map = [];
        
        // Create a simple mapping function for demonstration
        // In a real implementation, we'd parse the XML more carefully to match nodes to lines
        let lineCounter = 0;
        const walkNodes = (node, depth = 0) => {
            if (!node) return;
            
            // Add entry for this node
            map.push({
                node: node,
                line: lineCounter,
                depth: depth
            });
            
            // Increment line counter to simulate line mapping
            lineCounter++;
            
            // Process child nodes
            if (node.childNodes && node.childNodes.length > 0) {
                Array.from(node.childNodes).forEach(child => {
                    if (child.nodeType === 1 || (child.nodeType === 3 && child.nodeValue.trim())) {
                        walkNodes(child, depth + 1);
                    }
                });
            }
            
            // Add line for closing tag
            if (node.nodeType === 1 && node.childNodes.length > 0) {
                map.push({
                    node: node,
                    line: lineCounter,
                    depth: depth,
                    isClosing: true
                });
                lineCounter++;
            }
        };
        
        if (xmlDoc.documentElement) {
            walkNodes(xmlDoc.documentElement);
        }
        
        setLineMap(map);
    };

    // Function to expand all ancestor nodes of a path
    const expandAncestors = (path) => {
        if (!path) return;

        // Create a mapping of all nodes
        const nodesToExpand = {};

        // For each xpath part, expand all ancestor nodes
        let currentPath = '';
        const parts = path.split('/').filter(Boolean);

        for (let i = 0; i < parts.length; i++) {
            currentPath += '/' + parts[i];
            nodesToExpand[currentPath] = true;
        }

        // Update expanded nodes by their paths
        const newExpandedNodes = { ...expandedNodes };
        document.querySelectorAll('[data-path]').forEach(el => {
            const nodePath = el.getAttribute('data-path');
            if (nodePath && nodesToExpand[nodePath]) {
                const nodeId = el.id;
                if (nodeId) {
                    newExpandedNodes[nodeId] = true;
                }
            }
        });

        setExpandedNodes(newExpandedNodes);
        
        // Reset scroll attempts counter when we have new matches
        setScrollAttempts(0);
    };

    // Helper function for XPath evaluation based on version
    const evaluateXPath = (xpath, context, resolver, type, result) => {
        // Set XPath version compatibility
        if (xpathVersion === '2.0' || xpathVersion === '3.0' || xpathVersion === '3.1') {
            // Modern browsers don't directly support XPath 2.0+ through the native API
            // We'll need to use a polyfill or library like Saxon-JS for proper support
            try {
                return document.evaluate(xpath, context, resolver, type, result);
            } catch (e) {
                throw new Error(`XPath ${xpathVersion} expression error: This browser might not fully support XPath ${xpathVersion} features.`);
            }
        } else {
            // XPath 1.0 (default browser support)
            return document.evaluate(xpath, context, resolver, type, result);
        }
    };

    // Find nodes matching XPath and expand ancestors
    useEffect(() => {
        if (!parsedXml || !xpath.trim()) {
            setMatches([]);
            setMatchedNodes([]);
            setError(null);
            return;
        }

        try {
            // Ensure we have a valid XPath query
            const xpathQuery = xpath.trim() || '/';
            const result = evaluateXPath(
                xpathQuery,
                parsedXml,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
            );

            const matchingPaths = [];
            const matchingNodesList = [];

            for (let i = 0; i < result.snapshotLength; i++) {
                const node = result.snapshotItem(i);
                const path = getXPath(node);
                matchingPaths.push(path);
                matchingNodesList.push(node);
            }

            setMatches(matchingPaths);
            setMatchedNodes(matchingNodesList);
            setError(null);

            // Reset scroll attempts when we have new matches
            setScrollAttempts(0);

            // If we have matches, expand all ancestors of the first match
            if (matchingPaths.length > 0) {
                expandAncestors(matchingPaths[0]);

                // Notify callback if provided
                if (onXPathMatch && typeof onXPathMatch === 'function') {
                    const matchEvent = {
                        xpathExpression: xpath,
                        matches: matchingNodesList
                    };
                    onXPathMatch(matchEvent);
                }
            }
        } catch (error) {
            setMatches([]);
            setMatchedNodes([]);
            setError("XPath error: " + error.message);
        }
    }, [parsedXml, xpath, xpathVersion, onXPathMatch]);

    // Improved scrolling to first highlighted element with retry mechanism
    useEffect(() => {
        // Only try to scroll if we have matches and expanded nodes are set
        if (matches.length > 0 && Object.keys(expandedNodes).length > 0) {
            // Use a delay that increases with each attempt, max 5 attempts
            const maxAttempts = 5;
            if (scrollAttempts < maxAttempts) {
                const timeout = setTimeout(() => {
                    const highlightedElements = document.querySelectorAll('[style*="background-color: rgb(255, 238, 200)"]');
                    
                    if (highlightedElements.length > 0 && viewerRef.current) {
                        // Find the first visible highlighted element
                        const firstElement = highlightedElements[0];
                        
                        // Calculate proper scroll position
                        const viewerRect = viewerRef.current.getBoundingClientRect();
                        const elementRect = firstElement.getBoundingClientRect();
                        const relativePosition = elementRect.top - viewerRect.top;
                        
                        // Scroll with offset
                        viewerRef.current.scrollTop += relativePosition - lineHeightRef.current;
                        
                        // If successfully scrolled, don't try again
                        if (Math.abs(relativePosition) < viewerRect.height) {
                            setScrollAttempts(maxAttempts); // Stop retries
                        } else {
                            // Try again
                            setScrollAttempts(prev => prev + 1);
                        }
                    } else {
                        // Try again if element not found
                        setScrollAttempts(prev => prev + 1);
                    }
                }, 100 * (scrollAttempts + 1)); // Increasing delay
                
                return () => clearTimeout(timeout);
            }
        }
    }, [matches, expandedNodes, scrollAttempts]);

    // Calculate XPath for a node
    const getXPath = (node) => {
        if (!node) return "";
        
        // Handle text nodes
        if (node.nodeType === 3) {
            if (node.parentNode) return getXPath(node.parentNode) + "/text()";
            return "";
        }
        
        // Handle element nodes
        if (node.nodeType !== 1) return "";

        const segments = [];
        let currentNode = node;
        
        while (currentNode && currentNode.nodeType === 1) {
            let name = currentNode.nodeName.toLowerCase();
            let index = 1;
            let sibling = currentNode.previousSibling;

            while (sibling) {
                if (sibling.nodeType === 1 && sibling.nodeName === currentNode.nodeName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }

            // Only add index if there are multiple siblings with the same name
            const indexStr = index > 1 ? `[${index}]` : "";
            segments.unshift(`${name}${indexStr}`);
            currentNode = currentNode.parentNode;
        }

        return '/' + segments.join('/');
    };

    // Toggle node expansion
    const toggleNode = (nodeId) => {
        setExpandedNodes(prev => ({
            ...prev,
            [nodeId]: !prev[nodeId]
        }));
        
        // Reset scroll attempts when expanding/collapsing nodes
        setScrollAttempts(0);
    };

    // Expand all nodes
    const expandAllNodes = () => {
        const allNodes = {};
        document.querySelectorAll('[id^="node-"]').forEach(el => {
            allNodes[el.id] = true;
        });
        setExpandedNodes(allNodes);
        
        // Reset scroll attempts when expanding all nodes
        setScrollAttempts(0);
    };

    // Collapse all nodes except root
    const collapseAllNodes = () => {
        setExpandedNodes({ "node-0": true });
        
        // Reset scroll attempts when collapsing nodes
        setScrollAttempts(0);
    };

    // Check if a node or its path matches any of the XPath matches
    const isHighlighted = (node, nodePath) => {
        // Direct path matching
        if (matches.includes(nodePath)) {
            return true;
        }
        
        // Prevent evaluation of empty XPath expressions
        if (!xpath.trim()) {
            return false;
        }
        
        try {
            // Direct node object matching (as a fallback)
            const xpathQuery = xpath.trim() || '/';
            const matchingXPathResult = document.evaluate(
                xpathQuery, 
                parsedXml, 
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
            );
            
            for (let i = 0; i < matchingXPathResult.snapshotLength; i++) {
                if (matchingXPathResult.snapshotItem(i) === node) {
                    return true;
                }
            }
        } catch (error) {
            console.error("Error in highlight check:", error);
        }
        
        return false;
    };

    // Custom arrow components for expand/collapse using Ant Design icons
    const DownArrow = () => <DownOutlined style={{ fontSize: '10px', marginRight: '2px' }} />;
    const RightArrow = () => <RightOutlined style={{ fontSize: '10px', marginRight: '2px' }} />;

    // Recursively render XML nodes with line numbering
    const renderNode = (node, level = 0, path = "", index = 0, parentId = "", lineIndex = 0) => {
        if (!node) return null;

        const nodeId = `${parentId}node-${index}`;

        // Text nodes
        if (node.nodeType === 3) {
            const content = node.nodeValue.trim();
            if (!content) return null;

            // Build path for text nodes
            const textNodePath = `${path}/text()`;
            const highlighted = isHighlighted(node, textNodePath);

            return (
                <div
                    style={{ 
                        marginLeft: level * 12, 
                        backgroundColor: highlighted ? '#ffeec8' : 'transparent',
                        padding: '1px 0',
                        lineHeight: '16px',
                        whiteSpace: 'nowrap'
                    }}
                    ref={highlighted && matches[0] === textNodePath ? firstMatchRef : null}
                    data-line={lineIndex}
                    data-matched={highlighted ? 'true' : 'false'}
                >
                    <span style={{ color: '#333' }}>{content}</span>
                </div>
            );
        }

        // Element nodes
        if (node.nodeType === 1) {
            const nodeName = node.nodeName;
            const nodePath = `${path}/${nodeName.toLowerCase()}`;
            const highlighted = isHighlighted(node, nodePath);
            const isExpanded = expandedNodes[nodeId] ?? false;
            const hasChildren = node.childNodes.length > 0;

            // Create array of attributes
            const attributes = [];
            if (node.attributes) {
                for (let i = 0; i < node.attributes.length; i++) {
                    const attr = node.attributes[i];
                    attributes.push({ name: attr.name, value: attr.value });
                }
            }

            return (
                <div
                    key={nodeId}
                    id={nodeId}
                    data-path={nodePath}
                    data-line={lineIndex}
                    data-matched={highlighted ? 'true' : 'false'}
                    style={{ backgroundColor: highlighted ? '#ffeec8' : 'transparent' }}
                    ref={highlighted && matches[0] === nodePath ? firstMatchRef : null}
                >
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        padding: '1px 0',
                        lineHeight: '16px',
                        whiteSpace: 'nowrap'
                    }}>
                        {/* Node name with expand/collapse control */}
                        <div
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                cursor: hasChildren ? 'pointer' : 'default',
                                marginLeft: level * 12
                            }}
                            onClick={() => hasChildren && toggleNode(nodeId)}
                        >
                            {hasChildren && (
                                isExpanded ? <DownArrow /> : <RightArrow />
                            )}
                            <span style={{ color: '#2196f3' }}>&lt;{nodeName}</span>
                        </div>

                        {/* Attributes section */}
                        {showAttributes && attributes.length > 0 && (
                            <span style={{ marginLeft: 4 }}>
                                {attributes.map((attr, i) => (
                                    <span key={i} style={{ marginLeft: 4 }}>
                                        <span style={{ color: '#4caf50' }}>{attr.name}</span>=
                                        <span style={{ color: '#f44336' }}>"{attr.value}"</span>
                                    </span>
                                ))}
                            </span>
                        )}

                        {/* Self-closing or opening tag */}
                        <span style={{ color: '#2196f3', marginLeft: 4 }}>
                            {!hasChildren ? "/>" : ">"}
                        </span>
                    </div>

                    {/* Child nodes */}
                    {hasChildren && isExpanded && (
                        <div>
                            {Array.from(node.childNodes).map((childNode, childIndex) =>
                                renderNode(
                                    childNode, 
                                    level + 1, 
                                    nodePath, 
                                    childIndex, 
                                    `${nodeId}-`, 
                                    lineIndex + childIndex + 1
                                )
                            )}
                        </div>
                    )}

                    {/* Closing tag (only for non-empty elements) */}
                    {hasChildren && isExpanded && (
                        <div 
                            style={{ 
                                marginLeft: level * 12, 
                                color: '#2196f3',
                                padding: '1px 0',
                                lineHeight: '16px',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            &lt;/{nodeName}&gt;
                        </div>
                    )}
                </div>
            );
        }

        return null;
    };

    // Create line numbers based on the actual rendered nodes
    const renderLineNumbers = () => {
        const lineCount = lineMap.length > 0 ? lineMap.length : xml.split('\n').length;
        return Array.from({ length: lineCount }, (_, i) => (
            <div key={i} style={{ lineHeight: '16px', height: '16px', fontSize: '10px' }}>{i + 1}</div>
        ));
    };

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            border: '1px solid #d9d9d9', 
            borderRadius: 4, 
            boxShadow: '0 2px 0 rgba(0, 0, 0, 0.02)', 
            width: '100%',
            //position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
        }}>
            <div style={{ backgroundColor: '#f0f2f5', padding: '8px', borderBottom: '1px solid #e8e8e8' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ flexGrow: 1, marginRight: 8, minWidth: 200 }}>
                            <Input
                                prefix={<SearchOutlined />}
                                value={xpath}
                                onChange={(e) => handleXPathChange(e.target.value)}
                                placeholder="Enter XPath expression..."
                                size="small"
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Tooltip title="Expand All">
                                <Button 
                                    icon={<ExpandAltOutlined />} 
                                    size="small" 
                                    onClick={expandAllNodes}
                                    style={{ marginRight: 4 }}
                                />
                            </Tooltip>
                            <Tooltip title="Collapse All">
                                <Button 
                                    icon={<ShrinkOutlined />} 
                                    size="small" 
                                    onClick={collapseAllNodes}
                                />
                            </Tooltip>
                        </div>

                        <div style={{ marginLeft: 16, minWidth: 120, display:'none' }}>
                            <Select
                                value={xpathVersion}
                                onChange={(value) => setXPathVersion(value)}
                                style={{ width: '100%' }}
                                size="small"
                            >
                                <Select.Option value="1.0">XPath 1.0</Select.Option>
                                <Select.Option value="2.0">XPath 2.0</Select.Option>
                                <Select.Option value="3.0">XPath 3.0</Select.Option>
                                <Select.Option value="3.1">XPath 3.1</Select.Option>
                            </Select>
                        </div>

                        <Space style={{ marginTop: 8, marginBottom:0, paddingBottom:0, display:'none'}}>
                            <Checkbox checked={showAttributes} onChange={() => setShowAttributes(!showAttributes)}>
                                Show Attributes
                            </Checkbox>
                        </Space>
                    </div>

                    <div style={{ marginTop: 4, fontSize: '12px' }}>
                        {error ? (
                            <Text type="danger">{error}</Text>
                        ) : matches.length > 0 ? (
                            <Text type="success">{matches.length} match{matches.length !== 1 ? 'es' : ''} found</Text>
                        ) : (
                            <Text type="secondary">No matches</Text>
                        )}
                    </div>
                </Space>
            </div>

            <div 
                ref={viewerRef} 
                style={{ 
                    flexGrow: 1, 
                    overflow: 'auto', 
                    backgroundColor: '#fff', 
                    display: 'flex', 
                    width: '100%',
                    position: 'relative'
                }}
            >
                {parsedXml ? (
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'row', 
                        width: '100%', 
                        fontFamily: 'monospace',
                        minHeight: '100%'
                    }}>
                        {/* Line numbers column */}
                        <div style={{ 
                            paddingRight: 6, 
                            paddingLeft: 2,
                            textAlign: 'right', 
                            color: '#bfbfbf', 
                            userSelect: 'none', 
                            borderRight: '1px solid #e8e8e8', 
                            marginRight: 8, 
                            fontSize: '10px',
                            backgroundColor: '#f9f9f9',
                            minWidth: '24px'
                        }}>
                            {renderLineNumbers()}
                        </div>

                        {/* XML viewer */}
                        <div style={{ 
                            flexGrow: 1, 
                            overflowX: 'auto', 
                            width: '100%', 
                            fontSize: '10px'
                        }}>
                            {renderNode(parsedXml.documentElement, 0, "", 0, "", 0)}
                        </div>
                    </div>
                ) : (
                    <Text type="danger">Invalid XML</Text>
                )}
            </div>
        </div>
    );
}