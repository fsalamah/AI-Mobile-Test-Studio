/**
 * ModulePreferences Component
 * 
 * This component provides a interface for managing AI module preferences,
 * including recording settings, analysis settings, and general module options.
 */
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Switch, 
  InputNumber, 
  Select, 
  Button, 
  Divider, 
  Collapse, 
  message,
  Typography,
  Tooltip
} from 'antd';
import {
  InfoCircleOutlined,
  SaveOutlined,
  UndoOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import ActionRecorder from '../../../lib/ai/actionRecorder';
import { CONFIG } from '../../../lib/ai/config.js';

const { Option } = Select;
const { Panel } = Collapse;
const { Title, Text, Paragraph } = Typography;

const ModulePreferences = () => {
  const [form] = Form.useForm();
  
  // States for various preference sets
  const [recordingPrefs, setRecordingPrefs] = useState({
    condensingEnabled: CONFIG?.CONDENSER?.enabled !== undefined ? CONFIG.CONDENSER.enabled : true,
    checkXml: CONFIG?.CONDENSER?.checkXml !== undefined ? CONFIG.CONDENSER.checkXml : true,
    checkScreenshot: CONFIG?.CONDENSER?.checkScreenshot !== undefined ? CONFIG.CONDENSER.checkScreenshot : true,
    screenshotThreshold: CONFIG?.CONDENSER?.screenshotThreshold !== undefined ? CONFIG.CONDENSER.screenshotThreshold : 1.0
  });
  
  const [analysisPrefs, setAnalysisPrefs] = useState({
    autoAnalyzeRecordings: CONFIG?.ANALYSIS?.autoAnalyzeRecordings !== undefined ? CONFIG.ANALYSIS.autoAnalyzeRecordings : false,
    transitionDetection: CONFIG?.ANALYSIS?.transitionDetection !== undefined ? CONFIG.ANALYSIS.transitionDetection : 'moderate'
  });

  const [generalPrefs, setGeneralPrefs] = useState({
    sidePanelVisible: true,
    darkMode: false,
    preferredLanguage: 'java'
  });
  
  // Effect to initialize form values
  useEffect(() => {
    form.setFieldsValue({
      ...recordingPrefs,
      ...analysisPrefs,
      ...generalPrefs
    });
  }, []);
  
  // Handle form submission
  const onFinish = (values) => {
    try {
      // Update recording condensing options
      ActionRecorder.setCondensingOptions({
        enabled: values.condensingEnabled,
        checkXml: values.checkXml,
        checkScreenshot: values.checkScreenshot,
        screenshotThreshold: values.screenshotThreshold
      });
      
      // For now, just log the other settings that would be saved
      console.log('Analysis preferences to save:', {
        autoAnalyzeRecordings: values.autoAnalyzeRecordings,
        transitionDetection: values.transitionDetection
      });
      
      console.log('General preferences to save:', {
        sidePanelVisible: values.sidePanelVisible,
        darkMode: values.darkMode,
        preferredLanguage: values.preferredLanguage
      });
      
      // Update local state
      setRecordingPrefs({
        condensingEnabled: values.condensingEnabled,
        checkXml: values.checkXml,
        checkScreenshot: values.checkScreenshot,
        screenshotThreshold: values.screenshotThreshold
      });
      
      setAnalysisPrefs({
        autoAnalyzeRecordings: values.autoAnalyzeRecordings,
        transitionDetection: values.transitionDetection
      });
      
      setGeneralPrefs({
        sidePanelVisible: values.sidePanelVisible,
        darkMode: values.darkMode,
        preferredLanguage: values.preferredLanguage
      });
      
      message.success('Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      message.error('Failed to save preferences: ' + error.message);
    }
  };
  
  // Reset form to initial values
  const handleReset = () => {
    form.resetFields();
    message.info('Preferences reset to last saved values');
  };
  
  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Title level={5} style={{ margin: 0 }}>AI Module Preferences</Title>
        </div>
      }
      bordered={false}
      style={{ width: '100%' }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          ...recordingPrefs,
          ...analysisPrefs,
          ...generalPrefs
        }}
      >
        <Collapse defaultActiveKey={['recording', 'analysis']} bordered={false}>
          {/* Recording Settings */}
          <Panel 
            header={<span style={{ fontWeight: 500 }}>Recording Settings</span>} 
            key="recording"
          >
            <Paragraph type="secondary">
              Configure how user interactions are recorded and condensed
            </Paragraph>
            
            <Form.Item
              name="condensingEnabled"
              label={
                <span>
                  Enable state condensing
                  <Tooltip title="When enabled, similar states in recordings will be marked as condensed">
                    <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                  </Tooltip>
                </span>
              }
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            
            <Form.Item
              name="checkXml"
              label="Compare XML when condensing"
              valuePropName="checked"
              dependencies={['condensingEnabled']}
            >
              <Switch disabled={!form.getFieldValue('condensingEnabled')} />
            </Form.Item>
            
            <Form.Item
              name="checkScreenshot"
              label="Compare screenshots when condensing"
              valuePropName="checked"
              dependencies={['condensingEnabled']}
            >
              <Switch disabled={!form.getFieldValue('condensingEnabled')} />
            </Form.Item>
            
            <Form.Item
              name="screenshotThreshold"
              label={
                <span>
                  Screenshot similarity threshold
                  <Tooltip title="Lower values will detect smaller changes (0.8 means 80% similarity is required to consider screenshots the same)">
                    <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                  </Tooltip>
                </span>
              }
              dependencies={['condensingEnabled', 'checkScreenshot']}
            >
              <InputNumber 
                min={0.5} 
                max={1} 
                step={0.05} 
                disabled={!form.getFieldValue('condensingEnabled') || !form.getFieldValue('checkScreenshot')} 
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Panel>
          
          {/* Analysis Settings */}
          <Panel 
            header={<span style={{ fontWeight: 500 }}>Analysis Settings</span>} 
            key="analysis"
          >
            <Paragraph type="secondary">
              Configure how AI analyzes recordings and transitions
            </Paragraph>
            
            <Form.Item
              name="autoAnalyzeRecordings"
              label={
                <span>
                  Auto-analyze recordings
                  <Tooltip title="Automatically analyze recordings after they are completed">
                    <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                  </Tooltip>
                </span>
              }
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            
            <Form.Item
              name="transitionDetection"
              label={
                <span>
                  Transition detection sensitivity
                  <Tooltip title="Determines how aggressively the system detects transitions between states">
                    <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                  </Tooltip>
                </span>
              }
            >
              <Select>
                <Option value="conservative">Conservative (fewer transitions)</Option>
                <Option value="moderate">Moderate (balanced)</Option>
                <Option value="aggressive">Aggressive (more transitions)</Option>
              </Select>
            </Form.Item>
          </Panel>
          
          {/* General Settings */}
          <Panel 
            header={<span style={{ fontWeight: 500 }}>General Settings</span>} 
            key="general"
          >
            <Paragraph type="secondary">
              Configure general module preferences
            </Paragraph>
            
            <Form.Item
              name="sidePanelVisible"
              label="Show side panel by default"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            
            <Form.Item
              name="darkMode"
              label="Dark mode"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            
            <Form.Item
              name="preferredLanguage"
              label="Preferred code generation language"
            >
              <Select>
                <Option value="java">Java</Option>
                <Option value="python">Python</Option>
                <Option value="javascript">JavaScript</Option>
                <Option value="csharp">C#</Option>
                <Option value="robot">Robot Framework</Option>
              </Select>
            </Form.Item>
          </Panel>
        </Collapse>
        
        <Divider />
        
        <Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button 
              onClick={handleReset}
              icon={<UndoOutlined />}
            >
              Reset
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              icon={<SaveOutlined />}
            >
              Save Preferences
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ModulePreferences;