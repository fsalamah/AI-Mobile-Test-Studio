import React, { useState } from 'react';
import { 
  Modal, 
  Steps, 
  Button, 
  Upload, 
  Radio, 
  Form, 
  Input, 
  Space, 
  Alert, 
  Typography, 
  message,
  Select,
  Divider
} from 'antd';
import { 
  InboxOutlined, 
  FileImageOutlined, 
  FileTextOutlined,
  FileAddOutlined,
  ImportOutlined
} from '@ant-design/icons';
import { RcFile } from 'antd/es/upload';
import fileUtils from '../../utils/fileUtils';
import importExportUtils from '../../utils/importExportUtils';
import { Page } from '../../types/api';
import useAppStore from '../../store/appStore';

const { Dragger } = Upload;
const { Step } = Steps;
const { Text, Title } = Typography;
const { Option } = Select;

interface FileImporterProps {
  visible: boolean;
  onClose: () => void;
  onComplete?: (page: Page) => void;
}

const FileImporter: React.FC<FileImporterProps> = ({
  visible,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [importType, setImportType] = useState<'appium' | 'files' | 'json'>('appium');
  const [appiumFile, setAppiumFile] = useState<RcFile | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<RcFile | null>(null);
  const [sourceFile, setSourceFile] = useState<RcFile | null>(null);
  const [jsonFile, setJsonFile] = useState<RcFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios');
  const [form] = Form.useForm();

  // Get addPage function from store
  const addPage = useAppStore(state => state.addPage);
  
  // Reset state when modal is opened or closed
  const resetState = () => {
    setCurrentStep(0);
    setImportType('appium');
    setAppiumFile(null);
    setScreenshotFile(null);
    setSourceFile(null);
    setJsonFile(null);
    setLoading(false);
    setPlatform('ios');
    form.resetFields();
  };
  
  // Handle appium file selection
  const handleAppiumFileChange = (info: any) => {
    if (info.fileList.length > 0) {
      const file = info.fileList[info.fileList.length - 1].originFileObj;
      setAppiumFile(file);
    } else {
      setAppiumFile(null);
    }
  };
  
  // Handle screenshot file selection
  const handleScreenshotChange = (info: any) => {
    if (info.fileList.length > 0) {
      const file = info.fileList[info.fileList.length - 1].originFileObj;
      if (fileUtils.isImageFile(file)) {
        setScreenshotFile(file);
      } else {
        message.error('Please upload a valid image file');
        setScreenshotFile(null);
      }
    } else {
      setScreenshotFile(null);
    }
  };
  
  // Handle source file selection
  const handleSourceChange = (info: any) => {
    if (info.fileList.length > 0) {
      const file = info.fileList[info.fileList.length - 1].originFileObj;
      if (fileUtils.isXmlFile(file)) {
        setSourceFile(file);
      } else {
        message.error('Please upload a valid XML file');
        setSourceFile(null);
      }
    } else {
      setSourceFile(null);
    }
  };
  
  // Handle JSON file selection
  const handleJsonChange = (info: any) => {
    if (info.fileList.length > 0) {
      const file = info.fileList[info.fileList.length - 1].originFileObj;
      setJsonFile(file);
    } else {
      setJsonFile(null);
    }
  };
  
  // Handle next step
  const handleNext = () => {
    if (currentStep === 0) {
      // Validate files are selected
      if (importType === 'appium' && !appiumFile) {
        message.error('Please upload an Appium session file');
        return;
      } else if (importType === 'files' && (!screenshotFile || !sourceFile)) {
        message.error('Please upload both screenshot and source files');
        return;
      } else if (importType === 'json' && !jsonFile) {
        message.error('Please upload a JSON file');
        return;
      }
    }
    
    if (currentStep === 1 && importType === 'files') {
      // Validate form
      form.validateFields().then(() => {
        setCurrentStep(currentStep + 1);
      }).catch(() => {
        message.error('Please fill in all required fields');
      });
    } else {
      setCurrentStep(currentStep + 1);
    }
  };
  
  // Handle previous step
  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };
  
  // Handle import completion
  const handleComplete = async () => {
    setLoading(true);
    
    try {
      let newPage: Page | null = null;
      
      if (importType === 'appium' && appiumFile) {
        // Import from Appium session file
        newPage = await importExportUtils.convertAppiumSessionToPage(appiumFile);
      } else if (importType === 'files' && screenshotFile && sourceFile) {
        // Import from screenshot and source files
        const formValues = form.getFieldsValue();
        const screenshot = await fileUtils.readFileAsDataURL(screenshotFile);
        const source = await fileUtils.readFileAsText(sourceFile);
        
        newPage = importExportUtils.createPageFromFiles(
          screenshot,
          source,
          formValues.pageName,
          platform
        );
      } else if (importType === 'json' && jsonFile) {
        // Import from JSON file
        const importData = await importExportUtils.importFromFile(jsonFile);
        if (importData && (importData.type === 'page' || importData.type === 'page-collection')) {
          if (importData.type === 'page') {
            newPage = importData.data as Page;
          } else if (Array.isArray(importData.data) && importData.data.length > 0) {
            // For simplicity, we're just taking the first page from the collection
            newPage = importData.data[0] as Page;
          }
        }
      }
      
      if (newPage) {
        // Add page to store
        const pageId = addPage(newPage);
        message.success('Page imported successfully');
        
        // Call onComplete callback with the new page
        if (onComplete) {
          onComplete({ ...newPage, id: pageId });
        }
        
        // Close modal and reset state
        onClose();
        resetState();
      } else {
        throw new Error('Failed to import page');
      }
    } catch (error) {
      console.error('Error completing import:', error);
      message.error('Failed to import page');
    } finally {
      setLoading(false);
    }
  };
  
  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div>
            <Title level={4}>Choose Import Type</Title>
            <Radio.Group 
              value={importType} 
              onChange={(e) => setImportType(e.target.value)}
              style={{ marginBottom: 16 }}
            >
              <Space direction="vertical">
                <Radio value="appium">
                  <Space>
                    <ImportOutlined />
                    <Text>Import from Appium Session</Text>
                  </Space>
                </Radio>
                <Radio value="files">
                  <Space>
                    <FileAddOutlined />
                    <Text>Import from Screenshot and Source Files</Text>
                  </Space>
                </Radio>
                <Radio value="json">
                  <Space>
                    <FileTextOutlined />
                    <Text>Import from JSON</Text>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
            
            <Divider />
            
            {importType === 'appium' && (
              <div>
                <Text>Upload an Appium Session (.appiumsession) file:</Text>
                <Dragger
                  name="appiumFile"
                  fileList={appiumFile ? [{ uid: '1', name: appiumFile.name, status: 'done', size: appiumFile.size, type: appiumFile.type, originFileObj: appiumFile }] : []}
                  onChange={handleAppiumFileChange}
                  beforeUpload={() => false}
                  accept=".appiumsession"
                  maxCount={1}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">Click or drag file to this area to upload</p>
                  <p className="ant-upload-hint">
                    Upload an Appium session file exported from Appium Inspector
                  </p>
                </Dragger>
              </div>
            )}
            
            {importType === 'files' && (
              <div>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text>Upload Screenshot:</Text>
                  <Upload
                    name="screenshot"
                    listType="picture"
                    fileList={screenshotFile ? [{ uid: '1', name: screenshotFile.name, status: 'done', size: screenshotFile.size, type: screenshotFile.type, originFileObj: screenshotFile }] : []}
                    onChange={handleScreenshotChange}
                    beforeUpload={() => false}
                    accept="image/*"
                    maxCount={1}
                  >
                    <Button icon={<FileImageOutlined />}>Upload Screenshot</Button>
                  </Upload>
                  
                  <Text>Upload XML Source:</Text>
                  <Upload
                    name="source"
                    listType="text"
                    fileList={sourceFile ? [{ uid: '1', name: sourceFile.name, status: 'done', size: sourceFile.size, type: sourceFile.type, originFileObj: sourceFile }] : []}
                    onChange={handleSourceChange}
                    beforeUpload={() => false}
                    accept=".xml,.uix,.appium"
                    maxCount={1}
                  >
                    <Button icon={<FileTextOutlined />}>Upload XML Source</Button>
                  </Upload>
                </Space>
              </div>
            )}
            
            {importType === 'json' && (
              <div>
                <Text>Upload JSON file:</Text>
                <Dragger
                  name="jsonFile"
                  fileList={jsonFile ? [{ uid: '1', name: jsonFile.name, status: 'done', size: jsonFile.size, type: jsonFile.type, originFileObj: jsonFile }] : []}
                  onChange={handleJsonChange}
                  beforeUpload={() => false}
                  accept=".json"
                  maxCount={1}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">Click or drag file to this area to upload</p>
                  <p className="ant-upload-hint">
                    Upload a JSON file exported from AI Studio
                  </p>
                </Dragger>
              </div>
            )}
          </div>
        );
      case 1:
        return importType === 'files' ? (
          <div>
            <Title level={4}>Configure Page Details</Title>
            <Form
              form={form}
              layout="vertical"
              initialValues={{ pageName: screenshotFile?.name.replace(/\.[^/.]+$/, '') || 'New Page' }}
            >
              <Form.Item
                label="Page Name"
                name="pageName"
                rules={[{ required: true, message: 'Please enter a page name' }]}
              >
                <Input placeholder="Enter page name" />
              </Form.Item>
              
              <Form.Item
                label="Platform"
                name="platform"
                initialValue={platform}
                rules={[{ required: true, message: 'Please select a platform' }]}
              >
                <Select onChange={(value) => setPlatform(value)}>
                  <Option value="ios">iOS</Option>
                  <Option value="android">Android</Option>
                </Select>
              </Form.Item>
            </Form>
          </div>
        ) : (
          <div>
            <Title level={4}>Review Import Details</Title>
            {importType === 'appium' && appiumFile && (
              <div>
                <Alert
                  message="Ready to Import"
                  description={`Appium session file: ${appiumFile.name}`}
                  type="success"
                  showIcon
                />
              </div>
            )}
            {importType === 'json' && jsonFile && (
              <div>
                <Alert
                  message="Ready to Import"
                  description={`JSON file: ${jsonFile.name}`}
                  type="success"
                  showIcon
                />
              </div>
            )}
          </div>
        );
      case 2:
        return (
          <div>
            <Title level={4}>Review Import Details</Title>
            <Alert
              message="Ready to Import"
              description="Click Complete to import the page into AI Studio"
              type="success"
              showIcon
            />
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <Modal
      title="Import to AI Studio"
      open={visible}
      onCancel={() => {
        onClose();
        resetState();
      }}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        currentStep > 0 && (
          <Button key="previous" onClick={handlePrevious}>
            Previous
          </Button>
        ),
        currentStep < (importType === 'files' ? 2 : 1) ? (
          <Button key="next" type="primary" onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button 
            key="complete" 
            type="primary" 
            onClick={handleComplete}
            loading={loading}
          >
            Complete
          </Button>
        ),
      ]}
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        <Step title="Choose Files" />
        {importType === 'files' && <Step title="Configure" />}
        <Step title="Review" />
      </Steps>
      
      {renderStepContent()}
    </Modal>
  );
};

export default FileImporter;