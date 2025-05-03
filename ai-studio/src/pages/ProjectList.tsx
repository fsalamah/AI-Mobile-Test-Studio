import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  List, 
  Typography, 
  Space, 
  Divider, 
  Tag, 
  Input, 
  Modal,
  Form,
  Tooltip,
  Empty
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ExportOutlined,
  ImportOutlined,
  EyeOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import useAppStore from '../store/appStore';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const ProjectList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [currentProject, setCurrentProjectState] = useState<any>(null);
  const [form] = Form.useForm();
  
  const navigate = useNavigate();
  
  // Get projects from store
  const projects = useAppStore(state => state.projects);
  const addProject = useAppStore(state => state.addProject);
  const updateProject = useAppStore(state => state.updateProject);
  const deleteProject = useAppStore(state => state.deleteProject);
  const setCurrentProject = useAppStore(state => state.setCurrentProject);
  
  // Filter projects by search term
  const filteredProjects = projects.filter(
    project => 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Open create project modal
  const handleCreateProject = () => {
    form.resetFields();
    setCreateModalVisible(true);
  };
  
  // Open edit project modal
  const handleEditProject = (project: any) => {
    setCurrentProjectState(project);
    form.setFieldsValue({
      name: project.name,
      description: project.description || ''
    });
    setEditModalVisible(true);
  };
  
  // Open delete project modal
  const handleDeleteProject = (project: any) => {
    setCurrentProjectState(project);
    setDeleteModalVisible(true);
  };
  
  // Create a new project
  const handleCreateSubmit = () => {
    form.validateFields().then(values => {
      const newProject = {
        name: values.name,
        description: values.description,
        pages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      addProject(newProject);
      setCreateModalVisible(false);
      form.resetFields();
    });
  };
  
  // Update an existing project
  const handleEditSubmit = () => {
    form.validateFields().then(values => {
      updateProject(currentProject.id, {
        name: values.name,
        description: values.description,
        updatedAt: new Date().toISOString()
      });
      
      setEditModalVisible(false);
      setCurrentProjectState(null);
      form.resetFields();
    });
  };
  
  // Delete a project
  const handleDeleteSubmit = () => {
    deleteProject(currentProject.id);
    setDeleteModalVisible(false);
    setCurrentProjectState(null);
  };
  
  // View a project
  const handleViewProject = (projectId: string) => {
    setCurrentProject(projectId);  // This is the store action, not the state setter
    navigate(`/projects/${projectId}`);
  };
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>Projects</Title>
        <Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreateProject}
          >
            New Project
          </Button>
          <Button icon={<ImportOutlined />}>
            Import
          </Button>
        </Space>
      </div>
      
      <Search
        placeholder="Search projects"
        allowClear
        enterButton={<SearchOutlined />}
        size="large"
        onSearch={value => setSearchTerm(value)}
        onChange={e => setSearchTerm(e.target.value)}
        style={{ marginBottom: 16 }}
      />
      
      {filteredProjects.length > 0 ? (
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
          dataSource={filteredProjects}
          renderItem={project => (
            <List.Item>
              <Card
                hoverable
                actions={[
                  <Tooltip title="View Project">
                    <EyeOutlined key="view" onClick={() => handleViewProject(project.id)} />
                  </Tooltip>,
                  <Tooltip title="Edit Project">
                    <EditOutlined key="edit" onClick={() => handleEditProject(project)} />
                  </Tooltip>,
                  <Tooltip title="Export Project">
                    <ExportOutlined key="export" />
                  </Tooltip>,
                  <Tooltip title="Delete Project">
                    <DeleteOutlined key="delete" onClick={() => handleDeleteProject(project)} />
                  </Tooltip>
                ]}
              >
                <Card.Meta
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {project.name}
                      <Tag color="blue">
                        {(project.pages || []).length} Pages
                      </Tag>
                    </div>
                  }
                  description={
                    <div>
                      <Paragraph ellipsis={{ rows: 2 }}>
                        {project.description || 'No description'}
                      </Paragraph>
                      <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        Created: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}
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
              No projects found. <Button type="link" onClick={handleCreateProject}>Create one now</Button>
            </span>
          }
        />
      )}
      
      {/* Create Project Modal */}
      <Modal
        title="Create New Project"
        open={createModalVisible}
        onOk={handleCreateSubmit}
        onCancel={() => setCreateModalVisible(false)}
      >
        <Form form={form} layout="vertical">
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
      
      {/* Edit Project Modal */}
      <Modal
        title="Edit Project"
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalVisible(false)}
      >
        <Form form={form} layout="vertical">
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
        open={deleteModalVisible}
        onOk={handleDeleteSubmit}
        onCancel={() => setDeleteModalVisible(false)}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete the project "{currentProject?.name}"?</p>
        <p>This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default ProjectList;