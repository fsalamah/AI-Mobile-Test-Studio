import React, { useState } from 'react';
import { Dropdown, Menu, Badge, Tooltip } from 'antd';
import { BulbOutlined, CheckCircleOutlined, WarningOutlined, StopOutlined } from '@ant-design/icons';

/**
 * XPath Alternatives Component
 * Displays alternative XPath suggestions in a dropdown
 * 
 * @param {Object} props
 * @param {Array} props.alternatives - Alternative XPaths with metadata
 * @param {Function} props.onSelect - Function to handle selection of an alternative
 * @param {number} props.matchCount - Number of matches for current XPath
 */
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

export default XPathAlternatives;