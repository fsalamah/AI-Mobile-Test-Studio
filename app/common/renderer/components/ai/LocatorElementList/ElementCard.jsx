import React, { useState } from 'react';
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

  const itemId = item.id;
  const matchStatus = getMatchStatus(item.xpath?.numberOfMatches);
  
  // Get alternative XPaths from the element if they exist
  const alternatives = getAlternativeXPaths(item);

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

  // Save inline edit
  const saveInlineEdit = (field) => {
    try {
      // Validate uniqueness if needed
      if (field === 'devName') {
        validateElementUniqueness(item, field, editingValue, elements, itemId);
      }

      // Create updated element
      const updatedItem = { ...item };
      
      if (field === 'xpathExpression') {
        updatedItem.xpath = {
          ...updatedItem.xpath,
          xpathExpression: editingValue
        };
      } else {
        updatedItem[field] = editingValue;
      }
      
      // Notify parent component
      onElementUpdated(updatedItem, field);
      
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
          <Tooltip title={`${matchStatus.text} ${matchStatus.text === '1' ? 'match' : 'matches'} found`}>
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
            <Input.TextArea
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              autoFocus
              size="small"
              autoSize={{ minRows: 1, maxRows: 2 }}
              style={{ width: '100%', fontSize: '10px', padding: '2px' }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  saveInlineEdit('xpathExpression');
                }
              }}
            />
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
            loading={xpathState?.status === 'PROCESSING' && xpathState?.currentXPath === item.xpath?.xpathExpression}
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