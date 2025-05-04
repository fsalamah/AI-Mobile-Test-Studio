import React, { useState, useEffect } from 'react';
import { Button, Tooltip, Badge, Typography, Popover, Space } from 'antd';
import { 
  ToolOutlined, 
  InfoCircleOutlined, 
  CheckCircleOutlined,
  WarningOutlined 
} from '@ant-design/icons';

// Import XPathManager singleton for direct access
import xpathManager from '../../Xray/XPathManager.js';

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
  // Add state to track XPath manager status
  const [managerStatus, setManagerStatus] = useState({
    hasXml: false,
    platform: null,
    isDebugEnabled: false
  });
  
  // Check XPathManager status on mount
  useEffect(() => {
    const checkManagerStatus = () => {
      const hasXml = !!xpathManager.getXmlSource();
      const platform = xpathManager.currentPlatform;
      const isDebugEnabled = xpathManager.debug;
      
      setManagerStatus({
        hasXml,
        platform,
        isDebugEnabled
      });
    };
    
    // Initial check
    checkManagerStatus();
    
    // Set up listener to monitor changes
    const unsubscribe = xpathManager.addListener((eventType) => {
      if (eventType === 'xmlChanged') {
        checkManagerStatus();
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  // Toggle debug mode in XPathManager
  const toggleDebugMode = () => {
    xpathManager.setDebugMode(!managerStatus.isDebugEnabled);
    setManagerStatus(prev => ({
      ...prev,
      isDebugEnabled: !prev.isDebugEnabled
    }));
  };

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
      
      <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
        <Text strong>XPath Manager Status:</Text>
        <div style={{ marginTop: '5px' }}>
          <div>XML Loaded: {managerStatus.hasXml ? 
            <CheckCircleOutlined style={{ color: 'green' }} /> : 
            <WarningOutlined style={{ color: 'orange' }} />}
          </div>
          <div>Platform: {managerStatus.platform || 'unknown'}</div>
          <div>Debug Mode: 
            <Button 
              type="link" 
              size="small" 
              onClick={toggleDebugMode}
              style={{ padding: '0 4px' }}
            >
              {managerStatus.isDebugEnabled ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <Space>
        <Tooltip title={loading ? currentStage : "Fix failing XPaths using AI"}>
          <Badge count={failingCount > 0 ? failingCount : 0} size="small">
            <Button
              icon={<ToolOutlined />}
              onClick={onClick}
              loading={loading}
              disabled={failingCount === 0 || !managerStatus.hasXml}
              style={{ marginRight: '0' }}
              type={managerStatus.hasXml ? 'primary' : 'default'}
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
          <InfoCircleOutlined 
            style={{ 
              color: managerStatus.hasXml ? '#1890ff' : '#faad14', 
              cursor: 'pointer',
              fontSize: '16px' 
            }} 
          />
        </Popover>
      </Space>
    </div>
  );
};

export default XPathFixButton;