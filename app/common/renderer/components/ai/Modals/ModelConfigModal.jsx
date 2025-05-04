import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Form, Input, Select, Switch, Button, Space, Typography, Divider, Table, Tooltip, message, Radio } from 'antd';
import { PlusOutlined, MinusCircleOutlined, QuestionCircleOutlined, LockOutlined, EyeOutlined, EyeInvisibleOutlined, RobotOutlined, SettingOutlined } from '@ant-design/icons';
import { 
  loadGlobalModelConfigs, 
  saveGlobalModelConfigs, 
  loadProjectModelAssignments,
  saveProjectModelAssignments,
  assignModelToPipeline,
  getAllProviders,
  updateProviderConfig,
  setActiveProvider,
  addModelToProvider,
  PIPELINE_TYPES
} from '../../../lib/ai/modelManager';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

/**
 * Modal for configuring AI models with two-tier approach:
 * 1. Global provider definitions (shared across projects)
 * 2. Project-specific pipeline assignments
 */
const ModelConfigModal = ({ 
  visible, 
  onCancel, 
  projectId,
  onConfigChanged
}) => {
  const [activeTab, setActiveTab] = useState('providers');
  const [providerConfigs, setProviderConfigs] = useState({});
  const [pipelineAssignments, setPipelineAssignments] = useState({});
  const [showApiKey, setShowApiKey] = useState({});
  const [customProviderName, setCustomProviderName] = useState('');
  const [customProviderId, setCustomProviderId] = useState('');
  
  // Load configurations when modal opens
  useEffect(() => {
    if (visible) {
      // Load global provider configurations
      const providers = loadGlobalModelConfigs();
      setProviderConfigs(providers);
      
      // Load project-specific model assignments
      const effectiveProjectId = projectId || 'default';
      const assignments = loadProjectModelAssignments(effectiveProjectId);
      setPipelineAssignments(assignments);
      
      // Initialize showApiKey state
      const initialShowState = {};
      Object.keys(providers).forEach(providerId => {
        initialShowState[providerId] = false;
      });
      setShowApiKey(initialShowState);
    }
  }, [visible, projectId]);
  
  // Handle tab change
  const handleTabChange = (key) => {
    setActiveTab(key);
  };
  
  // Toggle API key visibility
  const toggleApiKeyVisibility = (providerId) => {
    setShowApiKey({
      ...showApiKey,
      [providerId]: !showApiKey[providerId]
    });
  };
  
  // Update a provider configuration (global setting)
  const updateProvider = (providerId, values) => {
    // Update the configuration
    const updatedConfigs = {
      ...providerConfigs,
      [providerId]: {
        ...providerConfigs[providerId],
        ...values
      }
    };
    
    setProviderConfigs(updatedConfigs);
    saveGlobalModelConfigs(updatedConfigs);
    message.success(`Updated ${providerConfigs[providerId].name} configuration`);
    
    // Notify parent component
    if (onConfigChanged) {
      onConfigChanged({
        providers: updatedConfigs,
        assignments: pipelineAssignments
      });
    }
  };
  
  // Set a provider as active (global setting)
  const activateProvider = (providerId) => {
    // Set all providers to inactive except the selected one
    const updatedConfigs = { ...providerConfigs };
    
    Object.keys(updatedConfigs).forEach(id => {
      updatedConfigs[id] = {
        ...updatedConfigs[id],
        active: (id === providerId)
      };
    });
    
    setProviderConfigs(updatedConfigs);
    saveGlobalModelConfigs(updatedConfigs);
    message.success(`${providerConfigs[providerId].name} is now the active provider`);
    
    // Notify parent component
    if (onConfigChanged) {
      onConfigChanged({
        providers: updatedConfigs,
        assignments: pipelineAssignments
      });
    }
  };
  
  // Add a new model to a provider (global setting)
  const addModel = (providerId, modelName) => {
    if (!modelName) return;
    
    // Check if model already exists
    if (providerConfigs[providerId].availableModels.includes(modelName)) {
      message.warning(`Model ${modelName} already exists`);
      return;
    }
    
    // Add the model
    const updatedConfigs = {
      ...providerConfigs,
      [providerId]: {
        ...providerConfigs[providerId],
        availableModels: [
          ...providerConfigs[providerId].availableModels,
          modelName
        ]
      }
    };
    
    setProviderConfigs(updatedConfigs);
    saveGlobalModelConfigs(updatedConfigs);
    message.success(`Added model ${modelName} to ${providerConfigs[providerId].name}`);
    
    // Notify parent component
    if (onConfigChanged) {
      onConfigChanged({
        providers: updatedConfigs,
        assignments: pipelineAssignments
      });
    }
  };
  
  // Remove a model from a provider (global setting)
  const removeModel = (providerId, modelName) => {
    // Remove the model
    const updatedConfigs = {
      ...providerConfigs,
      [providerId]: {
        ...providerConfigs[providerId],
        availableModels: providerConfigs[providerId].availableModels.filter(
          model => model !== modelName
        )
      }
    };
    
    // If the default model was removed, update it
    if (providerConfigs[providerId].defaultModel === modelName) {
      updatedConfigs[providerId].defaultModel = 
        updatedConfigs[providerId].availableModels[0] || '';
    }
    
    setProviderConfigs(updatedConfigs);
    saveGlobalModelConfigs(updatedConfigs);
    message.success(`Removed model ${modelName} from ${providerConfigs[providerId].name}`);
    
    // Notify parent component
    if (onConfigChanged) {
      onConfigChanged({
        providers: updatedConfigs,
        assignments: pipelineAssignments
      });
    }
  };
  
  // Add a custom provider (global setting)
  const addCustomProvider = () => {
    if (!customProviderId || !customProviderName) {
      message.warning('Provider ID and name are required');
      return;
    }
    
    // Check if ID already exists
    if (providerConfigs[customProviderId]) {
      message.warning(`Provider with ID ${customProviderId} already exists`);
      return;
    }
    
    // Add the custom provider
    const updatedConfigs = {
      ...providerConfigs,
      [customProviderId]: {
        name: customProviderName,
        baseUrl: '',
        apiKey: '',
        defaultModel: '',
        availableModels: [],
        active: false
      }
    };
    
    setProviderConfigs(updatedConfigs);
    saveGlobalModelConfigs(updatedConfigs);
    message.success(`Added custom provider ${customProviderName}`);
    
    // Clear inputs
    setCustomProviderId('');
    setCustomProviderName('');
    
    // Switch to the new provider tab
    setActiveTab(customProviderId);
    
    // Notify parent component
    if (onConfigChanged) {
      onConfigChanged({
        providers: updatedConfigs,
        assignments: pipelineAssignments
      });
    }
  };
  
  // Assign model to pipeline for this project
  const updatePipelineModel = (pipelineType, providerId, modelName) => {
    const effectiveProjectId = projectId || 'default';
    
    // Update the assignment
    const updatedAssignments = {
      ...pipelineAssignments,
      [pipelineType]: {
        providerId,
        modelName
      }
    };
    
    setPipelineAssignments(updatedAssignments);
    saveProjectModelAssignments(effectiveProjectId, updatedAssignments);
    message.success(`Assigned ${providerConfigs[providerId].name} - ${modelName} to ${pipelineType}`);
    
    // Notify parent component
    if (onConfigChanged) {
      onConfigChanged({
        providers: providerConfigs,
        assignments: updatedAssignments
      });
    }
  };
  
  // Render provider configuration form (global settings)
  const renderProviderForm = (providerId) => {
    const config = providerConfigs[providerId];
    if (!config) return null;
    
    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4}>{config.name} Configuration</Title>
          <Space>
            <Switch 
              checked={config.active} 
              onChange={() => activateProvider(providerId)}
              checkedChildren="Active"
              unCheckedChildren="Inactive"
            />
            <Tooltip title="Make this the active AI provider (global setting)">
              <QuestionCircleOutlined />
            </Tooltip>
          </Space>
        </div>
        
        <Form layout="vertical" initialValues={config}>
          <Form.Item 
            label="Base URL" 
            tooltip="The base URL for the provider's API"
          >
            <Input 
              placeholder="https://api.example.com/v1" 
              value={config.baseUrl}
              onChange={(e) => updateProvider(providerId, { baseUrl: e.target.value })} 
            />
          </Form.Item>
          
          <Form.Item 
            label="API Key" 
            tooltip="Your API key for this provider"
          >
            <Input.Password 
              placeholder="Enter API key" 
              value={config.apiKey}
              iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              visibilityToggle={{ visible: showApiKey[providerId], onVisibleChange: () => toggleApiKeyVisibility(providerId) }}
              onChange={(e) => updateProvider(providerId, { apiKey: e.target.value })} 
            />
          </Form.Item>
          
          <Form.Item 
            label="Default Model" 
            tooltip="The default model to use from this provider"
          >
            <Select 
              placeholder="Select default model"
              value={config.defaultModel}
              onChange={(value) => updateProvider(providerId, { defaultModel: value })}
            >
              {config.availableModels.map(model => (
                <Select.Option key={model} value={model}>{model}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
        
        <Divider orientation="left">Available Models</Divider>
        
        <Table 
          dataSource={config.availableModels.map(model => ({ name: model }))} 
          rowKey="name"
          size="small"
          pagination={false}
          columns={[
            {
              title: 'Model Name',
              dataIndex: 'name',
              key: 'name',
            },
            {
              title: 'Actions',
              key: 'actions',
              width: 100,
              render: (_, record) => (
                <Button 
                  type="text" 
                  danger 
                  icon={<MinusCircleOutlined />}
                  onClick={() => removeModel(providerId, record.name)}
                />
              ),
            },
          ]} 
        />
        
        <div style={{ marginTop: 16 }}>
          <Input.Search
            placeholder="Add a new model"
            enterButton={<PlusOutlined />}
            onSearch={(value) => {
              if (value) {
                addModel(providerId, value);
              }
            }}
          />
        </div>
      </div>
    );
  };
  
  // Render project pipeline assignments
  const renderPipelineAssignments = () => {
    const effectiveProjectId = projectId || 'default';
    const [useCustomModels, setUseCustomModels] = useState(false);
    
    // Get the default/global model configuration
    const globalAssignment = {
      providerId: 'openai',
      modelName: 'gpt-4',
      ...Object.values(pipelineAssignments)[0]  // Use the first pipeline's settings as default if available
    };
    
    // Handle changing the global model
    const updateGlobalModel = (providerId, modelName) => {
      const effectiveProjectId = projectId || 'default';
      
      // Apply the same model to all pipelines
      Object.values(PIPELINE_TYPES).forEach(pipelineType => {
        // Use the imported assignModelToPipeline function with correct parameter order
        assignModelToPipeline(effectiveProjectId, pipelineType, providerId, modelName || providerConfigs[providerId]?.defaultModel);
      });
      
      // Refresh the assignments in the UI
      setTimeout(() => {
        const refreshedAssignments = loadProjectModelAssignments(effectiveProjectId);
        setPipelineAssignments(refreshedAssignments);
      }, 100);
      
      message.success(`Updated all pipelines to use ${providerConfigs[providerId].name} - ${modelName || providerConfigs[providerId]?.defaultModel}`);
      
      // Notify parent component
      if (onConfigChanged) {
        onConfigChanged({
          providers: providerConfigs,
          assignments: loadProjectModelAssignments(effectiveProjectId)
        });
      }
    };
    
    return (
      <div>
        <Title level={4}>Pipeline Model Assignments for Project</Title>
        <Text type="secondary">
          Configure which AI model to use for each pipeline in this project.
          Changes only affect this project.
        </Text>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Switch 
            checked={useCustomModels} 
            onChange={setUseCustomModels}
            checkedChildren="Custom per pipeline"
            unCheckedChildren="Same for all"
          />
        </div>
        
        {!useCustomModels && (
          <div style={{ marginTop: 16, marginBottom: 24, padding: 16, border: '1px solid #f0f0f0', borderRadius: 4 }}>
            <Title level={5}>Global Model for All Pipelines</Title>
            
            <Form layout="vertical">
              <div style={{ display: 'flex', gap: '16px' }}>
                <Form.Item 
                  label="Provider"
                  tooltip="Select the AI provider to use for all pipelines"
                  style={{ flex: 1 }}
                >
                  <Select
                    value={globalAssignment.providerId}
                    onChange={(providerId) => {
                      const provider = providerConfigs[providerId];
                      const modelName = provider ? provider.defaultModel : '';
                      updateGlobalModel(providerId, modelName);
                    }}
                  >
                    {Object.entries(providerConfigs).map(([id, provider]) => (
                      <Select.Option key={id} value={id}>
                        {provider.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                
                <Form.Item
                  label="Model"
                  tooltip="Select the specific model to use for all pipelines"
                  style={{ flex: 1 }}
                >
                  <Select
                    value={globalAssignment.modelName}
                    onChange={(modelName) => {
                      updateGlobalModel(globalAssignment.providerId, modelName);
                    }}
                  >
                    {providerConfigs[globalAssignment.providerId]?.availableModels.map(model => (
                      <Select.Option key={model} value={model}>
                        {model}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
            </Form>
          </div>
        )}
        
        {useCustomModels && (
          <>
            <Divider />
            {Object.entries(PIPELINE_TYPES).map(([pipelineKey, pipelineType]) => {
          const assignment = pipelineAssignments[pipelineType] || {
            providerId: 'openai',
            modelName: 'gpt-4'
          };
          
          return (
            <div key={pipelineType} style={{ marginBottom: 24 }}>
              <Title level={5}>
                {pipelineKey.replace(/_/g, ' ')}
              </Title>
              
              <Form layout="vertical">
                <Form.Item 
                  label="Provider"
                  tooltip="Select the AI provider to use for this pipeline"
                >
                  <Select
                    value={assignment.providerId}
                    onChange={(providerId) => {
                      // When provider changes, use its default model
                      const provider = providerConfigs[providerId];
                      const modelName = provider ? provider.defaultModel : '';
                      updatePipelineModel(pipelineType, providerId, modelName);
                    }}
                    style={{ width: '100%' }}
                  >
                    {Object.entries(providerConfigs).map(([id, provider]) => (
                      <Select.Option key={id} value={id}>
                        {provider.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                
                <Form.Item
                  label="Model"
                  tooltip="Select the specific model to use for this pipeline"
                >
                  <Select
                    value={assignment.modelName}
                    onChange={(modelName) => {
                      const effectiveProjectId = projectId || 'default';
                      assignModelToPipeline(effectiveProjectId, pipelineType, assignment.providerId, modelName);
                    }}
                    style={{ width: '100%' }}
                  >
                    {providerConfigs[assignment.providerId]?.availableModels.map(model => (
                      <Select.Option key={model} value={model}>
                        {model}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Form>
              
              <Divider />
            </div>
          );
        })}
          </>
        )}
      </div>
    );
  };
  
  return (
    <Modal
      title="AI Model Configuration"
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="close" onClick={onCancel}>
          Close
        </Button>,
      ]}
    >
      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        {/* Project Pipeline Assignments Tab */}
        <TabPane 
          tab={
            <span>
              <RobotOutlined /> Project Pipelines
            </span>
          } 
          key="pipelines"
        >
          {renderPipelineAssignments()}
        </TabPane>
      
        {/* Global Providers Tab */}
        <TabPane 
          tab={
            <span>
              <SettingOutlined /> Global Providers
            </span>
          } 
          key="providers"
        >
          <Tabs type="card">
            {/* Render tabs for each provider */}
            {Object.keys(providerConfigs).map(providerId => (
              <TabPane tab={providerConfigs[providerId].name} key={providerId}>
                {renderProviderForm(providerId)}
              </TabPane>
            ))}
            
            {/* Add Custom Provider Tab */}
            <TabPane tab={<><PlusOutlined /> Add Provider</>} key="add_provider">
              <div>
                <Title level={4}>Add Custom Provider</Title>
                <Form layout="vertical">
                  <Form.Item 
                    label="Provider ID" 
                    tooltip="A unique identifier for this provider (lowercase, no spaces)"
                  >
                    <Input 
                      placeholder="custom_provider" 
                      value={customProviderId}
                      onChange={(e) => setCustomProviderId(e.target.value.toLowerCase().replace(/\s+/g, '_'))} 
                    />
                  </Form.Item>
                  
                  <Form.Item 
                    label="Provider Name" 
                    tooltip="Display name for this provider"
                  >
                    <Input 
                      placeholder="Custom Provider Name" 
                      value={customProviderName}
                      onChange={(e) => setCustomProviderName(e.target.value)} 
                    />
                  </Form.Item>
                  
                  <Button 
                    type="primary" 
                    onClick={addCustomProvider}
                    disabled={!customProviderId || !customProviderName}
                  >
                    Add Provider
                  </Button>
                </Form>
              </div>
            </TabPane>
          </Tabs>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default ModelConfigModal;