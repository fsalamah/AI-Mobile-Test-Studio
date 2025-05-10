import React, { useState, useEffect } from 'react';
import { Button, Typography, Space, Badge, Tooltip } from 'antd';
import { 
  DownloadOutlined, 
  ArrowLeftOutlined, 
  FileImageOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined
} from '@ant-design/icons';

const { Text } = Typography;

const ScreenshotViewer = ({ 
  selectedEntry, 
  selectedEntryIndex, 
  detailedRecording,
  setSelectedEntryIndex,
  columnWidths,
  setIsResizing
}) => {
  const [screenshotDimensions, setScreenshotDimensions] = useState({ width: 'auto', height: 'auto' });
  const [zoomLevel, setZoomLevel] = useState(100);

  // Reset screenshot dimensions when selected entry changes
  useEffect(() => {
    setScreenshotDimensions({ width: 'auto', height: 'auto' });
    setZoomLevel(100);
  }, [selectedEntryIndex]);

  // Handle zoom in
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 300));
  };

  // Handle zoom out
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 25));
  };

  // Handle fit to container
  const handleFitToContainer = () => {
    setZoomLevel(100);
    setScreenshotDimensions({ width: 'auto', height: 'auto' });
  };

  // Download screenshot
  const downloadScreenshot = () => {
    if (!selectedEntry?.deviceArtifacts?.screenshotBase64) return;
    
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${selectedEntry.deviceArtifacts.screenshotBase64}`;
    link.download = `screenshot-${selectedEntryIndex + 1}-${new Date(selectedEntry.actionTime).getTime()}.png`;
    link.click();
  };

  // Handle image load to calculate dimensions
  const handleImageLoad = (e) => {
    // Get the container height
    const containerHeight = e.target.parentElement.clientHeight;
    
    // Calculate the width based on aspect ratio
    const aspectRatio = e.target.naturalWidth / e.target.naturalHeight;
    
    // Update the dimensions (but don't change column widths)
    setScreenshotDimensions({
        width: 'auto',
        height: `${containerHeight}px`
    });
  };

  if (!selectedEntry) {
    return (
      <div style={{ 
        width: columnWidths.screenshot,
        borderRight: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fafafa'
      }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px' 
        }}>
          <FileImageOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
          <Text type="secondary">No screenshot selected</Text>
        </div>
      </div>
    );
  }

  const hasScreenshot = !!selectedEntry?.deviceArtifacts?.screenshotBase64;

  return (
    <div style={{ 
      width: columnWidths.screenshot,
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
        height: '48px'
      }}>
        <Space>
          <Badge 
            count={selectedEntryIndex + 1} 
            style={{ backgroundColor: '#1890ff' }}
          />
          <Text strong>Screenshot</Text>
          {selectedEntry.isCondensed && (
            <Badge 
              count="CONDENSED" 
              style={{ backgroundColor: '#faad14', fontSize: '12px' }}
            />
          )}
        </Space>
        
        <Space>
          <Tooltip title="Previous entry">
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />}
              disabled={selectedEntryIndex === 0}
              onClick={() => setSelectedEntryIndex(selectedEntryIndex - 1)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Next entry">
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined style={{ transform: 'rotate(180deg)' }} />}
              disabled={selectedEntryIndex === detailedRecording.length - 1}
              onClick={() => setSelectedEntryIndex(selectedEntryIndex + 1)}
              size="small"
            />
          </Tooltip>
          
          {hasScreenshot && (
            <>
              <Tooltip title="Zoom in">
                <Button 
                  type="text" 
                  icon={<ZoomInOutlined />}
                  size="small"
                  onClick={handleZoomIn}
                />
              </Tooltip>
              <Tooltip title="Zoom out">
                <Button 
                  type="text" 
                  icon={<ZoomOutOutlined />}
                  size="small"
                  onClick={handleZoomOut}
                />
              </Tooltip>
              <Tooltip title="Fit to container">
                <Button 
                  type="text" 
                  icon={<ExpandOutlined />}
                  size="small"
                  onClick={handleFitToContainer}
                />
              </Tooltip>
              <Tooltip title="Download screenshot">
                <Button 
                  type="text" 
                  icon={<DownloadOutlined />}
                  size="small"
                  onClick={downloadScreenshot}
                />
              </Tooltip>
            </>
          )}
        </Space>
      </div>
      
      <div style={{ 
        padding: '0', 
        height: 'calc(100% - 48px)', // Subtract header height
        minHeight: '300px', // Ensure minimum height for container
        textAlign: 'center',
        background: '#ffffff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}>
        {hasScreenshot ? (
          <img 
            src={`data:image/png;base64,${selectedEntry.deviceArtifacts.screenshotBase64}`} 
            alt={`Screenshot at ${new Date(selectedEntry.actionTime).toLocaleString()}`}
            onLoad={handleImageLoad}
            style={{ 
              maxWidth: zoomLevel !== 100 ? `${zoomLevel}%` : '100%',
              height: zoomLevel !== 100 ? 'auto' : screenshotDimensions.height, 
              objectFit: 'contain',
              border: '1px solid #d9d9d9',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.2s ease'
            }}
          />
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            color: '#bfbfbf'
          }}>
            <FileImageOutlined style={{ fontSize: '64px', marginBottom: '16px' }} />
            <Text type="secondary">No screenshot available</Text>
          </div>
        )}
      </div>
      
      {/* Resizable divider */}
      <div 
        className="resize-handle resize-handle-details"
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
          setIsResizing('screenshot-details');
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

export default ScreenshotViewer;