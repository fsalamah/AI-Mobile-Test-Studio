import React from 'react';
import { List } from 'antd';
import ElementCard from './ElementCard';

/**
 * Elements Group Component
 * Renders a group of elements for a specific state
 * 
 * @param {Object} props
 * @param {string} props.stateId - ID of the state
 * @param {string} props.stateName - Display name of the state
 * @param {Array} props.elements - Elements belonging to this state
 * @param {string} props.currentStateId - Current active state ID
 * @param {string} props.currentPlatform - Current active platform
 * @param {Object} props.xpathState - Current XPath evaluation state
 * @param {function} props.onEdit - Edit element handler
 * @param {function} props.onDelete - Delete element handler
 * @param {function} props.onEvaluate - Evaluate XPath handler
 * @param {function} props.onView - View element handler
 * @param {function} props.onElementUpdated - Element update handler
 * @param {Array} props.allElements - All elements (for uniqueness validation)
 * @param {function} props.onFixXPath - Handler for fixing single element XPath
 */
export const ElementsGroup = ({
  stateId,
  stateName,
  elements,
  currentStateId,
  currentPlatform,
  xpathState,
  onEdit,
  onDelete,
  onEvaluate,
  onView,
  onElementUpdated,
  allElements,
  onFixXPath
}) => {
  if (!elements || elements.length === 0) {
    return null;
  }
  
  return (
    <div style={{ marginBottom: '8px' }}>
      {/* State header */}
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '2px 8px', 
        borderRadius: '2px',
        marginBottom: '4px',
        fontSize: '11px',
        fontWeight: 'bold'
      }}>
        {stateName || stateId}
        <span style={{ marginLeft: '4px', fontSize: '10px', color: '#999', fontWeight: 'normal' }}>
          ({elements.length})
        </span>
      </div>
      
      {/* Elements list */}
      <List
        size="small"
        dataSource={elements}
        renderItem={item => {
          // Determine if this is the active item
          const isActive = (
            item.stateId === currentStateId && 
            item.platform === currentPlatform && 
            xpathState?.lastResult?.xpathExpression === item.xpath?.xpathExpression &&
            xpathState?.status === 'COMPLETE'
          );
          
          return (
            <List.Item key={item.id} style={{ padding: '2px 0' }}>
              <ElementCard 
                item={item}
                isActive={isActive}
                xpathState={xpathState}
                onEdit={onEdit}
                onDelete={onDelete}
                onEvaluate={onEvaluate}
                onView={onView}
                onElementUpdated={onElementUpdated}
                elements={allElements}
                onFixXPath={onFixXPath}
              />
            </List.Item>
          );
        }}
      />
    </div>
  );
};

export default ElementsGroup;