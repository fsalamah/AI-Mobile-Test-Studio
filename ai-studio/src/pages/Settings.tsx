import React, { useState } from 'react';
import { Tabs, Card, Form, Input, Button, Switch, Select, message, Typography, Space } from 'antd';
import { SaveOutlined, ApiOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';
import { useApiConfig } from '../context/ApiConfigContext';
import { useTheme } from '../context/ThemeContext';

const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const Settings: React.FC = () => {
  const { apiConfig, updateApiConfig, resetApiConfig } = useApiConfig();
  const { currentTheme, setTheme } = useTheme();
  const [apiForm] = Form.useForm();
  const [profileForm] = Form.useForm();
  const [generalForm] = Form.useForm();
  
  // Initialize forms with current values
  React.useEffect(() => {
    apiForm.setFieldsValue({
      baseUrl: apiConfig.baseUrl,
      apiKey: apiConfig.apiKey,
    });
    
    generalForm.setFieldsValue({
      theme: currentTheme,
      autoRefresh: true,
      notificationsEnabled: true,
    });
    
    profileForm.setFieldsValue({
      displayName: 'Test User',
      email: 'user@example.com',
      jobTitle: 'QA Engineer',
      company: 'Example Corp',
    });
  }, [apiConfig, currentTheme, apiForm, profileForm, generalForm]);

  // Handle API settings form submit
  const handleApiFormSubmit = (values: any) => {
    updateApiConfig({
      baseUrl: values.baseUrl,
      apiKey: values.apiKey,
    });
    message.success('API settings updated successfully');
  };

  // Handle profile form submit
  const handleProfileFormSubmit = (values: any) => {
    console.log('Profile updated:', values);
    message.success('Profile updated successfully');
  };

  // Handle general settings form submit
  const handleGeneralFormSubmit = (values: any) => {
    // Update theme
    setTheme(values.theme);
    console.log('General settings updated:', values);
    message.success('Settings updated successfully');
  };

  // Reset API configuration
  const handleResetApiConfig = () => {
    resetApiConfig();
    apiForm.setFieldsValue({
      baseUrl: apiConfig.baseUrl,
      apiKey: apiConfig.apiKey,
    });
    message.success('API settings reset to defaults');
  };

  return (
    <div>
      <Title level={2}>Settings</Title>
      <Paragraph>Configure your AI Studio preferences and connections.</Paragraph>

      <Card>
        <Tabs defaultActiveKey="api">
          <TabPane 
            tab={
              <span>
                <ApiOutlined /> API Configuration
              </span>
            } 
            key="api"
          >
            <Form
              form={apiForm}
              layout="vertical"
              onFinish={handleApiFormSubmit}
              initialValues={{
                baseUrl: apiConfig.baseUrl,
                apiKey: apiConfig.apiKey,
              }}
            >
              <Form.Item
                label="API Base URL"
                name="baseUrl"
                rules={[{ required: true, message: 'Please enter the API Base URL' }]}
              >
                <Input placeholder="http://localhost:3001/api" />
              </Form.Item>

              <Form.Item
                label="API Key"
                name="apiKey"
                rules={[{ required: true, message: 'Please enter your API Key' }]}
              >
                <Input.Password placeholder="Your API key" />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                    Save API Settings
                  </Button>
                  <Button onClick={handleResetApiConfig}>
                    Reset to Defaults
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <UserOutlined /> Profile
              </span>
            } 
            key="profile"
          >
            <Form
              form={profileForm}
              layout="vertical"
              onFinish={handleProfileFormSubmit}
            >
              <Form.Item
                label="Display Name"
                name="displayName"
                rules={[{ required: true, message: 'Please enter your name' }]}
              >
                <Input placeholder="Your Name" />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input placeholder="your.email@example.com" />
              </Form.Item>

              <Form.Item label="Job Title" name="jobTitle">
                <Input placeholder="QA Engineer" />
              </Form.Item>

              <Form.Item label="Company" name="company">
                <Input placeholder="Your Company" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                  Save Profile
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <SettingOutlined /> General
              </span>
            } 
            key="general"
          >
            <Form
              form={generalForm}
              layout="vertical"
              onFinish={handleGeneralFormSubmit}
            >
              <Form.Item label="Theme" name="theme">
                <Select>
                  <Option value="light">Light</Option>
                  <Option value="dark">Dark</Option>
                </Select>
              </Form.Item>

              <Form.Item 
                label="Auto-refresh Analysis Results" 
                name="autoRefresh"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item 
                label="Enable Notifications" 
                name="notificationsEnabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                  Save Settings
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Settings;