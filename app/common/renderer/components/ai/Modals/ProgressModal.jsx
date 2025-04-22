// ProgressModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Typography, Progress } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, LoadingOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

// Create a component that contains both the modal and its controller
export const ProgressModal = () => {
  const [progressPopupVisible, setProgressPopupVisible] = useState(false);
  const [progressData, setProgressData] = useState({
    message: "",
    timestamp: new Date().toLocaleTimeString(),
    status: "processing", // can be "processing", "success", "error"
  });
  const [progressPercentage, setProgressPercentage] = useState(0);

  // Auto-increment progress while in processing state
  useEffect(() => {
    if (progressPopupVisible && progressData.status === "processing") {
      const timer = setInterval(() => {
        setProgressPercentage(prev => {
          const newValue = prev + 5;
          if (newValue >= 100) {
            clearInterval(timer);
            return 100;
          }
          return newValue;
        });
      }, 500);
      
      return () => clearInterval(timer);
    }
  }, [progressPopupVisible, progressData.status]);

  // Style variables
  const gradientBackground = "linear-gradient(135deg, #2b3074 0%, #191e3e 100%)";
  const accentColor = "#50e3c2";

  const getStatusIcon = () => {
    switch (progressData.status) {
      case "success":
        return <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 24 }} />;
      case "error":
        return <CloseCircleOutlined style={{ color: "#f5222d", fontSize: 24 }} />;
      default:
        return <LoadingOutlined style={{ color: accentColor, fontSize: 24 }} />;
    }
  };

  // Define public methods that will be exposed
  const showProgressPopup = (message, status = "processing") => {
    setProgressData({
      message,
      timestamp: new Date().toLocaleTimeString(),
      status
    });
    setProgressPercentage(0);
    setProgressPopupVisible(true);
  };

  const updateProgressPopupMessage = (message, status = "processing") => {
    setProgressData(prev => ({
      ...prev,
      message,
      timestamp: new Date().toLocaleTimeString(),
      status
    }));
  };

  const hideProgressPopup = () => {
    setProgressPopupVisible(false);
    setProgressData({
      message: "",
      timestamp: new Date().toLocaleTimeString(),
      status: "processing"
    });
    setProgressPercentage(0);
  };

  // Return the modal JSX
  return {
    modalComponent: (
      <Modal
        visible={progressPopupVisible}
        footer={null}
        closable={false}
        centered
        width={400}
        bodyStyle={{ 
          padding: "32px",
          background: gradientBackground,
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)"
        }}
      >
        <div className="flex flex-col items-center">
          <div className="mb-4">
            {getStatusIcon()}
          </div>
          
          <Title level={4} className="mb-2 text-white">
            {progressData.status === "success" ? "Complete" : "Processing"}
          </Title>
          
          <Text className="mb-4 text-gray-300">
            {progressData.message}
          </Text>
          
          {progressData.status === "processing" && (
            <Progress 
              percent={progressPercentage} 
              status="active" 
              strokeColor={accentColor}
              className="w-full mb-4"
            />
          )}
          
          <div className="flex items-center mt-2">
            <ClockCircleOutlined className="mr-2 text-gray-400" />
            <Text className="text-gray-400">
              {progressData.timestamp}
            </Text>
          </div>
        </div>
      </Modal>
    ),
    showProgressPopup,
    updateProgressPopupMessage,
    hideProgressPopup
  };
};

// Create a proper instance for external use
let progressModalInstance = null;

// Export a singleton pattern to access the progress modal from anywhere
export const createProgressModal = () => {
  // For server-side rendering safety
  if (typeof window === 'undefined') {
    return {
      showProgressPopup: () => {},
      updateProgressPopupMessage: () => {},
      hideProgressPopup: () => {},
      ProgressModalComponent: () => null
    };
  }

  // This needs to be used within a component
  const ProgressModalInstance = () => {
    const {
      modalComponent,
      showProgressPopup,
      updateProgressPopupMessage,
      hideProgressPopup
    } = ProgressModal();
    
    // Save reference to methods when component mounts
    React.useEffect(() => {
      progressModalInstance = {
        showProgressPopup,
        updateProgressPopupMessage,
        hideProgressPopup
      };
      
      return () => {
        progressModalInstance = null;
      };
    }, []);
    
    return modalComponent;
  };
  
  return {
    ProgressModalComponent: ProgressModalInstance
  };
};

export const getProgressModalControls = () => {
  if (!progressModalInstance) {
    console.warn('ProgressModal not mounted yet. Make sure ProgressModalComponent is rendered in your app.');
    return {
      showProgressPopup: () => {},
      updateProgressPopupMessage: () => {},
      hideProgressPopup: () => {}
    };
  }
  
  return progressModalInstance;
};

export default ProgressModal;