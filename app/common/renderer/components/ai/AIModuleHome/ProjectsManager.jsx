/**
 * ProjectsManager Component
 *
 * This component provides functionality to manage AI Studio projects,
 * including creating new projects, opening existing ones, and viewing
 * project details.
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Button,
  Input,
  Modal,
  Form,
  Empty,
  Typography,
  Tooltip,
  Space,
  Tag,
  Dropdown,
  Menu,
  Divider,
  message
} from 'antd';
import {
  FolderOutlined,
  PlusOutlined,
  EllipsisOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  ExportOutlined,
  ImportOutlined
} from '@ant-design/icons';
import { getRecentProjects, removeRecentProject } from '../utils/FileOperationsUtils.js';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { confirm } = Modal;

const ProjectsManager = ({ 
  onProjectSelect, 
  onCreateProject, 
  onImportProject,
  fileOperations 
}) => {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [createProjectModalVisible, setCreateProjectModalVisible] = useState(false);
  const [newProjectForm] = Form.useForm();

  // Load projects when component mounts
  useEffect(() => {
    loadProjects();
  }, []);

  // Load projects from storage
  const loadProjects = () => {
    const recentProjects = getRecentProjects();
    setProjects(recentProjects);
  };

  // Filter projects based on search term
  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle creating a new project
  const handleCreateProject = (values) => {
    if (fileOperations && fileOperations.chooseFile) {
      try {
        // This would typically trigger file save dialog and then create the project
        fileOperations.chooseFile();
        
        // After project creation, refresh list
        loadProjects();
        
        // Close modal and reset form
        setCreateProjectModalVisible(false);
        newProjectForm.resetFields();
        
        message.success(`Project "${values.name}" created successfully`);
      } catch (error) {
        console.error("Error creating project:", error);
        message.error("Failed to create project: " + error.message);
      }
    } else {
      message.warning("Create project functionality is not available");
    }
  };

  // Handle opening a project
  const handleOpenProject = (project) => {
    if (fileOperations && fileOperations.openRecentProject) {
      fileOperations.openRecentProject(project.name);
      if (onProjectSelect) {
        onProjectSelect(project);
      }
    } else {
      message.warning("Open project functionality is not available");
    }
  };

  // Handle deleting a project from recent list
  const handleRemoveProject = (e, project) => {
    e.stopPropagation(); // Prevent triggering the list item click
    
    confirm({
      title: `Remove "${project.name}" from recent projects?`,
      content: 'This will only remove it from the list, not delete the actual file.',
      okText: 'Remove',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        const updatedProjects = removeRecentProject(project.name);
        setProjects(updatedProjects);
        message.success(`"${project.name}" removed from recent projects`);
      }
    });
  };

  // Project actions menu
  const getProjectActionsMenu = (project) => (
    <Menu>
      <Menu.Item key="edit" icon={<EditOutlined />} onClick={(e) => e.stopPropagation()}>
        Rename Project
      </Menu.Item>
      <Menu.Item key="duplicate" icon={<CopyOutlined />} onClick={(e) => e.stopPropagation()}>
        Duplicate Project
      </Menu.Item>
      <Menu.Item key="export" icon={<ExportOutlined />} onClick={(e) => e.stopPropagation()}>
        Export Project
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item 
        key="remove" 
        icon={<DeleteOutlined />} 
        danger
        onClick={(e) => handleRemoveProject(e, project)}
      >
        Remove from List
      </Menu.Item>
    </Menu>
  );

  return (
    <div>
      {/* Projects header with actions */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px' 
      }}>
        <Title level={5} style={{ margin: 0 }}>Recent Projects</Title>
        <Space>
          <Button 
            icon={<ImportOutlined />}
            onClick={() => {
              if (fileOperations && fileOperations.openSavedFile) {
                fileOperations.openSavedFile();
                // After import, refresh list
                setTimeout(loadProjects, 500);
              } else if (onImportProject) {
                onImportProject();
              } else {
                message.warning("Import project functionality is not available");
              }
            }}
          >
            Open Project
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setCreateProjectModalVisible(true)}
          >
            New Project
          </Button>
        </Space>
      </div>

      {/* Search */}
      <Search
        placeholder="Search projects..."
        allowClear
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onSearch={setSearchTerm}
        style={{ 
          marginBottom: '16px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}
      />

      {/* Projects list */}
      {projects.length > 0 ? (
        <List
          grid={{ 
            gutter: 16, 
            xs: 1, 
            sm: 2, 
            md: 2, 
            lg: 3, 
            xl: 4, 
            xxl: 5 
          }}
          dataSource={filteredProjects}
          locale={{
            emptyText: searchTerm ? (
              <Empty 
                description={`No projects matching "${searchTerm}"`}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Empty
                description="No recent projects"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )
          }}
          renderItem={project => (
            <List.Item onClick={() => handleOpenProject(project)}>
              <Card
                hoverable
                size="small"
                style={{ cursor: 'pointer' }}
                actions={[
                  <Dropdown 
                    overlay={getProjectActionsMenu(project)} 
                    trigger={['click']}
                    onClick={e => e.stopPropagation()}
                  >
                    <Button 
                      type="text" 
                      icon={<EllipsisOutlined />}
                      onClick={e => e.stopPropagation()}
                    />
                  </Dropdown>
                ]}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <FolderOutlined 
                    style={{ 
                      fontSize: '24px', 
                      color: '#1890ff', 
                      marginRight: '12px',
                      marginTop: '4px'
                    }} 
                  />
                  <div>
                    <Text 
                      strong 
                      style={{ 
                        display: 'block', 
                        fontSize: '16px', 
                        marginBottom: '4px',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap'
                      }}
                      title={project.name}
                    >
                      {project.name}
                    </Text>
                    <Text 
                      type="secondary"
                      style={{
                        fontSize: '12px',
                        display: 'block',
                        marginBottom: '8px'
                      }}
                    >
                      Last opened: {new Date(project.lastOpened).toLocaleString()}
                    </Text>
                    {project.pages && (
                      <div>
                        <Tag color="blue">{project.pages} pages</Tag>
                        {project.recordings && (
                          <Tag color="green">{project.recordings} recordings</Tag>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </List.Item>
          )}
        />
      ) : (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Text style={{ display: 'block', marginBottom: '8px' }}>No recent projects</Text>
              <Paragraph type="secondary" style={{ fontSize: '12px' }}>
                Create a new project or open an existing one to get started
              </Paragraph>
            </div>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setCreateProjectModalVisible(true)}
              block
            >
              Create New Project
            </Button>
            <Button 
              icon={<ImportOutlined />}
              onClick={() => {
                if (fileOperations && fileOperations.openSavedFile) {
                  fileOperations.openSavedFile();
                } else if (onImportProject) {
                  onImportProject();
                }
              }}
              block
            >
              Open Existing Project
            </Button>
          </Space>
        </Empty>
      )}

      {/* Create Project Modal */}
      <Modal
        title="Create New Project"
        open={createProjectModalVisible}
        onCancel={() => setCreateProjectModalVisible(false)}
        footer={null}
        centered
        destroyOnClose
      >
        <Form
          form={newProjectForm}
          layout="vertical"
          onFinish={handleCreateProject}
          preserve={false}
        >
          <Form.Item
            name="name"
            label="Project Name"
            rules={[{ required: true, message: 'Please enter a project name' }]}
          >
            <Input placeholder="My Appium Project" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <Input.TextArea 
              placeholder="Brief description of this project"
              rows={3}
            />
          </Form.Item>
          <Divider />
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateProjectModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Create Project
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectsManager;