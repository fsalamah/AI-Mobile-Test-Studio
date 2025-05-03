import React, { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
// Import components locally but keep compatibility with the external interface
import ElementListHeader from './ElementListHeader';
import ElementsGroup from './ElementsGroup';
import ElementFormModal from './ElementFormModal';
import { groupElementsByState } from './elementUtils';

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

  // Custom setElements function that also triggers the event
  const updateElementsAndNotify = useCallback((newElements) => {
    setElements(newElements);
    // Always trigger the event when elements change
    if (onElementsChanged) {
      onElementsChanged([...newElements]);
    }
  }, [onElementsChanged]);

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

  // Effect to update elements when xpathState changes to COMPLETE
  useEffect(() => {
    if (xpathState?.status === 'COMPLETE' && xpathState.lastResult) {
      const { xpathExpression, numberOfMatches, isValid, matchingNodes } = xpathState.lastResult;
      
      // Find and update elements that match this XPath expression
      const updatedElements = elements.map(item => {
        if (
          item.xpath?.xpathExpression === xpathExpression && 
          item.stateId === currentStateId &&
          item.platform === currentPlatform
        ) {
          // Update this element with new evaluation results
          return {
            ...item,
            xpath: {
              ...item.xpath,
              numberOfMatches,
              isValid,
              matchingNodes
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

  // Submit form handler
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
        // Evaluate the new XPath expression immediately
        evaluateXPath && evaluateXPath(newElement.xpath.xpathExpression, result => {
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
        });
      }
      
      // Trigger element updated event
      onElementUpdated && onElementUpdated(newElement);
    } else {
      // Add new element and evaluate its XPath
      evaluateXPath && evaluateXPath(newElement.xpath.xpathExpression, result => {
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
      });
    }

    message.success(`Element ${isEdit ? 'updated' : 'added'} successfully!`);
    setIsModalVisible(false);
  };

  // Delete element handler
  const handleDelete = (element) => {
    const updatedElements = elements.filter(item => item.id !== element.id);
    
    // Update elements and notify
    updateElementsAndNotify(updatedElements);
    
    message.success('Element removed successfully!');
  };

  // Evaluate XPath handler
  const handleEvaluate = (element) => {
    message.info(`Evaluating XPath for ${element.devName}`);
    
    // First make sure we're looking at the right state and platform
    if (element.stateId !== currentStateId || element.platform !== currentPlatform) {
      // This will trigger a state change in the parent component
      onHandleEvaluate && onHandleEvaluate(element);
    } else {
      // We're already in the right state, just evaluate the XPath
      evaluateXPath && evaluateXPath(element.xpath.xpathExpression, result => {
        // Update this specific element with the evaluation results
        const elementWithResults = {
          ...element,
          xpath: {
            ...element.xpath,
            numberOfMatches: result.numberOfMatches,
            isValid: result.isValid,
            matchingNodes: result.matchingNodes || []
          }
        };
        
        // Update the elements list with the result
        const updatedElements = elements.map(item => 
          item.id === element.id ? elementWithResults : item
        );
        
        updateElementsAndNotify(updatedElements);
      });
    }
  };

  // View element handler
  const handleView = (element) => {
    // First make sure we're looking at the right state and platform
    if (element.stateId !== currentStateId || element.platform !== currentPlatform) {
      onHandleEvaluate && onHandleEvaluate(element);
    }
    
    // Then highlight the element's XPath
    if (element.xpath?.xpathExpression) {
      evaluateXPath && evaluateXPath(element.xpath.xpathExpression);
    }
    
    message.info(`Viewing ${element.devName}`);
  };

  // Handle inline edit updates
  const handleElementUpdated = (updatedElement, field) => {
    if (field === 'xpathExpression') {
      // Evaluate the new XPath immediately
      evaluateXPath && evaluateXPath(updatedElement.xpath.xpathExpression, result => {
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
                matchingNodes: result.matchingNodes || []
              }
            };
          }
          return item;
        });
        
        // Update elements and notify
        updateElementsAndNotify(updatedElements);
      });
    } else {
      // Update other fields
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
    // Import and use the fixSingleElementXPath function
    const { fixSingleElementXPath } = require('./integration');
    
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