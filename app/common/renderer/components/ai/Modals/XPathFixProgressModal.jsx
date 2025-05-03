import React, { useState, useEffect } from 'react';
import { Modal, Typography, Progress, Card, List, Tag, Divider } from 'antd';
import { CheckCircleOutlined, LoadingOutlined, CloseCircleOutlined, CodeOutlined, GroupOutlined, ApiOutlined, SyncOutlined } from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;

/**
 * XPath Fix Progress Modal Component
 * Shows detailed progress of the XPath fix pipeline
 */
export const XPathFixProgressModal = () => {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'
  const [currentStage, setCurrentStage] = useState('');
  const [stageDetails, setStageDetails] = useState({});
  const [processingStats, setProcessingStats] = useState({
    totalFailingXPaths: 0,
    totalGroups: 0,
    currentGroup: 0,
    currentBatch: 0,
    totalBatches: 0,
    fixedCount: 0,
    errorCount: 0,
  });

  // Style variables
  const gradientBackground = "linear-gradient(135deg, #2b3074 0%, #191e3e 100%)";
  const accentColor = "#50e3c2";

  // Auto-increment progress during processing state
  useEffect(() => {
    if (visible && status === 'processing' && progress < 95) {
      const timer = setTimeout(() => {
        if (progress < 95) {
          setProgress(prev => prev + 0.5);
        }
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [visible, status, progress]);

  const getStageIcon = (stageName) => {
    const stageInfo = stageDetails[stageName] || {};
    const stageStatus = stageInfo.status || '';
    
    if (stageStatus === 'complete') {
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    } else if (stageStatus === 'error') {
      return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
    } else if (stageStatus === 'processing') {
      return <LoadingOutlined style={{ color: accentColor }} />;
    } else {
      return <LoadingOutlined style={{ opacity: 0.3 }} />;
    }
  };

  const getStageTag = (stageName) => {
    const stageInfo = stageDetails[stageName] || {};
    const stageStatus = stageInfo.status || '';
    
    if (stageStatus === 'complete') {
      return <Tag color="success">Complete</Tag>;
    } else if (stageStatus === 'error') {
      return <Tag color="error">Error</Tag>;
    } else if (stageStatus === 'processing') {
      return <Tag color="processing">Processing</Tag>;
    } else {
      return <Tag color="default">Pending</Tag>;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 24 }} />;
      case "error":
        return <CloseCircleOutlined style={{ color: "#f5222d", fontSize: 24 }} />;
      default:
        return <LoadingOutlined style={{ color: accentColor, fontSize: 24 }} />;
    }
  };

  // Define the stages of XPath fixing process
  const stages = [
    {
      key: 'grouping',
      title: 'Grouping Elements',
      description: 'Organizing elements by state and platform',
      icon: <GroupOutlined />
    },
    {
      key: 'stateData',
      title: 'Loading State Data',
      description: 'Associating screenshots and XML with groups',
      icon: <CodeOutlined />
    },
    {
      key: 'processing',
      title: 'Processing Groups',
      description: 'Generating XPath repairs in batches',
      icon: <ApiOutlined />
    },
    {
      key: 'validation',
      title: 'Validating XPaths',
      description: 'Testing repaired XPaths against source',
      icon: <SyncOutlined />
    },
    {
      key: 'updating',
      title: 'Updating Elements',
      description: 'Applying fixes to original elements',
      icon: <CheckCircleOutlined />
    }
  ];

  // Public methods
  const show = (data = {}) => {
    const { totalFailingXPaths = 0 } = data;
    
    setVisible(true);
    setProgress(0);
    setStatus('processing');
    setCurrentStage('Initializing XPath fix process');
    setStageDetails({
      grouping: { status: 'processing', details: 'Starting...' },
      stateData: { status: 'pending' },
      processing: { status: 'pending' },
      validation: { status: 'pending' },
      updating: { status: 'pending' }
    });
    setProcessingStats({
      totalFailingXPaths,
      totalGroups: 0,
      currentGroup: 0,
      currentBatch: 0,
      totalBatches: 0,
      fixedCount: 0,
      errorCount: 0
    });
  };

  const updateStage = (stage, stageStatus, details = '', stats = {}) => {
    // Update current stage
    setCurrentStage(stages.find(s => s.key === stage)?.title || stage);
    
    // Update stage details
    setStageDetails(prev => ({
      ...prev,
      [stage]: { status: stageStatus, details }
    }));
    
    // Update stats
    setProcessingStats(prev => ({
      ...prev,
      ...stats
    }));
    
    // Update progress based on stages completion
    const stageProgress = {
      grouping: 10,
      stateData: 20,
      processing: 60,
      validation: 80,
      updating: 95
    };
    
    if (stageStatus === 'complete' && stageProgress[stage]) {
      setProgress(stageProgress[stage]);
    }
  };

  const updateBatchProgress = (batchNum, totalBatches, fixedInBatch, errorsInBatch) => {
    const batchProgress = (batchNum / totalBatches) * 40; // 40% of progress for batches (between 20% and 60%)
    
    setProgress(20 + batchProgress);
    setProcessingStats(prev => ({
      ...prev,
      currentBatch: batchNum,
      totalBatches,
      fixedCount: prev.fixedCount + (fixedInBatch || 0),
      errorCount: prev.errorCount + (errorsInBatch || 0)
    }));
  };

  const complete = (success = true, finalStats = {}) => {
    setStatus(success ? 'success' : 'error');
    setProgress(100);
    setProcessingStats(prev => ({
      ...prev,
      ...finalStats
    }));
    
    // Auto-close after success
    if (success) {
      setTimeout(() => {
        setVisible(false);
      }, 3000);
    }
  };

  const hide = () => {
    setVisible(false);
  };

  // Modal content
  return {
    modalComponent: (
      <Modal
        visible={visible}
        title={null}
        footer={null}
        closable={status !== 'processing'}
        onCancel={hide}
        centered
        width={650}
        bodyStyle={{
          padding: '24px',
          background: '#fff',
          borderRadius: '8px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            {getStatusIcon()}
          </div>
          
          <Title level={4}>
            {status === 'success' ? 'XPath Repairs Complete' : 
             status === 'error' ? 'XPath Repair Error' : 
             'Repairing XPaths'}
          </Title>
          
          <Paragraph type="secondary">
            {currentStage}
          </Paragraph>
          
          {status === 'processing' && (
            <Progress
              percent={Math.round(progress)}
              status="active"
              strokeColor={accentColor}
              style={{ marginBottom: '24px' }}
            />
          )}
        </div>
        
        <Card
          title="Process Details"
          size="small"
          bordered={false}
          style={{ marginBottom: '16px', background: '#f9f9f9' }}
        >
          <List
            size="small"
            dataSource={stages}
            renderItem={stage => (
              <List.Item
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <div style={{ marginRight: '12px' }}>
                    {getStageIcon(stage.key)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong>{stage.title}</Text>
                      {getStageTag(stage.key)}
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {stage.description}
                    </Text>
                    {stageDetails[stage.key]?.details && (
                      <div style={{ marginTop: '4px', fontSize: '12px' }}>
                        <Text italic>{stageDetails[stage.key].details}</Text>
                      </div>
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </Card>
        
        <Divider style={{ margin: '12px 0' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <StatItem label="Failing XPaths" value={processingStats.totalFailingXPaths} />
          <StatItem label="Groups" value={`${processingStats.currentGroup}/${processingStats.totalGroups}`} />
          <StatItem label="Batches" value={`${processingStats.currentBatch}/${processingStats.totalBatches}`} />
          <StatItem label="Fixed" value={processingStats.fixedCount} color="#52c41a" />
          <StatItem label="Failed" value={processingStats.errorCount} color="#f5222d" />
        </div>
      </Modal>
    ),
    show,
    updateStage,
    updateBatchProgress,
    complete,
    hide
  };
};

// Helper component for statistics display
const StatItem = ({ label, value, color }) => (
  <div style={{ textAlign: 'center', margin: '0 10px' }}>
    <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>{label}</Text>
    <Text strong style={{ color }}>{value}</Text>
  </div>
);

// Singleton pattern setup
let xpathFixProgressModalInstance = null;

export const createXPathFixProgressModal = () => {
  // For server-side rendering safety
  if (typeof window === 'undefined') {
    return {
      show: () => {},
      updateStage: () => {},
      updateBatchProgress: () => {},
      complete: () => {},
      hide: () => {},
      XPathFixProgressModalComponent: () => null
    };
  }

  // Component with instance controls
  const XPathFixProgressModalInstance = () => {
    const {
      modalComponent,
      show,
      updateStage,
      updateBatchProgress,
      complete,
      hide
    } = XPathFixProgressModal();
    
    // Save reference to methods
    React.useEffect(() => {
      xpathFixProgressModalInstance = {
        show,
        updateStage,
        updateBatchProgress,
        complete,
        hide
      };
      
      return () => {
        xpathFixProgressModalInstance = null;
      };
    }, []);
    
    return modalComponent;
  };
  
  return {
    XPathFixProgressModalComponent: XPathFixProgressModalInstance
  };
};

export const getXPathFixProgressModalControls = () => {
  if (!xpathFixProgressModalInstance) {
    console.warn('XPathFixProgressModal not mounted yet. Ensure XPathFixProgressModalComponent is rendered in your app.');
    return {
      show: () => {},
      updateStage: () => {},
      updateBatchProgress: () => {},
      complete: () => {},
      hide: () => {}
    };
  }
  
  return xpathFixProgressModalInstance;
};

export default XPathFixProgressModal;