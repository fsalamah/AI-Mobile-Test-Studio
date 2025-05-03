import React, { useState } from 'react';
import { 
  Typography, 
  Steps, 
  Button, 
  Card, 
  Space, 
  Select, 
  Divider, 
  Alert,
  notification,
  Form,
  Input,
  Spin,
  Radio,
  Collapse
} from 'antd';
import {
  UploadOutlined,
  RocketOutlined,
  CodeOutlined,
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/appStore';
import FileUploader from '../components/common/FileUploader';
import { useJobPolling } from '../hooks/useJobPolling';
import ScreenshotViewer from '../components/analysis/ScreenshotViewer';
import apiClient from '../services/apiClient';
import { Page, VisualAnalysisRequest } from '../types/api';

const { Title, Paragraph, Text } = Typography;
const { Step } = Steps;
const { Panel } = Collapse;
const { Option } = Select;

const PageAnalyzer: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [pageData, setPageData] = useState<Partial<Page> | null>(null);
  const [platforms, setPlatforms] = useState<string[]>(['ios', 'android']);
  const [loading, setLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Get data from store
  const addPage = useAppStore(state => state.addPage);
  const projects = useAppStore(state => state.projects);
  const updateProject = useAppStore(state => state.updateProject);
  const addOperation = useAppStore(state => state.addOperation);
  const updateOperation = useAppStore(state => state.updateOperation);

  const { startJob, jobStatus, jobResult } = useJobPolling();
  
  // Handle file upload for page source and screenshot
  const handleFileUploaded = (fileData: any) => {
    try {
      // Process the uploaded files
      // This is a placeholder for the actual implementation
      const parsedData = {
        name: 'New Page',
        description: '',
        states: [
          {
            id: Date.now().toString(),
            title: 'Initial State',
            description: 'Initial state of the page',
            versions: {
              // Sample data structure, to be replaced with actual parsed data
              android: {
                screenShot: fileData.androidScreenshot || '',
                pageSource: fileData.androidSource || ''
              },
              ios: {
                screenShot: fileData.iosScreenshot || '',
                pageSource: fileData.iosSource || ''
              }
            }
          }
        ]
      };
      
      setPageData(parsedData);
      
      // Move to the next step
      if (fileData.androidScreenshot || fileData.iosScreenshot) {
        setCurrentStep(1);
      } else {
        notification.error({
          message: 'Upload error',
          description: 'Please upload at least one screenshot file.'
        });
      }
    } catch (error) {
      notification.error({
        message: 'Upload error',
        description: 'There was an error processing the uploaded files. Please try again.'
      });
    }
  };

  // Handle configuration form submission
  const handleConfigSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Update page data with form values
      setPageData(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          name: values.name,
          description: values.description
        };
      });
      
      // Start analysis
      setCurrentStep(2);
      setLoading(true);
      setAnalysisError(null);
      
      // Start the visual analysis job
      if (pageData) {
        const fullPageData = {
          ...pageData,
          name: values.name,
          description: values.description
        } as Page;
        
        // Create an operation record
        const operationId = addOperation({
          type: 'visual-analysis',
          pageId: 'temp', // Will be updated when page is saved
          status: 'pending'
        });
        
        // Start analysis job
        try {
          const request: VisualAnalysisRequest = {
            page: fullPageData as Page,
            osVersions: platforms
          };
          
          const jobId = await startJob(
            () => apiClient.startVisualAnalysis(fullPageData, platforms),
            () => (id: string) => apiClient.getJobStatus(id)
          );
          
          // Update the operation status
          updateOperation(operationId, {
            status: 'processing'
          });
          
          // The job polling hook will handle the rest
        } catch (error) {
          setAnalysisError('Failed to start analysis job. Please try again.');
          setLoading(false);
          
          // Update the operation status
          updateOperation(operationId, {
            status: 'failed'
          });
        }
      }
    } catch (error) {
      // Form validation error
    }
  };

  // Handle saving the analyzed page to a project
  const handleSavePage = async () => {
    if (!pageData || !jobResult) return;
    
    try {
      // Create a new page with the analysis results
      const newPage: Omit<Page, 'id'> = {
        ...pageData as Page,
        // Add analysis results to the page data
        // This is a placeholder for the actual implementation
      };
      
      // Add the page to the store
      const pageId = addPage(newPage);
      
      // If a project is selected, add the page to that project
      const projectId = form.getFieldValue('projectId');
      if (projectId) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
          updateProject(projectId, {
            pages: [...project.pages, pageId],
            updatedAt: new Date().toISOString()
          });
        }
      }
      
      notification.success({
        message: 'Page saved',
        description: 'The page has been saved successfully.'
      });
      
      // Navigate to the page detail view
      navigate(`/pages/${pageId}`);
    } catch (error) {
      notification.error({
        message: 'Save error',
        description: 'There was an error saving the page. Please try again.'
      });
    }
  };

  const renderUploadStep = () => {
    return (
      <Card>
        <Title level={4}>Upload App Files</Title>
        <Paragraph>
          Upload your app's screenshot and source XML files to analyze. You can upload files for multiple platforms.
        </Paragraph>
        
        <FileUploader
          onFileUploaded={handleFileUploaded}
          acceptedFileTypes=".png,.jpg,.jpeg,.xml,.json"
          description="Upload screenshot images (PNG/JPG) and XML source files"
          multiple={true}
          allowDrop={true}
        />
        
        <Divider />
        
        <Paragraph type="secondary">
          You can also import Appium Inspector session files or connect to an existing Appium Inspector session.
        </Paragraph>
        
        <Space>
          <Button icon={<UploadOutlined />}>
            Import Appium Session
          </Button>
        </Space>
      </Card>
    );
  };

  const renderConfigStep = () => {
    if (!pageData) return null;
    
    return (
      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={4}>Configure Analysis</Title>
          
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              name: pageData.name || 'New Page',
              description: pageData.description || '',
              platforms: platforms,
              projectId: ''
            }}
          >
            <Form.Item
              name="name"
              label="Page Name"
              rules={[{ required: true, message: 'Please enter a page name' }]}
            >
              <Input placeholder="Enter a name for this page" />
            </Form.Item>
            
            <Form.Item
              name="description"
              label="Description"
            >
              <Input.TextArea 
                placeholder="Enter a description for this page"
                rows={3}
              />
            </Form.Item>
            
            <Form.Item
              name="platforms"
              label="Platforms to Analyze"
            >
              <Select
                mode="multiple"
                placeholder="Select platforms"
                onChange={(values) => setPlatforms(values)}
              >
                <Option value="ios">iOS</Option>
                <Option value="android">Android</Option>
                <Option value="web">Web</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="projectId"
              label="Save to Project (Optional)"
            >
              <Select
                placeholder="Select a project"
                allowClear
              >
                {projects.map(project => (
                  <Option key={project.id} value={project.id}>{project.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
          
          <Divider />
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setCurrentStep(0)}>
              Back
            </Button>
            <Button type="primary" onClick={handleConfigSubmit}>
              Start Analysis
            </Button>
          </div>
        </Space>
      </Card>
    );
  };

  const renderAnalysisStep = () => {
    return (
      <Card>
        <Title level={4}>Analysis in Progress</Title>
        
        {analysisError ? (
          <Alert
            message="Analysis Error"
            description={analysisError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : loading && (!jobStatus || jobStatus.status === 'pending' || jobStatus.status === 'processing') ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
            <Paragraph style={{ marginTop: 16 }}>
              Analyzing page elements...
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
              message="Analysis Complete"
              description="The visual analysis has been completed successfully."
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Collapse defaultActiveKey={['1']}>
              <Panel header="Analysis Results" key="1">
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  {/* Display analysis results here */}
                  <Paragraph>
                    Found {jobResult?.elements?.length || 0} elements on the page.
                  </Paragraph>
                  
                  {/* This is a placeholder for the actual results */}
                  <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
                    {JSON.stringify(jobResult, null, 2)}
                  </pre>
                </div>
              </Panel>
            </Collapse>
            
            <Divider />
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Space>
                <Button onClick={() => {
                  // Reset and start a new analysis
                  setPageData(null);
                  setCurrentStep(0);
                }}>
                  New Analysis
                </Button>
                <Button type="primary" onClick={handleSavePage}>
                  Save & Continue
                </Button>
              </Space>
            </div>
          </div>
        ) : (
          <Alert
            message="Analysis Failed"
            description="There was an error during the analysis. Please try again."
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
      </Card>
    );
  };

  return (
    <div>
      <Title level={2}>Page Analyzer</Title>
      <Paragraph>
        Upload your app screenshots and source files to identify elements and generate optimal locators.
      </Paragraph>
      
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        <Step title="Upload" description="Upload app files" icon={<UploadOutlined />} />
        <Step title="Configure" description="Configure analysis" icon={<RocketOutlined />} />
        <Step title="Results" description="View analysis results" icon={<CheckCircleOutlined />} />
      </Steps>
      
      <div style={{ marginTop: 24 }}>
        {currentStep === 0 && renderUploadStep()}
        {currentStep === 1 && renderConfigStep()}
        {currentStep === 2 && renderAnalysisStep()}
      </div>
    </div>
  );
};

export default PageAnalyzer;