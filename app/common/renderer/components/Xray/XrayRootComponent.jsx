import React, { useState, useRef, useEffect, useCallback, useMemo, useReducer } from 'react';
import ResizableTabs from './ResizableTabs.jsx';
import { Button, Input, Select, message, Modal, Dropdown, Badge, Tooltip } from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined, 
  CloseOutlined, 
  RightOutlined, 
  ReloadOutlined,
  ToolOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  StopOutlined
} from '@ant-design/icons';
import { LocatorElementList } from '../ai/LocatorElementList/LocatorElementList.tsx';
import _ from 'lodash'; // Import lodash for debounce

import ImageHighlighter from './ImageHighlighter.jsx';
import { getBase64Image, getPageSource, getPageStateLookupPerOs } from '../../lib/ai/JsonHelper.js';
import XMLViewer from '../ai/XpathHighlighter.jsx';
import { connect } from 'react-redux';
import { startXpathFixProcess } from '../../reducers/ai';

// Import our direct XPath manager
import xpathManager from './XPathManager.js';

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
        currentXPath: action.xpath,
        currentElementId: action.elementId || null // Store elementId if available
      };
    case 'COMPLETE_PROCESSING':
      return {
        ...state,
        status: XPATH_STATE.COMPLETE,
        lastMatches: action.matches || [],
        lastResult: action.result || null,
        lastElementId: state.currentElementId // Preserve elementId
      };
    case 'RESET':
      return {
        ...state,
        status: XPATH_STATE.IDLE,
        currentElementId: null // Clear element ID
      };
    case 'ENQUEUE':
      // Create a queue entry with xpath and elementId
      const queueEntry = {
        xpath: action.xpath,
        elementId: action.elementId || null
      };
      
      // Prevent duplicate XPath expressions in the queue
      if (state.queue.some(entry => 
        entry.xpath === action.xpath && entry.elementId === action.elementId)) {
        return state;
      }
      
      return {
        ...state,
        queue: [...state.queue, queueEntry]
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
        matchedNodes: action.nodes || [],
        nodePlatform: action.platform // Store platform information with nodes
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

// XPath Fix Button Component
const XPathFixButton = ({ onClick, failingCount = 0, loading = false, size = 'middle' }) => {
  return (
    <Tooltip title="Fix failing XPaths using AI">
      <Badge count={failingCount > 0 ? failingCount : 0} size="small">
        <Button
          icon={<ToolOutlined />}
          onClick={onClick}
          loading={loading}
          disabled={failingCount === 0}
          size={size}
        >
          {size === 'small' ? 'Fix' : 'Fix XPaths'}
        </Button>
      </Badge>
    </Tooltip>
  );
};

// XPath Alternatives Component
const XPathAlternatives = ({ alternatives = [], onSelect, matchCount = 0 }) => {
  const [visible, setVisible] = useState(false);
  
  // Don't render anything if no alternatives
  if (!alternatives || alternatives.length === 0) {
    return null;
  }
  
  // Get icon and color based on match count
  const getStatusIndicator = (count) => {
    if (count === undefined || count === null) return { icon: <StopOutlined />, color: '#f5222d' };
    if (count === 0) return { icon: <StopOutlined />, color: '#f5222d' };
    if (count === 1) return { icon: <CheckCircleOutlined />, color: '#52c41a' }; // Exact match - green
    return { icon: <WarningOutlined />, color: '#faad14' }; // Multiple matches - yellow
  };
  
  // Create menu items for each alternative
  const menuItems = alternatives.map((alt, index) => {
    const status = getStatusIndicator(alt.matchCount);
    
    return {
      key: index.toString(),
      label: (
        <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <Badge 
            count={alt.matchCount || 0} 
            size="small" 
            style={{ backgroundColor: status.color, marginRight: '8px' }}
          />
          <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
            {alt.xpath}
          </span>
        </div>
      ),
      icon: status.icon,
      onClick: () => {
        onSelect(alt);
        setVisible(false);
      }
    };
  });
  
  // Current XPath status
  const currentStatus = getStatusIndicator(matchCount);
  
  return (
    <Dropdown
      menu={{ items: menuItems }}
      open={visible}
      onOpenChange={setVisible}
      trigger={['click']}
    >
      <Tooltip title="Alternative XPath suggestions">
        <BulbOutlined 
          style={{ 
            color: currentStatus.color,
            cursor: 'pointer',
            fontSize: '14px',
            padding: '4px'
          }} 
        />
      </Tooltip>
    </Dropdown>
  );
};

const FinalResizableTabsContainer = ({ 
  pageChanged = () => {}, 
  onExit, 
  page, 
  viewMode = 'pipeline-stage', 
  onProceedToPom = () => {}, 
  onRegenerateLocators = () => {},
  // Redux-connected props
  isAnalyzing = false,
  startXpathFixProcess
}) => {
  // References that don't cause re-renders
  const xmlViewerReadyRef = useRef(false);
  const evaluationContextRef = useRef({
    stateId: null,
    platform: null,
    elementBeingEvaluated: null
  });
  const isUpdatingLocatorsRef = useRef(false);
  
  // State for XPath fix process
  const [isFixingXPaths, setIsFixingXPaths] = useState(false);
  
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
    currentElementId: null, // Track which element is being evaluated
    queue: [],
    lastMatches: [],
    lastResult: null,
    lastElementId: null // Store element ID from previous evaluation
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
  
  // Function to update the state view with direct reference management
  const updateStateView = useCallback((stateId, platform) => {
    try {
      console.log("🔄 UPDATE STATE VIEW: Starting state view update");
      
      if (!stateId) {
        console.warn("❌ No stateId provided to updateStateView");
        return;
      }
      
      console.log(`🔍 Updating to: stateId=${stateId}, platform=${platform}`);
      
      // Get data first before updating state
      console.log("📄 Getting XML source from page data");
      const xmlSource = getPageSource(selectedPage, platform, stateId);
      
      if (!xmlSource) {
        console.error(`❌ No XML source available for platform=${platform}, stateId=${stateId}`);
        message.error(`Failed to load XML source for ${platform} state ${stateId}`);
        return false;
      }
      
      console.log(`📄 XML source loaded: ${xmlSource.length} characters`);
      
      const b64Image = getBase64Image(selectedPage, platform, stateId);
      if (!b64Image) {
        console.warn(`⚠️ No screenshot available for platform=${platform}, stateId=${stateId}`);
      }
      
      console.log("🔄 Setting XML source in XPathManager");
      // IMPORTANT: Update the XPathManager with new XML and state info
      // This is the key change - direct management instead of events
      xpathManager.setXmlSource(xmlSource, stateId, platform);
      
      // Verify that XML was set properly
      const xmlAfterSet = xpathManager.getXmlSource();
      console.log(`📊 XPathManager now has XML: ${!!xmlAfterSet}`);
      console.log(`📊 XPathManager XML length: ${xmlAfterSet?.length || 0}`);
      
      console.log("📤 Updating app state with new XML and image");
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
      console.log("🔄 Resetting XPath state machine");
      xpathDispatch({ type: 'RESET' });
      
      // Update evaluation context
      console.log("🔄 Updating evaluation context reference");
      evaluationContextRef.current = {
        stateId,
        platform,
        elementBeingEvaluated: evaluationContextRef.current.elementBeingEvaluated
      };
      
      // Update XML key separately after a short delay to avoid excessive renders
      setTimeout(() => {
        console.log("🔄 Updating XML key to refresh viewers");
        dispatchAppState({ type: 'UPDATE_XML_KEY' });
      }, 100);
      
      console.log("✅ State view update complete");
      return true;
      
    } catch (error) {
      console.error("❌ Error in updating state view:", error);
      message.error(`Failed to update state view: ${error.message}`);
      return false;
    }
  }, [selectedPage, dispatchAppState, xpathDispatch]); // Added proper dependencies
  
  // Forward declare evaluateXPathStable
  let evaluateXPathStable;
  
  // Create a stable version of the XPath evaluation function using centralized evaluation
  evaluateXPathStable = useCallback((xpathExpression, callback) => {
    if (!xpathExpression) {
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
    
    // Extract element ID from evaluation context if available
    const elementId = evaluationContextRef.current?.elementBeingEvaluated?.id;
    
    // Use centralized evaluation
    const result = centralizedEvaluateXPath(xpathExpression, {
      elementId,
      callback
    });
    
    return result || {
      xpathExpression: String(xpathExpression),
      numberOfMatches: 0,
      matchingNodes: [],
      isValid: false
    };
  }, [/* No dependencies to avoid circular references */]); // Depend on pageXml for direct access
  
  // Create a debounced version of the XPath evaluation function with stable reference
  const debouncedEvaluateXPath = useMemo(() => 
    _.debounce((xpathExpression, updateElement = null) => {
      // Ensure xpathExpression is a string
      if (!xpathExpression) return;
      
      // Extract element ID from evaluation context if available
      const elementId = evaluationContextRef.current?.elementBeingEvaluated?.id;
      
      // Use the centralized evaluation function
      centralizedEvaluateXPath(xpathExpression, {
        elementId,
        highlight: true,
        updateUI: true,
        callback: (result) => {
          // Update state with the result
          xpathDispatch({ 
            type: 'COMPLETE_PROCESSING', 
            matches: result.matchingNodes || [],
            result
          });
          
          // Update the element if provided
          if (updateElement && typeof updateElement === 'function') {
            updateElement(result);
          }
        }
      });
    }, 300),
    [/* No dependencies to avoid circular references */]
  );
  
  // Extract the update logic to a separate function with a stable reference
  const updateLocators = useCallback((updatedLocators, shouldMarkAsChanged = false) => {
    console.log(`Updating locators with ${updatedLocators.length} elements, markAsChanged=${shouldMarkAsChanged}`);
    
    // Use a ref to avoid excessive updates
    if (isUpdatingLocatorsRef.current) return;
    
    isUpdatingLocatorsRef.current = true;
    
    // Update the page with the new locators WITHOUT marking as changed by default
    if (shouldMarkAsChanged) {
      // Only mark as changed if explicitly requested (for user edits)
      dispatchAppState({ 
        type: 'UPDATE_LOCATORS', 
        locators: updatedLocators 
      });
    } else {
      // For evaluation updates, don't mark as changed
      dispatchAppState({ 
        type: 'BATCH_UPDATE',
        updates: { 
          page: {
            ...selectedPage,
            aiAnalysis: {
              ...selectedPage.aiAnalysis,
              locators: updatedLocators
            }
          }
        }
      });
    }
    
    // Reset the updating flag after a short delay
    setTimeout(() => {
      isUpdatingLocatorsRef.current = false;
    }, 10);
  }, [selectedPage, dispatchAppState]);
  
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
    
    // Check for meaningful changes that should trigger the changes flag
    let hasElementChanged = false;
    
    // Compare each element to check for meaningful changes
    for (let i = 0; i < updatedLocators.length; i++) {
      const updatedEl = updatedLocators[i];
      const originalEl = currentLocators[i];
      
      // Only consider these specific changes as meaningful
      if (updatedEl && originalEl && 
          (updatedEl.id === element.id || // Only check the element we're updating
           (updatedEl.devName === element.devName && updatedEl.platform === element.platform))) {
        
        // Consider ANY attribute change as a meaningful change that requires saving
        // Compare all properties of the element (except evaluation stats that are auto-generated)
        if (updatedEl.xpath?.xpathExpression !== originalEl.xpath?.xpathExpression ||
            updatedEl.devName !== originalEl.devName ||
            updatedEl.name !== originalEl.name ||
            updatedEl.value !== originalEl.value ||
            updatedEl.platform !== originalEl.platform ||
            updatedEl.stateId !== originalEl.stateId ||
            updatedEl.description !== originalEl.description) {
          hasElementChanged = true;
          break;
        }
        
        // Only the following are NOT considered meaningful changes:
        // - XPath evaluation results (numberOfMatches, isValid, matchingNodes)
        // - Internal state flags (_isEvaluating, _lastUpdateTime, etc.)
        // - Auto-generated metadata
      }
    }
    
    // Update elements with the appropriate change flag
    updateLocators(updatedLocators, hasElementChanged);
    
    // No need for additional dispatch as updateLocators now handles the hasChanges flag
    // based on the hasElementChanged parameter
  }, [selectedPage.aiAnalysis?.locators, updateLocators]);
  
  // Forward declare processXPath to avoid reference errors
  let centralizedEvaluateXPath;
  
  // Legacy processXPath function that redirects to centralized evaluation
  const processXPath = useCallback((xpathExpression, updateElement = null, options = {}) => {
    // Extract elementId from options if provided
    const { elementId } = options;
    
    // Use the centralized evaluation function
    return centralizedEvaluateXPath(xpathExpression, {
      elementId,
      highlight: true,
      updateUI: true,
      callback: updateElement
    });
  }, [/* Don't include centralizedEvaluateXPath as a dependency to avoid circular reference */]);
  
  /**
   * Centralized XPath evaluation function - all XPath evaluations should flow through here
   * @param {string} xpathExpression - The XPath expression to evaluate
   * @param {Object} options - Evaluation options
   * @returns {Object} - Evaluation result
   */
  centralizedEvaluateXPath = useCallback((xpathExpression, options = {}) => {
    // Default options
    const {
      elementId = null,
      highlight = true,
      updateUI = true,
      callback = null
    } = options;
    
    // Ensure xpathExpression is a string
    if (!xpathExpression) {
      // Clear matches if expression is empty
      dispatchAppState({ 
  type: 'SET_MATCHED_NODES', 
  nodes: [],
  platform: evaluationContextRef.current?.platform || currentPlatform
});
      return null;
    }
    
    // Make sure xpathExpression is a string
    const xpathString = String(xpathExpression);
    
    console.log(`Centralized XPath evaluation: ${xpathString} for element ${elementId || 'none'}`);
    
    // Use XPathManager for centralized evaluation
    const result = xpathManager.centralizedEvaluate({
      xpathExpression: xpathString,
      elementId,
      highlight,
      updateUI
    });
    
    // Update app state with matched nodes
    if (highlight && result.actualNodes) {
      dispatchAppState({ 
        type: 'SET_MATCHED_NODES', 
        nodes: result.actualNodes || [],
        platform: evaluationContextRef.current?.platform || currentPlatform
      });
    }
    
    // Call callback if provided
    if (callback && typeof callback === 'function') {
      callback(result);
    }
    
    return result;
  }, [dispatchAppState]);
  
  // Handle XPath match from XMLViewer with minimal dependencies
  const handleXPathMatch = useCallback((xpathResult) => {
    // Extract the nodes from the matches array
    const nodes = xpathResult?.matches || [];
    
    // Update matched nodes
    dispatchAppState({ 
      type: 'SET_MATCHED_NODES', 
      nodes,
      platform: evaluationContextRef.current?.platform || currentPlatform
    });
    
    // Get the XPath expression from the result
    const xpathExpression = xpathResult.xpathExpression;
    
    // Get the element ID from the evaluation context
    const elementId = evaluationContextRef.current?.elementBeingEvaluated?.id;
    
    // Create a result object
    const result = {
      xpathExpression,
      numberOfMatches: nodes.length,
      matchingNodes: nodes,
      isValid: true,
      elementId
    };
    
    // If we're in processing state and match current XPath, complete the processing
    if (xpathState.status === XPATH_STATE.PROCESSING && 
        xpathExpression === xpathState.currentXPath) {
      xpathDispatch({ 
        type: 'COMPLETE_PROCESSING', 
        matches: nodes,
        result
      });
    }
    
    // Notify all listeners about the XPath match
    xpathManager.notifyListeners('highlightsChanged', {
      nodes,
      xpathExpression,
      elementId
    });
  }, [xpathState.status, xpathState.currentXPath, dispatchAppState]);
  
  // Enhanced element evaluation with centralized evaluation - make sure this is defined AFTER centralizedEvaluateXPath
  const handleElementEvaluation = useCallback(async (element, forceRefresh = false) => {
    console.log("🔍 ELEMENT EVALUATION: Starting evaluation for element", element?.devName || 'unknown');
    console.log(`Force refresh: ${forceRefresh}`);
    
    if (!element) {
      console.log("❌ No element provided - aborting evaluation");
      return;
    }
    
    // Store the element being evaluated
    evaluationContextRef.current.elementBeingEvaluated = element;
    
    let needsUpdate = forceRefresh; // Always update if force refresh is true
    let newStateId = element.stateId || currentStateId;
    let newPlatform = element.platform || currentPlatform;
    
    console.log(`Element State Info: platform=${element.platform}, stateId=${element.stateId}`);
    console.log(`Current State Info: platform=${currentPlatform}, stateId=${currentStateId}`);
    
    // Update platform if element has a platform specified
    if (element.platform && element.platform !== currentPlatform) {
      console.log(`📱 Platform change needed: ${currentPlatform} -> ${element.platform}`);
      newPlatform = element.platform;
      needsUpdate = true;
    }
    
    if (element.stateId && element.stateId !== currentStateId) {
      console.log(`🔄 State ID change needed: ${currentStateId} -> ${element.stateId}`);
      newStateId = element.stateId;
      needsUpdate = true;
    }
    
    // If either stateId or platform changed, update state
    if (needsUpdate) {
      console.log(`🔄 Updating state view to platform=${newPlatform}, stateId=${newStateId}`);
      
      // Update state ID and platform in one batch
      dispatchAppState({
        type: 'UPDATE_CURRENT_STATE',
        stateId: newStateId,
        platform: newPlatform
      });
      
      // Then update the view with fresh XML
      console.log("📊 Getting fresh XML for new state/platform");
      await updateStateView(newStateId, newPlatform);
      
      // Now check the XPathManager XML state
      const hasXml = !!xpathManager.getXmlSource();
      console.log(`📄 XML loaded: ${hasXml}`);
      console.log(`📄 XML length: ${xpathManager.getXmlSource()?.length || 0}`);
      
      if (!hasXml) {
        console.error("❌ Failed to load XML source for evaluation");
        return;
      }
      
      // Give the view a moment to update before evaluating XPath
      if (element.xpath && element.xpath.xpathExpression) {
        console.log(`⏳ Scheduling evaluation after view update: ${element.xpath.xpathExpression}`);
        setTimeout(() => {
          console.log("🔄 Now evaluating XPath after view update");
          // Important: Pass platform information to evaluation
          centralizedEvaluateXPath(element.xpath.xpathExpression, {
            elementId: element.id,
            elementPlatform: element.platform,
            callback: result => updateElementXPath(element, result)
          });
        }, 500); // Increased timeout to ensure XML is fully loaded
      }
      
      return; // Return early to avoid double evaluation
    }
    
    // If the element has an XPath, evaluate it directly (no state change needed)
    if (element.xpath && element.xpath.xpathExpression) {
      // Make sure the xpathExpression is a string
      const xpathExpression = String(element.xpath.xpathExpression);
      
      console.log(`🔍 Direct evaluation of: ${xpathExpression}`);
      console.log(`📱 Using platform: ${element.platform}`);
      
      // Use centralized evaluation with element ID and platform
      centralizedEvaluateXPath(xpathExpression, {
        elementId: element.id,
        elementPlatform: element.platform,
        callback: result => updateElementXPath(element, result)
      });
    } else {
      console.log("❌ No XPath expression available for evaluation");
    }
  }, [currentStateId, currentPlatform, updateStateView, updateElementXPath, dispatchAppState 
      /* Don't include centralizedEvaluateXPath as a dependency to avoid circular reference */]);
  
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
  }, [updateStateView, dispatchAppState]);
  
  // External update to matched nodes with minimal dependencies
  const updateMatchedNodes = useCallback((nodes, platform) => {
    dispatchAppState({ 
      type: 'SET_MATCHED_NODES', 
      nodes: nodes || [],
      platform: platform || evaluationContextRef.current?.platform || currentPlatform
    });
  }, [dispatchAppState, currentPlatform]);
  
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
    
    // Check for meaningful changes by comparing with current locators
    const currentLocators = selectedPage.aiAnalysis?.locators || [];
    let hasElementChanged = false;
    
    // Skip change detection if element counts differ - this is always a meaningful change
    if (elementsWithIds.length !== currentLocators.length) {
      hasElementChanged = true;
    } else {
      // Compare each element to check for meaningful changes
      for (let i = 0; i < elementsWithIds.length; i++) {
        const updatedEl = elementsWithIds[i];
        const originalEl = currentLocators[i];
        
        // Consider ANY attribute change as a meaningful change that requires saving
        // Compare all properties of the element (except evaluation stats that are auto-generated)
        if (updatedEl.xpath?.xpathExpression !== originalEl.xpath?.xpathExpression ||
            updatedEl.devName !== originalEl.devName ||
            updatedEl.name !== originalEl.name ||
            updatedEl.value !== originalEl.value ||
            updatedEl.platform !== originalEl.platform ||
            updatedEl.stateId !== originalEl.stateId ||
            updatedEl.description !== originalEl.description) {
          hasElementChanged = true;
          break;
        }
      }
    }
    
    // Update locators with the new elements, marking as changed if necessary
    updateLocators(elementsWithIds, hasElementChanged);
  }, [updateLocators, selectedPage.aiAnalysis?.locators, selectedPage]);
  
  // Process XPath queue when state changes to COMPLETE
  useEffect(() => {
    if (xpathState.status === XPATH_STATE.COMPLETE && xpathState.queue.length > 0) {
      // Small delay to ensure clean state transitions
      const timer = setTimeout(() => {
        // Reset state to IDLE
        xpathDispatch({ type: 'RESET' });
        
        // Process next in queue
        const nextItem = xpathState.queue[0];
        xpathDispatch({ type: 'DEQUEUE' });
        
        // Start processing the next item with its elementId if available
        if (nextItem) {
          processXPath(
            nextItem.xpath, 
            null, 
            { elementId: nextItem.elementId }
          );
        }
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
  }, [selectedPage, currentStateId, currentPlatform, updateStateView, dispatchAppState]);
  
  // Function to get failing XPath count
  const getFailingXPathCount = useCallback(() => {
    const locators = selectedPage.aiAnalysis?.locators || [];
    
    return locators.filter(loc => 
      !loc.xpath?.isValid || 
      loc.xpath?.numberOfMatches === 0 || 
      loc.xpath?.xpathExpression === '//*[99=0]'
    ).length;
  }, [selectedPage.aiAnalysis?.locators]);
  
  // Function to handle XPath fixing
  const handleFixXPaths = useCallback(async () => {
    // Get current locators
    const locators = selectedPage.aiAnalysis?.locators || [];
    
    // Get failing locators
    const failingLocators = locators.filter(loc => 
      !loc.xpath?.isValid || 
      loc.xpath?.numberOfMatches === 0 || 
      loc.xpath?.xpathExpression === '//*[99=0]'
    );
    
    if (failingLocators.length === 0) {
      message.info('No failing XPaths found to repair.');
      return;
    }
    
    // Set loading state
    setIsFixingXPaths(true);
    message.loading(`Fixing ${failingLocators.length} failing XPaths...`, 0);
    
    try {
      // Call the Redux action to start the XPath fix process
      const fixedElements = await startXpathFixProcess(locators, selectedPage);
      
      if (fixedElements) {
        // Apply the fixed elements
        updateLocators(fixedElements);
        
        // Evaluate all the fixed XPaths to update their match status
        await evaluateFixedXPaths(fixedElements);
        
        message.destroy();
        message.success(`Fixed ${failingLocators.length} XPaths successfully!`);
      } else {
        message.destroy();
        message.error('Failed to fix XPaths. Please check the logs for details.');
      }
    } catch (error) {
      console.error('Error fixing XPaths:', error);
      message.destroy();
      message.error(`Error fixing XPaths: ${error.message}`);
    } finally {
      setIsFixingXPaths(false);
    }
  }, [selectedPage, startXpathFixProcess, updateLocators]);
  
  // Function to evaluate fixed XPaths
  const evaluateFixedXPaths = useCallback(async (elements) => {
    // For each element
    for (const element of elements) {
      // Skip elements with already working XPaths
      if (element.xpath?.numberOfMatches === 1) {
        continue;
      }
      
      // If the element has alternatives, prepare to evaluate them
      if (element.xpath?.alternativeXpaths && element.xpath.alternativeXpaths.length > 0) {
        // Create an array of all XPaths to evaluate (current + alternatives)
        const xpathsToEvaluate = [
          { 
            xpath: element.xpath.xpathExpression,
            isPrimary: true 
          },
          ...element.xpath.alternativeXpaths.map(alt => ({
            xpath: alt.xpath,
            confidence: alt.confidence,
            description: alt.description,
            isPrimary: false
          }))
        ];
        
        // Evaluate each XPath
        const evaluatedXPaths = [];
        
        for (const xpathData of xpathsToEvaluate) {
          if (!xpathData.xpath || xpathData.xpath === '//*[99=0]') {
            evaluatedXPaths.push({
              ...xpathData,
              matchCount: 0,
              isValid: false
            });
            continue;
          }
          
          // Evaluate this XPath
          const result = evaluateXPathStable(xpathData.xpath);
          
          evaluatedXPaths.push({
            ...xpathData,
            matchCount: result.numberOfMatches,
            isValid: result.isValid
          });
        }
        
        // Store the evaluated XPaths in the element
        element.xpath.evaluatedAlternatives = evaluatedXPaths;
        
        // Find the first XPath with exactly 1 match
        const exactMatch = evaluatedXPaths.find(alt => alt.matchCount === 1);
        
        if (exactMatch) {
          // Use this XPath
          element.xpath = {
            ...element.xpath,
            xpathExpression: exactMatch.xpath,
            numberOfMatches: 1,
            isValid: true
          };
          continue;
        }
        
        // If no exact match, find the first with multiple matches
        const multiMatch = evaluatedXPaths.find(alt => alt.matchCount > 1);
        
        if (multiMatch) {
          // Use this XPath
          element.xpath = {
            ...element.xpath,
            xpathExpression: multiMatch.xpath,
            numberOfMatches: multiMatch.matchCount,
            isValid: true
          };
          continue;
        }
      }
    }
    
    // Apply updates to all elements at once
    updateLocators([...elements]);
    
    return elements;
  }, [evaluateXPathStable, updateLocators]);
  
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
          
          // Exit Xray view
          if (typeof onExit === 'function') {
            onExit(selectedPage.id);
          }
        },
        onCancel() {
          // Exit without saving
          if (typeof onExit === 'function') {
            onExit(selectedPage.id);
          }
        },
      });
    } else {
      // No changes, just exit
      if (typeof onExit === 'function') {
        onExit(selectedPage.id);
      }
    }
  }, [hasChanges, onExit, pageChanged, selectedPage, dispatchAppState]);

  const handleApply = useCallback(() => {
    // Raise the updated page object when applying changes
    pageChanged(selectedPage);
    dispatchAppState({ type: 'RESET_CHANGES' });
    message.success('Changes applied successfully!');
  }, [pageChanged, selectedPage, dispatchAppState]);

  const handleAbort = useCallback(() => {
    Modal.confirm({
      title: 'Confirm Abort',
      content: 'Are you sure you want to abort? All changes will be discarded.',
      okText: 'Yes, Abort',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        // Exit Xray view, discarding all changes
        if (typeof onExit === 'function') {
          onExit(selectedPage.id);
        }
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
  }, [onProceedToPom, pageChanged, selectedPage, dispatchAppState]);

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
        platform: currentPlatform, // Pass platform information
        debug: true, // Enable debug logging
        key: 'image-highlighter',
        className: 'tab-screenshot', // Add special class for screenshot tab
        isViewMode: viewMode // Pass view mode info
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
        // Pass the direct evaluate function for use with alternatives
        evaluateXPathDirectly: evaluateXPathStable,
        className: 'tab-locators', // Add special class for locators tab
        // For enhancing ElementCard
        showAlternatives: true,
        key: 'locator-list'
      }
    },
    {
      label: 'XML',
      component: XMLViewer,
      props: { 
        initialXml: pageXml,
        key: xmlKey, // This key is necessary for XML component reloading
        onXPathMatch: handleXPathMatch,
        className: 'tab-xml' // Add special class for XML tab
      }
    }
  ], [
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
        style={{
          width: '100%',
          maxWidth: viewMode === 'tabbed-view' ? 180 : 240,
          flexShrink: 1,
          fontSize: viewMode === 'tabbed-view' ? '12px' : 'inherit'
        }}
        size={viewMode === 'tabbed-view' ? 'small' : 'middle'}
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

    // Add XPath fix button (smaller in tabbed view)
    const xpathFixButton = (
      <XPathFixButton
        onClick={handleFixXPaths}
        failingCount={getFailingXPathCount()}
        loading={isFixingXPaths || isAnalyzing}
        size={viewMode === 'tabbed-view' ? 'small' : 'middle'}
      />
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
          <div style={{ display: 'flex', gap: viewMode === 'tabbed-view' ? '4px' : '8px' }}>
            {xpathFixButton}
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRegenerate}
              size={viewMode === 'tabbed-view' ? 'small' : 'middle'}
            >
              {viewMode === 'tabbed-view' ? 'Regen' : 'Regenerate Locators'}
            </Button>
            <Button
              icon={<CloseOutlined />}
              onClick={handleAbort}
              danger
              size={viewMode === 'tabbed-view' ? 'small' : 'middle'}
            >
              {viewMode === 'tabbed-view' ? 'Cancel' : 'Abort'}
            </Button>
            <Button
              icon={<RightOutlined />}
              onClick={handleProceed}
              type="primary"
              size={viewMode === 'tabbed-view' ? 'small' : 'middle'}
            >
              {viewMode === 'tabbed-view' ? 'To POM' : 'Proceed to POM'}
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
        <div style={{ display: 'flex', gap: viewMode === 'tabbed-view' ? '4px' : '8px' }}>
          {xpathFixButton}
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRegenerate}
            size={viewMode === 'tabbed-view' ? 'small' : 'middle'}
          >
            {viewMode === 'tabbed-view' ? 'Regen' : 'Regenerate Locators'}
          </Button>
          <Button
            icon={<SaveOutlined />}
            onClick={handleApply}
            disabled={!hasChanges}
            type="primary"
            style={{ flexShrink: 0 }}
            size={viewMode === 'tabbed-view' ? 'small' : 'middle'}
          >
            {viewMode === 'tabbed-view' ? 'Apply' : 'Apply Changes'}
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
    handleFixXPaths,
    hasChanges,
    viewMode,
    getFailingXPathCount,
    isFixingXPaths,
    isAnalyzing
  ]);

  // Store viewMode in window for use by child components
  if (typeof window !== 'undefined') {
    window.viewMode = viewMode;
  }

  // Different style when in tabbed-view mode to ensure proper height constraints
  const containerStyle = viewMode === 'tabbed-view'
    ? {
        height: '100%',
        width: '100%',
        display: 'flex',
        padding: '0px',
        flexDirection: 'column',
        overflow: 'hidden',
        maxHeight: '100%' // Ensure it doesn't exceed its container
      }
    : {
        height: '100%',
        width: '100%',
        display: 'flex',
        padding: '0px',
        flexDirection: 'column',
        overflow: 'hidden'
      };

  // Adjust header style in tabbed-view mode
  const headerStyle = viewMode === 'tabbed-view'
    ? {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '2px 4px', // Minimal padding
        marginBottom: '0px', // No margin
        minHeight: '28px', // Very reduced height
        maxHeight: '28px', // Constrained height
        flexShrink: 0,
        overflow: 'hidden',
        borderBottom: '1px solid #f0f0f0',
        fontSize: '12px' // Smaller font size
      }
    : {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px',
        marginBottom: '8px',
        minHeight: '48px',
        flexShrink: 0,
        overflow: 'hidden'
      };

  // Create a custom header renderer that uses our view-specific styles
  const renderHeaderWithStyle = () => {
    // Get the base header content from the original function
    const header = renderHeader();

    // If in tabbed view, apply our custom styling by wrapping the header
    if (viewMode === 'tabbed-view') {
      return (
        <div style={headerStyle}>
          {header.props.children}
        </div>
      );
    }

    // Otherwise return the original header
    return header;
  };

  return (
    <div
      id="resizable-tabs-container"
      style={containerStyle}
    >
      {renderHeaderWithStyle()}

      <div style={{
        flex: '1 1 auto',
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden',
        maxHeight: viewMode === 'tabbed-view' ? 'calc(100% - 28px)' : 'auto' // Adjust for smaller header height
      }}>
        <ResizableTabs
          tabs={tabsConfig}
          nestedMode={viewMode === 'tabbed-view'}
        />
      </div>
    </div>
  );
};

// Map Redux state to props
const mapStateToProps = (state) => ({
  isAnalyzing: state.ai?.isAnalyzing || false
});

// Map Redux actions to props
const mapDispatchToProps = {
  startXpathFixProcess
};

export default connect(mapStateToProps, mapDispatchToProps)(FinalResizableTabsContainer);