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
  const log = (...args) => {
    if (debug) {
      console.log(...args);
    }
  };

  // Update ref when matchingNodes changes
  useEffect(() => {
    // Check if matchingNodes has changed
    const prevNodes = matchingNodesRef.current;
    const nodesChanged = prevNodes !== matchingNodes;
    
    // Debug info about nodes
    log('matchingNodes prop received:', matchingNodes);
    log('matchingNodes is empty:', !matchingNodes || matchingNodes.length === 0);
    
    // Update the ref
    matchingNodesRef.current = matchingNodes;
    
    // If we already have dimensions, trigger a redraw
    if (dimensions.width > 0 && dimensions.height > 0 && imageRef.current && nodesChanged) {
      log('Nodes changed, triggering highlight update');
      calculateHighlightBoxes();
    }
  }, [matchingNodes, debug, dimensions]);

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
  }, [base64Png, debug]);

  // Handle window resize and container size changes
  const updateDimensions = useCallback((imageWidth, imageHeight) => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    
    log(`Container size: ${containerWidth}x${containerHeight}`);
    
    const aspectRatio = imageWidth / imageHeight;
    const containerAspectRatio = containerWidth / containerHeight;
    
    let newWidth, newHeight;
    
    if (aspectRatio > containerAspectRatio) {
      // Image is wider than container
      newWidth = containerWidth;
      newHeight = containerWidth / aspectRatio;
    } else {
      // Image is taller than container
      newHeight = containerHeight;
      newWidth = containerHeight * aspectRatio;
    }
    
    log(`Calculated dimensions: ${newWidth}x${newHeight}`);
    setDimensions({ width: newWidth, height: newHeight });
    setAspectRatioAfterResize(newWidth / imageWidth);
  }, [debug]);

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

  // Parse node bounds and apply scaling
  const parseNodeBounds = useCallback((node) => {
    if (!node) return null;
    
    try {
      // Case 1: Node has x, y, width, height attributes
      if (node.getAttribute('x') !== null && 
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
      else if (node.getAttribute('bounds') !== null) {
        const boundsRegex = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/;
        const match = node.getAttribute('bounds').match(boundsRegex);
        
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
        }
      }
    } catch (error) {
      log("Error parsing node bounds:", error, node);
    }
    
    // Return null if bounds couldn't be determined
    return null;
  }, [pixelRatio, aspectRatioAfterResize, debug]);

  // Calculate highlight boxes based on matching nodes
  const calculateHighlightBoxes = useCallback(() => {
    const nodesToHighlight = matchingNodesRef.current;
    log('Calculating highlight boxes for nodes:', nodesToHighlight);
    
    if (!nodesToHighlight || nodesToHighlight.length === 0) {
      setHighlightBoxes([]);
      return;
    }
    
    const boxes = nodesToHighlight.map((node, index) => {
      const bounds = parseNodeBounds(node);
      if (bounds) {
        log(`Highlight box for node ${index}:`, bounds);
        return {
          id: `highlight-${index}`,
          ...bounds
        };
      }
      log(`Could not determine bounds for node ${index}`);
      return null;
    }).filter(box => box !== null);
    
    setHighlightBoxes(boxes);
  }, [parseNodeBounds, debug]);

  // Trigger recalculation of highlight boxes when dimensions change
  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      log('Dimensions changed, recalculating highlight boxes');
      calculateHighlightBoxes();
    }
  }, [dimensions, calculateHighlightBoxes]);

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
  }, [dimensions, debug]);

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
        justifyContent: 'start',
        alignItems: 'start',
        backgroundColor: '#f5f5f5' // Light background to show image boundaries
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
        <div style={{ position: 'relative', width: dimensions.width, height: dimensions.height }}>
          <img 
            ref={imgElementRef}
            src={`data:image/png;base64,${base64Png}`}
            alt="App screenshot"
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              boxShadow: '0 0 10px rgba(0,0,0,0.1)'
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