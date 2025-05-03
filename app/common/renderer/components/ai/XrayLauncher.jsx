import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'antd';
import { FullscreenOutlined, CloseOutlined } from '@ant-design/icons';
import AppiumAnalysisPanel from './AppiumAnalysisPanel';

/**
 * Launcher component for Xray/AI Studio functionality
 * Used to embed AI Studio within the inspector or launch it as full-screen modal
 */
const XrayLauncher = ({ 
  isInspectorActive = false, 
  sessionXml = '',
  sessionScreenshot = '',
  onClose = () => {}
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Track when launched from inspector to potentially import current session
  useEffect(() => {
    if (isModalOpen && isInspectorActive && !hasInitialized) {
      console.log("XrayLauncher: Initialized from inspector, could import current session");
      setHasInitialized(true);
      
      // In the future, we could add logic here to import the current session as a page
    }
  }, [isModalOpen, isInspectorActive, hasInitialized]);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    onClose();
  };

  return (
    <>
      <Button 
        type="primary" 
        icon={<FullscreenOutlined />} 
        onClick={showModal}
      >
        AI Studio
      </Button>

      <Modal
        title="AI Automation Studio"
        open={isModalOpen}
        onCancel={handleClose}
        footer={null}
        width="100%"
        style={{ top: 0, paddingBottom: 0 }}
        bodyStyle={{ height: 'calc(100vh - 55px)', padding: '0', overflow: 'hidden' }}
        closeIcon={<CloseOutlined />}
        maskClosable={false}
      >
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <AppiumAnalysisPanel
            isEmbedded={true}
            inspectorXml={sessionXml}
            inspectorScreenshot={sessionScreenshot}
            onClose={handleClose}
          />
        </div>
      </Modal>
    </>
  );
};

export default XrayLauncher;