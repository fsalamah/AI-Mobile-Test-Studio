import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Space, Tooltip, Popconfirm, message } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ExperimentOutlined,
  AppleOutlined,
  AndroidOutlined,
  CheckOutlined,
  CloseOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { getMatchStatus, getPlatformIconStyle, validateElementUniqueness } from './elementUtils';
import XPathAlternatives from './XPathAlternatives';

// Import XPathManager singleton for direct access
import xpathManager from '../../Xray/XPathManager.js';

/**
 * Element Card Component
 * Renders a single element card with inline editing capabilities
 * 
 * @param {Object} props
 * @param {Object} props.item - Element data
 * @param {boolean} props.isActive - Whether element is active (matched)
 * @param {Object} props.xpathState - Current XPath evaluation state
 * @param {function} props.onEdit - Edit element handler
 * @param {function} props.onDelete - Delete element handler
 * @param {function} props.onEvaluate - Evaluate XPath handler
 * @param {function} props.onView - View element handler
 * @param {function} props.onElementUpdated - Element update handler
 * @param {Array} props.elements - All elements (for uniqueness validation)
 * @param {function} props.evaluateXPath - Function to evaluate XPath
 * @param {function} props.onFixXPath - Handler for fixing single element XPath
 */
export const ElementCard = ({
  item,
  isActive,
  xpathState,
  onEdit,
  onDelete,
  onEvaluate,
  onView,
  onElementUpdated,
  elements,
  evaluateXPath,
  onFixXPath
}) => {
  // Inline editing states
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  
  // Enhanced stuck evaluation detection and recovery
  useEffect(() => {
    // If this element is currently marked as evaluating, set up a timer to check if it gets stuck
    if (item.xpath?._isEvaluating) {
      console.log(`ElementCard ${item.id}: Monitoring evaluation state`);
      
      // Store start time to calculate total evaluation duration
      const evaluationStartTime = Date.now();
      
      // Create a timer to check if the state gets stuck
      const monitorTimer = setTimeout(() => {
        // If the element is still in evaluating state, force a direct evaluation
        if (item.xpath?._isEvaluating) {
          const duration = Date.now() - evaluationStartTime;
          console.log(`⚠️ ElementCard ${item.id}: STUCK DETECTED - Stuck for ${duration}ms - Forcing direct evaluation`);
          
          try {
            // Do a direct evaluation ourselves
            const xpathExpression = item.xpath?.xpathExpression;
            if (xpathExpression) {
              // Force evaluation with element ID and platform for context
              console.log(`🔍 Running direct XPath evaluation: ${xpathExpression}`);
              console.log(`🔍 Element platform: ${item.platform}`);
              
              // Force evaluation and get result directly - use centralized manager
              const result = xpathManager.centralizedEvaluate({
                xpathExpression: xpathExpression,
                elementId: item.id,
                elementPlatform: item.platform,
                highlight: true,
                updateUI: true,
                debug: true // Enable debug mode for stuck recovery
              });
              
              console.log(`🔄 DIRECT FIX: Evaluation result for ${item.id}: ${result.numberOfMatches} matches`);
              
              // Update with result and include diagnostic information
              const fixedItem = {
                ...item,
                xpath: {
                  ...item.xpath,
                  numberOfMatches: result.numberOfMatches,
                  isValid: result.isValid !== false, // Ensure boolean true/false
                  matchingNodes: result.matchingNodes || [],
                  _isEvaluating: false,
                  _lastUpdateTime: Date.now(),
                  _stuckDuration: duration,
                  _recoveryMethod: 'self_fix',
                  _evaluationResult: {
                    success: result.success,
                    matchCount: result.numberOfMatches,
                    timestamp: Date.now()
                  }
                }
              };
              
              // Update directly through parent
              onElementUpdated(fixedItem, 'self_fix');
              
              // Also notify XPathManager explicitly about the resolved state
              xpathManager.notifyListeners('evaluationComplete', {
                result,
                xpathExpression,
                elementId: item.id,
                highlight: true,
                isRecovery: true
              }, {
                immediate: true,
                bypassDebounce: true,
                force: true
              });
            }
          } catch (error) {
            console.error(`⚠️ ElementCard ${item.id}: Error during self-fix:`, error);
            
            // Still clear the evaluation state
            const clearedItem = {
              ...item,
              xpath: {
                ...item.xpath,
                _isEvaluating: false,
                error: error.message,
                _stuckDuration: duration,
                _recoveryMethod: 'self_fix_error',
                _lastUpdateTime: Date.now()
              }
            };
            onElementUpdated(clearedItem, 'self_fix_error');
          }
        }
      }, 1000); // Check after 1 second - this is enough time for normal evaluation
      
      // Also set up a second more aggressive fallback timer for persistent stuck states
      const fallbackTimer = setTimeout(() => {
        if (item.xpath?._isEvaluating) {
          const duration = Date.now() - evaluationStartTime;
          console.log(`⚠️ ElementCard ${item.id}: CRITICAL STUCK STATE - Stuck for ${duration}ms - Force clearing`);
          
          // Emergency state reset without evaluation
          const emergencyFixedItem = {
            ...item,
            xpath: {
              ...item.xpath,
              _isEvaluating: false,
              _lastUpdateTime: Date.now(),
              _stuckDuration: duration,
              _recoveryMethod: 'emergency_reset'
            }
          };
          
          // Update directly through parent
          onElementUpdated(emergencyFixedItem, 'emergency_reset');
        }
      }, 3000); // Last resort after 3 seconds total
      
      return () => {
        clearTimeout(monitorTimer);
        clearTimeout(fallbackTimer);
      };
    }
  }, [item.id, item.xpath?._isEvaluating, item, onElementUpdated]);

  // Enhanced listener for XPath evaluation updates from XPathManager
  useEffect(() => {
    // Keep a reference to the current item data for closure
    const currentItemId = item.id;
    const currentPlatform = item.platform || 'unknown';
    
    console.log(`🔔 Setting up XPath listener for element ${currentItemId} (${currentPlatform})`);
    
    // Add listener for XPath evaluation results
    const unsubscribe = xpathManager.addListener((eventType, data) => {
      // Extract platform from event data for better matching
      const eventPlatform = data._platform || data.platform || 'unknown';
      
      // SPECIAL CHECK: Always force clear _isEvaluating if it's been active for >2 seconds
      // This is a last resort safety mechanism
      const evaluationStartTime = item.xpath?._evaluationStartTime || 0;
      const evaluationDuration = Date.now() - evaluationStartTime;
      
      if (item.xpath?._isEvaluating && evaluationDuration > 2000) {
        console.log(`⚠️ ElementCard ${currentItemId}: Force clearing stuck evaluation state after ${evaluationDuration}ms`);
        // Force update to clear stuck state
        const forceClearedItem = {
          ...item,
          xpath: {
            ...item.xpath,
            _isEvaluating: false,
            _lastUpdateTime: Date.now(),
            _recoveryMethod: 'listener_timeout'
          }
        };
        onElementUpdated(forceClearedItem, 'stuckStateCleanup');
      }
      
      // Process specific evaluation events for this element ID
      if ((eventType === 'evaluationComplete' || eventType === 'evaluationError') 
           && data.elementId === currentItemId) {
        
        console.log(`ElementCard ${currentItemId}: Received ${eventType} event` +
          (data.isBackupNotification ? ' (backup notification)' : '') +
          ` Platform: ${eventPlatform}`);
        
        // Track update frequency to avoid storm of updates
        const lastUpdateTime = item.xpath?._lastUpdateTime || 0;
        const now = Date.now();
        const updateInterval = now - lastUpdateTime;
        
        // Allow certain types of notifications to bypass timing checks
        const bypassTiming = data.isBackupNotification || 
                            data.isRecovery || 
                            data.force || 
                            updateInterval > 50;
        
        if (eventType === 'evaluationComplete') {
          // Get result data
          const result = data.result;
          if (result) {
            console.log(`ElementCard: Updating ${currentItemId} with ${result.numberOfMatches} matches` + 
              (!bypassTiming ? ' (skipping - too soon)' : ''));
            
            if (bypassTiming) {
              // Always clear _isEvaluating regardless of other state
              const updatedItem = {
                ...item,
                xpath: {
                  ...item.xpath,
                  numberOfMatches: result.numberOfMatches,
                  isValid: result.isValid !== false, // Ensure boolean true/false
                  matchingNodes: result.matchingNodes || [],
                  _isEvaluating: false, // Critical: always clear evaluation flag
                  _lastUpdateTime: now, // Track when we last updated
                  _updateSource: data.isBackupNotification ? 'backup' : 
                               (data.isRecovery ? 'recovery' : 
                               (data.consolidated ? 'consolidated' : 'normal')),
                  // Include platform information                 
                  _platform: result.platform || eventPlatform || currentPlatform
                }
              };
              
              // Notify parent of updated element
              console.log(`ElementCard: Updating element ${currentItemId} to show ${result.numberOfMatches} matches via ${updatedItem.xpath._updateSource}`);
              onElementUpdated(updatedItem, data.consolidated ? 'consolidated' : 
                              (data.fromHighlighter ? 'highlight' : 
                              (data.isRecovery ? 'recovery' : 'xpathExpression')));
            }
          }
        } else if (eventType === 'evaluationError') {
          // Handle evaluation error
          const updatedItem = {
            ...item,
            xpath: {
              ...item.xpath,
              numberOfMatches: 0,
              isValid: false,
              error: data.error,
              _isEvaluating: false,
              _lastUpdateTime: now,
              _updateSource: 'error',
              _platform: eventPlatform || currentPlatform
            }
          };
          
          // Notify parent of updated element
          onElementUpdated(updatedItem, 'xpathExpression');
        }
      }
      
      // Also listen for highlights that affect this element's XPath
      if (eventType === 'highlightsChanged' && 
          data.xpathExpression === item.xpath?.xpathExpression) {
        
        console.log(`🔆 Highlight changed for ${currentItemId}: ${data.nodes?.length || 0} nodes`);
        
        // This is just to ensure the card gets refreshed when its XPath gets highlighted
        if (!item.xpath?._isEvaluating) {
          // For highlight events, add platform context
          const updatedItem = {
            ...item,
            xpath: {
              ...item.xpath,
              _lastHighlightTime: Date.now(),
              _highlightNodeCount: data.nodes?.length || 0,
              // Set platform info from highlight event
              _highlightPlatform: data.platform || eventPlatform || currentPlatform
            }
          };
          
          // Minimal update to trigger render with highlight information
          onElementUpdated(updatedItem, 'highlight');
        }
      }
    });
    
    // Clean up on unmount
    return () => {
      console.log(`🧹 Removing XPath listener for element ${currentItemId}`);
      unsubscribe();
    };
  }, [item, onElementUpdated]);

  const itemId = item.id;
  // Get alternative XPaths from the element if they exist
  const alternatives = getAlternativeXPaths(item);
  
  // Get match status for display, showing a special state when evaluating
  const isEvaluating = item.xpath?._isEvaluating || false;
  const matchStatus = isEvaluating ? 
    { color: '#1890ff', text: '...' } : // Blue color with "..." when evaluating
    getMatchStatus(item.xpath?.numberOfMatches);

  // Start inline editing
  const startEditing = (field) => {
    setEditingField(field);
    
    if (field === 'xpathExpression') {
      setEditingValue(item.xpath?.xpathExpression || '');
    } else {
      setEditingValue(item[field] || '');
    }
  };

  // Cancel inline editing
  const cancelEditing = () => {
    setEditingField(null);
    setEditingValue('');
  };

  // Save inline edit with enhanced XPath handling
  const saveInlineEdit = (field) => {
    try {
      // Validate uniqueness if needed
      if (field === 'devName') {
        validateElementUniqueness(item, field, editingValue, elements, itemId);
      }

      // Create updated element
      const updatedItem = { ...item };
      
      if (field === 'xpathExpression') {
        // Set evaluation state while updating XPath
        updatedItem.xpath = {
          ...updatedItem.xpath,
          xpathExpression: editingValue,
          _isEvaluating: true, // Mark as evaluating
          _evaluationStartTime: Date.now(), // Record when we started evaluation
          _lastUpdateTime: Date.now()
        };
        
        // Notify parent component first to show evaluating state
        onElementUpdated(updatedItem, field);
        
        // Then immediately trigger evaluation with platform context
        try {
          console.log(`🔄 Evaluating new XPath for ${itemId}: ${editingValue}`);
          console.log(`📱 Platform: ${item.platform}`);
          
          // Use centralized evaluation with extra parameters
          xpathManager.centralizedEvaluate({
            xpathExpression: editingValue,
            elementId: itemId,
            elementPlatform: item.platform,
            highlight: true,
            updateUI: true,
            debug: true // Enable debugging for inline edits
          });
        } catch (error) {
          console.error(`Error during XPath evaluation: ${error.message}`);
          // Update immediately with error state
          const errorItem = {
            ...updatedItem,
            xpath: {
              ...updatedItem.xpath,
              _isEvaluating: false,
              isValid: false,
              numberOfMatches: 0,
              error: error.message
            }
          };
          onElementUpdated(errorItem, 'evaluationError');
        }
      } else {
        // For other fields, just update normally
        updatedItem[field] = editingValue;
        onElementUpdated(updatedItem, field);
      }
      
      // Reset editing state
      cancelEditing();
    } catch (error) {
      message.error(error.message);
    }
  };
  
  // Function to handle XPath alternative selection
  const handleAlternativeSelect = (alternative) => {
    // Create updated element
    const updatedItem = { 
      ...item,
      xpath: {
        ...item.xpath,
        xpathExpression: alternative.xpath,
        numberOfMatches: alternative.matchCount,
        isValid: alternative.matchCount > 0
      }
    };
    
    // Notify parent component
    onElementUpdated(updatedItem, 'xpathExpression');
    
    // Show success message
    message.success(`XPath updated to alternative with ${alternative.matchCount} matches`);
  };
  
  // Function to extract alternative XPaths from element
  function getAlternativeXPaths(element) {
    // If we have evaluated alternatives, use those
    if (element.xpath?.evaluatedAlternatives && element.xpath.evaluatedAlternatives.length > 0) {
      return element.xpath.evaluatedAlternatives.map(alt => ({
        xpath: alt.xpath,
        matchCount: alt.matchCount,
        description: alt.description || '',
        confidence: alt.confidence || 'Medium'
      }));
    }
    
    // Otherwise, use the raw alternatives if they exist
    if (element.xpath?.alternativeXpaths && element.xpath.alternativeXpaths.length > 0) {
      return element.xpath.alternativeXpaths.map(alt => ({
        xpath: alt.xpath,
        matchCount: 0, // We don't know yet
        description: alt.description || '',
        confidence: alt.confidence || 'Medium'
      }));
    }
    
    // No alternatives
    return [];
  }

  return (
    <Card 
      size="small" 
      style={{ 
        width: '100%',
        borderLeft: isActive ? '2px solid #1890ff' : 'none'
      }}
      bodyStyle={{ padding: '4px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Left section with platform icon and match indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {/* Platform icon with color */}
          <div style={getPlatformIconStyle(item.platform)}>
            {item.platform === 'ios' ? <AppleOutlined /> : <AndroidOutlined />}
          </div>
          
          {/* Match count indicator */}
          <Tooltip title={isEvaluating ? 
              "Evaluating XPath..." : 
              `${matchStatus.text} ${matchStatus.text === '1' ? 'match' : 'matches'} found`
            }>
            <div style={{ 
              backgroundColor: matchStatus.color,
              color: 'white',
              fontSize: '9px',
              fontWeight: 'bold',
              padding: '0 4px',
              height: '14px',
              lineHeight: '14px',
              borderRadius: '7px',
              minWidth: '14px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {matchStatus.text}
            </div>
          </Tooltip>
        </div>
        
        {/* Main content - flex grows to fill space */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* DevName - editable */}
          {editingField === 'devName' ? (
            <Input
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onPressEnter={() => saveInlineEdit('devName')}
              autoFocus
              size="small"
              style={{ width: '100%', height: '22px' }}
              suffix={
                <Space size={1}>
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<CheckOutlined style={{ fontSize: '10px' }} />} 
                    onClick={() => saveInlineEdit('devName')} 
                  />
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<CloseOutlined style={{ fontSize: '10px' }} />} 
                    onClick={cancelEditing} 
                  />
                </Space>
              }
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title={`${item.name}: ${item.value}`}>
                <span style={{ 
                  fontWeight: 'bold', 
                  fontSize: '12px',
                  color: (item.xpath?.numberOfMatches > 0 ? '#1890ff' : 'inherit'),
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {item.devName}
                </span>
              </Tooltip>
              <Button 
                type="text" 
                icon={<EditOutlined style={{ fontSize: '10px' }} />} 
                size="small" 
                style={{ marginLeft: '2px', padding: '0 2px' }}
                onClick={() => startEditing('devName')}
              />
            </div>
          )}
          
          {/* XPath - editable */}
          {editingField === 'xpathExpression' ? (
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Input.TextArea
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                autoFocus
                size="small"
                autoSize={{ minRows: 1, maxRows: 2 }}
                style={{ flex: 1, fontSize: '10px', padding: '2px' }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    saveInlineEdit('xpathExpression');
                  }
                }}
                onKeyDown={(e) => {
                  // Handle Escape key to cancel editing
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEditing();
                  }
                }}
              />
              <Space size={1} style={{ marginLeft: '3px' }}>
                <Button 
                  type="text" 
                  size="small" 
                  icon={<CheckOutlined style={{ fontSize: '10px', color: '#52c41a' }} />} 
                  onClick={() => saveInlineEdit('xpathExpression')} 
                />
                <Button 
                  type="text" 
                  size="small" 
                  icon={<CloseOutlined style={{ fontSize: '10px', color: '#ff4d4f' }} />} 
                  onClick={cancelEditing} 
                />
              </Space>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title={item.xpath?.xpathExpression}>
                <div style={{ 
                  fontSize: '9px', 
                  fontFamily: 'monospace',
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%'
                }}>
                  {item.xpath?.xpathExpression}
                </div>
              </Tooltip>
              <Button 
                type="text" 
                icon={<EditOutlined style={{ fontSize: '9px' }} />} 
                size="small" 
                style={{ padding: '0 2px', marginLeft: '2px' }}
                onClick={() => startEditing('xpathExpression')}
              />
              
              {/* XPath Alternatives dropdown */}
              {alternatives.length > 0 && (
                <XPathAlternatives 
                  alternatives={alternatives}
                  onSelect={handleAlternativeSelect}
                  matchCount={item.xpath?.numberOfMatches}
                />
              )}
            </div>
          )}
        </div>
        
        {/* Action buttons - compact row */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <Button 
            size="small"
            icon={<EditOutlined style={{ fontSize: '10px' }} />} 
            onClick={() => onEdit(item)}
            style={{ padding: '0 4px', height: '22px' }}
          />
          <Button 
            size="small"
            icon={<ExperimentOutlined style={{ fontSize: '10px' }} />} 
            onClick={() => onEvaluate(item)}
            style={{ padding: '0 4px', height: '22px' }}
            loading={false} // No loading state - synchronous operation
          />
          <Button 
            size="small"
            icon={<EyeOutlined style={{ fontSize: '10px' }} />} 
            onClick={() => onView(item)}
            style={{ padding: '0 4px', height: '22px' }}
          />
          {onFixXPath && (
            <Tooltip title="Fix XPath using AI">
              <Button 
                size="small"
                icon={<ToolOutlined style={{ fontSize: '10px' }} />} 
                onClick={() => onFixXPath(item)}
                style={{ padding: '0 4px', height: '22px' }}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Delete this element?"
            onConfirm={() => onDelete(item)}
            okText="Yes"
            cancelText="No"
            placement="left"
          >
            <Button 
              size="small"
              danger 
              icon={<DeleteOutlined style={{ fontSize: '10px' }} />}
              style={{ padding: '0 4px', height: '22px' }}
            />
          </Popconfirm>
        </div>
      </div>
    </Card>
  );
};

export default ElementCard;