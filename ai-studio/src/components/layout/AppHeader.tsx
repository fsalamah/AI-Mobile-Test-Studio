import React from 'react';
import { Layout, Menu, Dropdown, Button, Space } from 'antd';
import {
  SettingOutlined,
  UserOutlined,
  QuestionCircleOutlined,
  GithubOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { Header } = Layout;

const AppHeader: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const { toggleTheme, currentTheme } = useTheme();

  const userMenu = (
    <Menu
      items={[
        {
          key: '1',
          label: <Link to="/settings/profile">Profile Settings</Link>,
        },
        {
          key: '2',
          label: <Link to="/settings/api">API Configuration</Link>,
        },
        {
          key: '3',
          label: <Button type="text" onClick={logout}>Logout</Button>,
        },
      ]}
    />
  );

  const helpMenu = (
    <Menu
      items={[
        {
          key: '1',
          label: <a href="https://github.com/appium/appium-inspector/wiki/AI-Studio-Guide" target="_blank" rel="noopener noreferrer">Documentation</a>,
        },
        {
          key: '2',
          label: <a href="https://github.com/appium/appium-inspector/issues" target="_blank" rel="noopener noreferrer">Report Issues</a>,
        },
        {
          key: '3',
          label: <a href="https://appium.io/docs/en/about-appium/intro/" target="_blank" rel="noopener noreferrer">About Appium</a>,
        },
      ]}
    />
  );

  return (
    <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div className="logo" style={{ display: 'flex', alignItems: 'center' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/logo.svg"
            alt="AI Studio Logo"
            style={{ height: '32px', marginRight: '10px' }}
          />
          <h1 style={{ color: 'white', margin: 0 }}>AI Studio</h1>
        </Link>
      </div>
      <Space>
        <Dropdown overlay={helpMenu} placement="bottomRight">
          <Button type="text" icon={<QuestionCircleOutlined />} style={{ color: 'white' }} />
        </Dropdown>
        <a
          href="https://github.com/appium/appium-inspector"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button type="text" icon={<GithubOutlined />} style={{ color: 'white' }} />
        </a>
        <Button
          type="text"
          icon={<SettingOutlined />}
          onClick={toggleTheme}
          style={{ color: 'white' }}
        />
        {isAuthenticated ? (
          <Dropdown overlay={userMenu} placement="bottomRight">
            <Button type="text" icon={<UserOutlined />} style={{ color: 'white' }}>
              {user?.name || 'User'}
            </Button>
          </Dropdown>
        ) : (
          <Link to="/login">
            <Button type="primary">Login</Button>
          </Link>
        )}
      </Space>
    </Header>
  );
};

export default AppHeader;