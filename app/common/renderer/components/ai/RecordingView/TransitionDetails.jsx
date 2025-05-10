import React, { useState } from 'react';
import { 
  Typography, 
  Space, 
  Badge, 
  Tabs, 
  Card, 
  Divider, 
  Row, 
  Col,
  Empty
} from 'antd';
import {
  ExperimentOutlined,
  InfoCircleOutlined,
  CodeOutlined,
  FileImageOutlined
} from '@ant-design/icons';
import AIAnalysisView from './AIAnalysisView';

const { Text } = Typography;
const { TabPane } = Tabs;

const TransitionDetails = ({ 
  selectedEntry, 
  selectedEntryIndex, 
  columnWidths,
  handleProcessWithAI,
  processingAI
}) => {
  const hasAnalysis = !!selectedEntry?.aiAnalysis;
  
  // If no entry is selected, show empty state
  if (!selectedEntry) {
    return (
      <div style={{ 
        width: columnWidths.details,
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Empty 
          description="No entry selected" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ margin: '40px 0' }}
        />
      </div>
    );
  }

  return (
    <div style={{ 
      width: columnWidths.details,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fafafa',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '48px',
        flexShrink: 0
      }}>
        <Space>
          <Badge 
            count={selectedEntryIndex} 
            style={{ backgroundColor: '#1890ff' }}
          />
          <Text strong>Transition Details</Text>
        </Space>
        
        {selectedEntryIndex > 0 && selectedEntry?.aiAnalysisRaw && (
          <div>
            {selectedEntry?.aiAnalysisRaw?.isPageChanged && (
              <Badge
                status="success"
                text={<Text strong style={{ color: '#52c41a' }}>Page Change</Text>}
              />
            )}
            {selectedEntry?.aiAnalysisRaw?.isSamePageDifferentState &&
              !selectedEntry?.aiAnalysisRaw?.isPageChanged && (
              <Badge
                status="processing"
                text={<Text strong style={{ color: '#1890ff' }}>State Change</Text>}
              />
            )}
            {selectedEntry?.aiAnalysisRaw?.hasTransition &&
              !selectedEntry?.aiAnalysisRaw?.isPageChanged &&
              !selectedEntry?.aiAnalysisRaw?.isSamePageDifferentState && (
              <Badge
                status="warning"
                text={<Text strong style={{ color: '#faad14' }}>UI Change</Text>}
              />
            )}
          </div>
        )}
      </div>
      
      <div style={{ flex: 1, overflow: 'hidden', maxHeight: 'calc(100% - 48px)' }}>
        <Tabs 
          defaultActiveKey="analysis"
          style={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}
          tabPosition="top"
          type="card"
          size="middle"
          tabBarStyle={{ 
            margin: '0 12px',
            marginTop: '12px',
            background: '#f9f9f9',
            borderRadius: '4px 4px 0 0',
            flexShrink: 0
          }}
        >
          <TabPane 
            tab={
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ExperimentOutlined style={{ color: hasAnalysis ? '#722ED1' : '#bfbfbf' }} />
                <span style={{ 
                  fontWeight: 500,
                  color: hasAnalysis ? '#722ED1' : '#bfbfbf'
                }}>
                  AI Analysis
                </span>
                {!hasAnalysis && (
                  <Badge 
                    count="Not Available" 
                    style={{ 
                      backgroundColor: '#f0f0f0',
                      color: '#bfbfbf',
                      fontSize: '10px',
                      fontWeight: 'normal',
                      textTransform: 'uppercase'
                    }} 
                  />
                )}
              </span>
            }
            key="analysis"
            disabled={!hasAnalysis}
          >
            <AIAnalysisView 
              aiAnalysis={selectedEntry.aiAnalysis} 
              aiAnalysisRaw={selectedEntry.aiAnalysisRaw}
              handleProcessWithAI={handleProcessWithAI}
              processingAI={processingAI}
            />
          </TabPane>
          
          <TabPane 
            tab={
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Badge status={selectedEntry.action ? "processing" : "default"} />
                <span style={{ fontWeight: 500 }}>Action Data</span>
              </span>
            }
            key="action"
          >
            <div className="custom-scrollbar force-scrollbar" style={{ 
              padding: '16px', 
              height: 'calc(100% - 32px)',
              background: '#ffffff'
            }}>
              <pre style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '16px', 
                borderRadius: '4px', 
                overflow: 'auto',
                height: '100%',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                {JSON.stringify(selectedEntry.action, null, 2) || "No action data"}
              </pre>
            </div>
          </TabPane>
          
          <TabPane 
            tab={
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileImageOutlined />
                <span style={{ fontWeight: 500 }}>Page Source</span>
              </span>
            }
            key="source"
          >
            <div className="custom-scrollbar force-scrollbar" style={{ 
              padding: '16px', 
              height: 'calc(100% - 32px)',
              background: '#ffffff'
            }}>
              <pre style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '16px',
                borderRadius: '4px', 
                overflow: 'auto',
                height: '100%',
                margin: 0,
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                {selectedEntry.deviceArtifacts?.pageSource || "No page source available"}
              </pre>
            </div>
          </TabPane>
          
          <TabPane 
            tab={
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <InfoCircleOutlined />
                <span style={{ fontWeight: 500 }}>Session Details</span>
              </span>
            }
            key="session"
          >
            <div className="custom-scrollbar force-scrollbar" style={{ 
              padding: '16px', 
              height: 'calc(100% - 32px)',
              background: '#ffffff'
            }}>
              <pre style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '16px', 
                borderRadius: '4px', 
                overflow: 'auto',
                height: '100%',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                {JSON.stringify(selectedEntry.deviceArtifacts?.sessionDetails, null, 2) || "No session details available"}
              </pre>
            </div>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default TransitionDetails;