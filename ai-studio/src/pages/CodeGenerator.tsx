import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Card, 
  Button, 
  Space, 
  Select, 
  Spin, 
  Steps,
  Alert,
  Divider,
  notification,
  Breadcrumb,
  Form,
  Radio,
  Checkbox,
  Tabs,
  Empty
} from 'antd';
import {
  CodeOutlined,
  CopyOutlined,
  DownloadOutlined,
  LoadingOutlined,
  RocketOutlined,
  SettingOutlined,
  RollbackOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import useAppStore from '../store/appStore';
import { CodeGenerationRequest, ElementWithLocator, Language, Framework } from '../types/api';
import { useJobPolling } from '../hooks/useJobPolling';
import apiClient from '../services/apiClient';
import CodeEditor from '../components/common/CodeEditor';

const { Title, Paragraph, Text } = Typography;
const { Step } = Steps;
const { Option } = Select;
const { TabPane } = Tabs;

const CodeGenerator: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get pageId from URL query parameters
  const params = new URLSearchParams(location.search);
  const pageId = params.get('pageId');

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<Record<string, string>>({});
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedFramework, setSelectedFramework] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Get data from store
  const pages = useAppStore(state => state.pages);
  const addOperation = useAppStore(state => state.addOperation);
  const updateOperation = useAppStore(state => state.updateOperation);

  // Find the current page
  const page = pages.find(p => p.id === pageId);

  // Job polling hook
  const { startJob, jobStatus, jobResult } = useJobPolling();

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

  // Load available languages and frameworks
  useEffect(() => {
    // This would be an API call in a real implementation
    // Mock data for now
    const mockLanguages: Language[] = [
      {
        id: 'java',
        name: 'Java',
        frameworks: [
          { id: 'java-junit4', name: 'JUnit 4' },
          { id: 'java-junit5', name: 'JUnit 5' },
          { id: 'java-testng', name: 'TestNG' }
        ]
      },
      {
        id: 'python',
        name: 'Python',
        frameworks: [
          { id: 'python-pytest', name: 'PyTest' },
          { id: 'python-unittest', name: 'Unittest' }
        ]
      },
      {
        id: 'javascript',
        name: 'JavaScript',
        frameworks: [
          { id: 'js-webdriverio', name: 'WebdriverIO' },
          { id: 'js-oxygen', name: 'Oxygen' }
        ]
      },
      {
        id: 'csharp',
        name: 'C#',
        frameworks: [
          { id: 'csharp-nunit', name: 'NUnit' },
          { id: 'csharp-mstest', name: 'MSTest' }
        ]
      },
      {
        id: 'ruby',
        name: 'Ruby',
        frameworks: [
          { id: 'ruby-rspec', name: 'RSpec' },
          { id: 'ruby-cucumber', name: 'Cucumber' }
        ]
      }
    ];
    
    setLanguages(mockLanguages);
    if (mockLanguages.length > 0) {
      setSelectedLanguage(mockLanguages[0].id);
      setSelectedFramework(mockLanguages[0].frameworks[0].id);
    }
  }, []);

  if (!page) {
    return null; // Render nothing while redirecting
  }

  // Get frameworks for the selected language
  const getFrameworksForLanguage = () => {
    const language = languages.find(lang => lang.id === selectedLanguage);
    return language ? language.frameworks : [];
  };

  // Start code generation process
  const handleStartCodeGeneration = async () => {
    try {
      const values = await form.validateFields();
      
      setLoading(true);
      setCurrentStep(1);
      setError(null);

      // Create an operation record
      const operationId = addOperation({
        type: 'code-generation',
        pageId: pageId!,
        status: 'pending'
      });

      try {
        const request: CodeGenerationRequest = {
          page: page,
          language: selectedLanguage,
          framework: selectedFramework,
          // Add other form values as needed
        };

        const jobId = await startJob(
          () => apiClient.startCodeGeneration(request),
          () => (id: string) => apiClient.getJobStatus(id)
        );

        // Update the operation status
        updateOperation(operationId, {
          status: 'processing'
        });

        // The job polling hook will handle the rest
      } catch (error) {
        setError('Failed to start code generation job. Please try again.');
        setLoading(false);
        
        // Update the operation status
        updateOperation(operationId, {
          status: 'failed'
        });
      }
    } catch (error) {
      // Form validation error
    }
  };

  // Handle copying code to clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      notification.success({
        message: 'Copied to clipboard',
        description: 'The code has been copied to your clipboard.'
      });
    }).catch(() => {
      notification.error({
        message: 'Copy failed',
        description: 'Failed to copy the code to your clipboard.'
      });
    });
  };

  // Handle downloading code
  const handleDownloadCode = (code: string, fileName: string) => {
    const element = document.createElement('a');
    const file = new Blob([code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const renderConfigurationStep = () => {
    return (
      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={4}>Configure Code Generation</Title>
          
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              language: selectedLanguage,
              framework: selectedFramework,
              options: {
                includeComments: true,
                generatePageObject: true,
                includeScreenshots: false,
                includeSampleTests: true
              }
            }}
          >
            <Form.Item label="Language" required>
              <Select
                value={selectedLanguage}
                onChange={(value) => {
                  setSelectedLanguage(value);
                  // Reset framework when language changes
                  const language = languages.find(lang => lang.id === value);
                  if (language && language.frameworks.length > 0) {
                    setSelectedFramework(language.frameworks[0].id);
                  } else {
                    setSelectedFramework('');
                  }
                }}
                style={{ width: '100%' }}
              >
                {languages.map((language) => (
                  <Option key={language.id} value={language.id}>
                    {language.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item label="Framework" required>
              <Select
                value={selectedFramework}
                onChange={setSelectedFramework}
                style={{ width: '100%' }}
                disabled={getFrameworksForLanguage().length === 0}
              >
                {getFrameworksForLanguage().map((framework) => (
                  <Option key={framework.id} value={framework.id}>
                    {framework.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item label="Code Generation Options">
              <Form.Item name={['options', 'generatePageObject']} valuePropName="checked" noStyle>
                <Checkbox>Generate Page Object Model</Checkbox>
              </Form.Item>
              <br />
              <Form.Item name={['options', 'includeComments']} valuePropName="checked" noStyle>
                <Checkbox>Include Comments</Checkbox>
              </Form.Item>
              <br />
              <Form.Item name={['options', 'includeSampleTests']} valuePropName="checked" noStyle>
                <Checkbox>Include Sample Tests</Checkbox>
              </Form.Item>
              <br />
              <Form.Item name={['options', 'includeScreenshots']} valuePropName="checked" noStyle>
                <Checkbox>Include Screenshots</Checkbox>
              </Form.Item>
            </Form.Item>
            
            <Form.Item label="Element Selection">
              <Radio.Group defaultValue="all">
                <Radio value="all">Use All Elements</Radio>
                <Radio value="selected">Use Selected Elements Only</Radio>
              </Radio.Group>
            </Form.Item>
          </Form>
          
          <Divider />
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button icon={<RollbackOutlined />} onClick={() => navigate(`/pages/${pageId}`)}>
              Back to Page
            </Button>
            <Button 
              type="primary" 
              icon={<RocketOutlined />} 
              onClick={handleStartCodeGeneration}
              disabled={!selectedLanguage || !selectedFramework}
            >
              Generate Code
            </Button>
          </div>
        </Space>
      </Card>
    );
  };

  const renderResultsStep = () => {
    // Mock generated code for demonstration
    const mockGeneratedCode = {
      'PageObject.java': `
public class ${page.name}Page {
    private AppiumDriver driver;
    
    public ${page.name}Page(AppiumDriver driver) {
        this.driver = driver;
    }
    
    // Locators
    private By usernameField = MobileBy.xpath("//XCUIElementTypeTextField[@value='Username']");
    private By passwordField = MobileBy.xpath("//XCUIElementTypeSecureTextField[@value='Password']");
    private By loginButton = MobileBy.xpath("//XCUIElementTypeButton[@name='log-in']");
    
    // Methods
    public ${page.name}Page enterUsername(String username) {
        driver.findElement(usernameField).sendKeys(username);
        return this;
    }
    
    public ${page.name}Page enterPassword(String password) {
        driver.findElement(passwordField).sendKeys(password);
        return this;
    }
    
    public void clickLogin() {
        driver.findElement(loginButton).click();
    }
}`,
      'LoginTest.java': `
@Test
public void testLogin() {
    ${page.name}Page loginPage = new ${page.name}Page(driver);
    
    loginPage.enterUsername("testuser")
             .enterPassword("password")
             .clickLogin();
    
    // Add assertions here
}`,
      'BaseTest.java': `
public class BaseTest {
    protected AppiumDriver driver;
    
    @Before
    public void setUp() {
        DesiredCapabilities caps = new DesiredCapabilities();
        caps.setCapability("platformName", "iOS");
        caps.setCapability("deviceName", "iPhone Simulator");
        caps.setCapability("automationName", "XCUITest");
        
        try {
            driver = new IOSDriver(new URL("http://localhost:4723/wd/hub"), caps);
        } catch (MalformedURLException e) {
            e.printStackTrace();
        }
    }
    
    @After
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }
}`
    };

    return (
      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={4}>Generated Code</Title>

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
                Generating code...
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
                message="Code Generation Complete"
                description="Your code has been generated successfully."
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Tabs defaultActiveKey="0">
                {Object.entries(mockGeneratedCode).map(([fileName, code], index) => (
                  <TabPane tab={fileName} key={index.toString()}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                      <Space>
                        <Button 
                          icon={<CopyOutlined />} 
                          onClick={() => handleCopyCode(code)}
                        >
                          Copy
                        </Button>
                        <Button 
                          icon={<DownloadOutlined />} 
                          onClick={() => handleDownloadCode(code, fileName)}
                        >
                          Download
                        </Button>
                      </Space>
                    </div>
                    <CodeEditor 
                      code={code} 
                      language={selectedLanguage}
                      readOnly={true}
                    />
                  </TabPane>
                ))}
              </Tabs>

              <Divider />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={() => setCurrentStep(0)}>
                  Back to Configuration
                </Button>
                <Button 
                  type="primary" 
                  icon={<RocketOutlined />} 
                  onClick={() => {
                    // Generate another code
                    setCurrentStep(0);
                  }}
                >
                  Generate New Code
                </Button>
              </div>
            </div>
          ) : (
            <Alert
              message="Code Generation Failed"
              description="There was an error generating the code. Please try again."
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
        <Breadcrumb.Item>Code Generator</Breadcrumb.Item>
      </Breadcrumb>

      <Title level={2}>Code Generator</Title>
      <Paragraph>
        Generate test automation code for your page using AI-powered code generation.
      </Paragraph>

      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        <Step title="Configure" icon={<SettingOutlined />} />
        <Step title="Generated Code" icon={<CodeOutlined />} />
      </Steps>

      <div style={{ marginTop: 24 }}>
        {currentStep === 0 && renderConfigurationStep()}
        {currentStep === 1 && renderResultsStep()}
      </div>
    </div>
  );
};

export default CodeGenerator;