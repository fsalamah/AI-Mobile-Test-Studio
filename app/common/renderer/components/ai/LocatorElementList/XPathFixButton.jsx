import React from 'react';
import { Button, Tooltip, Badge, Typography, Popover } from 'antd';
import { ToolOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * XPath Fix Button Component
 * Displays a button to trigger the XPath fix pipeline
 * 
 * @param {Object} props
 * @param {Function} props.onClick - Function to handle button click
 * @param {number} props.failingCount - Number of failing XPaths
 * @param {boolean} props.loading - Whether the fix process is loading
 * @param {string} props.currentStage - Current stage of the XPath fix process
 * @param {number} props.progress - Progress percentage of the current operation
 */
const XPathFixButton = ({ 
  onClick, 
  failingCount = 0, 
  loading = false, 
  currentStage = '',
  progress = 0 
}) => {
  // Information about the XPath fix process
  const infoContent = (
    <div style={{ maxWidth: '300px' }}>
      <Text strong>XPath Fix Process:</Text>
      <ol style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '0' }}>
        <li>Groups failing XPaths by screen and platform</li>
        <li>Analyzes screenshot and XML structure</li>
        <li>Generates multiple alternative XPaths</li>
        <li>Validates repaired XPaths against source</li>
        <li>Applies the most reliable fixes</li>
      </ol>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <Tooltip title={loading ? currentStage : "Fix failing XPaths using AI"}>
        <Badge count={failingCount > 0 ? failingCount : 0} size="small">
          <Button
            icon={<ToolOutlined />}
            onClick={onClick}
            loading={loading}
            disabled={failingCount === 0}
            style={{ marginRight: '8px' }}
          >
            Fix XPaths
            {loading && progress > 0 && ` (${progress}%)`}
          </Button>
        </Badge>
      </Tooltip>
      
      <Popover 
        content={infoContent} 
        title="About XPath Fixing" 
        placement="right"
        trigger="hover"
      >
        <InfoCircleOutlined style={{ color: '#1890ff', cursor: 'pointer' }} />
      </Popover>
    </div>
  );
};

export default XPathFixButton;