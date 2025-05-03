/**
 * XPathManager.js
 * 
 * A singleton manager for XPath evaluations that provides direct access
 * and synchronization between components.
 */
import xpath from 'xpath';
import { DOMParser, XMLSerializer } from 'xmldom';

// Create a singleton that will be shared across components
/**
 * XPathManager
 * 
 * Centralized manager for XPath evaluations with unified event handling
 */
class XPathManager {
  constructor() {
    this.xmlSource = '';
    this.currentStateId = '';
    this.currentPlatform = '';
    this.listeners = [];
    this.xmlDocCache = new Map();
    this.lastEvaluationResults = new Map();
    this.activeEvaluations = new Set(); // Track elements currently being evaluated
    this.xmlDoc = null; // Parsed XML document
    this.highlightedNodes = []; // Currently highlighted nodes
  }

  /**
   * Set the current XML source and metadata
   */
  setXmlSource(xmlSource, stateId, platform) {
    this.xmlSource = xmlSource;
    this.currentStateId = stateId;
    this.currentPlatform = platform;
    
    // Clear evaluation cache when XML changes
    this.lastEvaluationResults.clear();
    
    // Parse the XML document once
    if (xmlSource) {
      try {
        this.xmlDoc = new DOMParser().parseFromString(xmlSource, 'text/xml');
        this.xmlDocCache.clear(); // Clear cache since we have a new document
        this.xmlDocCache.set(xmlSource, this.xmlDoc);
      } catch (error) {
        console.error("Error parsing XML:", error);
        this.xmlDoc = null;
      }
    } else {
      this.xmlDoc = null;
    }
    
    // Notify listeners of XML change
    this.notifyListeners('xmlChanged', { 
      xmlSource, 
      stateId, 
      platform, 
      xmlDoc: this.xmlDoc 
    });
    
    // Clear highlighted nodes when XML changes
    this.clearHighlights();
  }
  
  /**
   * Clear all highlighted nodes
   */
  clearHighlights() {
    this.highlightedNodes = [];
    this.notifyListeners('highlightsChanged', { 
      nodes: [], 
      xpathExpression: '' 
    });
  }

  /**
   * Get the current XML source
   */
  getXmlSource() {
    return this.xmlSource;
  }

  /**
   * Centralized evaluation method - all XPath evaluations should go through this
   * @param {Object} options - Evaluation options
   * @param {string} options.xpathExpression - XPath expression to evaluate
   * @param {string} [options.elementId] - ID of element requesting evaluation
   * @param {string} [options.elementPlatform] - Platform of element (ios/android)
   * @param {boolean} [options.highlight=true] - Whether to highlight matching nodes
   * @param {boolean} [options.updateUI=true] - Whether to update UI components
   * @returns {Object} - Evaluation result
   */
  centralizedEvaluate(options) {
    console.log("╔══════════════════════════════════════════════════════");
    console.log("║ XPATH EVALUATION: Starting centralized evaluation");
    console.log("╠══════════════════════════════════════════════════════");
    
    const { 
      xpathExpression, 
      elementId = null, 
      elementPlatform = null,
      highlight = true, 
      updateUI = true 
    } = options;
    
    console.log(`║ 📝 Expression: ${xpathExpression}`);
    console.log(`║ 🆔 Element ID: ${elementId || 'none'}`);
    console.log(`║ 🔍 Highlight: ${highlight}`);
    console.log(`║ 🖥️ Update UI: ${updateUI}`);
    console.log(`║ 📱 Element Platform: ${elementPlatform || 'not specified'}`);
    console.log(`║ 📱 Manager Platform: ${this.currentPlatform}`);
    console.log(`║ 🏠 Current State ID: ${this.currentStateId}`);
    console.log(`║ 🏠 XML Doc exists: ${!!this.xmlDoc}`);
    console.log(`║ 🏠 XML source length: ${this.xmlSource?.length || 0}`);
    
    if (!xpathExpression || !this.xmlDoc) {
      console.log(`║ ⚠️ Empty expression or no XML doc - returning empty result`);
      // Clear highlights if requested
      if (highlight) {
        this.clearHighlights();
      }
      
      // Return empty result
      const emptyResult = {
        xpathExpression,
        numberOfMatches: 0,
        matchingNodes: [],
        isValid: false,
        success: false
      };
      
      // Notify listeners about the evaluation
      if (updateUI) {
        console.log(`║ 📢 Notifying listeners about empty result`);
        this.notifyListeners('evaluationComplete', {
          result: emptyResult,
          xpathExpression,
          elementId,
          highlight
        });
      }
      
      console.log("╚══════════════════════════════════════════════════════");
      return emptyResult;
    }
    
    // Prevent duplicate evaluations
    if (elementId && this.activeEvaluations.has(elementId)) {
      console.log(`║ ⚠️ Element ${elementId} is already being evaluated, skipping`);
      const inProgressResult = {
        xpathExpression,
        numberOfMatches: -1,
        matchingNodes: [],
        isValid: false,
        inProgress: true,
        success: false
      };
      console.log("╚══════════════════════════════════════════════════════");
      return inProgressResult;
    }
    
    // Track active evaluations
    if (elementId) {
      console.log(`║ 🔄 Adding element ${elementId} to active evaluations`);
      this.activeEvaluations.add(elementId);
    }
    
    // Get platform for context-aware evaluation
    const platform = elementPlatform || this.currentPlatform;
    console.log(`║ 📱 Using platform for evaluation: ${platform}`);
    
    // Create a platform-aware cache key
    const cacheKey = `${this.currentStateId}:${platform}:${xpathExpression}`;
    console.log(`║ 🔑 Cache key: ${cacheKey}`);
    let result;
    
    try {
      // Try to use cache first
      if (this.lastEvaluationResults.has(cacheKey)) {
        result = this.lastEvaluationResults.get(cacheKey);
        console.log(`║ 🗄️ CACHE HIT: Using cached result with ${result.numberOfMatches} matches`);
      } else {
        console.log(`║ 🔎 EVALUATING: Running XPath expression against XML`);
        // Evaluate the XPath
        const nodes = xpath.select(xpathExpression, this.xmlDoc);
        const serializer = new XMLSerializer();
        
        console.log(`║ 🎯 FOUND: ${nodes.length} matching nodes`);
        
        // Collect the nodes and serialize - ensuring each node is properly serialized
        const nodeDetails = [];
        const matchingSerializedNodes = [];
        
        // Process each node regardless of platform
        for (let i = 0; i < nodes.length; i++) {
          try {
            const node = nodes[i];
            console.log(`║ 📄 NODE ${i}:`);
            console.log(`║   Type: ${node.nodeType}`);
            if (node.nodeName) console.log(`║   Name: ${node.nodeName}`);
            
            // For element nodes, log attributes
            if (node.nodeType === 1) {
              console.log(`║   Attributes:`, 
                Array.from(node.attributes || [])
                .map(attr => `${attr.name}="${attr.value}"`)
                .join(', ')
              );
            }
            
            const serializedNode = serializer.serializeToString(node);
            matchingSerializedNodes.push(serializedNode);
            
            // Store additional node data for highlighting - we need to properly extract bounds
            const boundsData = {};
            
            // Extract Android bounds from bounds attribute
            if (node.getAttribute && node.getAttribute('bounds')) {
              const boundsAttr = node.getAttribute('bounds');
              console.log(`║   📱 ANDROID: Found bounds attribute: ${boundsAttr}`);
              const match = boundsAttr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
              if (match) {
                const [_, x1, y1, x2, y2] = match.map(Number);
                console.log(`║   📏 Parsed bounds: [${x1},${y1}][${x2},${y2}]`);
                console.log(`║   📏 Number values: x1=${x1}, y1=${y1}, x2=${x2}, y2=${y2}`);
                boundsData.bounds = boundsAttr;
                boundsData.androidBounds = { x1, y1, x2, y2 };
                // Add explicit logging to verify the object was created correctly
                console.log(`║   ✅ Created androidBounds object:`, JSON.stringify(boundsData.androidBounds));
              } else {
                console.log(`║   ❌ Could not parse bounds: ${boundsAttr}`);
                console.log(`║   ❌ Regex match failed. Expected format: [x1,y1][x2,y2]`);
              }
            }
            // Extract iOS bounds from x,y,width,height attributes
            else if (node.getAttribute && 
                     node.getAttribute('x') !== null && 
                     node.getAttribute('y') !== null &&
                     node.getAttribute('width') !== null &&
                     node.getAttribute('height') !== null) {
              const x = parseInt(node.getAttribute('x'), 10);
              const y = parseInt(node.getAttribute('y'), 10);
              const width = parseInt(node.getAttribute('width'), 10);
              const height = parseInt(node.getAttribute('height'), 10);
              console.log(`║   📱 iOS: Found position attributes: x=${x}, y=${y}, width=${width}, height=${height}`);
              
              boundsData.x = x;
              boundsData.y = y;
              boundsData.width = width;
              boundsData.height = height;
              
              // Log for debugging
              console.log(`║   ✅ Created iOS bounds object: x=${x}, y=${y}, width=${width}, height=${height}`);
            } else {
              console.log(`║   ⚠️ No position data found for this node`);
            }
            
            // Add node to detail list
            nodeDetails.push({
              index: i,
              nodeType: node.nodeType,
              nodeName: node.nodeName,
              serialized: serializedNode.substring(0, 100) + (serializedNode.length > 100 ? '...' : ''),
              ...boundsData
            });
            
            console.log(`║   ✅ Successfully processed node ${i}`);
          } catch (err) {
            console.error(`║   ❌ ERROR: Failed to process node at index ${i}:`, err);
          }
        }
        
        console.log(`║ 📊 Processed ${nodeDetails.length} nodes with details`);
        
        // Create safe versions of the DOM nodes to avoid circular references
        console.log(`║ 🔄 Creating safe nodes from ${nodes.length} XML nodes...`);
        const safeNodes = nodes.map((node, index) => {
          // Extract only the essential properties for highlighting
          const safeNode = { 
            nodeType: node.nodeType,
            nodeName: node.nodeName
          };
          
          // For element nodes, extract bounds information carefully
          if (node.nodeType === 1 && node.getAttribute) {
            // For Android elements with bounds attribute
            const bounds = node.getAttribute('bounds');
            if (bounds) {
              console.log(`║ 📱 Node ${index} has Android bounds: ${bounds}`);
              safeNode.bounds = bounds;
              
              // Parse Android bounds format [x1,y1][x2,y2]
              const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
              if (match) {
                const [_, x1, y1, x2, y2] = match.map(Number);
                safeNode.androidBounds = { x1, y1, x2, y2 };
                console.log(`║ ✅ Created androidBounds for node ${index}: x1=${x1}, y1=${y1}, x2=${x2}, y2=${y2}`);
              } else {
                console.log(`║ ❌ Failed to parse Android bounds for node ${index}: ${bounds}`);
              }
            }
            
            // For iOS elements with x,y,width,height attributes
            const x = node.getAttribute('x');
            const y = node.getAttribute('y');
            const width = node.getAttribute('width');
            const height = node.getAttribute('height');
            
            if (x !== null && y !== null && width !== null && height !== null) {
              safeNode.x = parseInt(x, 10);
              safeNode.y = parseInt(y, 10);
              safeNode.width = parseInt(width, 10);
              safeNode.height = parseInt(height, 10);
              console.log(`║ 📱 Node ${index} has iOS bounds: x=${safeNode.x}, y=${safeNode.y}, w=${safeNode.width}, h=${safeNode.height}`);
              
              // Explicitly mark this as an iOS node to help with debugging
              safeNode.isIOS = true;
            }
          }
          
          return safeNode;
        });
        
        // Create result object with enhanced node information
        result = {
          xpathExpression,
          numberOfMatches: nodes.length,
          matchingNodes: matchingSerializedNodes,
          actualNodes: safeNodes, // Store safe node references instead of DOM nodes
          nodeDetails: nodeDetails, // Include the enhanced node details for better highlighting
          isValid: true,
          success: true,
          platform: platform, // Store the platform this was evaluated for
          // Add explicit platform flags for easier detection
          isAndroid: platform === 'android',
          isIOS: platform === 'ios'
        };
        
        // Cache the result
        this.lastEvaluationResults.set(cacheKey, result);
        console.log(`Cached new result for ${cacheKey}: ${result.numberOfMatches} matches`);
      }
      
      // Update highlights if requested
      if (highlight) {
        // First, clear any existing highlights to prevent stale data
        console.log(`║ 🧹 Clearing previous highlights before updating`);
        this.highlightedNodes = [];
        
        // Then set the new highlighted nodes
        console.log(`║ 🔔 HIGHLIGHT: Updating highlighted nodes (${result.actualNodes?.length || 0} nodes)`);
        
        // Make sure we have actual nodes to highlight
        if (result.actualNodes && result.actualNodes.length > 0) {
          // Create fresh copies of the nodes to avoid reference issues
          this.highlightedNodes = result.actualNodes.map(node => ({...node}));
          
          console.log(`║ ✅ Set ${this.highlightedNodes.length} nodes for highlighting`);
          console.log(`║ 📱 Platform: ${platform}`);
          
          // Verify content of first node for debugging
          if (this.highlightedNodes.length > 0) {
            const firstNode = this.highlightedNodes[0];
            console.log(`║ 🔍 First node details: 
║   Type: ${firstNode.nodeType || typeof firstNode}
║   Has androidBounds: ${!!firstNode.androidBounds}
║   Has iOS bounds: ${!!(firstNode.x !== undefined && firstNode.y !== undefined)}
║   Platform: ${platform}`);
          }
        } else {
          console.log(`║ ⚠️ No nodes to highlight - result has no actualNodes data`);
        }
        
        // Send a single consolidated update after highlighting
        // instead of sending separate evaluationComplete and highlightsChanged events
        if (result.numberOfMatches !== undefined && elementId) {
          console.log(`║ 🔢 Match count for element ${elementId}: ${result.numberOfMatches} (will be included in highlight notification)`);
          // We don't need a separate notification here as we'll send a consolidated one after highlighting
          // This reduces redundant updates
        }
        
        // Log the node details we're sending - avoid circular references
        try {
          console.log(`║ 📊 Node Details for highlighting (count: ${result.nodeDetails?.length || 0})`);
          
          if (result.nodeDetails && result.nodeDetails.length > 0) {
            const safeDetails = result.nodeDetails.map(n => ({
              index: n.index,
              nodeName: n.nodeName,
              bounds: n.bounds,
              hasBounds: !!n.bounds,
              hasAndroidBounds: !!n.androidBounds,
              hasIosBounds: !!(n.x !== undefined && n.y !== undefined)
            })).slice(0, 3); // Only show first 3 for brevity
            
            console.log(`║ 📊 Sample node details:`, JSON.stringify(safeDetails, null, 2));
          }
        } catch (err) {
          console.log(`║ ⚠️ Could not stringify node details: ${err.message}`);
        }
        
        console.log(`║ 📢 Notifying listeners with highlightsChanged event for platform: ${platform}`);
        this.notifyListeners('highlightsChanged', {
          nodes: this.highlightedNodes,
          nodeDetails: result.nodeDetails || [], // Include the detailed node information
          xpathExpression,
          platform, // Include the platform in the notification
          isAndroid: platform === 'android',
          isIOS: platform === 'ios'
        });
        
        // CONSOLIDATED UPDATE: Send a single update after highlighting that includes both
        // the highlight information and the evaluation result
        // This ensures element cards are updated at the same time as highlights appear
        if (elementId && result.numberOfMatches !== undefined) {
          console.log(`║ 🔄 CONSOLIDATED UPDATE: Notifying with combined highlight and evaluation data`);
          console.log(`║ 🔢 Element ${elementId} has ${result.numberOfMatches} matches`);
          
          // Send a consolidated notification with both highlight and evaluation data
          // CRITICAL: Use bypassDebounce to ensure this notification is ALWAYS sent
          // This fixes stuck "evaluating" state issues when XML is already loaded
          this.notifyListeners('evaluationComplete', {
            result,
            xpathExpression,
            elementId,
            highlight: false, // Don't trigger another highlight
            fromHighlighter: true, // Flag to indicate this came from highlight process
            consolidated: true, // Flag to indicate this is a consolidated update
            timestamp: Date.now() // Add timestamp to help track event timing
          }, {
            // Force immediate delivery to break out of stuck states
            immediate: true,
            bypassDebounce: true // Crucial - ignore debouncing to ensure delivery
          });
          
          // As a safety measure, send a second notification after a small delay
          // This helps ensure ElementCard components receive the update
          setTimeout(() => {
            console.log(`║ 🔄 SAFETY NOTIFICATION: Sending backup notification for ${elementId}`);
            this.notifyListeners('evaluationComplete', {
              result,
              xpathExpression,
              elementId,
              highlight: false,
              fromHighlighter: true,
              consolidated: true,
              isBackupNotification: true,
              timestamp: Date.now()
            }, {
              immediate: true,
              bypassDebounce: true
            });
          }, 200);
        }
      }
      
      // Clean up active evaluation
      if (elementId) {
        this.activeEvaluations.delete(elementId);
      }
      
      // Notify components about evaluation result
      if (updateUI) {
        this.notifyListeners('evaluationComplete', {
          result,
          xpathExpression,
          elementId,
          highlight
        });
      }
      
      return result;
    } catch (error) {
      console.error('XPath evaluation error:', error);
      
      // Create error result
      const errorResult = {
        xpathExpression,
        numberOfMatches: 0,
        matchingNodes: [],
        isValid: false,
        error: error.message,
        success: false
      };
      
      // Cache the error result
      this.lastEvaluationResults.set(cacheKey, errorResult);
      
      // Clear highlights on error
      if (highlight) {
        this.clearHighlights();
      }
      
      // Clean up active evaluation
      if (elementId) {
        this.activeEvaluations.delete(elementId);
      }
      
      // Notify components about the error
      if (updateUI) {
        this.notifyListeners('evaluationError', {
          result: errorResult,
          xpathExpression,
          elementId,
          error: error.message,
          highlight
        });
      }
      
      return errorResult;
    }
  }
  
  /**
   * Legacy evaluation method - redirects to centralized evaluation
   * @param {string} xpathExpression - XPath expression to evaluate
   * @param {Object} [options] - Evaluation options
   * @param {string} [options.elementId] - Optional element ID
   * @param {string} [options.elementPlatform] - Optional element platform
   * @returns {Object} - Evaluation result
   */
  evaluateXPath(xpathExpression, options = {}) {
    // Support both direct elementId and options object
    const elementId = typeof options === 'string' ? options : options.elementId;
    const elementPlatform = typeof options === 'object' ? options.elementPlatform : null;
    
    // Generate a unique evaluation ID for tracking repeated executions
    const evaluationId = `${this.currentStateId}:${elementPlatform || this.currentPlatform}:${xpathExpression}:${elementId || 'global'}`;
    
    // Implement throttling for rapid repeated evaluations (50ms debounce)
    const now = Date.now();
    if (this._lastEvaluationTime && this._lastEvaluationId === evaluationId && now - this._lastEvaluationTime < 50) {
      console.log(`🔄 Throttling repeated evaluation request for ${evaluationId} (${now - this._lastEvaluationTime}ms)`);
      
      // Return the last result for this exact evaluation if available
      if (elementId && this._lastElementResults && this._lastElementResults[elementId]) {
        console.log(`🔄 Returning cached results for ${elementId}`);
        return this._lastElementResults[elementId];
      }
      
      // Return a simple status object when throttling
      return {
        xpathExpression,
        numberOfMatches: -1,
        inProgress: true,
        throttled: true
      };
    }
    
    // Update tracking state
    this._lastEvaluationTime = now;
    this._lastEvaluationId = evaluationId;
    
    // First, ensure we clean up any existing evaluations for this element
    // This helps prevent issues when clicking evaluate multiple times
    if (elementId && this.activeEvaluations.has(elementId)) {
      console.log(`🧹 Cleaning up previous evaluation for element ${elementId}`);
      this.activeEvaluations.delete(elementId);
    }
    
    // Force invalidate cache for repeat evaluations on the same element
    // This ensures we don't get stale results when evaluating the same expression
    if (elementId && xpathExpression) {
      const cacheKey = `${this.currentStateId}:${elementPlatform || this.currentPlatform}:${xpathExpression}`;
      if (this.lastEvaluationResults.has(cacheKey)) {
        console.log(`🔄 Invalidating cache for repeat evaluation of ${xpathExpression}`);
        this.lastEvaluationResults.delete(cacheKey);
      }
    }
    
    // Perform the actual evaluation
    const result = this.centralizedEvaluate({
      xpathExpression,
      elementId,
      elementPlatform,
      highlight: true,
      updateUI: true
    });
    
    // Store result for this element if it exists
    if (elementId) {
      this._lastElementResults = this._lastElementResults || {};
      this._lastElementResults[elementId] = result;
    }
    
    return result;
  }

  /**
   * Update an element with evaluated XPath results
   * @param {Object} element - The element to update
   * @param {Array} elements - All elements array
   * @returns {Array} - Updated elements array
   */
  updateElementWithXPathResult(element, elements) {
    if (!element || !element.xpath?.xpathExpression) {
      return elements;
    }

    // Before evaluating, temporarily set the current platform to match the element's platform
    // This ensures proper evaluation context for Android elements
    const previousPlatform = this.currentPlatform;
    
    // Use the element's platform for evaluation context
    this.currentPlatform = element.platform;
    
    // Get evaluation result - pass the element ID to ensure only this element gets updated
    const result = this.centralizedEvaluate({
      xpathExpression: element.xpath.xpathExpression,
      elementId: element.id,
      // Don't highlight by default - this is just for data update
      highlight: false,
      updateUI: false
    });
    
    // Restore previous platform context
    this.currentPlatform = previousPlatform;
    
    // Create updated elements
    return elements.map(item => {
      if (item.id === element.id) {
        return {
          ...item,
          xpath: {
            ...item.xpath,
            numberOfMatches: result.numberOfMatches,
            isValid: result.isValid,
            matchingNodes: result.matchingNodes
          }
        };
      }
      return item;
    });
  }
  
  /**
   * Highlight nodes matching an XPath without updating any UI elements
   * @param {string} xpathExpression - XPath expression to evaluate
   * @returns {number} - Number of matches
   */
  highlightNodesOnly(xpathExpression) {
    if (!xpathExpression || !this.xmlDoc) {
      this.clearHighlights();
      return 0;
    }
    
    try {
      // Evaluate the XPath - don't update UI or use element ID
      const result = this.centralizedEvaluate({
        xpathExpression,
        highlight: true,
        updateUI: false
      });
      
      return result.numberOfMatches;
    } catch (error) {
      console.error("Error highlighting nodes:", error);
      this.clearHighlights();
      return 0;
    }
  }
  
  /**
   * Evaluate XPath and get match count without updating UI or highlighting
   * @param {string} xpathExpression - XPath to evaluate
   * @returns {number} - Number of matches
   */
  getMatchCount(xpathExpression) {
    if (!xpathExpression || !this.xmlDoc) {
      return 0;
    }
    
    try {
      // Evaluate without highlighting or updating UI
      const result = this.centralizedEvaluate({
        xpathExpression,
        highlight: false,
        updateUI: false
      });
      
      return result.numberOfMatches;
    } catch (error) {
      console.error("Error getting match count:", error);
      return 0;
    }
  }

  /**
   * Add a listener for XPath events
   * @param {Function} listener - Function to call when events occur
   */
  addListener(listener) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of an event
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   * @param {Object} [options] - Additional options
   * @param {boolean} [options.debounce=false] - Whether to debounce the event
   * @param {boolean} [options.immediate=false] - Whether to dispatch immediately without timeout
   */
  notifyListeners(eventType, data, options = {}) {
    console.log(`║ 📣 NOTIFY LISTENERS: Event type=${eventType}, listeners=${this.listeners.length}`);
    
    // Create unique event key for debouncing all event types
    const eventKey = `${eventType}:${data.elementId || 'global'}:${data.xpathExpression || ''}:${data.platform || this.currentPlatform}`;
    const now = Date.now();
    
    // Global debouncing for all events to prevent redundant notifications
    if (!options.bypassDebounce && this._lastEventTimes && this._lastEventTimes[eventKey]) {
      const lastTime = this._lastEventTimes[eventKey];
      const elapsed = now - lastTime;
      
      // Different debounce windows for different event types
      const debounceWindow = 
        eventType === 'highlightsChanged' ? 100 : // 100ms for highlights
        eventType === 'evaluationComplete' ? 50 : // 50ms for evaluation results
        30; // 30ms for other events
        
      if (elapsed < debounceWindow) {
        console.log(`║ 🔄 DEBOUNCING: Skipping duplicate ${eventType} event (${elapsed}ms < ${debounceWindow}ms)`);
        return; // Skip this duplicate event
      }
    }
    
    // Update event timing cache
    this._lastEventTimes = this._lastEventTimes || {};
    this._lastEventTimes[eventKey] = now;
    
    // Special handling for evaluationComplete events to avoid redundant UI updates
    if (eventType === 'evaluationComplete' && data.elementId) {
      // If this is a post-highlight update and we've already notified for this element,
      // only send the update if we don't have a recent update for this element/xpath combo
      if (data.fromHighlighter && this._recentEvaluationUpdates && this._recentEvaluationUpdates[data.elementId]) {
        const lastUpdateTime = this._recentEvaluationUpdates[data.elementId].time;
        const elapsed = now - lastUpdateTime;
        
        // If we've updated this element recently, check if the result is the same
        if (elapsed < 300 && this._recentEvaluationUpdates[data.elementId].count === data.result.numberOfMatches) {
          console.log(`║ 🔄 SKIPPING REDUNDANT UPDATE: Element ${data.elementId} already updated ${elapsed}ms ago with same count`);
          return; // Skip redundant update
        }
      }
      
      // Track this evaluation update
      this._recentEvaluationUpdates = this._recentEvaluationUpdates || {};
      this._recentEvaluationUpdates[data.elementId] = {
        time: now,
        count: data.result.numberOfMatches
      };
    }
    
    // Specific logging for highlight events
    if (eventType === 'highlightsChanged') {
      console.log(`║ 🔆 HIGHLIGHTS EVENT: XPath=${data.xpathExpression?.slice(0, 30)}...`);
      console.log(`║   Nodes: ${data.nodes?.length || 0}`);
      console.log(`║   Platform: ${data.platform || 'not specified'}`);
    }
    
    // Dispatch the event - either immediately or with a minimal timeout
    // Using requestAnimationFrame for better integration with React's rendering cycle
    const dispatchEvent = () => {
      console.log(`║ 🔄 Dispatching event to ${this.listeners.length} listeners`);
      this.listeners.forEach((listener, index) => {
        try {
          listener(eventType, data);
          console.log(`║   Listener #${index + 1} completed`);
        } catch (error) {
          console.error(`║   ❌ ERROR in listener #${index + 1}:`, error);
        }
      });
      console.log(`║ ✅ Event dispatch complete`);
      console.log("╚══════════════════════════════════════════════════════");
    };
    
    // Use requestAnimationFrame for better visual updates when available
    if (typeof window !== 'undefined' && window.requestAnimationFrame && !options.immediate) {
      window.requestAnimationFrame(dispatchEvent);
    } else if (options.immediate) {
      // Immediate dispatch without any timeout
      dispatchEvent();
    } else {
      // Fallback to setTimeout with 0 delay
      setTimeout(dispatchEvent, 0);
    }
  }
}

// Create and export a singleton instance
const xpathManager = new XPathManager();
export default xpathManager;