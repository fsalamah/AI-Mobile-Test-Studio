import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Card, 
  Button, 
  Space, 
  Table, 
  Tag, 
  Steps,
  Alert,
  Spin,
  Divider,
  Select,
  notification,
  Breadcrumb,
  Collapse,
  Empty,
  Tooltip
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  RocketOutlined,
  EyeOutlined,
  SaveOutlined,
  SettingOutlined,
  RollbackOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import useAppStore from '../store/appStore';
import { ElementWithLocator, Page, XPathRepairRequest } from '../types/api';
import { useJobPolling } from '../hooks/useJobPolling';
import apiClient from '../services/apiClient';
import ScreenshotViewer from '../components/analysis/ScreenshotViewer';

const { Title, Paragraph, Text } = Typography;
const { Step } = Steps;
const { Option } = Select;
const { Panel } = Collapse;

const XPathFixer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get pageId from URL query parameters
  const params = new URLSearchParams(location.search);
  const pageId = params.get('pageId');

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedElements, setSelectedElements] = useState<ElementWithLocator[]>([]);
  const [fixedElements, setFixedElements] = useState<ElementWithLocator[]>([]);
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get data from store
  const pages = useAppStore(state => state.pages);
  const updatePage = useAppStore(state => state.updatePage);
  const addOperation = useAppStore(state => state.addOperation);
  const updateOperation = useAppStore(state => state.updateOperation);

  // Find the current page
  const page = pages.find(p => p.id === pageId);

  // Job polling hook
  const { startJob, jobStatus, jobResult } = useJobPolling();

  // Set active platform when the page loads
  useEffect(() => {
    if (page && page.states.length > 0) {
      // Set active platform
      const firstState = page.states[0];
      const platforms = Object.keys(firstState.versions);
      if (platforms.length > 0) {
        setActivePlatform(platforms[0]);
      }
    }
  }, [page]);

  // Handle navigation if page doesn't exist
  useEffect(() => {
    if (!page && pageId) {
      notification.error({
        message: 'Page not found',
        description: 'The requested page could not be found.'
      });
      navigate('/projects');
    }
  }, [page, pageId, navigate]);

  if (!page) {
    return null; // Render nothing while redirecting
  }

  // Get the active state data (using first state)
  const currentState = page.states.length > 0 ? page.states[0] : null;
  
  // Get the active platform data
  const currentPlatformData = currentState && activePlatform
    ? currentState.versions[activePlatform]
    : null;

  // Start XPath fixing process
  const handleStartXPathFixer = async () => {
    if (!selectedElements.length) {
      notification.warning({
        message: 'No elements selected',
        description: 'Please select at least one element to fix XPaths for.'
      });
      return;
    }

    setLoading(true);
    setCurrentStep(1);
    setError(null);

    // Create an operation record
    const operationId = addOperation({
      type: 'xpath-repair',
      pageId: pageId!,
      status: 'pending'
    });

    try {
      const request: XPathRepairRequest = {
        elements: selectedElements,
        page: page
      };

      const jobId = await startJob(
        () => apiClient.startXPathRepair(request),
        () => (id: string) => apiClient.getJobStatus(id)
      );

      // Update the operation status
      updateOperation(operationId, {
        status: 'processing'
      });

      // The job polling hook will handle the rest
    } catch (error) {
      setError('Failed to start XPath repair job. Please try again.');
      setLoading(false);
      
      // Update the operation status
      updateOperation(operationId, {
        status: 'failed'
      });
    }
  };

  // Save fixed XPaths
  const handleSaveFixedXPaths = () => {
    if (!fixedElements.length) return;

    try {
      // Implement logic to save fixed XPaths
      // This is a placeholder for the actual implementation

      notification.success({
        message: 'XPaths saved',
        description: 'The fixed XPaths have been saved successfully.'
      });

      // Navigate back to the page detail
      navigate(`/pages/${pageId}`);
    } catch (error) {
      notification.error({
        message: 'Save error',
        description: 'There was an error saving the fixed XPaths. Please try again.'
      });
    }
  };

  // Table columns for element selection
  const elementColumns = [
    {
      title: 'Dev Name',
      dataIndex: 'devName',
      key: 'devName',
    },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      render: (platform: string) => (
        <Tag color={platform === 'ios' ? 'blue' : 'green'}>
          {platform.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'XPath Status',
      key: 'status',
      render: (text: string, record: ElementWithLocator) => (
        record.xpath ? (
          record.xpath.success ? (
            <Tag icon={<CheckCircleOutlined />} color="success">
              Valid
            </Tag>
          ) : (
            <Tag icon={<CloseCircleOutlined />} color="error">
              Invalid
            </Tag>
          )
        ) : (
          <Tag color="warning">
            No XPath
          </Tag>
        )
      ),
    },
    {
      title: 'Current XPath',
      dataIndex: ['xpath', 'expression'],
      key: 'xpath',
      ellipsis: true,
    },
    {
      title: 'Action',
      key: 'action',
      render: (text: string, record: ElementWithLocator) => (
        <Space size="small">
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => {
              // View element action
            }}
          >
            View
          </Button>
        </Space>
      ),
    },
  ];

  // Table columns for fixed XPaths
  const fixedXPathColumns = [
    {
      title: 'Dev Name',
      dataIndex: 'devName',
      key: 'devName',
    },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      render: (platform: string) => (
        <Tag color={platform === 'ios' ? 'blue' : 'green'}>
          {platform.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Original XPath',
      dataIndex: ['xpath', 'expression'],
      key: 'originalXpath',
      ellipsis: true,
      render: (text: string, record: ElementWithLocator) => (
        <Tooltip title={text}>
          <Text 
            style={{ 
              width: 250, 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              display: 'inline-block',
              textDecoration: record.xpath?.success ? 'none' : 'line-through',
              color: record.xpath?.success ? 'inherit' : '#ff4d4f'
            }}
          >
            {text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Fixed XPath',
      dataIndex: 'alternativeXpaths',
      key: 'fixedXpath',
      render: (alternativeXpaths: string[], record: ElementWithLocator) => (
        alternativeXpaths && alternativeXpaths.length > 0 ? (
          <Tooltip title={alternativeXpaths[0]}>
            <Text 
              style={{ 
                width: 250, 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                display: 'inline-block',
                color: '#52c41a'
              }}
            >
              {alternativeXpaths[0]}
            </Text>
          </Tooltip>
        ) : (
          <Text type="danger">No alternative found</Text>
        )
      ),
    },
    {
      title: 'Status',
      key: 'fixStatus',
      render: (text: string, record: ElementWithLocator) => (
        record.alternativeXpaths && record.alternativeXpaths.length > 0 ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Fixed
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">
            Not Fixed
          </Tag>
        )
      ),
    },
  ];

  // Fake data for demonstration
  // In a real implementation, these would come from the page data
  const fakeElements: ElementWithLocator[] = [
    {
      devName: 'LoginButton',
      platform: 'ios',
      xpath: {
        expression: '//XCUIElementTypeButton[@name="Login"]',
        success: false,
        numberOfMatches: 0,
        error: 'Element not found'
      }
    },
    {
      devName: 'UsernameInput',
      platform: 'ios',
      xpath: {
        expression: '//XCUIElementTypeTextField[@value="Username"]',
        success: true,
        numberOfMatches: 1
      }
    },
    {
      devName: 'PasswordInput',
      platform: 'ios',
      xpath: {
        expression: '//XCUIElementTypeSecureTextField[@value="Password"]',
        success: true,
        numberOfMatches: 1
      }
    },
    {
      devName: 'LoginButton',
      platform: 'android',
      xpath: {
        expression: '//android.widget.Button[@text="LOGIN"]',
        success: false,
        numberOfMatches: 0,
        error: 'Element not found'
      }
    }
  ];

  // Fake data for fixed elements
  const fakeFixedElements: ElementWithLocator[] = [
    {
      devName: 'LoginButton',
      platform: 'ios',
      xpath: {
        expression: '//XCUIElementTypeButton[@name="Login"]',
        success: false,
        numberOfMatches: 0,
        error: 'Element not found'
      },
      alternativeXpaths: [
        '//XCUIElementTypeButton[@name="log-in"]',
        '//XCUIElementTypeButton[contains(@name, "log")]'
      ]
    },
    {
      devName: 'LoginButton',
      platform: 'android',
      xpath: {
        expression: '//android.widget.Button[@text="LOGIN"]',
        success: false,
        numberOfMatches: 0,
        error: 'Element not found'
      },
      alternativeXpaths: [
        '//android.widget.Button[@content-desc="login_button"]',
        '//android.widget.Button[contains(@text, "LOG")]'
      ]
    }
  ];

  const renderSelectElementsStep = () => {
    return (
      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={4}>Select Elements to Fix</Title>
          <Paragraph>
            Select the elements that have broken or invalid XPaths that you want to fix.
          </Paragraph>

          <Space style={{ marginBottom: 16 }}>
            <Text strong>Platform:</Text>
            <Select 
              value={activePlatform} 
              onChange={setActivePlatform}
              style={{ width: 150 }}
              disabled={!currentState}
            >
              {currentState && Object.keys(currentState.versions).map(platform => (
                <Option key={platform} value={platform}>
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </Option>
              ))}
            </Select>
            <Button 
              onClick={() => {
                // Select all invalid XPaths
                const invalidElements = fakeElements.filter(
                  elem => !elem.xpath?.success
                );
                setSelectedElements(invalidElements);
              }}
            >
              Select All Invalid XPaths
            </Button>
          </Space>

          <Table
            rowSelection={{
              type: 'checkbox',
              onChange: (selectedRowKeys, selectedRows) => {
                setSelectedElements(selectedRows);
              },
              selectedRowKeys: selectedElements.map((el, index) => index)
            }}
            dataSource={fakeElements.map((elem, index) => ({ ...elem, key: index }))}
            columns={elementColumns}
          />

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button icon={<RollbackOutlined />} onClick={() => navigate(`/pages/${pageId}`)}>
              Back to Page
            </Button>
            <Button 
              type="primary" 
              icon={<RocketOutlined />} 
              onClick={handleStartXPathFixer}
              disabled={selectedElements.length === 0}
            >
              Fix Selected XPaths
            </Button>
          </div>
        </Space>
      </Card>
    );
  };

  const renderProcessingStep = () => {
    return (
      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={4}>Fixing XPaths</Title>

          {error ? (
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
            />
          ) : loading && (!jobStatus || jobStatus.status === 'pending' || jobStatus.status === 'processing') ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
              <Paragraph style={{ marginTop: 16 }}>
                Analyzing and fixing XPaths...
              </Paragraph>
              {jobStatus && jobStatus.progress && (
                <Paragraph>
                  Progress: {jobStatus.progress}%
                </Paragraph>
              )}
            </div>
          ) : jobStatus && jobStatus.status === 'completed' ? (
            <div>
              <Alert
                message="XPath Repair Complete"
                description="The XPaths have been analyzed and fixed successfully."
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Table
                dataSource={fakeFixedElements.map((elem, index) => ({ ...elem, key: index }))}
                columns={fixedXPathColumns}
              />

              <Divider />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={() => setCurrentStep(0)}>
                  Back
                </Button>
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />} 
                  onClick={handleSaveFixedXPaths}
                >
                  Save Fixed XPaths
                </Button>
              </div>
            </div>
          ) : (
            <Alert
              message="XPath Repair Failed"
              description="There was an error fixing the XPaths. Please try again."
              type="error"
              showIcon
            />
          )}
        </Space>
      </Card>
    );
  };

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="/projects">Projects</Link>
        </Breadcrumb.Item>
        {page.projectId && (
          <Breadcrumb.Item>
            <Link to={`/projects/${page.projectId}`}>Project</Link>
          </Breadcrumb.Item>
        )}
        <Breadcrumb.Item>
          <Link to={`/pages/${pageId}`}>{page.name}</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>XPath Fixer</Breadcrumb.Item>
      </Breadcrumb>

      <Title level={2}>XPath Fixer</Title>
      <Paragraph>
        Identify and fix broken XPaths in your page elements to ensure reliable test automation.
      </Paragraph>

      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        <Step title="Select Elements" icon={<SettingOutlined />} />
        <Step title="Fix XPaths" icon={<RocketOutlined />} />
      </Steps>

      <div style={{ marginTop: 24 }}>
        {currentStep === 0 && renderSelectElementsStep()}
        {currentStep === 1 && renderProcessingStep()}
      </div>
    </div>
  );
};

export default XPathFixer;