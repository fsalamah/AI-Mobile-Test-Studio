import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ResizableTabs from './ResizableTabs.jsx';
import { Button, Input, Select, message, Modal } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CloseOutlined, RightOutlined } from '@ant-design/icons';
import { LocatorElementList } from '../ai/LocatorElementList.js';

import ImageHighlighter from './ImageHighlighter.jsx';
import { getBase64Image, getPageSource, getPageStateLookupPerOs } from '../../lib/ai/JsonHelper.js';
import XMLViewer from '../ai/XpathHighlighter.jsx';

const { Option } = Select;

// Debounce utility function
const debounce = (func, wait) => {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
};

const FinalResizableTabsContainer = ({ 
  pageChanged = () => {}, // Added default function in case it's not provided
  onExit, 
  page, 
  viewMode = 'pipeline-stage', // 'default' or 'pipeline-stage'
  onProceedToPom = () => {} // Event handler for pipeline-stage mode
}) => {
  const [selectedPage, setSelectedPage] = useState(page);
  const [imageBase64, setImageBase64] = useState(null);
  const [pageXml, setPageXml] = useState(null);
  const [xmlKey, setXmlKey] = useState(0); // Add a key to force re-render of XML component
  const [availableStates, setAvailableStates] = useState([]);
  const [currentStateId, setCurrentStateId] = useState(null);
  const [currentPlatform, setCurrentPlatform] = useState(page?.platform || 'ios');
  const [matchedNodes, setMatchedNodes] = useState([]); // Store matched XPath nodes
  const currentXPathRef = useRef(''); // Use ref to track current XPath without re-renders
  const lastMatchCountRef = useRef(0); // Track the last match count to prevent unnecessary updates
  const [hasChanges, setHasChanges] = useState(true);
  
  // Keep track of whether we're currently processing an XPath update
  const [isProcessingXPath, setIsProcessingXPath] = useState(false);
  // We still keep the ref for internal use to avoid race conditions
  const isProcessingXPathRef = useRef(false);
  
  // Load available states when component mounts or page changes
  useEffect(() => {
    try {
      const statesArray = getPageStateLookupPerOs(selectedPage);
      if (statesArray && statesArray.length > 0) {
        setAvailableStates(statesArray);
        
        // Set initial state to the first one if not already set
        if (!currentStateId) {
          // Find the first state that matches the current platform
          const platformStates = statesArray.filter(state => 
            state.platform === currentPlatform
          );
          
          const firstState = platformStates.length > 0 
            ? platformStates[0] 
            : statesArray[0];
            
          setCurrentStateId(firstState.stateId);
          setCurrentPlatform(firstState.platform || 'ios');
          
          updateStateView(firstState.stateId, firstState.platform);
        }
      } else {
        console.warn("No states found for the selected page");
      }
    } catch (error) {
      console.error("Error loading page states:", error);
    }
  }, [selectedPage]); // Only depend on selectedPage, not currentStateId or currentPlatform

  // Create a debounced version of the XPath evaluation function
  const debouncedXPathEvaluation = useMemo(() => 
    debounce((xpathExpression) => {
      console.log(`Debounced XPath evaluation: ${xpathExpression}`);
      
      // Store the current XPath in our ref to compare with matches
      currentXPathRef.current = xpathExpression;
      
      // Use the global window.xmlViewer object to update the XPath query
      if (window.xmlViewer && typeof window.xmlViewer.setXPathQuery === 'function') {
        isProcessingXPathRef.current = true;
        setIsProcessingXPath(true);
        window.xmlViewer.setXPathQuery(xpathExpression);
        // Reset the processing flag after a delay to ensure we don't block future updates
        setTimeout(() => {
          isProcessingXPathRef.current = false;
          setIsProcessingXPath(false);
        }, 100);
      }
    }, 100), // 300ms debounce time
    []
  );

  // Move the handleElementEvaluation outside of render and memoize it
  const handleElementEvaluation = useCallback((element) => {
    if (!element) return;
    
    console.log("Element evaluation triggered:", element);
    
    let needsUpdate = false;
    let newStateId = currentStateId;
    let newPlatform = currentPlatform;
    
    // Update platform if element has a platform specified
    if (element.platform && element.platform !== currentPlatform) {
      console.log(`Changing platform from ${currentPlatform} to ${element.platform}`);
      newPlatform = element.platform;
      needsUpdate = true;
    }
    
    if (element.stateId && element.stateId !== currentStateId) {
      newStateId = element.stateId;
      console.log(`Element has stateId: ${newStateId}, current: ${currentStateId}`);
      needsUpdate = true;
    }
    
    // If either stateId or platform changed, update state
    if (needsUpdate) {
      console.log(`Setting new state: stateId=${newStateId}, platform=${newPlatform}`);
      setCurrentStateId(newStateId);
      setCurrentPlatform(newPlatform);
      updateStateView(newStateId, newPlatform);
    }
    
    // If the element has an XPath, use the debounced function to evaluate it
    if (element.xpath && element.xpath.xpathExpression) {
      const xpathExpression = element.xpath.xpathExpression;
      console.log(`Element has XPath: ${xpathExpression}`);
      
      // Only process if we're not already handling an XPath update
      if (!isProcessingXPathRef.current) {
        debouncedXPathEvaluation(xpathExpression);
      }
    }
  }, [currentStateId, currentPlatform, debouncedXPathEvaluation]);
  
  // Handle external updates to matchedNodes (if any)
  const updateMatchedNodes = useCallback((nodes) => {
    
    if (!isProcessingXPathRef.current) {
      setMatchedNodes(nodes);
      lastMatchCountRef.current = nodes.length;
    }
  }, []);
  
  // Handle XPath match from XMLViewer with protection against loops
  const handleXPathMatch = useCallback((xpathResult) => {
    
    // Extract the nodes from the matches array
    const nodes = xpathResult.matches || [];
    
    // If we're currently processing an XPath update, don't trigger new matches
    // if (isProcessingXPathRef.current) {
    //   console.log("Ignoring XPath match during processing period");
    //   return;
    // }
    //alert('nodes')
    setMatchedNodes(()=>{return nodes;})
    // Only update if the match count changes to prevent loops
    if (nodes.length !== lastMatchCountRef.current) {
      console.log(`XPath matched nodes: ${nodes.length} (changed from ${lastMatchCountRef.current})`);
      lastMatchCountRef.current = nodes.length;
      setMatchedNodes(()=>{
        
        return nodes})
      
    }
  }
  , []); // No dependencies here to prevent re-creation
  
  // Function to update the state view - defined once and reused
  const updateStateView = useCallback((stateId, platform) => {
    try {
      if (!stateId) {
        console.warn("No stateId provided to updateStateView");
        return;
      }
      
      console.log(`Updating state view: stateId=${stateId}, platform=${platform}`);
      
      // Get the page source XML directly using stateId and platform
      const xmlSource = getPageSource(selectedPage, platform, stateId);
      console.log("XML source retrieved, length:", xmlSource ? xmlSource.length : 0);
      setPageXml(xmlSource);
      

      // Get the base64 image directly using stateId and platform
      const b64Image = getBase64Image(selectedPage, platform, stateId);
      console.log("Base64 image retrieved, length:", b64Image ? b64Image.length : 0);
      setImageBase64(b64Image);
      
      // Reset XPath-related states when changing view
      lastMatchCountRef.current = 0;
      currentXPathRef.current = '';
      setMatchedNodes([]);
      setXmlKey(prevKey => prevKey + 1); // Force XML component to re-render
      
    } catch (error) {
      console.error("Error in updating state view:", error);
    }
  }, [selectedPage]); // Only depend on selectedPage
  
  const handleStateChange = useCallback((value) => {
    // The value here is a composite key of stateId-platform
    const [stateId, platform] = value.split('-');
    console.log(`State changed from dropdown: stateId=${stateId}, platform=${platform}`);
    
    setCurrentStateId(stateId);
    setCurrentPlatform(platform);
    
    updateStateView(stateId, platform);
  }, [updateStateView]);
  
  // Calculate the pixelRatio based on platform
  const getPixelRatio = useCallback(() => {
    // Different platforms might have different pixel ratios
    // Common values: iOS = 2 or 3, Android = 1.5 or 2
    return currentPlatform === 'ios' ? 3 : 1;
  }, [currentPlatform]);
  
  // Update the elements in selectedPage.aiAnalysis.locators
  const handleElementListChanged = (elements) => {
    // Create a new page object with updated locators
    const updatedPage = {
      ...selectedPage,
      aiAnalysis: {
        ...selectedPage.aiAnalysis,
        locators: elements
      }
    };
    
    // Update the local state
    setSelectedPage(updatedPage);
    
    // Mark that we have changes to apply
    setHasChanges(true);
    
    // Optionally notify parent of changes immediately
    // pageChanged(updatedPage);
  };
  
  // Create tab config objects with stable references
  const tabsConfig = useMemo(() => [
    {
      label: 'Screenshot',
      component: ImageHighlighter,
      props: { 
        base64Png: imageBase64,
        matchingNodes: matchedNodes, // Pass matched nodes to ImageHighlighter
        pixelRatio: getPixelRatio() // Pass the pixel ratio based on platform
      }
    },
    {
      label: 'Locators',
      component: LocatorElementList,
      props: { 
        initialElements: page?.aiAnalysis?.locators || [], 
        onHandleEvaluate: handleElementEvaluation,
        onElementsChanged: handleElementListChanged,
        onXPathChange: handleElementEvaluation,
        currentStateId, 
        currentPlatform,
        matchedNodes: matchedNodes,
        updateMatchedNodes: updateMatchedNodes // Add ability to update matched nodes from child component
      }
    },
    {
      label: 'XML',
      component: XMLViewer,
      props: { 
        initialXml: pageXml,
        key: xmlKey,
        onXPathMatch: handleXPathMatch
      }
    }
  ], [
    imageBase64, 
    pageXml, 
    xmlKey, 
    currentStateId, 
    currentPlatform, 
    handleElementEvaluation, 
    handleXPathMatch, 
    updateMatchedNodes,
    page?.aiAnalysis?.locators, 
    matchedNodes,
    getPixelRatio,
    isProcessingXPath // Use state instead of ref.current in dependency array
  ]);

  const handleBack = () => {
    if (hasChanges) {
      Modal.confirm({
        title: 'Confirm Exit',
        content: 'You have made changes. Do you want to apply them before exiting?',
        okText: 'Apply Changes',
        cancelText: 'Discard Changes',
        onOk() {
          // Raise the updated page object when applying changes
          if (typeof pageChanged === 'function') {
            pageChanged(selectedPage);
          } else {
            console.warn("pageChanged is not a function, cannot update page state");
          }
          
          setHasChanges(false);  
          onExit(selectedPage.id);
        },
        onCancel() {
          onExit(selectedPage.id);
        },
      });
    } else {
      onExit(selectedPage.id);
    }
  };

  const handleApply = () => {
    // Raise the updated page object when applying changes
    if (typeof pageChanged === 'function') {
      pageChanged(selectedPage);
    } else {
      console.warn("pageChanged is not a function, cannot update page state");
    }
    
    setHasChanges(false);
    message.success('Changes applied successfully!');
  };

  const handleAbort = () => {
    Modal.confirm({
      title: 'Confirm Abort',
      content: 'Are you sure you want to abort? All changes will be discarded.',
      okText: 'Yes, Abort',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        onExit(selectedPage.id);
      }
    });
  };

  const handleProceed = () => {
    // Raise the updated page object before proceeding
    // Check if pageChanged is available and is a function
    // if (typeof pageChanged === 'function') {
    //   //pageChanged(selectedPage);
    // } else {
    //   console.warn("pageChanged is not a function, cannot update page state");
    // }
    
    setHasChanges(false);
    // Trigger the proceedToPom event
    onProceedToPom(selectedPage);
  };

  const getCurrentTabValues = () => {
    return {
      profile: {
        userId: document.querySelector('#resizable-tabs-container input[type="number"]')?.value,
        theme: document.querySelector('#resizable-tabs-container select')?.value,
      },
      settings: {
        apiKey: document.querySelector('#resizable-tabs-container input[type="text"]')?.value,
      },
      // Add XMLViewer data if needed
      xmlViewer: {
        matchedNodes: matchedNodes,
        currentXPath: window.xmlViewer ? window.xmlViewer.getXPathQuery() : currentXPathRef.current
      }
    };
  };

  // Group states by their name for the dropdown (not by stateId)
  const getGroupedStates = () => {
    const groups = {};
    
    availableStates.forEach(state => {
      const { name } = state;
      if (!groups[name]) {
        groups[name] = [];
      }
      groups[name].push(state);
    });
    
    return groups;
  };

  const groupedStates = getGroupedStates();

  // Render different header based on viewMode
  const renderHeader = () => {
    // Common state selector element
    const stateSelector = availableStates.length > 0 && (
      <Select
        value={`${currentStateId}-${currentPlatform}`}
        onChange={handleStateChange}
        style={{ width: '100%', maxWidth: 240, flexShrink: 1 }}
        placeholder="Select a state"
        dropdownMatchSelectWidth={false}
      >
        {Object.entries(groupedStates).map(([stateName, stateVersions]) => (
          <Select.OptGroup key={stateName} label={stateName}>
            {stateVersions.map(state => (
              <Option key={`${state.stateId}-${state.platform}`} value={`${state.stateId}-${state.platform}`}>
                {state.name} ({state.platform?.toUpperCase() || 'DEFAULT'})
              </Option>
            ))}
          </Select.OptGroup>
        ))}
      </Select>
    );

    if (viewMode === 'pipeline-stage') {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '8px',
          marginBottom: '8px',
          minHeight: '48px',
          flexShrink: 0,
          overflow: 'hidden'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            minWidth: 0,
            overflow: 'hidden'
          }}>
            {stateSelector}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button 
              icon={<CloseOutlined />} 
              onClick={handleAbort} 
              danger
            >
              Abort
            </Button>
            <Button 
              icon={<RightOutlined />} 
              onClick={handleProceed} 
              type="primary"
            >
              Proceed to POM
            </Button>
          </div>
        </div>
      );
    }
    
    // Default header
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '8px',
        marginBottom: '8px',
        minHeight: '48px',
        flexShrink: 0,
        overflow: 'hidden'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          minWidth: 0,
          overflow: 'hidden'
        }}>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack} style={{ flexShrink: 0, marginRight: '12px' }} />
          {stateSelector}
        </div>
        <Button icon={<SaveOutlined />} onClick={handleApply} disabled={!hasChanges} type="primary" style={{ flexShrink: 0 }}>
          Apply Changes
        </Button>
      </div>
    );
  };

  return (
    <div
      id="resizable-tabs-container"
      style={{ 
        height: '100%', 
        width: '100%',
        display: 'flex', 
        padding:'0px',
        flexDirection: 'column',
        overflow: 'hidden' // Ensure container doesn't overflow
      }}
    >
      {renderHeader()}
      
      {/* The tabs container takes all remaining space */}
      <div style={{ 
        flex: '1 1 auto', 
        minHeight: 0, // Critical for proper flex behavior in Firefox
        position: 'relative', // Create positioning context
        overflow: 'hidden' // Hide overflow at this level
      }}>
        <ResizableTabs tabs={tabsConfig} />
      </div>
    </div>
  );
};

export default FinalResizableTabsContainer;