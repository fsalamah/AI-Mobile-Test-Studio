import React, { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
// Import components locally but keep compatibility with the external interface
import ElementListHeader from './ElementListHeader';
import ElementsGroup from './ElementsGroup';
import ElementFormModal from './ElementFormModal';
import { groupElementsByState } from './elementUtils';
// Import integration module explicitly so it's bundled properly
import * as integrationModule from './integration';

// Import XPathManager singleton for direct reference management
import xpathManager from '../../Xray/XPathManager.js';
// Import notification manager to prevent duplicate notifications
import notificationManager from './notificationManager';

// Assuming this is declared elsewhere in your file
const stateLookup = {
  'id_m9s3pxws_ifjtb': 'Welcome Screen',
  'id_m9s3rx61_kh63v': 'Home Screen',
  // Add other state mappings as needed
};

/**
 * Main LocatorElementList Component
 * Container component that orchestrates all child components
 */
export const LocatorElementList = ({ 
  onXPathChange, 
  onHandleEvaluate, 
  onElementUpdated, 
  initialElements,
  onElementsChanged, // Prop for tracking all element changes
  xpathState, // Add xpathState to track evaluation status
  matchedNodes, // Add matchedNodes to track current matched nodes
  currentStateId, // Current state ID for filtering relevant elements
  currentPlatform, // Current platform for filtering relevant elements
  evaluateXPath // Direct access to the XPath evaluation function
}) => {
  // Ensure elements is always initialized as an array
  const [elements, setElements] = useState(initialElements || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingElement, setEditingElement] = useState(null);
  
  // Grouped and sorted elements state
  const [groupedElements, setGroupedElements] = useState({});
  const [sortedStateIds, setSortedStateIds] = useState([]);
  
  // Custom setElements function that also triggers the event
  const updateElementsAndNotify = useCallback((newElements) => {
    setElements(newElements);
    // Always trigger the event when elements change
    if (onElementsChanged) {
      onElementsChanged([...newElements]);
    }
  }, [onElementsChanged]);

  // Platform options
  const platformOptions = [
    { label: 'iOS', value: 'ios' },
    { label: 'Android', value: 'android' }
  ];

  // State options based on stateLookup
  const stateOptions = Object.entries(stateLookup).map(([id, name]) => ({
    label: name,
    value: id
  }));

  // Update elements when initialElements prop changes
  useEffect(() => {
    if (initialElements && JSON.stringify(initialElements) !== JSON.stringify(elements)) {
      setElements(initialElements);
    }
  }, [initialElements, elements]);
  

  // Set up listeners for XPathManager updates
  useEffect(() => {
    // Add a listener to the XPathManager to receive updates
    const unsubscribe = xpathManager.addListener((eventType, data) => {
      if (eventType === 'evaluationComplete') {
        // Handle XPath evaluation results coming from the manager
        const { result, xpathExpression, elementId } = data;
        
        // Only update the specific element that requested the evaluation
        if (elementId) {
          // Find the element by ID
          const targetElement = elements.find(item => item.id === elementId);
          
          if (targetElement) {
            // Update only this element with the evaluation results
            const updatedElements = elements.map(item => {
              if (item.id === elementId) {
                // Display result
                if (result.numberOfMatches > 0) {
                  message.success(`Found ${result.numberOfMatches} match${result.numberOfMatches !== 1 ? 'es' : ''}`);
                } else {
                  message.error(`No matches found for ${xpathExpression}`);
                }
                
                return {
                  ...item,
                  xpath: {
                    ...item.xpath,
                    numberOfMatches: result.numberOfMatches,
                    isValid: result.isValid,
                    matchingNodes: result.matchingNodes || [],
                    _isEvaluating: false // Clear evaluation flag
                  }
                };
              }
              return item;
            });
            
            // Update element state
            updateElementsAndNotify(updatedElements);
          }
        }
      } 
      else if (eventType === 'evaluationError') {
        // Handle evaluation errors
        const { error, elementId } = data;
        
        if (elementId) {
          // Find and update the element with error state
          const updatedElements = elements.map(item => {
            if (item.id === elementId) {
              message.error(`Error evaluating XPath: ${error}`);
              
              return {
                ...item,
                xpath: {
                  ...item.xpath,
                  numberOfMatches: 0,
                  isValid: false,
                  error: error,
                  _isEvaluating: false // Clear evaluation flag
                }
              };
            }
            return item;
          });
          
          // Update element state
          updateElementsAndNotify(updatedElements);
        }
      }
    });
    
    // Cleanup
    return () => {
      unsubscribe(); // Remove the listener when component unmounts
    };
  }, [elements, updateElementsAndNotify]);


  // Initial trigger of onElementsChanged with initial elements
  useEffect(() => {
    if (onElementsChanged && initialElements) {
      onElementsChanged([...initialElements]);
    }
  }, [onElementsChanged, initialElements]);

  // Group elements by state and sort
  useEffect(() => {
    const { groupedElements, sortedStateIds } = groupElementsByState(
      elements, 
      searchTerm, 
      stateLookup
    );
    
    setGroupedElements(groupedElements);
    setSortedStateIds(sortedStateIds);
  }, [elements, searchTerm]);

  // Reset notification tracking when platform or state changes
  useEffect(() => {
    // When platform or state changes, reset notification tracking
    notificationManager.resetAll();
  }, [currentStateId, currentPlatform]);

  // Effect to update elements when xpathState changes
  useEffect(() => {
    // Handle COMPLETE state
    if (xpathState?.status === 'COMPLETE' && xpathState.lastResult) {
      const { xpathExpression, numberOfMatches, isValid, matchingNodes } = xpathState.lastResult;
      
      // Find and update elements that match this XPath expression
      const updatedElements = elements.map(item => {
        if (
          item.xpath?.xpathExpression === xpathExpression && 
          item.stateId === currentStateId &&
          item.platform === currentPlatform
        ) {
          // Update this element with new evaluation results and clear loading state
          return {
            ...item,
            xpath: {
              ...item.xpath,
              numberOfMatches,
              isValid,
              matchingNodes,
              isEvaluating: false // Clear processing flag when complete
            }
          };
        }
        // Also clear any element that's still in evaluating state for this XPath
        else if (item.xpath?.isEvaluating && item.xpath?.xpathExpression === xpathExpression) {
          return {
            ...item,
            xpath: {
              ...item.xpath,
              isEvaluating: false // Clear any stale loading states
            }
          };
        }
        return item;
      });
      
      // Update elements only if there's a change
      if (JSON.stringify(updatedElements) !== JSON.stringify(elements)) {
        updateElementsAndNotify(updatedElements);
      }
    }
    // Handle ERROR state - make sure to clear loading states
    else if (xpathState?.status === 'ERROR') {
      // Clear all loading states in case of error
      const clearedElements = elements.map(item => {
        if (item.xpath?.isEvaluating) {
          return {
            ...item,
            xpath: {
              ...item.xpath,
              isEvaluating: false,
              error: xpathState.error || "Evaluation failed"
            }
          };
        }
        return item;
      });
      
      // Update if there are any elements with loading states
      if (JSON.stringify(clearedElements) !== JSON.stringify(elements)) {
        updateElementsAndNotify(clearedElements);
      }
    }
  }, [xpathState, currentStateId, currentPlatform, elements, updateElementsAndNotify]);

  // Search term change handler
  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  // Show modal for add/edit
  const showModal = (isEdit = false, element = null) => {
    setEditMode(isEdit);
    setEditingElement(element);
    setIsModalVisible(true);
  };

  // Cancel modal
  const handleCancel = () => {
    setIsModalVisible(false);
  };

  // Submit form handler using XPathManager for direct XPath evaluation
  const handleSubmit = (newElement, isEdit) => {
    if (isEdit) {
      // Update existing element
      const updatedElements = elements.map(item => 
        item.id === newElement.id ? newElement : item
      );
      
      // Update elements and notify
      updateElementsAndNotify(updatedElements);
      
      // Trigger xpath change event if xpath was modified
      if (editingElement?.xpath?.xpathExpression !== newElement.xpath.xpathExpression) {
        // Evaluate the new XPath expression immediately using XPathManager
        const result = xpathManager.evaluateXPath(newElement.xpath.xpathExpression);
        
        // Update the element with the evaluation results
        const elementWithResults = {
          ...newElement,
          xpath: {
            ...newElement.xpath,
            numberOfMatches: result.numberOfMatches,
            isValid: result.isValid,
            matchingNodes: result.matchingNodes || []
          }
        };
        
        // Update the elements list with the latest results
        const updatedElementsWithResults = elements.map(item => 
          item.id === elementWithResults.id ? elementWithResults : item
        );
        
        updateElementsAndNotify(updatedElementsWithResults);
        
        // Notify parent that a XPath has changed (for highlighting)
        onXPathChange && onXPathChange(newElement.xpath.xpathExpression);
      }
      
      // Trigger element updated event
      onElementUpdated && onElementUpdated(newElement);
    } else {
      // Add new element and evaluate its XPath using XPathManager
      const result = xpathManager.evaluateXPath(newElement.xpath.xpathExpression);
      
      const newElementWithResults = {
        ...newElement,
        xpath: {
          ...newElement.xpath,
          numberOfMatches: result.numberOfMatches,
          isValid: result.isValid,
          matchingNodes: result.matchingNodes || []
        }
      };
      
      // Add the new element with evaluation results
      const updatedElements = [...elements, newElementWithResults];
      updateElementsAndNotify(updatedElements);
      
      // Trigger element updated event for new element
      onElementUpdated && onElementUpdated(newElementWithResults);
      
      // Notify parent that a XPath has changed (for highlighting)
      onXPathChange && onXPathChange(newElement.xpath.xpathExpression);
    }

    notificationManager.success(`Element ${isEdit ? 'updated' : 'added'} successfully!`, message);
    setIsModalVisible(false);
  };

  // Delete element handler
  const handleDelete = (element) => {
    const updatedElements = elements.filter(item => item.id !== element.id);
    
    // Update elements and notify
    updateElementsAndNotify(updatedElements);
    
    notificationManager.success('Element removed successfully!', message);
  };

  // XPath evaluation using centralized evaluation with split loading/evaluation phases
  const handleEvaluate = (element) => {
    console.log("🚀 EVALUATE: Starting evaluation for element", element.devName);
    console.log(`Element platform: ${element.platform}, stateId: ${element.stateId}`);
    console.log(`Current platform: ${currentPlatform}, stateId: ${currentStateId}`);
    
    // First make sure we're looking at the right state and platform
    if (element.stateId !== currentStateId || element.platform !== currentPlatform) {
      console.log("⚠️ Platform/state mismatch - triggering state change");
      
      // This will trigger a state change in the parent component
      onHandleEvaluate && onHandleEvaluate(element);
      // We'll exit and wait for state change to complete before evaluating
      return;
    }
    
    // Get the XPath expression we need to evaluate
    const xpathExpression = element.xpath?.xpathExpression;
    if (!xpathExpression) {
      notificationManager.error("No XPath expression available", message);
      return;
    }
    
    console.log(`📋 XPath to evaluate: ${xpathExpression}`);
    console.log(`📱 Element platform: ${element.platform}`);
    
    // Set loading state and preserve existing match count 
    const updatedElementWithLoading = {
      ...element,
      // Reset notification shown flag to ensure we can show a notification for this evaluation
      _notificationShown: false,
      xpath: {
        ...element.xpath,
        _isEvaluating: true,
        _evaluationStartTime: Date.now(), // Add timestamp to track when evaluation started
        _silentUpdate: false, // Reset silent update flag
        // Keep the existing count in UI while evaluating to avoid flickering
        // Only use -1 if we don't already have a count
        _previousMatchCount: element.xpath?.numberOfMatches,
        numberOfMatches: element.xpath?.numberOfMatches !== undefined ? 
          element.xpath.numberOfMatches : -1
      }
    };
    
    // Update the element's state to indicate evaluation is in progress
    const elementsWithLoading = elements.map(item => 
      item.id === element.id ? updatedElementWithLoading : item
    );
    updateElementsAndNotify(elementsWithLoading);
    
    try {
      console.log("📊 Current XPathManager state:");
      console.log(`XML source exists: ${!!xpathManager.getXmlSource()}`);
      
      // PHASE 1: Ensure XML source is loaded and valid
      if (!xpathManager.getXmlSource()) {
        console.log("⚠️ NO XML SOURCE AVAILABLE - forcing refresh");
        // Force a state refresh even if we're on the right state/platform
        onHandleEvaluate && onHandleEvaluate(element, true);
        
        // We'll retry after a short delay to allow XML loading
        setTimeout(() => {
          console.log("🔄 Retrying evaluation after refresh");
          handleEvaluate(element);
        }, 500);
        return;
      }
      
      // Check if XML source is valid (not empty and matches expected format)
      const xmlSource = xpathManager.getXmlSource();
      if (!xmlSource || xmlSource.length < 100 || !xmlSource.includes("<")) {
        console.log("⚠️ XML SOURCE INVALID OR INCOMPLETE - forcing refresh");
        onHandleEvaluate && onHandleEvaluate(element, true);
        
        setTimeout(() => {
          console.log("🔄 Retrying evaluation after refresh");
          handleEvaluate(element);
        }, 500);
        return;
      }
      
      console.log(`✅ XML source loaded and valid (${xmlSource.length} chars)`);
      
      // PHASE 2: Ensure proper platform context before evaluation
      console.log("🔧 Setting XML source with current context");
      xpathManager.setXmlSource(
        xmlSource, 
        currentStateId, 
        element.platform
      );
      
      // PHASE 3: Directly evaluate XPath - with special handling for same-state evaluations
      // This critical step ensures the element gets updated regardless of parent component events
      console.log("🔍 Performing direct evaluation to ensure result");
      
      // Check if we're evaluating in the current state/platform that's already displayed
      const isSameStateAndPlatform = element.stateId === currentStateId && 
                                    element.platform === currentPlatform;
      
      console.log(`📊 Evaluation context: Same state/platform? ${isSameStateAndPlatform}`);
      
      // When in same state/platform, do a COMPLETE evaluation ourselves first
      // This ensures the element card gets updated even if other events get lost
      const directResult = xpathManager.evaluateXPath(xpathExpression, {
        elementId: element.id,
        elementPlatform: element.platform,
        // Critical: For same-state evaluations, do full highlighting here directly
        // This fixes the issue where the count gets stuck on loading
        highlight: isSameStateAndPlatform 
      });
      
      console.log(`⚡ Direct evaluation result: ${directResult.numberOfMatches} matches`);
      
      // Immediately update element with the result to ensure UI is updated
      if (isSameStateAndPlatform) {
        console.log(`🚀 SAME-STATE EVALUATION: Immediately updating element with result`);
        
        const updatedElement = {
          ...element,
          xpath: {
            ...element.xpath,
            numberOfMatches: directResult.numberOfMatches,
            isValid: directResult.isValid,
            matchingNodes: directResult.matchingNodes || [],
            _isEvaluating: false,
            _lastUpdateTime: Date.now()
          }
        };
        
        // Update elements state directly
        const updatedElements = elements.map(item => 
          item.id === element.id ? updatedElement : item
        );
        
        // Update UI immediately
        updateElementsAndNotify(updatedElements);
        
        // Show result message - using notification manager
        // to prevent duplicate notifications
        if (directResult.numberOfMatches > 0) {
          notificationManager.success(
            `Found ${directResult.numberOfMatches} match${directResult.numberOfMatches !== 1 ? 'es' : ''}`,
            message
          );
        } else {
          notificationManager.error(
            `No matches found for ${xpathExpression}`,
            message
          );
        }
        
        // Set a flag to prevent duplicate notifications
        element._notificationShown = true;
      }
      
      // PHASE 4: Now delegate to parent for highlighting and full evaluation
      // We still delegate to the parent component to ensure proper highlight rendering
      // even for same-state evaluations
      console.log("📤 Delegating to parent for centralized evaluation");
      onXPathChange && onXPathChange(xpathExpression, { 
        elementId: element.id,
        elementPlatform: element.platform,
        // Tell parent this is a same-state evaluation
        isSameStateEvaluation: isSameStateAndPlatform
      });
      
      // If after 1 second we still haven't received an update, force update the element
      // This is a fallback to ensure we don't get stuck in "evaluating" state
      setTimeout(() => {
        // Check if element is still in evaluating state
        const currentElements = elements.find(e => e.id === element.id);
        if (currentElements?.xpath?._isEvaluating) {
          console.log(`⚠️ TIMEOUT: Element still in evaluating state after 1s, forcing update`);
          
          // Force update with direct result
          const updatedElement = {
            ...element,
            xpath: {
              ...element.xpath,
              numberOfMatches: directResult.numberOfMatches,
              isValid: directResult.isValid,
              matchingNodes: directResult.matchingNodes || [],
              _isEvaluating: false,
              _lastUpdateTime: Date.now()
            }
          };
          
          const updatedElements = elements.map(item => 
            item.id === element.id ? updatedElement : item
          );
          updateElementsAndNotify(updatedElements);
          
          // Show message to user via notification manager
          notificationManager.success(`Found ${directResult.numberOfMatches} match${directResult.numberOfMatches !== 1 ? 'es' : ''}`, message);
        }
      }, 1000);
      
      console.log(`🔎 Evaluation initiated for element ID ${element.id} with platform ${element.platform}`);
      
    } catch (error) {
      console.error("❌ Error initiating XPath evaluation:", error);
      notificationManager.error(`Error initiating XPath evaluation: ${error.message}`, message);
      
      // Clear loading state on error
      const elementWithError = {
        ...element,
        xpath: {
          ...element.xpath,
          numberOfMatches: 0,
          isValid: false,
          error: error.message,
          _isEvaluating: false // Clear evaluation flag
        }
      };
      
      const updatedElements = elements.map(item => 
        item.id === element.id ? elementWithError : item
      );
      updateElementsAndNotify(updatedElements);
    }
  };

  // View element handler using XPathManager
  const handleView = (element) => {
    console.log(`🔍 VIEW: Starting view operation for element ${element.devName}`);
    
    // First make sure we're looking at the right state and platform
    if (element.stateId !== currentStateId || element.platform !== currentPlatform) {
      console.log(`🔄 State/platform mismatch - switching context before evaluation`);
      onHandleEvaluate && onHandleEvaluate(element);
      return; // Exit early - will be called again after context switch
    }
    
    // Set loading state for UI feedback
    const updatedElementWithLoading = {
      ...element,
      xpath: {
        ...element.xpath,
        _isEvaluating: true,
        // Keep the existing count while evaluating
        _previousMatchCount: element.xpath?.numberOfMatches,
        numberOfMatches: element.xpath?.numberOfMatches !== undefined ? 
          element.xpath.numberOfMatches : -1
      }
    };
    
    // Update the element's state to indicate evaluation is in progress
    const elementsWithLoading = elements.map(item => 
      item.id === element.id ? updatedElementWithLoading : item
    );
    updateElementsAndNotify(elementsWithLoading);
    
    // Then highlight the element's XPath
    if (element.xpath?.xpathExpression) {
      console.log(`📊 Evaluating XPath for view: ${element.xpath.xpathExpression}`);
      
      try {
        // Use XPathManager to evaluate and notify for highlighting
        // Include platform information for proper evaluation context
        const result = xpathManager.evaluateXPath(element.xpath.xpathExpression, {
          elementId: element.id,
          elementPlatform: element.platform
        });
        
        console.log(`✅ XPath evaluation result: ${result.numberOfMatches} matches`);
        
        // Update the element with the evaluation results - ensuring the card badge shows the count
        const updatedElement = {
          ...element,
          xpath: {
            ...element.xpath,
            numberOfMatches: result.numberOfMatches,
            isValid: result.isValid,
            matchingNodes: result.matchingNodes || [],
            _isEvaluating: false, // Clear evaluation flag
            _lastUpdateTime: Date.now() // Track when we last updated this element
          }
        };
        
        // Update elements with the correct match count
        const updatedElements = elements.map(item => 
          item.id === element.id ? updatedElement : item
        );
        updateElementsAndNotify(updatedElements);
        
        // Also notify parent component for highlighting
        onXPathChange && onXPathChange(element.xpath.xpathExpression, {
          elementId: element.id,
          elementPlatform: element.platform
        });
        
        // Only show notifications if this is not a silent update
        if (!element.xpath?._silentUpdate) {
          // Use notification manager to prevent duplicates
          if (result.numberOfMatches > 0) {
            notificationManager.success(
              `Found ${result.numberOfMatches} match${result.numberOfMatches !== 1 ? 'es' : ''}`, 
              message
            );
          } else {
            notificationManager.warning(
              `No matches found for ${element.devName}`,
              message
            );
          }
        }
      } catch (error) {
        console.error(`❌ Error evaluating XPath during view:`, error);
        message.error(`Error evaluating: ${error.message || "Unknown error"}`);
        
        // Update element with error state
        const elementWithError = {
          ...element,
          xpath: {
            ...element.xpath,
            numberOfMatches: 0,
            isValid: false,
            error: error.message,
            _isEvaluating: false // Clear evaluation flag
          }
        };
        
        const updatedElements = elements.map(item => 
          item.id === element.id ? elementWithError : item
        );
        updateElementsAndNotify(updatedElements);
      }
    } else {
      notificationManager.warning(`No XPath expression for ${element.devName}`, message);
    }
  };

  // Handle element inline edit updates using XPathManager
  const handleElementUpdated = (updatedElement, field) => {
    console.log(`Element updated: ${updatedElement.devName}, field: ${field}`);
    
    if (field === 'xpathExpression') {
      // For XPath changes, handle evaluation and UI updates together
      // Evaluate the new XPath immediately using XPathManager
      const result = xpathManager.evaluateXPath(updatedElement.xpath.xpathExpression, {
        elementId: updatedElement.id,
        elementPlatform: updatedElement.platform
      });
      
      // Update the element with the evaluation results and the new XPath
      const updatedElements = elements.map(item => {
        if (item.id === updatedElement.id) {
          return {
            ...item,
            xpath: {
              ...item.xpath,
              xpathExpression: updatedElement.xpath.xpathExpression,
              numberOfMatches: result.numberOfMatches,
              isValid: result.isValid,
              matchingNodes: result.matchingNodes || [],
              _lastUpdateTime: Date.now() // Track update time
            }
          };
        }
        return item;
      });
      
      // Update elements and notify - this updates the UI in a single batch
      updateElementsAndNotify(updatedElements);
      
      // Notify parent that XPath has changed (for highlighting)
      onXPathChange && onXPathChange(updatedElement.xpath.xpathExpression, {
        elementId: updatedElement.id,
        elementPlatform: updatedElement.platform
      });
    } 
    else if (field === 'consolidated' || field === 'highlight' || field === 'self_fix') {
      // For updates from highlighting, consolidated events, or self-fixes,
      // make sure we don't trigger additional evaluations
      console.log(`🔄 Processing special update type: ${field} for element ${updatedElement.devName}`);
      
      // Important: always clear evaluation state to prevent stuck badges
      const finalElement = {
        ...updatedElement,
        xpath: {
          ...updatedElement.xpath,
          _isEvaluating: false // Force clear evaluation state
        }
      };
      
      const updatedElements = elements.map(item => {
        if (item.id === updatedElement.id) {
          return finalElement;
        }
        return item;
      });
      
      // For self-fixes, use the regular update method to ensure full UI updates
      if (field === 'self_fix') {
        console.log(`🔧 Self-fix update: updating UI for ${updatedElement.devName}`);
        updateElementsAndNotify(updatedElements);
      } else {
        // For other special events, update silently
        console.log(`🔄 Silent update for ${field} event: ${updatedElement.devName}`);
        setElements(updatedElements);
      }
    }
    else {
      // For other field updates (like devName)
      const updatedElements = elements.map(item => {
        if (item.id === updatedElement.id) {
          return updatedElement;
        }
        return item;
      });
      
      // Update elements and notify
      updateElementsAndNotify(updatedElements);
      
      // Trigger element updated event
      onElementUpdated && onElementUpdated(updatedElement);
    }
  };

  // Fix XPath for a single element
  const handleFixXPath = (element) => {
    try {
      // Use the pre-imported integration module
      const { fixSingleElementXPath } = integrationModule;
      
      // Call the fix function for this element
      fixSingleElementXPath(element, elements, {
        states: [{
          id: currentStateId,
          versions: {
            [currentPlatform]: {
              // We don't have direct access to the page data here,
              // but the integration function will handle the state retrieval
            }
          }
        }]
      }, (updatedElements) => {
        // Update elements with the fixed XPath
        updateElementsAndNotify(updatedElements);
      });
    } catch (error) {
      console.error("Error fixing XPath:", error);
      notificationManager.error("Failed to fix XPath: " + (error.message || "Unknown error"), message);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '8px', 
      overflowY:'scroll', 
      maxHeight:'100%', 
      padding:'8px'
    }}>
      {/* Header with search and add button */}
      <ElementListHeader 
        searchTerm={searchTerm}
        onSearchChange={handleSearch}
        onAddClick={() => showModal(false)}
      />

      {/* Empty state */}
      {sortedStateIds.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          No elements found
        </div>
      )}

      {/* Element groups by state */}
      {sortedStateIds.map(stateId => (
        <ElementsGroup
          key={stateId}
          stateId={stateId}
          stateName={stateLookup[stateId] || stateId}
          elements={groupedElements[stateId]}
          currentStateId={currentStateId}
          currentPlatform={currentPlatform}
          xpathState={xpathState}
          onEdit={(element) => showModal(true, element)}
          onDelete={handleDelete}
          onEvaluate={handleEvaluate}
          onView={handleView}
          onElementUpdated={handleElementUpdated}
          allElements={elements}
          onFixXPath={handleFixXPath}
        />
      ))}

      {/* Add/Edit Modal */}
      <ElementFormModal
        visible={isModalVisible}
        editMode={editMode}
        editingElement={editingElement}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        onXPathChange={onXPathChange}
        elements={elements}
        platformOptions={platformOptions}
        stateOptions={stateOptions}
        currentPlatform={currentPlatform}
        currentStateId={currentStateId}
      />
    </div>
  );
};

export default LocatorElementList;