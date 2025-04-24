import {ArrowLeftOutlined} from '@ant-design/icons';
import {Button, Spin, Tabs, Typography} from 'antd';
import {useEffect} from 'react';
import {useNavigate} from 'react-router';

import {
  SESSION_BUILDER_TABS,
} from '../../constants/session-builder.js';
import {ipcRenderer} from '../../polyfills.js';
import {log} from '../../utils/logger.js';
import SessionStyles from '../Session/Session.module.css';
import AppiumAnalysisPanel from './AppiumAnalysisPanel.jsx';

const AIStudio = (props) => {
  const {
    tabKey,
    switchTabs,
    newSessionLoading,
    // Provide default values for all props we're destructuring
    t = (text) => text, // Default translation function
  } = props;

  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate('/session');
  };

  useEffect(() => {
    const {
      bindWindowClose,
      setStateFromSessionFile,
      saveSessionAsFile,
    } = props;
    
    (async () => {
      try {
        // Safe call with checks
        bindWindowClose && bindWindowClose();
        switchTabs && switchTabs(SESSION_BUILDER_TABS.AI);  // Default to AI tab
        
        // Set up event listeners with safety checks
        if (typeof ipcRenderer !== 'undefined' && ipcRenderer) {
          if (setStateFromSessionFile) {
            ipcRenderer.on('sessionfile:apply', (_, sessionFileString) =>
              setStateFromSessionFile(sessionFileString)
            );
          }
          
          if (saveSessionAsFile) {
            ipcRenderer.on('sessionfile:download', () => saveSessionAsFile());
          }
        }
      } catch (e) {
        log.error(e);
      }
    })();
  }, []);

  return (
    <Spin spinning={!!newSessionLoading} key="main">
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        overflow: 'hidden', 
        margin: 0, 
        padding: 0 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #e8e8e8' }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleGoBack}
            style={{ marginRight: 16 }}
          />
          <Typography.Title level={4} style={{ margin: 0 }}>
            AI Automation Studio
          </Typography.Title>
        </div>
        
        <div style={{ 
          flex: '1 1 auto', 
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          margin: 0,
          padding: 0
        }}>
          <div style={{ 
            width: '100%', 
            height: '100%', 
            overflow: 'hidden', 
            display: 'flex',
            flexDirection: 'column',
            margin: 0,
            padding: 0
          }}>
            <AppiumAnalysisPanel {...props} />
          </div>
        </div>

        {/* Removed Tabs for cleaner interface */}

        <div className={SessionStyles.sessionFooter} style={{ flexShrink: 0, margin: 0, padding: 0 }}>
          {/* Simplified footer with no references to caps or sessions */}
        </div>
      </div>
    </Spin>
  );
};

export default AIStudio;