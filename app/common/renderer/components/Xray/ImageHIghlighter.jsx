import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * ImageHighlighter Component
 * 
 * Renders a base64 PNG image with highlight boxes drawn over specified XML nodes
 * using HTML div elements instead of canvas.
 * Features enhanced border animations including a glowing effect and fluid animation.
 * Handles both Android and iOS Appium XML node formats.
 * 
 * @param {Object} props
 * @param {string} props.base64Png - Base64 encoded PNG image
 * @param {number} props.pixelRatio - Device pixel ratio
 * @param {Array} props.matchingNodes - Array of Appium XML nodes to highlight
 * @param {boolean} props.debug - Enable debug logging
 */
const ImageHighlighter = ({ 
  base64Png, 
  pixelRatio = 1, 
  matchingNodes = [], 
  debug = false 
}) => {
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [aspectRatioAfterResize, setAspectRatioAfterResize] = useState(1);
  const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 });
  const [highlightBoxes, setHighlightBoxes] = useState([]);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const imgElementRef = useRef(null);
  
  // Initialize matchingNodesRef with the passed prop value
  const matchingNodesRef = useRef(matchingNodes);

  // Conditionally log based on debug flag
  const log = useCallback((...args) => {
    if (debug) {
      console.log(...args);
    }
  }, [debug]);

  // Handle window resize and container size changes
  const updateDimensions = useCallback((imageWidth, imageHeight) => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    
    log(`Container size: ${containerWidth}x${containerHeight}`);
    
    const aspectRatio = imageWidth / imageHeight;
    
    // Always fit within the container height and width
    // First check if fitting to width would exceed height
    let newWidth = containerWidth;
    let newHeight = containerWidth / aspectRatio;
    
    // If the height exceeds container height, scale down to fit height
    if (newHeight > containerHeight) {
      newHeight = containerHeight;
      newWidth = containerHeight * aspectRatio;
    }
    
    // Ensure the image takes up 90% of available container size at most
    // This leaves some margin to prevent touching the edges
    newWidth = Math.min(newWidth, containerWidth * 0.9);
    newHeight = Math.min(newHeight, containerHeight * 0.9);
    
    log(`Calculated dimensions: ${newWidth}x${newHeight}`);
    setDimensions({ width: newWidth, height: newHeight });
    setAspectRatioAfterResize(newWidth / imageWidth);
  }, [log]);

  // Parse node bounds and apply scaling
  const parseNodeBounds = useCallback((node) => {
    if (!node) return null;
    
    try {
      // Case 1: Node has x, y, width, height attributes
      if (node.getAttribute && node.getAttribute('x') !== null && 
          node.getAttribute('y') !== null && 
          node.getAttribute('width') !== null && 
          node.getAttribute('height') !== null) {
        // First calculate the original bounds
        const x = parseFloat(node.getAttribute('x')) * pixelRatio * aspectRatioAfterResize;
        const y = parseFloat(node.getAttribute('y')) * pixelRatio * aspectRatioAfterResize;
        const width = parseFloat(node.getAttribute('width')) * pixelRatio * aspectRatioAfterResize;
        const height = parseFloat(node.getAttribute('height')) * pixelRatio * aspectRatioAfterResize;
        
        // Expand by 5px in all directions
        const expandedX = x - 5;
        const expandedY = y - 5;
        const expandedWidth = width + 10;  // 5px on left + 5px on right
        const expandedHeight = height + 10;  // 5px on top + 5px on bottom
        
        log({ parsed: 'using x,y,width,height', original: { x, y, width, height }, expanded: { x: expandedX, y: expandedY, width: expandedWidth, height: expandedHeight } });
        return { x: expandedX, y: expandedY, width: expandedWidth, height: expandedHeight };
      } 
      // Case 2: Node has bounds attribute like "[x1,y1][x2,y2]"
      else if (node.getAttribute && node.getAttribute('bounds') !== null) {
        const boundsAttr = node.getAttribute('bounds');
        console.log(`Parsing Android bounds attribute: ${boundsAttr}`);
        
        const boundsRegex = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/;
        const match = boundsAttr.match(boundsRegex);
        
        if (match) {
          const x1 = parseInt(match[1], 10) * pixelRatio * aspectRatioAfterResize;
          const y1 = parseInt(match[2], 10) * pixelRatio * aspectRatioAfterResize;
          const x2 = parseInt(match[3], 10) * pixelRatio * aspectRatioAfterResize;
          const y2 = parseInt(match[4], 10) * pixelRatio * aspectRatioAfterResize;
          
          // Expand by 5px in all directions
          const expandedX1 = x1 - 5;
          const expandedY1 = y1 - 5;
          const expandedX2 = x2 + 5;
          const expandedY2 = y2 + 5;
          
          log({ parsed: 'using bounds', original: { x1, y1, x2, y2 }, expanded: { x1: expandedX1, y1: expandedY1, x2: expandedX2, y2: expandedY2 } });
          return {
            x: expandedX1,
            y: expandedY1,
            width: expandedX2 - expandedX1,
            height: expandedY2 - expandedY1
          };
        } else {
          console.log(`Failed to parse Android bounds: ${boundsAttr}`);
        }
      }
      // Case 3: Node is an object with detailed node data from XPathManager
      else if (node.androidBounds) {
        // If we have a pre-processed Android bounds data
        const { x1, y1, x2, y2 } = node.androidBounds;
        
        // Apply scaling
        const scaledX1 = x1 * pixelRatio * aspectRatioAfterResize;
        const scaledY1 = y1 * pixelRatio * aspectRatioAfterResize;
        const scaledX2 = x2 * pixelRatio * aspectRatioAfterResize;
        const scaledY2 = y2 * pixelRatio * aspectRatioAfterResize;
        
        // Expand by 5px in all directions
        const expandedX1 = scaledX1 - 5;
        const expandedY1 = scaledY1 - 5;
        const expandedX2 = scaledX2 + 5;
        const expandedY2 = scaledY2 + 5;
        
        log({ parsed: 'using androidBounds', original: { x1, y1, x2, y2 }, scaled: { x1: scaledX1, y1: scaledY1, x2: scaledX2, y2: scaledY2 } });
        return {
          x: expandedX1,
          y: expandedY1,
          width: expandedX2 - expandedX1,
          height: expandedY2 - expandedY1
        };
      }
      // Case 4: Node is an object with direct iOS x,y,width,height properties
      else if (node.x !== undefined && node.y !== undefined && 
               node.width !== undefined && node.height !== undefined) {
        // Use the iOS bounds directly
        const x = parseFloat(node.x) * pixelRatio * aspectRatioAfterResize;
        const y = parseFloat(node.y) * pixelRatio * aspectRatioAfterResize;
        const width = parseFloat(node.width) * pixelRatio * aspectRatioAfterResize;
        const height = parseFloat(node.height) * pixelRatio * aspectRatioAfterResize;
        
        // Expand by 5px in all directions
        const expandedX = x - 5;
        const expandedY = y - 5;
        const expandedWidth = width + 10;  // 5px on left + 5px on right
        const expandedHeight = height + 10;  // 5px on top + 5px on bottom
        
        log({ parsed: 'using direct iOS bounds', original: { x, y, width, height }, expanded: { x: expandedX, y: expandedY, width: expandedWidth, height: expandedHeight } });
        return { x: expandedX, y: expandedY, width: expandedWidth, height: expandedHeight };
      }
    } catch (error) {
      log("Error parsing node bounds:", error, node);
    }
    
    // Return null if bounds couldn't be determined
    return null;
  }, [pixelRatio, aspectRatioAfterResize, log]);

  // Calculate highlight boxes based on matching nodes - defined after parseNodeBounds
  const calculateBoxes = useCallback((nodesToHighlight) => {
    console.log("╔══════════════════════════════════════════════════════");
    console.log("║ HIGHLIGHT PROCESS: Starting box calculation");
    console.log("╠══════════════════════════════════════════════════════");
    console.log(`║ Input nodes: ${nodesToHighlight?.length || 0} nodes`);
    
    if (!nodesToHighlight || nodesToHighlight.length === 0) {
      console.log("║ ⚠️ No nodes to highlight - clearing boxes");
      setHighlightBoxes([]);
      return;
    }
    
    // Detailed logging of input nodes - be careful with DOM nodes (avoid circular references)
    console.log("║ 📌 Nodes to highlight count:", nodesToHighlight?.length || 0);
    
    // Safely log node information without circular references
    try {
      // Create a safe representation of the nodes
      const safeNodes = nodesToHighlight?.map(node => {
        // For DOM nodes, only extract safe properties
        if (node.nodeType) {
          return {
            nodeType: node.nodeType,
            nodeName: node.nodeName,
            hasAndroidBounds: !!(node.getAttribute && node.getAttribute('bounds')),
            bounds: node.getAttribute ? node.getAttribute('bounds') : null,
            hasBoundsData: !!node.androidBounds
          };
        }
        // For data objects, return a safe subset
        return {
          hasBounds: !!node.bounds,
          hasAndroidBounds: !!node.androidBounds,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          nodeType: node.nodeType,
          id: node.id
        };
      }) || [];
      
      console.log("║ 📌 Safe node details:", JSON.stringify(safeNodes.slice(0, 3), null, 2));
    } catch (err) {
      console.log("║ ⚠️ Could not stringify nodes:", err.message);
    }
    
    // Log the platform information for debugging
    console.log("║ 📱 Current platform context:", typeof window !== 'undefined' && window.evaluationContextRef?.current?.platform || 'unknown');
    
    // Check if we have nodeDetails from XPathManager
    // nodeDetails would be an array of objects with androidBounds or iOS position data
    const hasNodeDetails = Array.isArray(nodesToHighlight) && 
                         nodesToHighlight.length > 0 && 
                         (nodesToHighlight[0].nodeDetails || 
                          nodesToHighlight[0].androidBounds ||
                          nodesToHighlight[0].bounds ||
                          (nodesToHighlight[0].x !== undefined && 
                           nodesToHighlight[0].y !== undefined));
    
    console.log(`║ Has node details: ${hasNodeDetails}`);
    
    // Detailed logging for Android elements
    if (Array.isArray(nodesToHighlight) && nodesToHighlight.length > 0) {
      console.log("║ First node detailed analysis:");
      const firstNode = nodesToHighlight[0];
      if (firstNode) {
        console.log(`║   Node type: ${firstNode.nodeType || typeof firstNode}`);
        console.log(`║   Has androidBounds property: ${!!firstNode.androidBounds}`);
        console.log(`║   Has bounds property: ${!!firstNode.bounds}`);
        
        if (firstNode.androidBounds) {
          console.log(`║   Android bounds values: x1=${firstNode.androidBounds.x1}, y1=${firstNode.androidBounds.y1}, x2=${firstNode.androidBounds.x2}, y2=${firstNode.androidBounds.y2}`);
        }
        
        if (firstNode.bounds) {
          console.log(`║   Bounds attribute: ${firstNode.bounds}`);
        }
        
        if (firstNode.getAttribute && typeof firstNode.getAttribute === 'function') {
          const boundsAttr = firstNode.getAttribute('bounds');
          console.log(`║   Bounds from getAttribute: ${boundsAttr || 'not found'}`);
        }
      }
    }
    
    if (hasNodeDetails) {
      // Process detailed node information
      console.log(`║ 🔍 PROCESSING DETAILED NODE INFO: ${nodesToHighlight.length} node details`);
      log(`Processing ${nodesToHighlight.length} node details`);
      
      const boxes = [];
      
      // Process the nodeDetails array which contains pre-processed bounds information
      nodesToHighlight.forEach((nodeInfo, index) => {
        console.log(`║ 📦 Processing node ${index}:`);
        console.log(`║   Type: ${nodeInfo.nodeType || 'unknown'}`);
        console.log(`║   Has androidBounds: ${!!nodeInfo.androidBounds}`);
        console.log(`║   Has bounds: ${!!nodeInfo.bounds}`);
        console.log(`║   Has x,y,width,height: ${nodeInfo.x !== undefined ? 'yes' : 'no'}`);
        
        // For Android nodes
        if (nodeInfo.androidBounds) {
          console.log(`║   Android bounds data:`, nodeInfo.androidBounds);
          // Android-specific bounds handling
          const bounds = parseNodeBounds({
            androidBounds: nodeInfo.androidBounds
          });
          
          if (bounds) {
            console.log(`║   ✅ Created highlight box:`, bounds);
            log(`Highlight box for Android node ${index}:`, bounds);
            boxes.push({
              id: `highlight-${index}`,
              ...bounds
            });
          } else {
            console.log(`║   ❌ Failed to create bounds for Android node ${index}`);
          }
        } 
        // Direct bounds attribute (Android XML format)
        else if (nodeInfo.bounds) {
          console.log(`║   Has direct bounds attribute: ${nodeInfo.bounds}`);
          
          // Try to parse the bounds string directly
          const boundsAttr = nodeInfo.bounds;
          const boundsRegex = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/;
          const match = boundsAttr.match(boundsRegex);
          
          if (match) {
            console.log(`║   📏 Parsed Android bounds from string:`, match);
            const [_, x1, y1, x2, y2] = match.map(Number);
            
            // Create androidBounds object
            const androidBounds = { x1, y1, x2, y2 };
            
            // Parse the bounds
            const bounds = parseNodeBounds({
              androidBounds: androidBounds
            });
            
            if (bounds) {
              console.log(`║   ✅ Created highlight box from bounds attribute:`, bounds);
              boxes.push({
                id: `highlight-${index}`,
                ...bounds
              });
            } else {
              console.log(`║   ❌ Failed to create bounds from string attribute`);
            }
          } else {
            console.log(`║   ❌ Could not parse bounds string: ${boundsAttr}`);
          }
        }
        // For iOS nodes
        else if (nodeInfo.x !== undefined && nodeInfo.y !== undefined && 
                  nodeInfo.width !== undefined && nodeInfo.height !== undefined) {
          console.log(`║   iOS position data: x=${nodeInfo.x}, y=${nodeInfo.y}, w=${nodeInfo.width}, h=${nodeInfo.height}`);
          // iOS-specific bounds handling
          const bounds = parseNodeBounds({
            getAttribute: (attr) => {
              switch(attr) {
                case 'x': return nodeInfo.x;
                case 'y': return nodeInfo.y;
                case 'width': return nodeInfo.width;
                case 'height': return nodeInfo.height;
                default: return null;
              }
            }
          });
          
          if (bounds) {
            console.log(`║   ✅ Created highlight box:`, bounds);
            log(`Highlight box for iOS node ${index}:`, bounds);
            boxes.push({
              id: `highlight-${index}`,
              ...bounds
            });
          } else {
            console.log(`║   ❌ Failed to create bounds for iOS node ${index}`);
          }
        }
        // Check for getAttribute method (DOM node)
        else if (typeof nodeInfo.getAttribute === 'function') {
          console.log(`║   Node has getAttribute method - checking for bounds`);
          
          // Try to get bounds attribute
          const boundsAttr = nodeInfo.getAttribute('bounds');
          if (boundsAttr) {
            console.log(`║   Found bounds attribute: ${boundsAttr}`);
            const boundsRegex = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/;
            const match = boundsAttr.match(boundsRegex);
            
            if (match) {
              console.log(`║   📏 Parsed bounds:`, match);
              const bounds = parseNodeBounds(nodeInfo);
              
              if (bounds) {
                console.log(`║   ✅ Created highlight box:`, bounds);
                boxes.push({
                  id: `highlight-${index}`,
                  ...bounds
                });
              } else {
                console.log(`║   ❌ Failed to create bounds even with getAttribute method`);
              }
            } else {
              console.log(`║   ❌ Bounds attribute doesn't match expected format`);
            }
          } else {
            console.log(`║   ❓ No bounds attribute found with getAttribute`);
            
            // Check for iOS style attributes
            const x = nodeInfo.getAttribute('x');
            const y = nodeInfo.getAttribute('y');
            const width = nodeInfo.getAttribute('width');
            const height = nodeInfo.getAttribute('height');
            
            if (x !== null && y !== null && width !== null && height !== null) {
              console.log(`║   Found iOS style attributes: x=${x}, y=${y}, width=${width}, height=${height}`);
              const bounds = parseNodeBounds(nodeInfo);
              
              if (bounds) {
                console.log(`║   ✅ Created highlight box:`, bounds);
                boxes.push({
                  id: `highlight-${index}`,
                  ...bounds
                });
              }
            } else {
              console.log(`║   ❌ No recognized position attributes found`);
            }
          }
        } else {
          console.log(`║   ⚠️ No recognizable bounds data in node ${index}`);
          console.log(`║   Node keys: ${Object.keys(nodeInfo).join(', ')}`);
        }
      });
      
      console.log(`║ 📊 RESULT: Created ${boxes.length} highlight boxes from ${nodesToHighlight.length} nodes`);
      setHighlightBoxes(boxes);
      console.log("╚══════════════════════════════════════════════════════");
      return;
    }
    
    console.log(`║ 🔍 TRADITIONAL NODE PROCESSING: Using DOM node approach`);
    // Traditional node processing (for direct DOM nodes)
    const boxes = nodesToHighlight.map((node, index) => {
      console.log(`║ 📦 Processing traditional node ${index}:`);
      console.log(`║   Node type: ${node.nodeType || (typeof node === 'object' ? 'object' : typeof node)}`);
      
      // Extra logging for DOM nodes
      if (node.nodeType === 1) { // Element node
        console.log(`║   Element name: ${node.nodeName}`);
        if (typeof node.getAttribute === 'function') {
          const bounds = node.getAttribute('bounds');
          console.log(`║   Bounds attribute: ${bounds || 'not found'}`);
        }
      }
      
      const bounds = parseNodeBounds(node);
      if (bounds) {
        console.log(`║   ✅ Created highlight box:`, bounds);
        log(`Highlight box for node ${index}:`, bounds);
        return {
          id: `highlight-${index}`,
          ...bounds
        };
      }
      console.log(`║   ❌ Could not determine bounds for node ${index}`);
      log(`Could not determine bounds for node ${index}`);
      return null;
    }).filter(box => box !== null);
    
    console.log(`║ 📊 RESULT: Created ${boxes.length} highlight boxes from ${nodesToHighlight.length} nodes`);
    setHighlightBoxes(boxes);
    console.log("╚══════════════════════════════════════════════════════");
  }, [parseNodeBounds, log]);

  // Load the image and get original dimensions
  useEffect(() => {
    if (!base64Png) return;

    const img = new Image();
    imageRef.current = img;
    
    img.onload = () => {
      setOriginalImageSize({ width: img.width, height: img.height });
      log(`Original image size: ${img.width}x${img.height}`);
      
      // Set initial dimensions based on the container size
      updateDimensions(img.width, img.height);
    };
    img.src = `data:image/png;base64,${base64Png}`;
  }, [base64Png, updateDimensions, log]);

  // Handle window resize and container size changes
  useEffect(() => {
    const handleResize = () => {
      if (originalImageSize.width && originalImageSize.height) {
        updateDimensions(originalImageSize.width, originalImageSize.height);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [originalImageSize, updateDimensions]);

  // Process matchingNodes changes
  useEffect(() => {
    console.log("🔄 HIGHLIGHTER: Processing new matchingNodes");
    
    // Check if this is a real update with new data
    const nodesChanged = JSON.stringify(matchingNodesRef.current) !== JSON.stringify(matchingNodes);
    console.log(`Nodes changed: ${nodesChanged}`);
    
    // Always clear existing highlight boxes first to prevent stale highlights
    setHighlightBoxes([]);
    console.log("🧹 Cleared existing highlight boxes");
    
    // Store nodes for reference
    matchingNodesRef.current = matchingNodes || [];
    
    // Debug info if needed
    log('matchingNodes prop received:', matchingNodes);
    log('matchingNodes count:', matchingNodes?.length || 0);
    
    // Log details for debugging
    if (matchingNodes && matchingNodes.length > 0) {
      console.log("✅ Received matchingNodes with data:");
      try {
        // Log only safe properties to avoid circular references
        const safeProps = matchingNodes.map(node => ({
          hasAndroidBounds: !!node.androidBounds,
          hasBounds: !!node.bounds,
          hasX: node.x !== undefined,
          hasY: node.y !== undefined,
          nodeType: node.nodeType || 'unknown',
          nodeName: node.nodeName
        }));
        console.log("Node properties:", JSON.stringify(safeProps.slice(0, 3), null, 2));
      } catch (err) {
        console.log("Could not stringify nodes for logging:", err.message);
      }
    } else {
      console.log("⚠️ No nodes to highlight - received empty matchingNodes");
      return; // Exit early if no nodes to process
    }
    
    // If we have dimensions already, immediately calculate highlights 
    // without any conditional checks that could cause delays
    if (dimensions.width > 0 && dimensions.height > 0 && imageRef.current) {
      console.log("🎯 Calculating highlight boxes with current dimensions");
      calculateBoxes(matchingNodes);
    } else {
      console.log("⏳ Will calculate boxes once dimensions are available");
    }
  }, [matchingNodes, dimensions, calculateBoxes, log]);

  // Trigger recalculation of highlight boxes when dimensions change
  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      log('Dimensions changed, directly calculating highlight boxes');
      calculateBoxes(matchingNodesRef.current);
    }
  }, [dimensions, calculateBoxes, log]);

  // Image load handler to ensure proper sizing
  const handleImageLoad = useCallback(() => {
    log('Image loaded in DOM');
    if (imgElementRef.current && containerRef.current) {
      // Ensure our dimensions match the actual rendered image
      const rect = imgElementRef.current.getBoundingClientRect();
      if (rect.width !== dimensions.width || rect.height !== dimensions.height) {
        log(`Adjusting dimensions to match rendered image: ${rect.width}x${rect.height}`);
        setDimensions({ width: rect.width, height: rect.height });
      }
    }
  }, [dimensions, log]);

  // Create CSS styles for the animated glowing and fluid border effects with contrasting colors
  const createCSSStyles = () => {
    return `
      @keyframes pulse {
        0% {
          box-shadow: 0 0 5px 0px rgba(255, 119, 0, 0.6);
          opacity: 0.7;
        }
        50% {
          box-shadow: 0 0 15px 5px rgba(255, 200, 0, 0.9);
          opacity: 0.9;
        }
        100% {
          box-shadow: 0 0 5px 0px rgba(255, 0, 128, 0.6);
          opacity: 0.7;
        }
      }
      
      @keyframes borderFlow {
        0% {
          border-image-source: linear-gradient(0deg, #00ff88,rgb(200, 255, 0), #5500ff, #00ff88);
        }
        25% {
          border-image-source: linear-gradient(90deg, #00ff88,rgb(225, 255, 0), #5500ff, #00ff88);
        }
        50% {
          border-image-source: linear-gradient(180deg, #00ff88,rgb(225, 255, 0), #5500ff, #00ff88);
        }
        75% {
          border-image-source: linear-gradient(270deg, #00ff88,rgb(251, 255, 0), #5500ff, #00ff88);
        }
        100% {
          border-image-source: linear-gradient(360deg, #00ff88,rgb(234, 255, 0), #5500ff, #00ff88);
        }
      }
      
      .highlight-box {
        animation: pulse 2s infinite ease-in-out;
        border: 3px solid transparent;
        border-image: linear-gradient(90deg, #00ff88, #ff00aa, #5500ff, #00ff88);
        border-image-slice: 1;
        animation: borderFlow 4s infinite linear, pulse 2s infinite ease-in-out;
        background-color: rgba(255, 255, 0, 0.15);
        pointer-events: none;
        position: absolute;
      }
    `;
  };

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden', 
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f2f5' // Match the app background color
      }}
    >
      {/* Inject CSS styles for animations */}
      <style>{createCSSStyles()}</style>

      {!base64Png && (
        <div style={{ textAlign: 'center', color: '#999' }}>
          No screenshot available
        </div>
      )}
      {base64Png && (
        <div style={{ 
          position: 'relative', 
          width: dimensions.width, 
          height: dimensions.height,
          boxShadow: '0 0 10px rgba(0,0,0,0.1)',
          border: '1px solid #eee',
          margin: 0,
          padding: 0
        }}>
          <img 
            ref={imgElementRef}
            src={`data:image/png;base64,${base64Png}`}
            alt="App screenshot"
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              margin: 0,
              padding: 0
            }}
            onLoad={handleImageLoad}
          />
          
          {/* Animated highlight boxes */}
          {highlightBoxes.map((box) => (
            <div
              key={box.id}
              className="highlight-box"
              style={{
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.height
              }}
            />
          ))}
          
          {/* Debug indicator for no matching nodes */}
          {debug && matchingNodesRef.current && matchingNodesRef.current.length === 0 && (
            <div 
              style={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                padding: '5px 10px',
                backgroundColor: 'rgba(255, 247, 0, 0.7)',
                color: 'white',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              No matching nodes to highlight
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageHighlighter;