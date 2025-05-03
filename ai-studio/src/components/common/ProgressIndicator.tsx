import React from 'react';
import { Progress, Card, Typography, Spin, Button, Space } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface ProgressIndicatorProps {
  status: 'idle' | 'polling' | 'completed' | 'failed';
  progress: number;
  title?: string;
  description?: string;
  error?: string;
  onCancel?: () => void;
  onRetry?: () => void;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  status,
  progress,
  title = 'Processing',
  description,
  error,
  onCancel,
  onRetry,
}) => {
  // Define status-specific properties
  const getStatusProperties = () => {
    switch (status) {
      case 'polling':
        return {
          icon: <LoadingOutlined style={{ fontSize: 24 }} spin />,
          color: '#1890ff',
          statusText: 'In Progress',
        };
      case 'completed':
        return {
          icon: <CheckCircleOutlined style={{ fontSize: 24 }} />,
          color: '#52c41a',
          statusText: 'Completed',
        };
      case 'failed':
        return {
          icon: <CloseCircleOutlined style={{ fontSize: 24 }} />,
          color: '#ff4d4f',
          statusText: 'Failed',
        };
      default:
        return {
          icon: null,
          color: '#d9d9d9',
          statusText: 'Idle',
        };
    }
  };

  const { icon, color, statusText } = getStatusProperties();

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          {icon && <span style={{ marginRight: 8 }}>{icon}</span>}
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
        </div>

        {description && (
          <Text style={{ marginBottom: 16, display: 'block' }}>{description}</Text>
        )}

        <div style={{ marginBottom: 16 }}>
          <Progress
            percent={progress}
            status={
              status === 'completed'
                ? 'success'
                : status === 'failed'
                ? 'exception'
                : 'active'
            }
            strokeColor={color}
          />
          <Text strong>{`Status: ${statusText}`}</Text>
          {status === 'polling' && (
            <Text style={{ marginLeft: 8 }}>{`${progress}% Complete`}</Text>
          )}
        </div>

        {error && status === 'failed' && (
          <div style={{ marginBottom: 16 }}>
            <Text type="danger">{`Error: ${error}`}</Text>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {status === 'polling' && onCancel && (
            <Button onClick={onCancel}>Cancel</Button>
          )}
          {status === 'failed' && onRetry && (
            <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </Space>
    </Card>
  );
};

export default ProgressIndicator;