/**
 * AIModuleHome Component
 * 
 * This component serves as the main dashboard/home for the AI Module,
 * providing access to Pages, Recordings, Tests, and Generated Classes.
 */
import React, { useState, useEffect } from 'react';
import { Layout, Tabs, Typography, Button, Space, Empty, message } from 'antd';
import {
  PlusOutlined,
  LayoutOutlined,
  BookOutlined,
  FileTextOutlined,
  CodeOutlined,
  RobotOutlined,
  SettingOutlined
} from '@ant-design/icons';
import PageTreeAdapter from './PageTreeAdapter';
import { loadProjectState } from '../../../lib/ai/projectStateManager';

const { Content } = Layout;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

const AIModuleHome = ({ 
  inspectorState,
  navigateToModelConfig,
  navigateToRecordingView,
  navigateToPageDetail,
}) => {
  // State for pages, recordings, and other data
  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [activeTab, setActiveTab] = useState('pages');

  // Load project data when component mounts
  useEffect(() => {
    loadProjectData();
  }, []);

  // Function to load project data
  const loadProjectData = () => {
    try {
      const { pages = [], selectedPageId } = loadProjectState();
      // Filter only page-type entries, not recordings
      const pageEntries = pages.filter(page => page.type !== "recording");
      setPages(pageEntries);
      if (selectedPageId) {
        setSelectedPageId(selectedPageId);
      }
    } catch (error) {
      console.error("Error loading project data:", error);
      message.error("Failed to load project data");
    }
  };

  // Handle page selection
  const handlePageSelect = (pageId) => {
    setSelectedPageId(pageId);
    const selectedPage = pages.find(page => page.id === pageId);
    
    if (selectedPage) {
      // Navigate to page detail view
      navigateToPageDetail(selectedPage);
    }
  };

  // Handle tab change
  const handleTabChange = (key) => {
    setActiveTab(key);
    
    // Handle navigation based on tab
    if (key === 'recordings') {
      // Navigate to recording view with side panel visible
      navigateToRecordingView({ keepSidePanelVisible: true });
    } else if (key === 'models') {
      // Navigate to AI model configuration
      navigateToModelConfig();
    }
  };

  return (
    <Layout style={{ 
      height: '100%', 
      background: '#fff',
      display: 'flex',
      flexDirection: 'column' 
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #f0f0f0',
        background: '#fafafa'
      }}>
        <Title level={4} style={{ margin: 0 }}>Appium AI Studio</Title>
      </div>
      
      {/* Main Content */}
      <Content style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <Tabs 
          activeKey={activeTab}
          onChange={handleTabChange}
          size="large"
          tabBarStyle={{ marginBottom: '24px' }}
        >
          {/* Pages Tab */}
          <TabPane 
            tab={<span><LayoutOutlined /> Pages</span>}
            key="pages"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <Title level={5} style={{ margin: 0 }}>Page Objects</Title>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => document.dispatchEvent(new CustomEvent('showNewPageModal'))}
              >
                New Page
              </Button>
            </div>

            {pages.length > 0 ? (
              <div style={{ 
                border: '1px solid #f0f0f0', 
                borderRadius: '8px',
                padding: '16px',
                background: '#fafafa'
              }}>
                <PageTreeAdapter 
                  pages={pages}
                  selectedIds={selectedPageId ? [selectedPageId] : []}
                  onSelect={handlePageSelect}
                  setPages={setPages}
                />
              </div>
            ) : (
              <Empty 
                description="No pages created yet" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => document.dispatchEvent(new CustomEvent('showNewPageModal'))}
                >
                  Create Page
                </Button>
              </Empty>
            )}
          </TabPane>

          {/* Recordings Tab */}
          <TabPane 
            tab={<span><BookOutlined /> Recordings</span>}
            key="recordings"
          >
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <BookOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px' }} />
              <Title level={5}>View and Manage Recordings</Title>
              <Text type="secondary">Create, edit, and analyze recorded user interactions</Text>
              <div style={{ marginTop: '24px' }}>
                <Button 
                  type="primary" 
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={() => navigateToRecordingView({ keepSidePanelVisible: true })}
                >
                  Go to Recordings
                </Button>
              </div>
            </div>
          </TabPane>

          {/* Test Cases Tab */}
          <TabPane 
            tab={<span><FileTextOutlined /> Test Cases</span>}
            key="tests"
          >
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <FileTextOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px' }} />
              <Title level={5}>Test Cases</Title>
              <Text type="secondary">Create and manage automated test cases</Text>
              <div style={{ marginTop: '24px' }}>
                <Button type="primary" size="large" icon={<PlusOutlined />}>
                  Create Test Case
                </Button>
              </div>
            </div>
          </TabPane>

          {/* Generated Classes Tab */}
          <TabPane 
            tab={<span><CodeOutlined /> Generated Classes</span>}
            key="classes"
          >
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <CodeOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px' }} />
              <Title level={5}>Generated Classes</Title>
              <Text type="secondary">View and export generated Page Object classes</Text>
              <div style={{ marginTop: '24px' }}>
                <Button type="primary" size="large" icon={<PlusOutlined />}>
                  Generate Classes
                </Button>
              </div>
            </div>
          </TabPane>

          {/* AI Model Configuration Tab */}
          <TabPane 
            tab={<span><RobotOutlined /> AI Models</span>}
            key="models"
          >
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <RobotOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px' }} />
              <Title level={5}>AI Model Configuration</Title>
              <Text type="secondary">Configure AI models and parameters</Text>
              <div style={{ marginTop: '24px' }}>
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<SettingOutlined />}
                  onClick={navigateToModelConfig}
                >
                  Configure Models
                </Button>
              </div>
            </div>
          </TabPane>
        </Tabs>
      </Content>
    </Layout>
  );
};

export default AIModuleHome;