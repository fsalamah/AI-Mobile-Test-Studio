import React, { useState, useRef, useEffect, useCallback, useMemo, useReducer } from 'react';
import ResizableTabs from './ResizableTabs.jsx';
import { Button, Input, Select, message, Modal } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CloseOutlined, RightOutlined, ReloadOutlined } from '@ant-design/icons';
import { LocatorElementList } from '../ai/LocatorElementList.js';
import _ from 'lodash'; // Import lodash for debounce

import ImageHighlighter from './ImageHighlighter.jsx';
import { getBase64Image, getPageSource, getPageStateLookupPerOs } from '../../lib/ai/JsonHelper.js';
import XMLViewer from '../ai/XpathHighlighter.jsx';

const { Option } = Select;

// Define XPath processing states
const XPATH_STATE = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  COMPLETE: 'complete'
};

// XPath state reducer
const xpathReducer = (state, action) => {
  switch (action.type) {
    case 'START_PROCESSING':
      return {
        ...state,
        status: XPATH_STATE.PROCESSING,
        currentXPath: action.xpath
      };
    case 'COMPLETE_PROCESSING':
      return {
        ...state,
        status: XPATH_STATE.COMPLETE,
        lastMatches: action.matches || [],
        lastResult: action.result || null
      };
    case 'RESET':
      return {
        ...state,
        status: XPATH_STATE.IDLE
      };
    case 'ENQUEUE':
      // Prevent duplicate XPath expressions in the queue
      if (state.queue.includes(action.xpath)) {
        return state;
      }
      return {
        ...state,
        queue: [...state.queue, action.xpath]
      };
    case 'DEQUEUE':
      return {
        ...state,
        queue: state.queue.slice(1)
      };
    case 'BATCH_UPDATE': {
      // Handle multiple updates at once
      return {
        ...state,
        ...action.updates
      };
    }
    default:
      return state;
  }
};

// Combined state reducer for better state management
const appStateReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_LOCATORS':
      return {
        ...state,
        page: {
          ...state.page,
          aiAnalysis: {
            ...state.page.aiAnalysis,
            locators: action.locators
          }
        },
        hasChanges: true
      };
    case 'SET_PAGE':
      return {
        ...state,
        page: action.page
      };
    case 'UPDATE_STATE_VIEW':
      return {
        ...state,
        pageXml: action.pageXml,
        imageBase64: action.imageBase64,
        matchedNodes: [],
        // Don't update xmlKey here - we'll do it in a more controlled way
      };
    case 'UPDATE_XML_KEY':
      return {
        ...state,
        xmlKey: state.xmlKey + 1
      };
    case 'SET_MATCHED_NODES':
      return {
        ...state,
        matchedNodes: action.nodes || []
      };
    case 'UPDATE_CURRENT_STATE':
      return {
        ...state,
        currentStateId: action.stateId,
        currentPlatform: action.platform
      };
    case 'RESET_CHANGES':
      return {
        ...state,
        hasChanges: false
      };
    case 'BATCH_UPDATE':
      // Handle multiple updates in one dispatch
      return {
        ...state,
        ...action.updates
      };
    default:
      return state;
  }
};

const FinalResizableTabsContainer = ({ 
  pageChanged = () => {}, 
  onExit, 
  page, 
  viewMode = 'pipeline-stage', 
  onProceedToPom = () => {}, 
  onRegenerateLocators = () => {} 
}) => {
  // References that don't cause re-renders
  const xmlViewerReadyRef = useRef(false);
  const evaluationContextRef = useRef({
    stateId: null,
    platform: null,
    elementBeingEvaluated: null
  });
  const isUpdatingLocatorsRef = useRef(false);
  
  // Combine multiple state values into a single reducer for better batching
  const [appState, dispatchAppState] = useReducer(appStateReducer, {
    page: page,
    imageBase64: null,
    pageXml: null,
    xmlKey: 0,
    currentStateId: null,
    currentPlatform: page?.platform || 'ios',
    matchedNodes: [],
    hasChanges: false
  });
  
  // Keep specific states for UI management
  const [availableStates, setAvailableStates] = useState([]);
  
  // XPath state machine using useReducer - keep this separate as it has its own logic
  const [xpathState, xpathDispatch] = useReducer(xpathReducer, {
    status: XPATH_STATE.IDLE,
    currentXPath: '',
    queue: [],
    lastMatches: [],
    lastResult: null
  });
  
  // Destructure appState for cleaner code
  const {
    page: selectedPage,
    imageBase64,
    pageXml,
    xmlKey,
    currentStateId,
    currentPlatform,
    matchedNodes,
    hasChanges
  } = appState;

  // Check if XMLViewer is ready - now with stable dependencies
  useEffect(() => {
    const checkXmlViewerReady = () => {
      if (window.xmlViewer && typeof window.xmlViewer.evaluateXPathExpression === 'function') {
        xmlViewerReadyRef.current = true;
      } else {
        setTimeout(checkXmlViewerReady, 100);
      }
    };
    
    checkXmlViewerReady();
    
    return () => {
      xmlViewerReadyRef.current = false;
    };
  }, [xmlKey]); // Only re-run when xmlKey changes
  
  // Memoize the getPixelRatio function since it's simple
  const getPixelRatio = useMemo(() => {
    return currentPlatform === 'ios' ? 3 : 1;
  }, [currentPlatform]);
  
  // Function to update the state view with better batching
  const updateStateView = useCallback((stateId, platform) => {
    try {
      if (!stateId) {
        console.warn("No stateId provided to updateStateView");
        return;
      }
      
      console.log(`Updating state view: stateId=${stateId}, platform=${platform}`);
      
      // Get data first before updating state
      const xmlSource = getPageSource(selectedPage, platform, stateId);
      const b64Image = getBase64Image(selectedPage, platform, stateId);
      
      // Batch update app state
      dispatchAppState({
        type: 'BATCH_UPDATE',
        updates: {
          pageXml: xmlSource,
          imageBase64: b64Image,
          matchedNodes: []
        }
      });
      
      // Reset XPath state machine
      xpathDispatch({ type: 'RESET' });
      
      // Update evaluation context
      evaluationContextRef.current = {
        stateId,
        platform,
        elementBeingEvaluated: evaluationContextRef.current.elementBeingEvaluated
      };
      
      // Update XML key separately after a short delay to avoid excessive renders
      setTimeout(() => {
        dispatchAppState({ type: 'UPDATE_XML_KEY' });
      }, 50);
      
    } catch (error) {
      console.error("Error in updating state view:", error);
    }
  }, [selectedPage]); // Only depend on selectedPage
  
  // Create a stable version of the XPath evaluation function
  const evaluateXPathStable = useCallback((xpathExpression, callback) => {
    if (!xpathExpression || !xmlViewerReadyRef.current) {
      const emptyResult = {
        xpathExpression: xpathExpression ? String(xpathExpression) : '',
        numberOfMatches: 0,
        matchingNodes: [],
        isValid: false
      };
      
      if (callback) {
        callback(emptyResult);
      }
      return emptyResult;
    }
    
    // Convert to string if it's not already
    const xpathString = String(xpathExpression);
    
    try {
      // Use the evaluateXPathExpression method from XMLViewer directly
      const result = window.xmlViewer.evaluateXPathExpression(xpathString);
      
      // Ensure the result contains the xpathExpression as a string
      const safeResult = {
        ...result,
        xpathExpression: xpathString
      };
      
      // Update the matched nodes state
      dispatchAppState({ 
        type: 'SET_MATCHED_NODES', 
        nodes: safeResult.matchingNodes || [] 
      });
      
      // Call the callback with results if provided
      if (callback) {
        callback(safeResult);
      }
      
      return safeResult;
    } catch (error) {
      console.error('Error evaluating XPath:', error);
      const errorResult = {
        xpathExpression: xpathString,
        numberOfMatches: 0,
        matchingNodes: [],
        isValid: false
      };
      
      if (callback) {
        callback(errorResult);
      }
      
      return errorResult;
    }
  }, []); // No dependencies to make it stable
  
  // Create a debounced version of the XPath evaluation function with stable reference
  const debouncedEvaluateXPath = useMemo(() => 
    _.debounce((xpathExpression, updateElement = null) => {
      // Ensure xpathExpression is a string
      if (!xpathExpression || !xmlViewerReadyRef.current) return;
      
      // Convert to string if it's not already
      const xpathString = String(xpathExpression);
      
      try {
        // Use the stable evaluation function
        const result = evaluateXPathStable(xpathString);
        
        // Create a complete result object
        const completeResult = {
          ...result,
          xpathExpression: xpathString
        };
        
        // Update state with the result
        xpathDispatch({ 
          type: 'COMPLETE_PROCESSING', 
          matches: result.matchingNodes || [],
          result: completeResult
        });
        
        // Update the element if provided
        if (updateElement && typeof updateElement === 'function') {
          updateElement(completeResult);
        }
      } catch (error) {
        console.error('Error in debounced XPath evaluation:', error);
        
        // Clear matched nodes on error
        dispatchAppState({ type: 'SET_MATCHED_NODES', nodes: [] });
        
        // Create an error result
        const errorResult = {
          xpathExpression: xpathString,
          numberOfMatches: 0,
          matchingNodes: [],
          isValid: false
        };
        
        // Update state with the error result
        xpathDispatch({ 
          type: 'COMPLETE_PROCESSING', 
          matches: [],
          result: errorResult
        });
        
        // Still call updateElement with error result
        if (updateElement && typeof updateElement === 'function') {
          updateElement(errorResult);
        }
      }
    }, 300),
    [evaluateXPathStable]
  );
  
  // Extract the update logic to a separate function with a stable reference
  const updateLocators = useCallback((updatedLocators) => {
    console.log(`Updating locators with ${updatedLocators.length} elements`);
    
    // Use a ref to avoid excessive updates
    if (isUpdatingLocatorsRef.current) return;
    
    isUpdatingLocatorsRef.current = true;
    
    // Update the page with the new locators
    dispatchAppState({ 
      type: 'UPDATE_LOCATORS', 
      locators: updatedLocators 
    });
    
    // Reset the updating flag after a short delay
    setTimeout(() => {
      isUpdatingLocatorsRef.current = false;
    }, 10);
  }, []);
  
  // Function to update an element's XPath data with evaluation results
  const updateElementXPath = useCallback((element, result) => {
    if (!element || !result) return;
    
    // Get current locators
    const currentLocators = selectedPage.aiAnalysis?.locators || [];
    
    // Update the specific element with evaluation results
    const updatedLocators = currentLocators.map(item => {
      // Match by id first (most reliable), then by devName+platform as backup
      if (
        (element.id && item.id === element.id) || 
        (item.devName === element.devName && item.platform === element.platform)
      ) {
        return {
          ...item,
          xpath: {
            ...item.xpath,
            xpathExpression: result.xpathExpression,
            numberOfMatches: result.numberOfMatches,
            isValid: result.isValid,
            matchingNodes: result.matchingNodes || []
          }
        };
      }
      return item;
    });
    
    // Only update if there was an actual change
    const hasElementChanged = JSON.stringify(updatedLocators) !== JSON.stringify(currentLocators);
    
    if (hasElementChanged) {
      updateLocators(updatedLocators);
    }
  }, [selectedPage.aiAnalysis?.locators, updateLocators]);
  
  // Enhanced processXPath function with stable dependencies
  const processXPath = useCallback((xpathExpression, updateElement = null) => {
    // Ensure xpathExpression is a string
    if (!xpathExpression) {
      // Clear matches if expression is empty
      dispatchAppState({ type: 'SET_MATCHED_NODES', nodes: [] });
      return;
    }
    
    // Make sure xpathExpression is a string
    const xpathString = String(xpathExpression);
    
    // If already processing, enqueue this request
    if (xpathState.status === XPATH_STATE.PROCESSING) {
      xpathDispatch({ type: 'ENQUEUE', xpath: xpathString });
      return;
    }
    
    // Set state to processing
    xpathDispatch({ type: 'START_PROCESSING', xpath: xpathString });
    
    // Use the debounced evaluation
    debouncedEvaluateXPath(xpathString, updateElement);
    
  }, [xpathState.status, debouncedEvaluateXPath]);
  
  // Handle XPath match from XMLViewer with minimal dependencies
  const handleXPathMatch = useCallback((xpathResult) => {
    // Extract the nodes from the matches array
    const nodes = xpathResult?.matches || [];
    
    // Update matched nodes
    dispatchAppState({ type: 'SET_MATCHED_NODES', nodes });
    
    // Only update processing state if we're in PROCESSING state
    if (xpathState.status === XPATH_STATE.PROCESSING) {
      // Complete the processing with the result
      xpathDispatch({ 
        type: 'COMPLETE_PROCESSING', 
        matches: nodes,
        result: {
          xpathExpression: typeof xpathState.currentXPath === 'string' ? xpathState.currentXPath : String(xpathState.currentXPath),
          numberOfMatches: nodes.length,
          matchingNodes: nodes,
          isValid: true
        }
      });
    }
  }, [xpathState.status, xpathState.currentXPath]);
  
  // Enhanced element evaluation with controlled state updates
  const handleElementEvaluation = useCallback(async (element) => {
    if (!element) return;
    
    // Store the element being evaluated
    evaluationContextRef.current.elementBeingEvaluated = element;
    
    let needsUpdate = false;
    let newStateId = currentStateId;
    let newPlatform = currentPlatform;
    
    // Update platform if element has a platform specified
    if (element.platform && element.platform !== currentPlatform) {
      newPlatform = element.platform;
      needsUpdate = true;
    }
    
    if (element.stateId && element.stateId !== currentStateId) {
      newStateId = element.stateId;
      needsUpdate = true;
    }
    
    // If either stateId or platform changed, update state
    if (needsUpdate) {
      // Update state ID and platform in one batch
      dispatchAppState({
        type: 'UPDATE_CURRENT_STATE',
        stateId: newStateId,
        platform: newPlatform
      });
      
      // Then update the view
      await updateStateView(newStateId, newPlatform);
      
      // Give the view a moment to update before evaluating XPath
      if (element.xpath && element.xpath.xpathExpression) {
        setTimeout(() => {
          processXPath(element.xpath.xpathExpression, result => updateElementXPath(element, result));
        }, 300);
      }
      
      return; // Return early to avoid double evaluation
    }
    
    // If the element has an XPath, evaluate it
    if (element.xpath && element.xpath.xpathExpression) {
      // Make sure the xpathExpression is a string
      const xpathExpression = String(element.xpath.xpathExpression);
      
      // Process using our enhanced approach with element updating
      processXPath(xpathExpression, result => updateElementXPath(element, result));
    }
  }, [currentStateId, currentPlatform, processXPath, updateStateView, updateElementXPath]);
  
  // Handler for state change from dropdown
  const handleStateChange = useCallback((value) => {
    // The value here is a composite key of stateId-platform
    const [stateId, platform] = value.split('-');
    
    // Update state ID and platform
    dispatchAppState({
      type: 'UPDATE_CURRENT_STATE',
      stateId,
      platform
    });
    
    // Update the view
    updateStateView(stateId, platform);
  }, [updateStateView]);
  
  // External update to matched nodes with minimal dependencies
  const updateMatchedNodes = useCallback((nodes) => {
    dispatchAppState({ type: 'SET_MATCHED_NODES', nodes: nodes || [] });
  }, []);
  
  // Update the elements in selectedPage.aiAnalysis.locators
  const handleElementListChanged = useCallback((elements) => {
    // Add IDs to elements if they don't have one
    const elementsWithIds = elements.map(element => {
      if (!element.id) {
        return {
          ...element,
          id: `element_${element.platform}_${element.devName}_${Date.now()}`
        };
      }
      return element;
    });
    
    // Update locators with the new elements
    updateLocators(elementsWithIds);
  }, [updateLocators]);
  
  // Process XPath queue when state changes to COMPLETE
  useEffect(() => {
    if (xpathState.status === XPATH_STATE.COMPLETE && xpathState.queue.length > 0) {
      // Small delay to ensure clean state transitions
      const timer = setTimeout(() => {
        // Reset state to IDLE
        xpathDispatch({ type: 'RESET' });
        
        // Process next in queue
        const nextXPath = xpathState.queue[0];
        xpathDispatch({ type: 'DEQUEUE' });
        
        // Start processing the next item
        processXPath(nextXPath);
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [xpathState, processXPath]);
  
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
            
          // Update in a single dispatch
          dispatchAppState({
            type: 'UPDATE_CURRENT_STATE',
            stateId: firstState.stateId,
            platform: firstState.platform || 'ios'
          });
          
          updateStateView(firstState.stateId, firstState.platform);
        }
      }
    } catch (error) {
      console.error("Error loading page states:", error);
    }
  }, [selectedPage, currentStateId, currentPlatform, updateStateView]);
  
  // Event handlers with minimal dependencies
  const handleBack = useCallback(() => {
    if (hasChanges) {
      Modal.confirm({
        title: 'Confirm Exit',
        content: 'You have made changes. Do you want to apply them before exiting?',
        okText: 'Apply Changes',
        cancelText: 'Discard Changes',
        onOk() {
          // Raise the updated page object when applying changes
          pageChanged(selectedPage);
          dispatchAppState({ type: 'RESET_CHANGES' });
          onExit(selectedPage.id);
        },
        onCancel() {
          onExit(selectedPage.id);
        },
      });
    } else {
      onExit(selectedPage.id);
    }
  }, [hasChanges, onExit, pageChanged, selectedPage]);

  const handleApply = useCallback(() => {
    // Raise the updated page object when applying changes
    pageChanged(selectedPage);
    dispatchAppState({ type: 'RESET_CHANGES' });
    message.success('Changes applied successfully!');
  }, [pageChanged, selectedPage]);

  const handleAbort = useCallback(() => {
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
  }, [onExit, selectedPage.id]);
  
  const handleRegenerate = useCallback(() => {
    Modal.confirm({
      title: 'Regenerate Locators',
      content: 'Are you sure you want to regenerate all locators? Current changes will be discarded.',
      okText: 'Yes, Regenerate',
      okType: 'primary',
      cancelText: 'Cancel',
      onOk() {
        onRegenerateLocators(selectedPage);
      }
    });
  }, [onRegenerateLocators, selectedPage]);

  const handleProceed = useCallback(() => {
    pageChanged(selectedPage);
    dispatchAppState({ type: 'RESET_CHANGES' });
    onProceedToPom(selectedPage);
  }, [onProceedToPom, pageChanged, selectedPage]);

  // Group states by their name for the dropdown - memoized
  const groupedStates = useMemo(() => {
    const groups = {};
    
    availableStates.forEach(state => {
      const { name } = state;
      if (!groups[name]) {
        groups[name] = [];
      }
      groups[name].push(state);
    });
    
    return groups;
  }, [availableStates]);

  // Create tab config objects with minimal dependencies
  const tabsConfig = useMemo(() => [
    {
      label: 'Screenshot',
      component: ImageHighlighter,
      props: { 
        base64Png: imageBase64,
        matchingNodes: matchedNodes,
        pixelRatio: getPixelRatio,
        // Use a stable identifier instead of changing state values
        key: 'image-highlighter'
      }
    },
    {
      label: 'Locators',
      component: LocatorElementList,
      props: { 
        initialElements: selectedPage?.aiAnalysis?.locators || [],
        onHandleEvaluate: handleElementEvaluation,
        onElementsChanged: handleElementListChanged,
        onXPathChange: processXPath,
        evaluateXPath: evaluateXPathStable,
        currentStateId, 
        currentPlatform,
        matchedNodes,
        updateMatchedNodes,
        xpathState,
        // Use a stable identifier
        key: 'locator-list'
      }
    },
    {
      label: 'XML',
      component: XMLViewer,
      props: { 
        initialXml: pageXml,
        key: xmlKey, // This key is necessary for XML component reloading
        onXPathMatch: handleXPathMatch
      }
    }
  ], [
    // Reduced dependency array with only essential dependencies
    imageBase64,
    pageXml,
    xmlKey,
    selectedPage?.aiAnalysis?.locators,
    matchedNodes,
    handleElementEvaluation,
    handleXPathMatch,
    handleElementListChanged,
    currentStateId,
    currentPlatform,
    processXPath,
    getPixelRatio,
    evaluateXPathStable,
    updateMatchedNodes,
    xpathState
  ]);

  // Render different header based on viewMode
  const renderHeader = useCallback(() => {
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
              icon={<ReloadOutlined />} 
              onClick={handleRegenerate}
            >
              Regenerate Locators
            </Button>
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleRegenerate}
          >
            Regenerate Locators
          </Button>
          <Button 
            icon={<SaveOutlined />} 
            onClick={handleApply} 
            disabled={!hasChanges} 
            type="primary" 
            style={{ flexShrink: 0 }}
          >
            Apply Changes
          </Button>
        </div>
      </div>
    );
  }, [
    availableStates,
    currentStateId,
    currentPlatform,
    groupedStates,
    handleStateChange,
    handleRegenerate,
    handleAbort,
    handleProceed,
    handleBack,
    handleApply,
    hasChanges,
    viewMode
  ]);

  return (
    <div
      id="resizable-tabs-container"
      style={{ 
        height: '100%', 
        width: '100%',
        display: 'flex', 
        padding: '0px',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {renderHeader()}
      
      <div style={{ 
        flex: '1 1 auto', 
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <ResizableTabs tabs={tabsConfig} />
      </div>
    </div>
  );
};

export default FinalResizableTabsContainer;