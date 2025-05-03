import React from 'react';
import { Card, Row, Col, Statistic, Button, List, Typography, Space, Divider } from 'antd';
import {
  ProjectOutlined,
  FileOutlined,
  CodeOutlined,
  RightOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

const Dashboard: React.FC = () => {
  // This would come from API in a real implementation
  const stats = {
    projects: 5,
    pages: 18,
    elements: 143,
    generatedCode: 12,
  };

  // Recent activities (would come from API)
  const recentActivities = [
    {
      id: 1,
      type: 'analysis',
      title: 'Visual Analysis Completed',
      project: 'Shopping App',
      page: 'Product Listing',
      timestamp: '2023-03-15T10:30:00Z',
    },
    {
      id: 2,
      type: 'xpath',
      title: 'XPath Locators Generated',
      project: 'Banking App',
      page: 'Account Summary',
      timestamp: '2023-03-14T16:45:00Z',
    },
    {
      id: 3,
      type: 'code',
      title: 'Page Object Model Generated',
      project: 'Travel App',
      page: 'Booking Confirmation',
      timestamp: '2023-03-13T09:15:00Z',
    },
    {
      id: 4,
      type: 'repair',
      title: 'XPath Repair Completed',
      project: 'Healthcare App',
      page: 'Appointment List',
      timestamp: '2023-03-12T14:20:00Z',
    },
  ];

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div>
      <Row gutter={[16, 16]} align="middle" justify="space-between">
        <Col>
          <Title level={2}>Dashboard</Title>
          <Paragraph>Welcome to AI Studio. Manage your mobile app test automation projects.</Paragraph>
        </Col>
        <Col>
          <Space>
            <Link to="/projects/new">
              <Button type="primary">New Project</Button>
            </Link>
            <Link to="/analyzer">
              <Button type="default">Start Analysis</Button>
            </Link>
          </Space>
        </Col>
      </Row>

      <Divider />

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Projects"
              value={stats.projects}
              prefix={<ProjectOutlined />}
            />
            <div style={{ marginTop: 16 }}>
              <Link to="/projects">
                View All <RightOutlined />
              </Link>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pages"
              value={stats.pages}
              prefix={<FileOutlined />}
            />
            <div style={{ marginTop: 16 }}>
              <Link to="/pages">
                View All <RightOutlined />
              </Link>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="UI Elements"
              value={stats.elements}
              precision={0}
            />
            <div style={{ marginTop: 16 }}>
              <Link to="/xpath-fixer">
                XPath Fixer <RightOutlined />
              </Link>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Generated Code Files"
              value={stats.generatedCode}
              prefix={<CodeOutlined />}
            />
            <div style={{ marginTop: 16 }}>
              <Link to="/code-generator">
                Generate Code <RightOutlined />
              </Link>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Card title="Recent Activity" style={{ marginBottom: 24 }}>
        <List
          itemLayout="horizontal"
          dataSource={recentActivities}
          renderItem={item => (
            <List.Item
              actions={[
                <Link to={`/projects/${item.project}`} key="view-project">
                  View Project
                </Link>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  item.type === 'analysis' ? (
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />
                  ) : (
                    <ClockCircleOutlined style={{ color: '#1890ff', fontSize: 24 }} />
                  )
                }
                title={item.title}
                description={
                  <Space direction="vertical" size={0}>
                    <Text>
                      Project: <Link to={`/projects/${item.project}`}>{item.project}</Link>
                    </Text>
                    <Text>
                      Page: <Link to={`/pages/${item.page}`}>{item.page}</Link>
                    </Text>
                    <Text type="secondary">{formatDate(item.timestamp)}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* Quick Links */}
      <Card title="Quick Actions">
        <Row gutter={16}>
          <Col span={6}>
            <Button type="primary" block style={{ height: 'auto', padding: '12px' }}>
              <Space direction="vertical" size={2}>
                <ProjectOutlined style={{ fontSize: 24 }} />
                <span>Create New Project</span>
              </Space>
            </Button>
          </Col>
          <Col span={6}>
            <Button block style={{ height: 'auto', padding: '12px' }}>
              <Space direction="vertical" size={2}>
                <FileOutlined style={{ fontSize: 24 }} />
                <span>Upload App Screenshot</span>
              </Space>
            </Button>
          </Col>
          <Col span={6}>
            <Button block style={{ height: 'auto', padding: '12px' }}>
              <Space direction="vertical" size={2}>
                <CodeOutlined style={{ fontSize: 24 }} />
                <span>Generate Test Code</span>
              </Space>
            </Button>
          </Col>
          <Col span={6}>
            <Button block style={{ height: 'auto', padding: '12px' }}>
              <Space direction="vertical" size={2}>
                <ProjectOutlined style={{ fontSize: 24 }} />
                <span>Import from Appium</span>
              </Space>
            </Button>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Dashboard;