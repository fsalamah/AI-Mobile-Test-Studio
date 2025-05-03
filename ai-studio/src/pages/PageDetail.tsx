import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Tabs, 
  Button, 
  Space, 
  Card, 
  Descriptions,
  Tag,
  Breadcrumb,
  notification,
  Divider,
  Modal,
  Form,
  Input,
  Select,
  Empty
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CodeOutlined,
  ToolOutlined,
  ExportOutlined,
  RollbackOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useAppStore from '../store/appStore';
import ScreenshotViewer from '../components/analysis/ScreenshotViewer';
import ElementCard from '../components/analysis/ElementCard';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const PageDetail: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [activeState, setActiveState] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [editPageModalVisible, setEditPageModalVisible] = useState(false);
  const [deletePageModalVisible, setDeletePageModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Get data from store
  const pages = useAppStore(state => state.pages);
  const projects = useAppStore(state => state.projects);
  const updatePage = useAppStore(state => state.updatePage);
  const deletePage = useAppStore(state => state.deletePage);
  const updateProject = useAppStore(state => state.updateProject);

  // Find the current page
  const page = pages.find(p => p.id === pageId);
  
  // Find the project this page belongs to
  const project = page?.projectId ? projects.find(p => p.id === page.projectId) : null;
  
  // Set active state and platform when the page loads
  useEffect(() => {
    if (page && page.states.length > 0) {
      setActiveState(page.states[0].id);
      
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

  // Get the active state data
  const currentState = activeState 
    ? page.states.find(s => s.id === activeState) 
    : null;
  
  // Get the active platform data
  const currentPlatformData = currentState && activePlatform
    ? currentState.versions[activePlatform]
    : null;

  // Edit page details
  const handleEditPage = () => {
    form.setFieldsValue({
      name: page.name,
      description: page.description || '',
      projectId: page.projectId || ''
    });
    setEditPageModalVisible(true);
  };

  const handleEditPageSubmit = () => {
    form.validateFields().then(values => {
      // If project is changed, update both the page and the projects
      const oldProjectId = page.projectId;
      const newProjectId = values.projectId;
      
      // Update the page
      updatePage(pageId!, {
        name: values.name,
        description: values.description,
        projectId: newProjectId,
        updatedAt: new Date().toISOString()
      });
      
      // If project assignment changed, update the projects
      if (oldProjectId !== newProjectId) {
        // Remove from old project if it existed
        if (oldProjectId) {
          const oldProject = projects.find(p => p.id === oldProjectId);
          if (oldProject) {
            updateProject(oldProjectId, {
              pages: oldProject.pages.filter(id => id !== pageId),
              updatedAt: new Date().toISOString()
            });
          }
        }
        
        // Add to new project if one is selected
        if (newProjectId) {
          const newProject = projects.find(p => p.id === newProjectId);
          if (newProject) {
            updateProject(newProjectId, {
              pages: [...newProject.pages, pageId!],
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
      
      setEditPageModalVisible(false);
    });
  };

  // Delete page
  const handleDeletePage = () => {
    setDeletePageModalVisible(true);
  };

  const handleDeletePageSubmit = () => {
    // If page belongs to a project, update the project
    if (page.projectId) {
      const project = projects.find(p => p.id === page.projectId);
      if (project) {
        updateProject(page.projectId, {
          pages: project.pages.filter(id => id !== pageId),
          updatedAt: new Date().toISOString()
        });
      }
    }
    
    // Delete the page
    deletePage(pageId!);
    setDeletePageModalVisible(false);
    
    // Navigate back to the project or projects list
    if (page.projectId) {
      navigate(`/projects/${page.projectId}`);
    } else {
      navigate('/projects');
    }
  };

  // Navigate to XPath fixer
  const handleFixXPaths = () => {
    navigate(`/xpath-fixer?pageId=${pageId}`);
  };

  // Navigate to code generator
  const handleGenerateCode = () => {
    navigate(`/code-generator?pageId=${pageId}`);
  };

  // Convert base64 to image URL for display
  const getImageUrl = (base64String: string) => {
    if (base64String.startsWith('data:image')) {
      return base64String;
    }
    return `data:image/png;base64,${base64String}`;
  };

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="/projects">Projects</Link>
        </Breadcrumb.Item>
        {project && (
          <Breadcrumb.Item>
            <Link to={`/projects/${project.id}`}>{project.name}</Link>
          </Breadcrumb.Item>
        )}
        <Breadcrumb.Item>{page.name}</Breadcrumb.Item>
      </Breadcrumb>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={2}>{page.name}</Title>
          <Paragraph>{page.description || 'No description'}</Paragraph>
          <Space>
            <Text type="secondary">Created: {new Date(page.createdAt!).toLocaleDateString()}</Text>
            {page.updatedAt && (
              <Text type="secondary">Updated: {new Date(page.updatedAt).toLocaleDateString()}</Text>
            )}
            {project && (
              <Tag color="blue">Project: {project.name}</Tag>
            )}
          </Space>
        </div>
        <Space>
          <Button icon={<EditOutlined />} onClick={handleEditPage}>
            Edit
          </Button>
          <Button icon={<ToolOutlined />} onClick={handleFixXPaths}>
            Fix XPaths
          </Button>
          <Button icon={<CodeOutlined />} onClick={handleGenerateCode}>
            Generate Code
          </Button>
          <Button icon={<ExportOutlined />}>
            Export
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDeletePage}>
            Delete
          </Button>
          <Button icon={<RollbackOutlined />} onClick={() => {
            if (project) {
              navigate(`/projects/${project.id}`);
            } else {
              navigate('/projects');
            }
          }}>
            Back
          </Button>
        </Space>
      </div>
      
      {page.states.length > 0 ? (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <Space>
                <Text strong>State:</Text>
                <Select 
                  value={activeState} 
                  onChange={setActiveState}
                  style={{ width: 200 }}
                >
                  {page.states.map(state => (
                    <Option key={state.id} value={state.id}>
                      {state.title || `State ${state.id}`}
                    </Option>
                  ))}
                </Select>
                
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
              </Space>
              
              <Button type="dashed" icon={<PlusOutlined />}>
                Add State
              </Button>
            </div>
            
            {currentPlatformData ? (
              <div style={{ display: 'flex' }}>
                <div style={{ width: '50%', padding: 8 }}>
                  <ScreenshotViewer 
                    imageData={getImageUrl(currentPlatformData.screenShot)} 
                    elements={[]} // Add analyzed elements here when available
                  />
                </div>
                <div style={{ width: '50%', padding: 8, maxHeight: 500, overflow: 'auto' }}>
                  <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
                    {currentPlatformData.pageSource}
                  </pre>
                </div>
              </div>
            ) : (
              <Empty description="No data available for the selected state and platform" />
            )}
          </Card>
          
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="Overview" key="overview">
              <Card>
                <Descriptions title="Page Information" bordered>
                  <Descriptions.Item label="Name" span={3}>{page.name}</Descriptions.Item>
                  <Descriptions.Item label="Description" span={3}>{page.description || 'No description'}</Descriptions.Item>
                  <Descriptions.Item label="States" span={3}>{page.states.length}</Descriptions.Item>
                  <Descriptions.Item label="Platforms" span={3}>
                    {currentState ? (
                      Object.keys(currentState.versions).map(platform => (
                        <Tag key={platform} color="blue">
                          {platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </Tag>
                      ))
                    ) : (
                      'No platforms available'
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Created" span={3}>
                    {new Date(page.createdAt!).toLocaleString()}
                  </Descriptions.Item>
                  {page.updatedAt && (
                    <Descriptions.Item label="Updated" span={3}>
                      {new Date(page.updatedAt).toLocaleString()}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            </TabPane>
            <TabPane tab="Elements" key="elements">
              <Card>
                <Empty description="No elements have been analyzed yet. Run an analysis to identify elements." />
              </Card>
            </TabPane>
            <TabPane tab="Analysis Results" key="analysis">
              <Card>
                <Empty description="No analysis results available. Run an analysis to see results here." />
              </Card>
            </TabPane>
          </Tabs>
        </div>
      ) : (
        <Empty 
          description={
            <span>
              This page doesn't have any states yet. Add a state to continue.
            </span>
          }
        >
          <Button type="primary" icon={<PlusOutlined />}>
            Add State
          </Button>
        </Empty>
      )}
      
      {/* Edit Page Modal */}
      <Modal
        title="Edit Page"
        open={editPageModalVisible}
        onOk={handleEditPageSubmit}
        onCancel={() => setEditPageModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Page Name"
            rules={[{ required: true, message: 'Please enter a page name' }]}
          >
            <Input placeholder="Enter page name" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea placeholder="Enter page description" rows={4} />
          </Form.Item>
          <Form.Item
            name="projectId"
            label="Project"
          >
            <Select
              placeholder="Select a project (optional)"
              allowClear
            >
              {projects.map(p => (
                <Option key={p.id} value={p.id}>{p.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Delete Page Modal */}
      <Modal
        title="Delete Page"
        open={deletePageModalVisible}
        onOk={handleDeletePageSubmit}
        onCancel={() => setDeletePageModalVisible(false)}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete the page "{page.name}"?</p>
        <p>This action cannot be undone and will delete all associated analysis results.</p>
      </Modal>
    </div>
  );
};

export default PageDetail;