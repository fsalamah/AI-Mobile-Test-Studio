import React from 'react';
import { Badge, Typography, Space, Tooltip, Switch, Button } from 'antd';
import { 
  FileImageOutlined, 
  EyeOutlined, 
  EyeInvisibleOutlined,
  FilterOutlined
} from '@ant-design/icons';

const { Text } = Typography;

const StatesList = ({ 
  detailedRecording, 
  selectedEntryIndex, 
  setSelectedEntryIndex, 
  showCondensed, 
  setShowCondensed, 
  hideNonTransitions, 
  setHideNonTransitions,
  columnWidths,
  setIsResizing,
  isPlaying
}) => {
  // Filter the recording entries based on user preferences
  const filteredRecording = detailedRecording
    .filter(entry => showCondensed || !entry.isCondensed)
    .filter(entry => {
      // Only filter if hideNonTransitions is enabled
      if (!hideNonTransitions) return true;
      
      // Keep the entry if it has a transition
      if (entry.aiAnalysisRaw?.hasTransition) return true;
      
      // Otherwise filter it out
      return false;
    });

  return (
    <div style={{ 
      width: columnWidths.list,
      borderRight: '1px solid #f0f0f0',
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
        <Text strong>States</Text>
        <Space>
          <Tooltip title="Filter non-transitions">
            <Switch 
              checked={hideNonTransitions}
              onChange={setHideNonTransitions}
              checkedChildren={<FilterOutlined />}
              unCheckedChildren={<FilterOutlined />}
              size="small"
            />
          </Tooltip>
          <Tooltip title={showCondensed ? "Showing condensed states" : "Hiding condensed states"}>
            <Switch 
              checked={showCondensed}
              onChange={setShowCondensed}
              checkedChildren={<EyeOutlined />}
              unCheckedChildren={<EyeInvisibleOutlined />}
              size="small"
            />
          </Tooltip>
        </Space>
      </div>
      
      <div 
        className="custom-scrollbar force-scrollbar"
        style={{ 
          height: 'calc(100% - 95px)', // Subtract header height including playback controls
          padding: '0 2px',
          background: '#fafafa',
          overflowY: 'auto'
        }}
      >
        {filteredRecording.length > 0 ? (
          filteredRecording.map((entry) => {
            const isSelected = selectedEntryIndex === detailedRecording.indexOf(entry);
            const hasScreenshot = !!entry.deviceArtifacts?.screenshotBase64;
            const realIndex = detailedRecording.indexOf(entry);
            const hasAction = !!entry.action;
            const isPlayingCurrent = isPlaying && isSelected;
            
            return (
              <div 
                key={realIndex}
                onClick={() => setSelectedEntryIndex(realIndex)}
                style={{
                  padding: '8px 12px',
                  borderLeft: isSelected ? '3px solid #1890ff' : '3px solid transparent',
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: isSelected 
                    ? '#e6f7ff' 
                    : (entry.isCondensed ? '#f9f9f9' : 'transparent'),
                  cursor: 'pointer',
                  opacity: entry.isCondensed ? 0.8 : 1,
                  transition: 'all 0.2s ease',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  animation: isPlayingCurrent ? 'playback-pulse 1.5s infinite ease-in-out' : 'none'
                }}
              >
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: isSelected ? '#1890ff' : '#f0f0f0',
                  color: isSelected ? '#fff' : '#595959',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  marginRight: '8px'
                }}>
                  {realIndex + 1}
                </div>
                
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    lineHeight: '1.2'
                  }}>
                    <div style={{ 
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 500,
                      color: hasAction ? '#1890ff' : '#595959',
                      maxWidth: 'calc(100% - 50px)'
                    }}>
                      {entry.aiAnalysisRaw 
                        ? `${entry.aiAnalysisRaw.currentPageName || 'Unknown'} - ${entry.aiAnalysisRaw.transitionDescription || 'State change'}`
                        : hasAction 
                          ? entry.action.action || 'Unknown' 
                          : 'State change'
                      }
                    </div>
                    <div style={{ color: '#8c8c8c', fontSize: '10px' }}>
                      {new Date(entry.actionTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', marginLeft: '4px' }}>
                  {entry.isCondensed && 
                    <Badge status="warning" style={{ marginRight: '6px' }} />
                  }
                  {hasScreenshot && 
                    <FileImageOutlined style={{ color: '#1890ff', fontSize: '12px' }}/>
                  }
                </div>
              </div>
            );
          })
        ) : (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#bfbfbf',
            flexDirection: 'column',
            padding: '20px',
            textAlign: 'center'
          }}>
            <Text type="secondary">No states match your filter criteria</Text>
            {hideNonTransitions && (
              <Button 
                type="link" 
                size="small" 
                onClick={() => setHideNonTransitions(false)}
                style={{ marginTop: '8px' }}
              >
                Show all states
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Resizable divider */}
      <div 
        className="resize-handle resize-handle-list"
        style={{
          width: '5px',
          cursor: 'col-resize',
          background: '#f0f0f0',
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          zIndex: 1,
          transition: 'background-color 0.2s'
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing('list-screenshot');
        }}
      >
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '1px',
            height: '20px',
            background: '#d9d9d9'
          }}
        />
      </div>
    </div>
  );
};

export default StatesList;