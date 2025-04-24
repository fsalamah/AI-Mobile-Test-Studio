import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * ImageHighlighter Component
 * 
 * Renders a base64 PNG image with highlight boxes drawn over specified XML nodes
 * using HTML div elements instead of canvas.
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
        const x = parseFloat(node.getAttribute('x')) * pixelRatio * aspectRatioAfterResize;
        const y = parseFloat(node.getAttribute('y')) * pixelRatio * aspectRatioAfterResize;
        const width = parseFloat(node.getAttribute('width')) * pixelRatio * aspectRatioAfterResize;
        const height = parseFloat(node.getAttribute('height')) * pixelRatio * aspectRatioAfterResize;
        
        log({ parsed: 'using x,y,width,height', x, y, width, height });
        return { x, y, width, height };
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
          
          log({ parsed: 'using bounds', x1, y1, x2, y2 });
          return {
            x: x1,
            y: y1,
            width: x2 - x1,
            height: y2 - y1
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
          
          {/* Highlight boxes */}
          {highlightBoxes.map((box) => (
            <div
              key={box.id}
              style={{
                position: 'absolute',
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.height,
                border: '2px solid rgba(0, 120, 255, 0.8)',
                backgroundColor: 'rgba(255, 255, 0, 0.2)',
                pointerEvents: 'none' // Allow clicking through the highlight
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
                backgroundColor: 'rgba(255,0,0,0.7)',
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