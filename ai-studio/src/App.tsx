import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import './App.css';

// Components
import AppHeader from './components/layout/AppHeader';
import AppSidebar from './components/layout/AppSidebar';

// Pages
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import PageAnalyzer from './pages/PageAnalyzer';
import PageDetail from './pages/PageDetail';
import XPathFixer from './pages/XPathFixer';
import CodeGenerator from './pages/CodeGenerator';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

// Context providers
import { ApiConfigProvider } from './context/ApiConfigContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

const { Content } = Layout;

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ApiConfigProvider>
          <Layout style={{ minHeight: '100vh' }}>
            <AppHeader />
            <Layout>
              <AppSidebar />
              <Layout style={{ padding: '0 24px 24px' }}>
                <Content
                  style={{
                    margin: '24px 16px',
                    padding: 24,
                    background: '#fff',
                    borderRadius: 4,
                    minHeight: 280,
                  }}
                >
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/projects" element={<ProjectList />} />
                    <Route path="/projects/:projectId" element={<ProjectDetail />} />
                    <Route path="/analyzer" element={<PageAnalyzer />} />
                    <Route path="/pages/:pageId" element={<PageDetail />} />
                    <Route path="/xpath-fixer" element={<XPathFixer />} />
                    <Route path="/code-generator" element={<CodeGenerator />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Content>
              </Layout>
            </Layout>
          </Layout>
        </ApiConfigProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;