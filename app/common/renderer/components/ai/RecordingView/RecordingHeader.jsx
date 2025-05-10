import React from 'react';
import { Button, Typography, Layout, Space } from 'antd';
import { ArrowLeftOutlined, VideoCameraOutlined, PauseCircleOutlined, ClearOutlined } from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

const RecordingHeader = ({ 
  navigateBack, 
  isRecording, 
  onStartRecording, 
  onPauseRecording, 
  onClearRecording,
  recordingControlsDisabled
}) => {
  return (
    <Header 
      style={{ 
        padding: '0 16px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        height: '56px',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)'
      }}
    >
      <Space>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={navigateBack}
        />
        <Title level={4} style={{ margin: 0 }}>Session Recording</Title>
      </Space>

      <Space>
        {!isRecording ? (
          <Button
            type="primary"
            icon={<VideoCameraOutlined />}
            onClick={onStartRecording}
            disabled={recordingControlsDisabled}
          >
            Start Recording
          </Button>
        ) : (
          <>
            <Button
              type="primary"
              icon={<PauseCircleOutlined />}
              onClick={onPauseRecording}
              disabled={recordingControlsDisabled}
            >
              Pause Recording
            </Button>
            <Button
              danger
              icon={<ClearOutlined />}
              onClick={onClearRecording}
              disabled={recordingControlsDisabled}
            >
              Clear
            </Button>
          </>
        )}
      </Space>
    </Header>
  );
};

export default RecordingHeader;