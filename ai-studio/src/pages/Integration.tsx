import React from 'react';
import { 
  Card, 
  Tabs, 
  Typography, 
  Button, 
  Space, 
  Divider, 
  Steps, 
  List, 
  message, 
  Alert, 
  Collapse, 
  Input, 
  Tooltip 
} from 'antd';
import { 
  LinkOutlined, 
  CopyOutlined, 
  BookOutlined, 
  CodeOutlined, 
  ToolOutlined, 
  QuestionCircleOutlined 
} from '@ant-design/icons';
import { generateBookmarkletUrl } from '../integration/AppiumBookmarklet';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { Step } = Steps;
const { Panel } = Collapse;
const { TextArea } = Input;

const Integration: React.FC = () => {
  // Copy text to clipboard
  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        message.success(`${description} copied to clipboard`);
      },
      (err) => {
        message.error(`Could not copy ${description.toLowerCase()}: ${err}`);
      }
    );
  };

  // Generate bookmarklet URL
  const bookmarkletUrl = generateBookmarkletUrl();
  
  // Create bookmarklet code for display
  const bookmarkletCode = `
// Drag this to your bookmarks bar
javascript:${bookmarkletUrl}
`.trim();

  // Instructions for bookmarklet
  const bookmarkletSteps = [
    {
      title: 'Create a bookmark',
      description: 'Open your browser\'s bookmarks manager and create a new bookmark',
    },
    {
      title: 'Name your bookmark',
      description: 'Name it "Send to AI Studio" or something memorable',
    },
    {
      title: 'Paste the code',
      description: 'In the URL field, paste the bookmarklet code below',
    },
    {
      title: 'Save the bookmark',
      description: 'Save the bookmark to your bookmarks toolbar for easy access',
    },
    {
      title: 'Use in Appium Inspector',
      description: 'Open Appium Inspector, start a session, then click the bookmark',
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Title level={2}>Appium Inspector Integration</Title>
      <Paragraph>
        Connect AI Studio with Appium Inspector to enhance your mobile app testing workflow.
      </Paragraph>

      <Tabs defaultActiveKey="bookmarklet">
        <TabPane 
          tab={
            <span>
              <BookOutlined /> Bookmarklet
            </span>
          } 
          key="bookmarklet"
        >
          <Card>
            <Alert
              message="Zero-Modification Integration"
              description="Use this bookmarklet to send data from Appium Inspector to AI Studio without modifying the Appium Inspector codebase."
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Title level={4}>Bookmarklet Installation</Title>
            <Steps direction="vertical" current={-1}>
              {bookmarkletSteps.map((step, index) => (
                <Step
                  key={index}
                  title={step.title}
                  description={step.description}
                />
              ))}
            </Steps>

            <Divider />
            
            <Title level={4}>Bookmarklet Code</Title>
            <Paragraph>
              Copy and paste this code into your bookmark URL field:
            </Paragraph>
            
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <TextArea
                value={bookmarkletUrl}
                autoSize={{ minRows: 3, maxRows: 5 }}
                readOnly
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
              <Button
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(bookmarkletUrl, 'Bookmarklet code')}
                style={{ position: 'absolute', top: 5, right: 5 }}
              />
            </div>
            
            <Divider />
            
            <Title level={4}>Drag-and-Drop Installation</Title>
            <Paragraph>
              Alternatively, you can simply drag this link to your bookmarks bar:
            </Paragraph>
            
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              <a
                href={`javascript:${bookmarkletUrl}`}
                style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  background: '#1890ff',
                  color: 'white',
                  borderRadius: 4,
                  textDecoration: 'none',
                  cursor: 'move',
                }}
                draggable
              >
                <LinkOutlined /> Send to AI Studio
              </a>
            </div>

            <Divider />
            
            <Title level={4}>Using the Bookmarklet</Title>
            <List
              bordered
              dataSource={[
                'Start a session in Appium Inspector',
                'Navigate to the screen you want to analyze',
                'Click the "Send to AI Studio" bookmark',
                'AI Studio will open in a new tab with the imported data',
                'Proceed with analysis, locator generation, or code generation'
              ]}
              renderItem={(item, index) => (
                <List.Item>
                  <Text>{index + 1}. {item}</Text>
                </List.Item>
              )}
            />
          </Card>
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <ToolOutlined /> API Integration
            </span>
          }
          key="api"
        >
          <Card>
            <Alert
              message="For Developers"
              description="Use these APIs to integrate AI Studio with your own tools and workflows."
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />
            
            <Title level={4}>REST API Integration</Title>
            <Paragraph>
              AI Studio provides a REST API for programmatic integration with your testing tools and CI/CD pipelines.
            </Paragraph>
            
            <Collapse defaultActiveKey={['1']}>
              <Panel header="API Authentication" key="1">
                <Paragraph>
                  All API requests require authentication using an API key.
                </Paragraph>
                <Paragraph>
                  <Text strong>Authentication Header:</Text>
                </Paragraph>
                <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
                  X-API-Key: your-api-key-here
                </pre>
              </Panel>
              
              <Panel header="Importing Data" key="2">
                <Paragraph>
                  <Text strong>Endpoint:</Text> <code>/api/import</code>
                </Paragraph>
                <Paragraph>
                  <Text strong>Method:</Text> <code>POST</code>
                </Paragraph>
                <Paragraph>
                  <Text strong>Request Body:</Text>
                </Paragraph>
                <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
{`{
  "screenshot": "base64-encoded-screenshot",
  "source": "xml-source-code",
  "platform": "ios" // or "android"
}`}
                </pre>
              </Panel>
              
              <Panel header="Getting Analysis Results" key="3">
                <Paragraph>
                  <Text strong>Endpoint:</Text> <code>/api/analysis/{"{jobId}"}</code>
                </Paragraph>
                <Paragraph>
                  <Text strong>Method:</Text> <code>GET</code>
                </Paragraph>
              </Panel>
              
              <Panel header="Generating Code" key="4">
                <Paragraph>
                  <Text strong>Endpoint:</Text> <code>/api/code/generate</code>
                </Paragraph>
                <Paragraph>
                  <Text strong>Method:</Text> <code>POST</code>
                </Paragraph>
                <Paragraph>
                  <Text strong>Request Body:</Text>
                </Paragraph>
                <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
{`{
  "page": { /* page object */ },
  "language": "java",
  "framework": "junit4"
}`}
                </pre>
              </Panel>
            </Collapse>
          </Card>
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <CodeOutlined /> URL Scheme
            </span>
          }
          key="url-scheme"
        >
          <Card>
            <Alert
              message="URL-Based Integration"
              description="Use URL parameters to integrate AI Studio with Appium Inspector or your own tools."
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />
            
            <Title level={4}>URL Parameters</Title>
            <Paragraph>
              You can pass data to AI Studio using URL parameters.
            </Paragraph>
            
            <List
              bordered
              header={<Text strong>Available URL Parameters</Text>}
              dataSource={[
                {
                  param: 'data',
                  description: 'URL-encoded JSON containing session data',
                  example: '?data=%7B%22screenshot%22%3A%22data%3Aimage...%22%7D'
                },
                {
                  param: 'page',
                  description: 'URL-encoded JSON containing page data',
                  example: '?page=%7B%22name%22%3A%22Login%20Screen%22%7D'
                },
                {
                  param: 'source',
                  description: 'URL to XML source file',
                  example: '?source=https://example.com/source.xml'
                },
                {
                  param: 'screenshot',
                  description: 'URL to screenshot image',
                  example: '?screenshot=https://example.com/screenshot.png'
                }
              ]}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={<Text code>{item.param}</Text>}
                    description={item.description}
                  />
                  <Text code>{item.example}</Text>
                </List.Item>
              )}
            />
            
            <Divider />
            
            <Title level={4}>URL Scheme Example</Title>
            <Paragraph>
              Example URL to import data directly from a URL:
            </Paragraph>
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <Input
                value="https://aistudio.example.com/import?screenshot=https://example.com/screen.png&source=https://example.com/source.xml&platform=ios"
                readOnly
                style={{ fontFamily: 'monospace' }}
              />
              <Button
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard("https://aistudio.example.com/import?screenshot=https://example.com/screen.png&source=https://example.com/source.xml&platform=ios", "URL example")}
                style={{ position: 'absolute', top: 0, right: 0 }}
              />
            </div>
          </Card>
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <QuestionCircleOutlined /> FAQ
            </span>
          }
          key="faq"
        >
          <Card>
            <Collapse accordion>
              <Panel header="What is the bookmarklet and how does it work?" key="1">
                <Paragraph>
                  The bookmarklet is a small piece of JavaScript code saved as a bookmark. When clicked, it extracts the current session data from Appium Inspector and sends it to AI Studio for analysis.
                </Paragraph>
                <Paragraph>
                  It works by accessing the DOM and internal state of Appium Inspector to find the screenshot, XML source, and session information, then packaging this data and sending it to AI Studio via URL parameters.
                </Paragraph>
              </Panel>
              
              <Panel header="Is my data secure when using these integrations?" key="2">
                <Paragraph>
                  Yes, your data remains secure. The bookmarklet runs entirely within your browser and does not send data to any third-party servers. The data is transferred directly from Appium Inspector to AI Studio running on your local machine or your designated server.
                </Paragraph>
                <Paragraph>
                  If you're using the API integration, you can configure encryption and secure communication according to your organization's security requirements.
                </Paragraph>
              </Panel>
              
              <Panel header="Can I use this with CI/CD pipelines?" key="3">
                <Paragraph>
                  Yes, the API integration is designed for use with CI/CD pipelines. You can automate the process of sending test screenshots and source code to AI Studio, generating locators and code, and integrating the results into your test automation framework.
                </Paragraph>
              </Panel>
              
              <Panel header="Does this work with all versions of Appium Inspector?" key="4">
                <Paragraph>
                  The bookmarklet is designed to work with the latest versions of Appium Inspector. If you encounter issues with specific versions, please let us know, and we'll update the integration accordingly.
                </Paragraph>
              </Panel>
              
              <Panel header="What if the bookmarklet doesn't work?" key="5">
                <Paragraph>
                  If the bookmarklet doesn't work, you can try these alternatives:
                </Paragraph>
                <ul>
                  <li>Export the session from Appium Inspector and import it manually into AI Studio</li>
                  <li>Take a screenshot and save the source XML separately, then import them into AI Studio</li>
                  <li>Use the API integration for more reliable automated integration</li>
                </ul>
              </Panel>
            </Collapse>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Integration;