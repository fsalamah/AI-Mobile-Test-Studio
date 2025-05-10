import React, { useState } from 'react';
import { 
  Button, 
  Tooltip, 
  Space, 
  message, 
  Spin, 
  Progress, 
  Modal, 
  Divider, 
  Upload
} from 'antd';
import { 
  ThunderboltOutlined, 
  SaveOutlined, 
  CopyOutlined, 
  UploadOutlined 
} from '@ant-design/icons';

const RecordingToolbar = ({
  detailedRecording,
  handleProcessWithAI,
  saveToFile,
  copyToClipboard,
  handleLoadRecording,
  processingAI,
  analysisProgress
}) => {
  const [copied, setCopied] = useState(false);
  
  // Copy recording to clipboard
  const handleCopy = () => {
    copyToClipboard();
    setCopied(true);
    message.success("Recording data copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Check if there are recordings
  const hasRecordings = detailedRecording && detailedRecording.length > 0;
  
  // Get the progress percentage
  const progressPercent = analysisProgress?.percent || 0;
  
  return (
    <div style={{
      padding: '12px 16px',
      backgroundColor: '#f5f5f5',
      borderBottom: '1px solid #e8e8e8',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <Space>
        <Tooltip title="Process with AI to analyze transitions">
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handleProcessWithAI}
            loading={processingAI}
            disabled={!hasRecordings}
            style={{ background: '#722ED1', borderColor: '#722ED1' }}
          >
            Process with AI
          </Button>
        </Tooltip>
        
        {processingAI && (
          <div style={{ width: '200px' }}>
            <Progress 
              percent={progressPercent} 
              status="active" 
              size="small"
              style={{ marginBottom: 0 }}
            />
            <div style={{ fontSize: '12px' }}>
              {analysisProgress?.message || `Processing ${analysisProgress?.current || 0} of ${analysisProgress?.total || 0}`}
            </div>
          </div>
        )}
      </Space>
      
      <Space>
        <Tooltip title="Save recording to file">
          <Button
            icon={<SaveOutlined />}
            onClick={saveToFile}
            disabled={!hasRecordings}
          >
            Save
          </Button>
        </Tooltip>
        
        <Tooltip title="Copy recording to clipboard">
          <Button
            icon={<CopyOutlined />}
            onClick={handleCopy}
            disabled={!hasRecordings}
            type={copied ? "primary" : "default"}
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </Tooltip>
        
        <Upload
          accept=".json,.appiumsession"
          showUploadList={false}
          beforeUpload={(file) => {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const content = reader.result;
                handleLoadRecording(content);
                message.success(`${file.name} loaded successfully`);
              } catch (error) {
                message.error(`Failed to parse ${file.name}: ${error.message}`);
              }
            };
            reader.readAsText(file);
            return false;
          }}
        >
          <Button icon={<UploadOutlined />}>
            Load
          </Button>
        </Upload>
      </Space>
    </div>
  );
};

export default RecordingToolbar;