import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Button, 
  Space, 
  Tabs, 
  Card, 
  List, 
  Tag, 
  Tooltip, 
  Modal, 
  Form, 
  Input,
  Empty,
  notification,
  Breadcrumb
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ExportOutlined,
  EyeOutlined,
  UploadOutlined,
  RollbackOutlined
} from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useAppStore from '../store/appStore';
import FileUploader from '../components/common/FileUploader';
import { Page } from '../types/api';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pages');
  const [editProjectModalVisible, setEditProjectModalVisible] = useState(false);
  const [deleteProjectModalVisible, setDeleteProjectModalVisible] = useState(false);
  const [createPageModalVisible, setCreatePageModalVisible] = useState(false);
  const [uploadPageModalVisible, setUploadPageModalVisible] = useState(false);
  const [projectForm] = Form.useForm();
  const [pageForm] = Form.useForm();

  // Get data from store
  const projects = useAppStore(state => state.projects);
  const pages = useAppStore(state => state.pages);
  const updateProject = useAppStore(state => state.updateProject);
  const deleteProject = useAppStore(state => state.deleteProject);
  const addPage = useAppStore(state => state.addPage);
  const setCurrentPage = useAppStore(state => state.setCurrentPage);

  // Find the current project
  const project = projects.find(p => p.id === projectId);
  
  // Filter pages belonging to this project
  const projectPages = pages.filter(page => project?.pages.includes(page.id));
  
  // Handle navigation if project doesn't exist
  useEffect(() => {
    if (!project && projectId) {
      notification.error({
        message: 'Project not found',
        description: 'The requested project could not be found.'
      });
      navigate('/projects');
    }
  }, [project, projectId, navigate]);

  if (!project) {
    return null; // Render nothing while redirecting
  }

  // Update project details
  const handleEditProject = () => {
    projectForm.setFieldsValue({
      name: project.name,
      description: project.description || ''
    });
    setEditProjectModalVisible(true);
  };

  const handleEditProjectSubmit = () => {
    projectForm.validateFields().then(values => {
      updateProject(projectId!, {
        name: values.name,
        description: values.description,
        updatedAt: new Date().toISOString()
      });
      
      setEditProjectModalVisible(false);
    });
  };

  // Delete project
  const handleDeleteProject = () => {
    setDeleteProjectModalVisible(true);
  };

  const handleDeleteProjectSubmit = () => {
    deleteProject(projectId!);
    setDeleteProjectModalVisible(false);
    navigate('/projects');
  };

  // Create a new page
  const handleCreatePage = () => {
    pageForm.resetFields();
    setCreatePageModalVisible(true);
  };

  const handleCreatePageSubmit = () => {
    pageForm.validateFields().then(values => {
      const newPage: Omit<Page, 'id'> = {
        name: values.name,
        description: values.description,
        states: [],
        projectId: projectId!,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const pageId = addPage(newPage);
      
      // Add the page ID to the project's pages array
      updateProject(projectId!, {
        pages: [...project.pages, pageId],
        updatedAt: new Date().toISOString()
      });
      
      setCreatePageModalVisible(false);
      pageForm.resetFields();
    });
  };

  // Upload a page
  const handleUploadPage = () => {
    setUploadPageModalVisible(true);
  };

  // View a page
  const handleViewPage = (pageId: string) => {
    setCurrentPage(pageId);
    navigate(`/pages/${pageId}`);
  };

  // Handle file upload
  const handleFileUploaded = (fileData: any) => {
    // Process the uploaded file data and create a new page
    try {
      // Add logic to parse the uploaded file and create a new page
      // This is a placeholder for the actual implementation
      notification.success({
        message: 'Page uploaded successfully',
        description: 'The page has been added to your project.'
      });
      setUploadPageModalVisible(false);
    } catch (error) {
      notification.error({
        message: 'Upload failed',
        description: 'There was an error processing the uploaded file.'
      });
    }
  };

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="/projects">Projects</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{project.name}</Breadcrumb.Item>
      </Breadcrumb>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={2}>{project.name}</Title>
          <Paragraph>{project.description || 'No description'}</Paragraph>
          <Space>
            <Text type="secondary">Created: {new Date(project.createdAt!).toLocaleDateString()}</Text>
            {project.updatedAt && (
              <Text type="secondary">Updated: {new Date(project.updatedAt).toLocaleDateString()}</Text>
            )}
          </Space>
        </div>
        <Space>
          <Button icon={<EditOutlined />} onClick={handleEditProject}>
            Edit
          </Button>
          <Button icon={<ExportOutlined />}>
            Export
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDeleteProject}>
            Delete
          </Button>
          <Button icon={<RollbackOutlined />} onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </Space>
      </div>
      
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Pages" key="pages">
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreatePage}>
                New Page
              </Button>
              <Button icon={<UploadOutlined />} onClick={handleUploadPage}>
                Upload Page
              </Button>
            </Space>
          </div>
          
          {projectPages.length > 0 ? (
            <List
              grid={{ 
                gutter: 16, 
                xs: 1, 
                sm: 1, 
                md: 2, 
                lg: 3, 
                xl: 3, 
                xxl: 4 
              }}
              dataSource={projectPages}
              renderItem={page => (
                <List.Item>
                  <Card
                    hoverable
                    actions={[
                      <Tooltip title="View Page">
                        <EyeOutlined key="view" onClick={() => handleViewPage(page.id)} />
                      </Tooltip>,
                      <Tooltip title="Edit Page">
                        <EditOutlined key="edit" />
                      </Tooltip>,
                      <Tooltip title="Delete Page">
                        <DeleteOutlined key="delete" />
                      </Tooltip>
                    ]}
                  >
                    <Card.Meta
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {page.name}
                          <Tag color="green">
                            {page.states.length} States
                          </Tag>
                        </div>
                      }
                      description={
                        <div>
                          <Paragraph ellipsis={{ rows: 2 }}>
                            {page.description || 'No description'}
                          </Paragraph>
                          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                            Created: {new Date(page.createdAt!).toLocaleDateString()}
                          </div>
                        </div>
                      }
                    />
                  </Card>
                </List.Item>
              )}
            />
          ) : (
            <Empty 
              description={
                <span>
                  No pages found. <Button type="link" onClick={handleCreatePage}>Create one now</Button>
                </span>
              }
            />
          )}
        </TabPane>
        <TabPane tab="Analysis Results" key="analysis">
          <Empty 
            description={
              <span>
                No analysis results available. Analyze your pages to see results here.
              </span>
            }
          />
        </TabPane>
      </Tabs>
      
      {/* Edit Project Modal */}
      <Modal
        title="Edit Project"
        open={editProjectModalVisible}
        onOk={handleEditProjectSubmit}
        onCancel={() => setEditProjectModalVisible(false)}
      >
        <Form form={projectForm} layout="vertical">
          <Form.Item
            name="name"
            label="Project Name"
            rules={[{ required: true, message: 'Please enter a project name' }]}
          >
            <Input placeholder="Enter project name" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea placeholder="Enter project description" rows={4} />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Delete Project Modal */}
      <Modal
        title="Delete Project"
        open={deleteProjectModalVisible}
        onOk={handleDeleteProjectSubmit}
        onCancel={() => setDeleteProjectModalVisible(false)}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete the project "{project.name}"?</p>
        <p>This action cannot be undone and will delete all associated pages and analysis results.</p>
      </Modal>
      
      {/* Create Page Modal */}
      <Modal
        title="Create New Page"
        open={createPageModalVisible}
        onOk={handleCreatePageSubmit}
        onCancel={() => setCreatePageModalVisible(false)}
      >
        <Form form={pageForm} layout="vertical">
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
        </Form>
      </Modal>
      
      {/* Upload Page Modal */}
      <Modal
        title="Upload Page"
        open={uploadPageModalVisible}
        onCancel={() => setUploadPageModalVisible(false)}
        footer={null}
      >
        <FileUploader 
          onFileUploaded={handleFileUploaded}
          acceptedFileTypes=".json,.xml"
          description="Upload a page file in JSON or XML format"
        />
      </Modal>
    </div>
  );
};

export default ProjectDetail;