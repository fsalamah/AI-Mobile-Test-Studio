// elementUtils.js - Utility functions for element management

/**
 * Get match status color and text for visual indication
 * @param {number} numberOfMatches - Number of XPath matches
 * @returns {Object} - Color and text for status display
 */
export const getMatchStatus = (numberOfMatches) => {
    if (numberOfMatches === undefined || numberOfMatches === null) return { color: '#f5222d', text: '0' };
    if (numberOfMatches === 0) return { color: '#f5222d', text: '0' };
    if (numberOfMatches === 1) return { color: '#52c41a', text: '1' }; // Green for exact match
    return { color: '#faad14', text: numberOfMatches.toString() }; // Yellow/warning for multiple matches
  };
  
  /**
   * Get platform icon style based on platform
   * @param {string} platform - 'ios' or 'android'
   * @returns {Object} - Style object for platform icon
   */
  export const getPlatformIconStyle = (platform) => {
    return {
      fontSize: '12px', 
      width: '16px',
      color: platform === 'ios' ? '#000000' : '#3ddc84' // Black for iOS, Green for Android
    };
  };
  
  /**
   * Validate uniqueness of element within collection
   * @param {Object} element - Element to validate
   * @param {string} field - Field to check uniqueness for
   * @param {string} value - New value to validate
   * @param {Array} elements - Collection of all elements
   * @param {string} [currentElementId] - ID of element being edited (to exclude from check)
   * @returns {boolean} - True if valid, throws error if invalid
   */
  export const validateElementUniqueness = (element, field, value, elements, currentElementId) => {
    if (field === 'devName') {
      // Check uniqueness for devName + platform combination
      const isDuplicate = elements.some(
        item => item.devName === value && 
                item.platform === element.platform && 
                (!currentElementId || item.id !== currentElementId)
      );
      
      if (isDuplicate) {
        throw new Error(`The combination of devName and platform must be unique. "${value}" already exists for ${element.platform}.`);
      }
    }
    
    return true;
  };
  
  /**
   * Group elements by state ID and sort
   * @param {Array} elements - Array of elements to group
   * @param {string} searchTerm - Search term to filter elements
   * @param {Object} stateLookup - State ID to display name mapping
   * @returns {Object} - Grouped elements and sorted state IDs
   */
  export const groupElementsByState = (elements, searchTerm, stateLookup) => {
    // Additional protection to ensure elements is always an array before spreading
    const elementsToProcess = Array.isArray(elements) ? [...elements] : [];
    
    // Apply search filtering if needed
    const filteredElements = !searchTerm.trim() ? elementsToProcess : elementsToProcess.filter(element => {
      const lowercasedSearch = searchTerm.toLowerCase();
      return (
        element.devName?.toLowerCase().includes(lowercasedSearch) ||
        element.name?.toLowerCase().includes(lowercasedSearch) ||
        element.value?.toLowerCase().includes(lowercasedSearch) ||
        element.description?.toLowerCase().includes(lowercasedSearch) ||
        element.xpath?.xpathExpression?.toLowerCase().includes(lowercasedSearch) ||
        stateLookup[element.stateId]?.toLowerCase().includes(lowercasedSearch)
      );
    });
    
    // Group elements by stateId
    const grouped = {};
    filteredElements.forEach(element => {
      if (!grouped[element.stateId]) {
        grouped[element.stateId] = [];
      }
      grouped[element.stateId].push(element);
    });
    
    // Sort elements by devName within each state group
    Object.keys(grouped).forEach(stateId => {
      grouped[stateId].sort((a, b) => 
        (a.devName || '').toLowerCase().localeCompare((b.devName || '').toLowerCase())
      );
    });
    
    // Sort state IDs alphabetically by their display names
    const sortedIds = Object.keys(grouped).sort((a, b) => {
      const nameA = stateLookup[a] || a;
      const nameB = stateLookup[b] || b;
      return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
    });
    
    return { groupedElements: grouped, sortedStateIds: sortedIds };
  };
  
  /**
   * Create a new element object
   * @param {Object} values - Form values
   * @param {Object} [existingElement] - Existing element for edit mode
   * @returns {Object} - New element object
   */
  export const createElementObject = (values, existingElement = null) => {
    return {
      id: existingElement?.id || `element_${Date.now()}`, // Ensure we have a unique ID
      devName: values.devName,
      value: values.value,
      name: values.name,
      description: values.description,
      stateId: values.stateId,
      platform: values.platform,
      xpath: {
        xpathExpression: values.xpathExpression,
        numberOfMatches: existingElement?.xpath ? existingElement.xpath.numberOfMatches : 0,
        matchingNodes: existingElement?.xpath ? existingElement.xpath.matchingNodes : [],
        isValid: existingElement?.xpath ? existingElement.xpath.isValid : false
      }
    };
  };