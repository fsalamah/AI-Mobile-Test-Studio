// ModelConfigPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Typography, 
  Tabs, 
  Card, 
  Button, 
  Form, 
  Input, 
  Select, 
  Switch, 
  Table, 
  Divider, 
  Space,
  Tooltip,
  message
} from 'antd';
import { 
  CloseOutlined,
  PlusOutlined, 
  MinusCircleOutlined, 
  QuestionCircleOutlined, 
  LockOutlined, 
  EyeOutlined, 
  EyeInvisibleOutlined, 
  RobotOutlined, 
  SettingOutlined,
  SaveOutlined,
  EditOutlined
} from '@ant-design/icons';
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
} from '../../lib/ai/modelManager';

const { Content, Header } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

/**
 * Full page component for AI Model Configuration
 */
const ModelConfigPage = ({ 
  projectId,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState('pipelines');
  const [providerConfigs, setProviderConfigs] = useState({});
  const [pipelineAssignments, setPipelineAssignments] = useState({});
  const [showApiKey, setShowApiKey] = useState({});
  const [customProviderName, setCustomProviderName] = useState('');
  const [customProviderId, setCustomProviderId] = useState('');
  
  // Load configurations when component mounts
  useEffect(() => {
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
  }, [projectId]);
  
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
  };
  
// Provider configuration form component (separated to allow useState hooks)
const ProviderConfigForm = ({ 
  providerId, 
  config, 
  showApiKey,
  onToggleApiKey,
  onUpdateProvider,
  onActivateProvider,
  onAddModel,
  onRemoveModel
}) => {
  // State for provider name editing
  const [editingName, setEditingName] = useState(false);
  const [providerName, setProviderName] = useState(config.name);
  
  // Handle name edit save
  const saveProviderName = () => {
    if (providerName && providerName.trim() !== '') {
      onUpdateProvider(providerId, { name: providerName });
      setEditingName(false);
    }
  };
  
  const isCustomProvider = !['openai', 'anthropic', 'ollama'].includes(providerId);
  
  return (
    <Card className="provider-config-card">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {editingName ? (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Input 
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              onPressEnter={saveProviderName}
              autoFocus
              style={{ width: 250 }}
            />
            <Button 
              type="primary" 
              size="small" 
              onClick={saveProviderName}
              style={{ marginLeft: 8 }}
            >
              Save
            </Button>
            <Button 
              size="small" 
              onClick={() => {
                setEditingName(false);
                setProviderName(config.name);
              }}
              style={{ marginLeft: 8 }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>{config.name} Configuration</Title>
            {isCustomProvider && (
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                onClick={() => setEditingName(true)}
                size="small"
                style={{ marginLeft: 8 }}
                title="Edit Provider Name"
              />
            )}
          </div>
        )}
        <Space>
          <Switch 
            checked={config.active} 
            onChange={() => onActivateProvider(providerId)}
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
            onChange={(e) => onUpdateProvider(providerId, { baseUrl: e.target.value })} 
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
            visibilityToggle={{ visible: showApiKey, onVisibleChange: () => onToggleApiKey(providerId) }}
            onChange={(e) => onUpdateProvider(providerId, { apiKey: e.target.value })} 
          />
        </Form.Item>
        
        <Form.Item 
          label="Default Model" 
          tooltip="The default model to use from this provider"
        >
          <Select 
            placeholder="Select default model"
            value={config.defaultModel}
            onChange={(value) => onUpdateProvider(providerId, { defaultModel: value })}
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
                onClick={() => onRemoveModel(providerId, record.name)}
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
              onAddModel(providerId, value);
            }
          }}
        />
      </div>
    </Card>
  );
};
  
  // Render global pipeline assignments
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
    };
    
    const pipelineIconMap = {
      'VISUAL_ANALYSIS': '🔍',
      'XPATH_GENERATION': '🔗',
      'XPATH_REPAIR': '🔧',
      'POM_GENERATION': '📝'
    };
    
    const pipelineDescriptions = {
      'VISUAL_ANALYSIS': 'Analyzes screen elements visually to identify UI components',
      'XPATH_GENERATION': 'Generates XPath expressions for identified elements',
      'XPATH_REPAIR': 'Fixes broken XPath expressions when elements change',
      'POM_GENERATION': 'Creates Page Object Models from identified elements'
    };
    
    return (
      <div>
        <Card 
          className="pipeline-assignments-card"
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <RobotOutlined style={{ fontSize: '18px', marginRight: '8px', color: '#1890ff' }} />
              <span>AI Model Configuration</span>
            </div>
          }
          bordered={false}
          style={{ 
            marginBottom: 24,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <Paragraph>
            Configure which AI model to use for your pipelines.
            These settings apply to all operations in the application.
          </Paragraph>
          
          {/* Global model configuration that applies to all pipelines */}
          <Card 
            style={{ 
              marginBottom: 24,
              border: '1px solid #f0f0f0'
            }}
          >
            <Form layout="vertical">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>Default Model for All Pipelines</Title>
                <Switch 
                  checked={useCustomModels} 
                  onChange={setUseCustomModels}
                  checkedChildren="Custom per pipeline"
                  unCheckedChildren="Same for all"
                />
              </div>
              
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
                    disabled={useCustomModels}
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
                    disabled={useCustomModels}
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
          </Card>
          
          {/* Custom configurations for each pipeline (only visible when useCustomModels is true) */}
          {useCustomModels && (
            <div>
              <Divider>
                <span style={{ fontSize: 16, fontWeight: 'bold' }}>Custom Pipeline Configurations</span>
              </Divider>
              
              {Object.entries(PIPELINE_TYPES).map(([pipelineKey, pipelineType], index) => {
                const assignment = pipelineAssignments[pipelineType] || {
                  providerId: globalAssignment.providerId,
                  modelName: globalAssignment.modelName
                };
                
                const icon = pipelineIconMap[pipelineKey] || '🤖';
                const description = pipelineDescriptions[pipelineKey] || '';
                
                return (
                  <Card 
                    key={pipelineType} 
                    type="inner" 
                    style={{ 
                      marginBottom: 16,
                      backgroundColor: index % 2 === 0 ? '#fafafa' : '#fff'
                    }}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '8px', fontSize: '18px' }}>{icon}</span>
                        <span>
                          {pipelineKey.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                          ).join(' ')}
                        </span>
                      </div>
                    }
                  >
                    <Paragraph style={{ marginBottom: 16 }}>
                      {description}
                    </Paragraph>
                    
                    <Form layout="vertical">
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <Form.Item 
                          label="Provider"
                          tooltip="Select the AI provider to use for this pipeline"
                          style={{ flex: 1 }}
                        >
                          <Select
                            value={assignment.providerId}
                            onChange={(providerId) => {
                              // When provider changes, use its default model
                              const provider = providerConfigs[providerId];
                              const modelName = provider ? provider.defaultModel : '';
                              updatePipelineModel(pipelineType, providerId, modelName);
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
                          tooltip="Select the specific model to use for this pipeline"
                          style={{ flex: 1 }}
                        >
                          <Select
                            value={assignment.modelName}
                            onChange={(modelName) => {
                              updatePipelineModel(pipelineType, assignment.providerId, modelName);
                            }}
                          >
                            {providerConfigs[assignment.providerId]?.availableModels.map(model => (
                              <Select.Option key={model} value={model}>
                                {model}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </div>
                    </Form>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    );
  };
  
  // Render provider management UI
  const renderProviderManagement = () => {
    return (
      <div className="provider-management">
        <Card
          className="provider-management-card"
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <SettingOutlined style={{ fontSize: '18px', marginRight: '8px', color: '#1890ff' }} />
              <span>Global AI Provider Settings</span>
            </div>
          }
          bordered={false}
          style={{ 
            marginBottom: 24,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <Paragraph>
            Configure AI providers and their models. These settings are global and shared across all projects.
          </Paragraph>
          
          <Tabs type="card">
            {/* Render tabs for each provider */}
            {Object.keys(providerConfigs).map(providerId => {
              const providerIconMap = {
                'openai': '🧠',
                'anthropic': '🦮',
                'ollama': '🦙',
                'custom': '⚙️'
              };
              
              const icon = providerIconMap[providerId] || '⚙️';
              
              return (
                <TabPane 
                  tab={
                    <span>
                      <span style={{ marginRight: '8px' }}>{icon}</span>
                      {providerConfigs[providerId].name}
                    </span>
                  } 
                  key={providerId}
                >
                  <ProviderConfigForm
                    providerId={providerId}
                    config={providerConfigs[providerId]}
                    showApiKey={showApiKey[providerId]}
                    onToggleApiKey={toggleApiKeyVisibility}
                    onUpdateProvider={updateProvider}
                    onActivateProvider={activateProvider}
                    onAddModel={addModel}
                    onRemoveModel={removeModel}
                  />
                </TabPane>
              );
            })}
            
            {/* Add Custom Provider Tab */}
            <TabPane 
              tab={
                <span>
                  <PlusOutlined /> Add Provider
                </span>
              } 
              key="add_provider"
            >
              <Card 
                className="add-provider-card"
                style={{ boxShadow: 'none', border: '1px dashed #d9d9d9' }}
              >
                <Title level={4}>Add Custom AI Provider</Title>
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
                    icon={<PlusOutlined />}
                    onClick={addCustomProvider}
                    disabled={!customProviderId || !customProviderName}
                  >
                    Add Provider
                  </Button>
                </Form>
              </Card>
            </TabPane>
          </Tabs>
        </Card>
      </div>
    );
  };

  return (
    <Layout className="model-config-page" style={{ height: '100vh', background: '#fff' }}>
      <div style={{ 
        padding: '16px 24px', 
        borderBottom: '1px solid #f0f0f0', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#fff'
      }}>
        <Title level={3} style={{ margin: 0 }}>
          <RobotOutlined style={{ marginRight: 12 }} />
          AI Model Configuration
        </Title>
        
        <Space>
          <Button 
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => {
              message.success('AI model configurations saved successfully');
            }}
          >
            Save Changes
          </Button>
          <Button 
            icon={<CloseOutlined />} 
            onClick={onBack}
          >
            Done
          </Button>
        </Space>
      </div>
      
      <Content style={{ padding: '24px', overflowY: 'auto', background: '#fff' }}>
        <Tabs 
          defaultActiveKey="pipelines" 
          onChange={handleTabChange} 
          type="card"
          size="large"
          style={{ background: '#fff' }}
        >
          <TabPane
            tab={
              <span>
                <RobotOutlined /> Pipeline Models
              </span>
            }
            key="pipelines"
          >
            {renderPipelineAssignments()}
          </TabPane>
          
          <TabPane
            tab={
              <span>
                <SettingOutlined /> Global Providers
              </span>
            }
            key="providers"
          >
            {renderProviderManagement()}
          </TabPane>
        </Tabs>
      </Content>
    </Layout>
  );
};

export default ModelConfigPage;