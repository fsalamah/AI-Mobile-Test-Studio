import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ResizableBox } from 'react-resizable';
import CodeMirror from '@uiw/react-codemirror';
import { xml } from '@codemirror/lang-xml';
import { oneDark } from '@codemirror/theme-one-dark'; // Or choose another theme
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFolderOpen, faPencilAlt, faMousePointer, faFileExport,
    faEyeSlash, faEye, faUndo, faRedo, faSearch, faTimes, faExpandArrowsAlt, faCompressArrowsAlt
} from '@fortawesome/free-solid-svg-icons';

import './XmlViewer.css'; // Import the CSS

// Helper to get unique XPath (simplified from original)
function getAbsolutePath(node) {
    if (!node || node.nodeType !== 1) return '';
    let path = [];
    while (node && node.nodeType === 1 && node.nodeName?.toLowerCase() !== '#document') {
        let name = node.nodeName;
        let index = 1;
        let sibling = node.previousSibling;
        while (sibling) {
            if (sibling.nodeType === 1 && sibling.nodeName === name) {
                index++;
            }
            sibling = sibling.previousSibling;
        }
        // Check if index is necessary
        let hasSimilarFollowingSibling = false;
        let nextSibling = node.nextSibling;
         while (nextSibling) {
            if (nextSibling.nodeType === 1 && nextSibling.nodeName === name) {
                hasSimilarFollowingSibling = true;
                break;
            }
            nextSibling = nextSibling.nextSibling;
        }

        const indexStr = (index > 1 || hasSimilarFollowingSibling) ? `[${index}]` : '';
        path.unshift(`${name}${indexStr}`);
        node = node.parentNode;
    }
    return '/' + path.filter(Boolean).join('/');
}


function XmlViewer() {
    const [rectangles, setRectangles] = useState([]);
    const [history, setHistory] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    const [mode, setMode] = useState('select'); // 'select' or 'draw'
    const [hideEmptyLabels, setHideEmptyLabels] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [imageSrc, setImageSrc] = useState(null);
    const [xmlContent, setXmlContent] = useState('');
    const [xpathInput, setXpathInput] = useState('');
    const [xpathHighlightIndices, setXpathHighlightIndices] = useState([]); // Indices of rectangles highlighted by XPath
    const [selectedRectIndex, setSelectedRectIndex] = useState(null); // Index of the rect being hovered/selected
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 }); // Natural image dimensions
    const [scale, setScale] = useState(1);
    const [isDraggingOrResizing, setIsDraggingOrResizing] = useState(false); // Global flag for mouse up cleanup

    const screenshotPanelRef = useRef(null);
    const canvasContainerRef = useRef(null);
    const imageRef = useRef(null);
    const dragInfo = useRef(null); // { type: 'draw'/'drag'/'resize', index?, startX, startY, initialRect? }
    const xmlDocRef = useRef(null); // Parsed XML document

    // --- State Management ---

    const saveState = useCallback((currentState) => {
        // Limit history size if needed
        setHistory(prev => [...prev.slice(-50), JSON.stringify(currentState)]); // Keep last 50 states
        setRedoStack([]); // Clear redo stack on new action
    }, []);

    const updateRectangles = useCallback((newRectangles) => {
        const currentState = { rectangles, xmlContent, imageSrc };
        saveState(currentState);
        setRectangles(newRectangles);
        setXpathHighlightIndices([]); // Clear XPath highlights on modification
    }, [rectangles, xmlContent, imageSrc, saveState]);


    const handleUndo = () => {
        if (history.length === 0) return;
        const currentState = JSON.stringify({ rectangles, xmlContent, imageSrc });
        setRedoStack(prev => [currentState, ...prev]);
        const prevStateString = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        try {
            const prevState = JSON.parse(prevStateString);
            setRectangles(prevState.rectangles || []);
            // Optionally restore xmlContent and imageSrc if needed/stored
        } catch (e) { console.error("Error parsing history state:", e); }
         setXpathHighlightIndices([]);
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;
        const currentState = JSON.stringify({ rectangles, xmlContent, imageSrc });
        setHistory(prev => [...prev, currentState]);
        const nextStateString = redoStack[0];
        setRedoStack(prev => prev.slice(1));
        try {
            const nextState = JSON.parse(nextStateString);
            setRectangles(nextState.rectangles || []);
        } catch (e) { console.error("Error parsing redo state:", e); }
        setXpathHighlightIndices([]);
    };

    // --- File Loading ---

    const handleFileLoad = (event, type) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const result = e.target.result;
                if (type === 'image') {
                    setImageSrc(result);
                    setRectangles([]); // Reset rectangles when loading a new image directly
                    setXmlContent('');
                    saveState({ rectangles: [], xmlContent: '', imageSrc: result });
                } else if (type === 'xml') {
                    setXmlContent(result);
                    parseAndSetRectanglesFromXml(result);
                    // Don't reset image if only XML is loaded
                    saveState({ rectangles: parseXmlToRectsArray(result), xmlContent: result, imageSrc });
                } else if (type === 'json') {
                    const jsonData = JSON.parse(result);
                    const newImageSrc = jsonData.imagePath || jsonData.imageBase64 || imageSrc; // Keep existing image if none in JSON
                    const newXmlContent = jsonData.xml || xmlContent;
                    const newRectangles = jsonData.rectangles || jsonData.elements || [];

                    setImageSrc(newImageSrc);
                    setXmlContent(newXmlContent);
                    setRectangles(newRectangles);
                    parseAndSetRectanglesFromXml(newXmlContent); // Ensure XML is parsed
                    saveState({ rectangles: newRectangles, xmlContent: newXmlContent, imageSrc: newImageSrc });
                }
                setIsModalOpen(false); // Close modal on successful load
                 setXpathHighlightIndices([]); // Clear highlights
            } catch (error) {
                console.error(`Error processing ${type} file:`, error);
                alert(`Invalid ${type.toUpperCase()} file or format.`);
            } finally {
                 // Reset file input value to allow loading the same file again
                 event.target.value = null;
            }
        };

        reader.onerror = (error) => {
            console.error("FileReader error:", error);
            alert(`Error reading ${type} file.`);
             event.target.value = null;
        };

        if (type === 'image') {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
    };

     // --- XML Parsing ---

    const parseXmlToRectsArray = (xmlString) => {
        if (!xmlString) return [];
         try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlString, 'text/xml');
            xmlDocRef.current = doc; // Store the parsed document
            const errorNode = doc.querySelector('parsererror');
            if (errorNode) {
                console.error("XML Parsing Error:", errorNode.textContent);
                 // Optionally alert the user or return empty
                 return [];
            }

            const nodes = doc.getElementsByTagName('*');
            const jsonData = [];

            Array.from(nodes).forEach(node => {
                let boundsData = null;
                let label = '';
                const absolutePath = getAbsolutePath(node);

                // Android format (bounds attribute)
                if (node.hasAttribute('bounds')) {
                    const boundsAttr = node.getAttribute('bounds');
                    const match = boundsAttr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
                    if (match) {
                        const [_, x1, y1, x2, y2] = match.map(Number);
                         if (x2 > x1 && y2 > y1) { // Basic validation
                            boundsData = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
                            label = node.getAttribute('text') || node.getAttribute('content-desc') || '';
                         }
                    }
                }
                // iOS format (x, y, width, height attributes)
                else if (node.hasAttribute('x') && node.hasAttribute('y') && node.hasAttribute('width') && node.hasAttribute('height')) {
                    const x = parseInt(node.getAttribute('x'), 10);
                    const y = parseInt(node.getAttribute('y'), 10);
                    const width = parseInt(node.getAttribute('width'), 10);
                    const height = parseInt(node.getAttribute('height'), 10);
                     if (!isNaN(x) && !isNaN(y) && width > 0 && height > 0) {
                        boundsData = { x, y, width, height };
                         label = node.getAttribute('label') || node.getAttribute('name') || '';
                    }
                }

                if (boundsData) {
                    jsonData.push({
                        ...boundsData,
                        label: label,
                        absolutePath: absolutePath,
                        id: absolutePath || `rect-${jsonData.length}` // Add a unique ID
                    });
                }
            });
            return jsonData;
        } catch (error) {
            console.error('Error parsing XML to JSON:', error);
            xmlDocRef.current = null;
            return [];
        }
    };

     const parseAndSetRectanglesFromXml = (xmlString) => {
        const parsedRects = parseXmlToRectsArray(xmlString);
        // Optional: Merge with existing manual rectangles or replace?
        // For now, we replace if XML is loaded directly, otherwise it's handled by JSON load
        if (!imageSrc) { // If only XML was loaded, assume these are the primary rectangles
            setRectangles(parsedRects);
        }
    };

    // --- Scaling and Canvas Interaction ---

    const calculateScale = useCallback(() => {
        if (!imageRef.current || !screenshotPanelRef.current || !imageDimensions.width) {
             console.log("Calculate Scale: Missing refs or dimensions");
            return 1;
        }

        const panel = screenshotPanelRef.current;
        // Get panel dimensions excluding padding/borders if possible
        const panelWidth = panel.clientWidth;
        const panelHeight = panel.clientHeight;

        if (panelWidth <= 0 || panelHeight <= 0) {
             console.log("Calculate Scale: Panel dimensions are zero");
             return 1;
        }

        // Calculate scale to fit image within panel
        const scaleX = panelWidth / imageDimensions.width;
        const scaleY = panelHeight / imageDimensions.height;
        const newScale = Math.min(scaleX, scaleY, 1); // Fit while ensuring it doesn't exceed 1 unless zoomed

        console.log(`Calculate Scale: panel(${panelWidth}x${panelHeight}), image(${imageDimensions.width}x${imageDimensions.height}), newScale=${newScale}`);

        return newScale > 0 ? newScale : 1; // Prevent zero or negative scale

    }, [imageDimensions]);

     useEffect(() => {
        // Recalculate scale when image loads or panel size changes (debounced?)
        const newScale = calculateScale();
        if (newScale !== scale) {
            setScale(newScale);
        }
     }, [imageDimensions, calculateScale, scale]); // Add panel width/height state if using react-resizable state

      useEffect(() => {
         const img = imageRef.current;
         if (img && imageSrc) {
             const handleLoad = () => {
                 console.log(`Image Loaded: ${img.naturalWidth}x${img.naturalHeight}`);
                 setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                 // Initial scale calculation after image dimensions are known
                 setScale(calculateScale());
             };
             img.addEventListener('load', handleLoad);
             // If image is already loaded (e.g., from cache)
             if (img.complete && img.naturalWidth > 0) {
                  handleLoad();
             }
             return () => img.removeEventListener('load', handleLoad);
         } else {
              // Reset dimensions if image source is removed
              setImageDimensions({ width: 0, height: 0 });
              setScale(1);
         }
     }, [imageSrc, calculateScale]); // Rerun when imageSrc changes

    // --- Mouse Events for Drawing, Dragging, Resizing ---

    const getCoordsFromEvent = (event) => {
         if (!canvasContainerRef.current) return null;
         const rect = canvasContainerRef.current.getBoundingClientRect();
         // Adjust for canvas scroll position if the container itself scrolls
         const scrollLeft = canvasContainerRef.current.scrollLeft;
         const scrollTop = canvasContainerRef.current.scrollTop;

         // ClientX/Y are relative to the viewport
         // We need coordinates relative to the top-left of the *scaled image*
         const viewX = event.clientX - rect.left;
         const viewY = event.clientY - rect.top;

         // Account for scroll and scale
         const imgX = (viewX + scrollLeft) / scale;
         const imgY = (viewY + scrollTop) / scale;

        return { x: imgX, y: imgY };
    };

    const handleMouseDown = (event) => {
        const coords = getCoordsFromEvent(event);
        if (!coords) return;

        const target = event.target;
        const isResizeHandle = target.classList.contains('resize-handle');
        const isClearIcon = target.classList.contains('clear-icon');
        const rectElement = target.closest('.rectangle');
        const rectIndex = rectElement ? parseInt(rectElement.dataset.index, 10) : -1;

        if (isClearIcon && rectIndex !== -1) {
             // Handled by button's onClick, prevent drag start
             event.stopPropagation();
             return;
        }

        if (mode === 'select' && rectElement && rectIndex >= 0 && !isDrawingOrResizing) {
            event.preventDefault(); // Prevent text selection, etc.
            event.stopPropagation();
            setSelectedRectIndex(rectIndex); // Select on drag start

            if (isResizeHandle) {
                // Start Resizing
                setIsDraggingOrResizing(true);
                 const initialRect = rectangles[rectIndex];
                dragInfo.current = {
                    type: 'resize',
                    index: rectIndex,
                    startX: coords.x,
                    startY: coords.y,
                    initialRect: { ...initialRect }
                };
                console.log("Start Resize", dragInfo.current);
            } else {
                // Start Dragging
                setIsDraggingOrResizing(true);
                const initialRect = rectangles[rectIndex];
                dragInfo.current = {
                    type: 'drag',
                    index: rectIndex,
                    startX: coords.x,
                    startY: coords.y,
                    initialRect: { ...initialRect } // Store original position
                };
                 console.log("Start Drag", dragInfo.current);
            }
        } else if (mode === 'draw' && target === imageRef.current && !isDrawingOrResizing) {
             event.preventDefault();
             event.stopPropagation();
             // Start Drawing
             setIsDraggingOrResizing(true);
             dragInfo.current = {
                type: 'draw',
                startX: coords.x,
                startY: coords.y,
                // Temporary rect for visual feedback during draw
                 tempRect: { x: coords.x, y: coords.y, width: 0, height: 0, label: '', isDrawing: true, id: 'drawing' }
             };
             setRectangles(prev => [...prev, dragInfo.current.tempRect]); // Add temp rect
             console.log("Start Draw", dragInfo.current);
        } else {
             // Click on empty space in select mode - deselect
             if (mode === 'select') {
                 setSelectedRectIndex(null);
             }
              dragInfo.current = null;
        }
    };

    const handleMouseMove = useCallback((event) => {
         if (!isDraggingOrResizing || !dragInfo.current) return;

         const coords = getCoordsFromEvent(event);
         if (!coords) return;

         event.preventDefault();
         event.stopPropagation();

         const { type, index, startX, startY, initialRect } = dragInfo.current;
         const deltaX = coords.x - startX;
         const deltaY = coords.y - startY;

         if (type === 'drag' && initialRect) {
              const newX = initialRect.x + deltaX;
              const newY = initialRect.y + deltaY;
              setRectangles(prev => prev.map((rect, i) =>
                 i === index ? { ...rect, x: newX, y: newY } : rect
             ));
         } else if (type === 'resize' && initialRect) {
              const newWidth = Math.max(5, initialRect.width + deltaX); // Min size 5
              const newHeight = Math.max(5, initialRect.height + deltaY);
              setRectangles(prev => prev.map((rect, i) =>
                 i === index ? { ...rect, width: newWidth, height: newHeight } : rect
             ));
         } else if (type === 'draw') {
             const currentX = coords.x;
             const currentY = coords.y;
             const newX = Math.min(startX, currentX);
             const newY = Math.min(startY, currentY);
             const newWidth = Math.abs(currentX - startX);
             const newHeight = Math.abs(currentY - startY);

              // Update the temporary drawing rectangle
             setRectangles(prev => prev.map(rect =>
                 rect.id === 'drawing' ? { ...rect, x: newX, y: newY, width: newWidth, height: newHeight } : rect
             ));
         }
     }, [isDraggingOrResizing, scale]); // Include scale if needed by getCoordsFromEvent


    const handleMouseUp = useCallback((event) => {
        if (!isDraggingOrResizing || !dragInfo.current) return;

        event.preventDefault();
        event.stopPropagation();

        const { type, index } = dragInfo.current;
        let finalRectangles = [...rectangles];
        let needsSave = false;

        if (type === 'draw') {
             // Remove the temporary drawing rect and add the final one if valid size
             const tempRect = finalRectangles.find(r => r.id === 'drawing');
             finalRectangles = finalRectangles.filter(r => r.id !== 'drawing'); // Remove temp rect

             if (tempRect && tempRect.width > 5 && tempRect.height > 5) {
                // Create final rect without temporary properties
                const { isDrawing, id, ...finalRect } = tempRect;
                finalRectangles.push({
                    ...finalRect,
                    id: `rect-${Date.now()}-${Math.random().toString(16).slice(2)}`, // Unique ID
                    absolutePath: null // Manually drawn rects don't have an initial path
                });
                needsSave = true;
             }
        } else if (type === 'drag' || type === 'resize') {
            // Modification complete, state already updated by mouseMove
            needsSave = true;
        }

        // Update state and history
         if (needsSave) {
             const currentState = { rectangles: finalRectangles, xmlContent, imageSrc }; // Use finalRectangles for saving
             saveState({ rectangles: rectangles, xmlContent, imageSrc }); // Save *before* this change
             setRectangles(finalRectangles);
             setXpathHighlightIndices([]);
         } else if (type === 'draw') {
             // If draw was invalid, just remove the temp rect
             setRectangles(finalRectangles);
         }


        setIsDraggingOrResizing(false);
        dragInfo.current = null;
        console.log("End Interaction", type);

    }, [isDraggingOrResizing, rectangles, xmlContent, imageSrc, saveState]);

     // Effect to add and remove global mouse listeners
     useEffect(() => {
         if (isDraggingOrResizing) {
             document.addEventListener('mousemove', handleMouseMove);
             document.addEventListener('mouseup', handleMouseUp);
             document.addEventListener('mouseleave', handleMouseUp); // Handle mouse leaving window
             return () => {
                 document.removeEventListener('mousemove', handleMouseMove);
                 document.removeEventListener('mouseup', handleMouseUp);
                 document.removeEventListener('mouseleave', handleMouseUp);
             };
         }
     }, [isDraggingOrResizing, handleMouseMove, handleMouseUp]);


    // --- Rectangle List and Controls ---

     const handleLabelChange = (index, newLabel) => {
         const newRectangles = rectangles.map((rect, i) =>
             i === index ? { ...rect, label: newLabel } : rect
         );
         updateRectangles(newRectangles);
     };

     const handleDeleteRect = (index) => {
         const newRectangles = rectangles.filter((_, i) => i !== index);
         updateRectangles(newRectangles);
     };

     const handleDuplicateRect = (index) => {
         const originalRect = rectangles[index];
         const newRect = {
             ...originalRect,
             x: originalRect.x + 10, // Offset duplicate slightly
             y: originalRect.y + 10,
              id: `rect-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              absolutePath: null // Duplicates don't inherit path directly
         };
         updateRectangles([...rectangles, newRect]);
     };

      const handleRectMouseEnter = (index) => {
         if (!isDraggingOrResizing) { // Don't change selection while dragging/resizing
            setSelectedRectIndex(index);
         }
     };

     const handleRectMouseLeave = () => {
          if (!isDraggingOrResizing) {
            setSelectedRectIndex(null);
          }
     };


    // --- Export ---
    const handleExportJson = () => {
        const json = JSON.stringify({
            rectangles: rectangles.map(({ isDrawing, id, ...rest }) => rest), // Exclude temporary fields
            xml: xmlContent,
            imageBase64: imageSrc, // Include base64 image data
            imageDimensions: imageDimensions
        }, null, 2);

        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'annotated_data.json';
        document.body.appendChild(a); // Required for Firefox
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

     // --- XPath Evaluation ---
     const handleEvaluateXpath = () => {
        if (!xmlDocRef.current || !xpathInput) {
             setXpathHighlightIndices([]);
            return;
        }
        try {
             const results = xmlDocRef.current.evaluate(xpathInput, xmlDocRef.current, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
             let node;
             const matchingPaths = new Set();
             while ((node = results.iterateNext())) {
                 // Make sure we get element nodes
                 if (node.nodeType === Node.ELEMENT_NODE) {
                    matchingPaths.add(getAbsolutePath(node));
                 } else if (node.nodeType === Node.ATTRIBUTE_NODE) {
                     // If the XPath selects an attribute, highlight its parent element
                     matchingPaths.add(getAbsolutePath(node.ownerElement));
                 }
             }

             console.log("XPath Input:", xpathInput);
             console.log("Matching Paths:", matchingPaths);

             const highlighted = rectangles.reduce((acc, rect, index) => {
                if (rect.absolutePath && matchingPaths.has(rect.absolutePath)) {
                    acc.push(index);
                }
                return acc;
            }, []);

             console.log("Highlighted Indices:", highlighted);
             setXpathHighlightIndices(highlighted);
             setSelectedRectIndex(null); // Deselect any single rect

        } catch (error) {
            console.error("XPath Evaluation Error:", error);
            alert(`Invalid XPath expression: ${error.message}`);
            setXpathHighlightIndices([]);
        }
    };


    // --- Rendering ---

    const filteredRectangles = rectangles.filter(rect =>
         !hideEmptyLabels || rect.label || rect.id === 'drawing' // Always show drawing rect
    );

    const imageStyle = {
        display: imageSrc ? 'block' : 'none',
        width: `${imageDimensions.width * scale}px`,
        height: `${imageDimensions.height * scale}px`,
    };

    const canvasContainerStyle = {
         width: imageSrc ? `${imageDimensions.width * scale}px` : '100%',
         height: imageSrc ? `${imageDimensions.height * scale}px` : '100%',
         cursor: mode === 'draw' ? 'crosshair' : 'default',
         transform: `scale(${scale})`, // Apply scale here if needed for zooming, might complicate coords
         transformOrigin: 'top left', // Ensure scaling originates correctly
         overflow: 'visible', // Allow scaled content to overflow container if needed
         position: 'relative', // Ensure absolute positioning of children works
    };
     // Wrapper for the container to handle scrolling
     const screenshotPanelContentStyle = {
         width: '100%',
         height: '100%',
         overflow: 'auto', // This wrapper scrolls
         position: 'relative', // Context for canvas container
     };


    return (
        <div className="xml-viewer-container">
            {/* Top Bar */}
            <div className="top-bar">
                <button onClick={() => setIsModalOpen(true)}>
                    <FontAwesomeIcon icon={faFolderOpen} /> Load Files
                </button>
                <button
                    onClick={() => setMode('draw')}
                    className={mode === 'draw' ? 'active' : ''}
                >
                    <FontAwesomeIcon icon={faPencilAlt} /> Draw Mode
                </button>
                <button
                    onClick={() => setMode('select')}
                    className={mode === 'select' ? 'active' : ''}
                >
                    <FontAwesomeIcon icon={faMousePointer} /> Select Mode
                </button>
                 <button onClick={handleExportJson} disabled={!imageSrc && !xmlContent}>
                    <FontAwesomeIcon icon={faFileExport} /> Export JSON
                </button>
                 <button onClick={() => setHideEmptyLabels(!hideEmptyLabels)}>
                     <FontAwesomeIcon icon={hideEmptyLabels ? faEye : faEyeSlash} /> Toggle Labels
                 </button>
                 <button onClick={handleUndo} disabled={history.length === 0}>
                    <FontAwesomeIcon icon={faUndo} /> Undo
                </button>
                <button onClick={handleRedo} disabled={redoStack.length === 0}>
                    <FontAwesomeIcon icon={faRedo} /> Redo
                </button>
                 <input
                    type="text"
                    id="xpathInput"
                    placeholder="Enter XPath..."
                    value={xpathInput}
                    onChange={(e) => setXpathInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEvaluateXpath()}
                 />
                 <button onClick={handleEvaluateXpath} disabled={!xmlContent || !xpathInput}>
                    <FontAwesomeIcon icon={faSearch} /> Evaluate
                </button>
                 {/* Basic Zoom Controls (Example) */}
                 {/* <button onClick={() => setScale(s => Math.min(s + 0.1, 3))}><FontAwesomeIcon icon={faExpandArrowsAlt} /> Zoom In</button>
                 <button onClick={() => setScale(s => Math.max(s - 0.1, 0.1))}><FontAwesomeIcon icon={faCompressArrowsAlt} /> Zoom Out</button>
                  <span style={{ marginLeft: '10px' }}>Zoom: {Math.round(scale * 100)}%</span> */}
            </div>

             {/* File Load Modal */}
             {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Load Files</h3>
                        <div>
                            <label htmlFor="xmlLoader">Load XML Source:</label>
                            <input type="file" id="xmlLoader" accept=".xml" onChange={(e) => handleFileLoad(e, 'xml')} />
                        </div>
                        <div>
                            <label htmlFor="imageLoader">Load Screenshot Image:</label>
                            <input type="file" id="imageLoader" accept="image/*" onChange={(e) => handleFileLoad(e, 'image')} />
                        </div>
                        <div>
                            <label htmlFor="jsonLoader">Load Annotation JSON:</label>
                            <input type="file" id="jsonLoader" accept=".json" onChange={(e) => handleFileLoad(e, 'json')} />
                        </div>
                        <button className="close-button" onClick={() => setIsModalOpen(false)}>Close</button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="container-fluid">
                <div className="main-content">
                    {/* Screenshot Panel */}
                     <ResizableBox
                        className="panel"
                        width={600} // Initial width
                        height={Infinity} // Let flexbox control height
                        minConstraints={[200, Infinity]}
                        maxConstraints={[window.innerWidth * 0.8, Infinity]} // Example max width
                        axis="x"
                        handle={<span className="react-resizable-handle" />}
                        resizeHandles={['e']}
                        onResizeStop={(e, data) => {
                            // Optional: Recalculate scale after resize
                             setScale(calculateScale());
                         }}
                    >
                         <div id="screenshot-panel" ref={screenshotPanelRef} style={{ height: '100%' }}>
                             <div style={screenshotPanelContentStyle}> {/* Scrollable Wrapper */}
                                <div
                                    id="canvas-container"
                                    ref={canvasContainerRef}
                                    style={canvasContainerStyle}
                                    onMouseDown={handleMouseDown}
                                >
                                    <img ref={imageRef} src={imageSrc} alt="Screenshot" style={imageStyle} draggable="false" />
                                     {/* Render Rectangles */}
                                     {rectangles.map((rect, index) => {
                                         // Filter out hidden rectangles unless it's the one being drawn
                                         if (!rect.isDrawing && hideEmptyLabels && !rect.label) return null;

                                         const isSelected = index === selectedRectIndex;
                                         const isHighlighted = xpathHighlightIndices.includes(index);
                                         const rectClass = `rectangle ${rect.isDrawing ? 'drawing' : ''} ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted-xpath' : ''}`;

                                         return (
                                            <div
                                                key={rect.id || index} // Use unique ID if available
                                                className={rectClass}
                                                style={{
                                                    left: `${rect.x * scale}px`,
                                                    top: `${rect.y * scale}px`,
                                                    width: `${rect.width * scale}px`,
                                                    height: `${rect.height * scale}px`,
                                                    display: (hideEmptyLabels && !rect.label && !rect.isDrawing) ? 'none' : 'block'
                                                }}
                                                data-index={index}
                                                title={rect.label || `Rect ${index}`}
                                                onMouseEnter={() => handleRectMouseEnter(index)}
                                                onMouseLeave={handleRectMouseLeave}
                                            >
                                                 {/* Only show controls in select mode and if not drawing */}
                                                 {mode === 'select' && !rect.isDrawing && (
                                                     <>
                                                        <span
                                                             className="clear-icon"
                                                             onClick={(e) => { e.stopPropagation(); handleDeleteRect(index); }}
                                                         >
                                                            <FontAwesomeIcon icon={faTimes} size="xs" />
                                                         </span>
                                                         <div className="resize-handle"></div>
                                                     </>
                                                 )}
                                            </div>
                                        );
                                     })}
                                </div>
                             </div>
                        </div>
                     </ResizableBox>


                     {/* XML Panel */}
                     <ResizableBox
                         className="panel"
                         width={400}
                         height={Infinity}
                         minConstraints={[200, Infinity]}
                         maxConstraints={[window.innerWidth * 0.8, Infinity]}
                         axis="x"
                         handle={<span className="react-resizable-handle" />}
                         resizeHandles={['e']}
                    >
                         <div id="xml-panel" style={{ height: '100%', width: '100%' }}>
                            <h3>XML Source</h3>
                             <div className="xml-editor-wrapper">
                                 <CodeMirror
                                    value={xmlContent}
                                    height="100%"
                                    width="100%"
                                    extensions={[xml()]}
                                    theme={oneDark} // Use imported theme
                                    onChange={(value) => setXmlContent(value)} // Optional: Allow editing
                                    readOnly={true} // Keep read-only like original
                                    basicSetup={{
                                        lineNumbers: true,
                                        foldGutter: true,
                                        highlightActiveLine: true,
                                        // Add other desired options
                                    }}
                                />
                             </div>
                         </div>
                     </ResizableBox>

                    {/* Elements List Panel */}
                     <ResizableBox
                         className="panel"
                         width={300}
                         height={Infinity}
                         minConstraints={[200, Infinity]}
                         maxConstraints={[window.innerWidth * 0.8, Infinity]}
                         axis="x"
                         handle={<span className="react-resizable-handle" />}
                         resizeHandles={['e']}
                    >
                         <div id="elements-panel" style={{ height: '100%', width: '100%' }}>
                             <h3>Elements List</h3>
                             {/* Add controls if needed (e.g., All vs AI) */}
                              {/* <div className="elements-controls">
                                  <button className="btn btn-secondary">All Elements</button>
                                   <button className="btn btn-secondary">AI Extracted</button>
                              </div> */}
                             <div id="rectangles-list">
                                 {rectangles.map((rect, index) => {
                                     if (rect.isDrawing) return null; // Don't list the temp drawing rect

                                      const isSelected = index === selectedRectIndex;
                                      const isHighlighted = xpathHighlightIndices.includes(index);
                                      const isHidden = hideEmptyLabels && !rect.label;
                                      const itemClass = `rectangle-item ${isSelected ? 'highlighted' : ''} ${isHighlighted ? 'highlighted-xpath' : ''} ${isHidden ? 'hidden' : ''}`;

                                      if (isHidden) return null; // Don't render if hidden by filter

                                     return (
                                        <div
                                            key={rect.id || index}
                                            className={itemClass}
                                            data-index={index}
                                             onMouseEnter={() => handleRectMouseEnter(index)}
                                             onMouseLeave={handleRectMouseLeave}
                                        >
                                            <input
                                                type="text"
                                                placeholder="Enter label..."
                                                value={rect.label || ''}
                                                onChange={(e) => handleLabelChange(index, e.target.value)}
                                            />
                                             <div className='controls'>
                                                 {/* Add show/hide buttons if needed */}
                                                 <button onClick={() => handleDeleteRect(index)}>Delete</button>
                                                 <button onClick={() => handleDuplicateRect(index)}>Duplicate</button>
                                             </div>
                                              {rect.absolutePath && <small style={{ color: '#888', display: 'block', marginTop: '4px', wordBreak: 'break-all' }}>{rect.absolutePath}</small>}
                                        </div>
                                    );
                                 })}
                             </div>
                         </div>
                     </ResizableBox>
                </div>
            </div>
        </div>
    );
}

export default XmlViewer;