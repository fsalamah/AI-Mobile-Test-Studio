import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Result, Spin, message, Steps, Typography, Space, Divider } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ImportOutlined } from '@ant-design/icons';
import { processBookmarkletData } from '../integration/AppiumBookmarklet';
import AppiumBridge from '../integration/AppiumBridge';
import useAppStore from '../store/appStore';
import { Page } from '../types/api';

const { Step } = Steps;
const { Title, Text, Paragraph } = Typography;

const AppiumImport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importedPage, setImportedPage] = useState<Page | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Get addPage function from store
  const addPage = useAppStore(state => state.addPage);
  const setCurrentPage = useAppStore(state => state.setCurrentPage);
  
  // Process the import data
  useEffect(() => {
    const processImport = async () => {
      try {
        setLoading(true);
        setCurrentStep(0);
        
        // Parse the query string
        const searchParams = new URLSearchParams(location.search);
        const importData = searchParams.get('data');
        
        if (!importData) {
          throw new Error('No import data provided');
        }
        
        // Process the data
        setCurrentStep(1);
        const appiumData = processBookmarkletData(importData);
        
        if (!appiumData) {
          throw new Error('Invalid import data format');
        }
        
        // Create a page from the data
        setCurrentStep(2);
        const page = AppiumBridge.handleDataFromAppium(appiumData);
        
        if (!page) {
          throw new Error('Failed to create page from Appium data');
        }
        
        // Add the page to the store
        setCurrentStep(3);
        const pageId = addPage(page);
        
        // Set current page ID in the store
        setCurrentPage(pageId);
        
        // Update state
        setImportedPage({ ...page, id: pageId });
        setCurrentStep(4);
        
        // Success message
        message.success('Successfully imported page from Appium Inspector');
      } catch (error: any) {
        console.error('Error processing import:', error);
        setError(error.message || 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    processImport();
  }, [location.search, addPage, setCurrentPage]);
  
  // Navigate to the page detail view
  const handleViewPage = () => {
    if (importedPage) {
      navigate(`/pages/${importedPage.id}`);
    }
  };
  
  // Navigate to the analyzer
  const handleGoToAnalyzer = () => {
    if (importedPage) {
      navigate('/analyzer', { state: { pageId: importedPage.id } });
    } else {
      navigate('/analyzer');
    }
  };
  
  // Go back to home
  const handleGoHome = () => {
    navigate('/');
  };
  
  // If there was an error
  if (error) {
    return (
      <Result
        status="error"
        title="Import Failed"
        subTitle={error}
        extra={[
          <Button type="primary" key="home" onClick={handleGoHome}>
            Go to Dashboard
          </Button>,
          <Button key="analyzer" onClick={() => navigate('/analyzer')}>
            Go to Analyzer
          </Button>,
        ]}
      />
    );
  }
  
  // If still loading
  if (loading) {
    return (
      <Card style={{ margin: '24px auto', maxWidth: 800 }}>
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Space direction="vertical" align="center">
            <Spin size="large" />
            <Title level={4}>Processing Appium Data</Title>
            <Steps current={currentStep} direction="vertical">
              <Step title="Receiving Data" description="Receiving data from Appium Inspector" />
              <Step title="Processing Data" description="Parsing and validating data format" />
              <Step title="Creating Page" description="Creating page from Appium data" />
              <Step title="Saving Page" description="Saving page to AI Studio" />
              <Step title="Complete" description="Import process complete" />
            </Steps>
          </Space>
        </div>
      </Card>
    );
  }
  
  // Import successful
  return (
    <Card style={{ margin: '24px auto', maxWidth: 800 }}>
      <Result
        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
        title="Import Successful"
        subTitle={`Successfully imported page "${importedPage?.name || 'Unknown Page'}" from Appium Inspector`}
        extra={[
          <Button type="primary" key="view" onClick={handleViewPage}>
            View Page
          </Button>,
          <Button key="analyze" onClick={handleGoToAnalyzer}>
            Analyze Page
          </Button>,
          <Button key="home" onClick={handleGoHome}>
            Go to Dashboard
          </Button>,
        ]}
      >
        <Divider />
        <div style={{ textAlign: 'left' }}>
          <Paragraph>
            <Title level={5}>Page Details:</Title>
            <ul>
              <li>
                <Text strong>Name:</Text> {importedPage?.name}
              </li>
              <li>
                <Text strong>Platform:</Text> {Object.keys(importedPage?.states[0].versions || {}).join(', ')}
              </li>
              <li>
                <Text strong>Description:</Text> {importedPage?.description}
              </li>
            </ul>
          </Paragraph>
          
          <Paragraph>
            <Text strong>Next Steps:</Text>
            <ul>
              <li>View the page details to see the screenshot and source</li>
              <li>Analyze the page to identify UI elements</li>
              <li>Generate code for your test automation</li>
            </ul>
          </Paragraph>
        </div>
      </Result>
    </Card>
  );
};

export default AppiumImport;