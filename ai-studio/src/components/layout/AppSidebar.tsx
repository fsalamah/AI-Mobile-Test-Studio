import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  AppstoreOutlined,
  FileSearchOutlined,
  CodeOutlined,
  ToolOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';

const { Sider } = Layout;

const AppSidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const onCollapse = (collapsed: boolean) => {
    setCollapsed(collapsed);
  };

  // Determine which key should be selected based on the current path
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return '1';
    if (path.startsWith('/projects')) return '2';
    if (path.startsWith('/analyzer')) return '3';
    if (path.startsWith('/pages')) return '4';
    if (path.startsWith('/xpath-fixer')) return '5';
    if (path.startsWith('/code-generator')) return '6';
    if (path.startsWith('/settings')) return '7';
    return '1'; // Default to dashboard
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      style={{
        background: '#fff',
        boxShadow: '2px 0 8px 0 rgba(29,35,41,0.05)',
      }}
    >
      <div className="logo" style={{ margin: '16px', textAlign: 'center' }}>
        {!collapsed && (
          <h3 style={{ margin: 0 }}>Navigation</h3>
        )}
      </div>
      <Menu
        theme="light"
        mode="inline"
        defaultSelectedKeys={[getSelectedKey()]}
        selectedKeys={[getSelectedKey()]}
        items={[
          {
            key: '1',
            icon: <DashboardOutlined />,
            label: <Link to="/dashboard">Dashboard</Link>,
          },
          {
            key: '2',
            icon: <ProjectOutlined />,
            label: <Link to="/projects">Projects</Link>,
          },
          {
            key: '3',
            icon: <AppstoreOutlined />,
            label: <Link to="/analyzer">Analyzer</Link>,
          },
          {
            key: '4',
            icon: <FileSearchOutlined />,
            label: <Link to="/pages">Pages</Link>,
          },
          {
            key: '5',
            icon: <ToolOutlined />,
            label: <Link to="/xpath-fixer">XPath Fixer</Link>,
          },
          {
            key: '6',
            icon: <CodeOutlined />,
            label: <Link to="/code-generator">Code Generator</Link>,
          },
          {
            key: '7',
            icon: <SettingOutlined />,
            label: <Link to="/settings">Settings</Link>,
          },
        ]}
      />
    </Sider>
  );
};

export default AppSidebar;