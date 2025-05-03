import React from 'react';
import { Button, Tooltip, Badge } from 'antd';
import { ToolOutlined } from '@ant-design/icons';

/**
 * XPath Fix Button Component
 * Displays a button to trigger the XPath fix pipeline
 * 
 * @param {Object} props
 * @param {Function} props.onClick - Function to handle button click
 * @param {number} props.failingCount - Number of failing XPaths
 * @param {boolean} props.loading - Whether the fix process is loading
 */
const XPathFixButton = ({ onClick, failingCount = 0, loading = false }) => {
  return (
    <Tooltip title="Fix failing XPaths using AI">
      <Badge count={failingCount > 0 ? failingCount : 0} size="small">
        <Button
          icon={<ToolOutlined />}
          onClick={onClick}
          loading={loading}
          disabled={failingCount === 0}
        >
          Fix XPaths
        </Button>
      </Badge>
    </Tooltip>
  );
};

export default XPathFixButton;