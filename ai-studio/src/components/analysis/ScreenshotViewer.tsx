import React, { useState, useRef, useEffect } from 'react';
import { Button, Space, Tooltip, Card } from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  CompressOutlined,
  DownloadOutlined,
  BorderOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { ElementWithLocator } from '../../types/api';
import fileUtils from '../../utils/fileUtils';

interface ScreenshotViewerProps {
  imageData?: string;
  imageUrl?: string; // Added for backward compatibility
  elements?: ElementWithLocator[];
  highlightedElementId?: string;
  onElementHover?: (elementId: string | null) => void;
  onElementClick?: (elementId: string) => void;
}

const ScreenshotViewer: React.FC<ScreenshotViewerProps> = ({
  imageData,
  imageUrl,
  elements = [],
  highlightedElementId,
  onElementHover,
  onElementClick,
}) => {
  // Use imageUrl if provided (for backward compatibility)
  const actualImageData = imageData || imageUrl || '';
  const [zoom, setZoom] = useState(1);
  const [showHighlights, setShowHighlights] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Calculate element positions for highlights
  // In a real app, these would come from the backend
  const getElementPositions = () => {
    // Mock positions for demonstration, in reality this would be calculated
    const mockPositions: Record<string, { x: number; y: number; width: number; height: number }> = {};
    
    elements.forEach((element, index) => {
      const containerWidth = containerRef.current?.clientWidth || 375;
      const containerHeight = containerRef.current?.clientHeight || 667;
      
      // Generate evenly spaced mock positions
      const rows = Math.ceil(Math.sqrt(elements.length));
      const cols = Math.ceil(elements.length / rows);
      
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      const elementWidth = containerWidth / cols / 2;
      const elementHeight = containerHeight / rows / 2;
      
      const x = (col * (containerWidth / cols)) + (containerWidth / cols / 4);
      const y = (row * (containerHeight / rows)) + (containerHeight / rows / 4);
      
      mockPositions[element.devName] = {
        x,
        y,
        width: elementWidth,
        height: elementHeight,
      };
    });
    
    return mockPositions;
  };

  // Handle zoom in
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  // Handle zoom out
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  // Handle fullscreen toggle
  const handleFullscreenToggle = () => {
    setFullscreen(prev => !prev);
  };

  // Handle download
  const handleDownload = () => {
    if (actualImageData) {
      fileUtils.downloadFile(
        fileUtils.dataURLtoBlob(actualImageData),
        'screenshot.png',
        'image/png'
      );
    }
  };

  // Handle element highlight toggle
  const handleHighlightToggle = () => {
    setShowHighlights(prev => !prev);
  };

  // Element highlight rectangles
  const elementHighlights = showHighlights && imageRef.current
    ? Object.entries(getElementPositions()).map(([elementId, position]) => {
        const isHighlighted = highlightedElementId === elementId;
        
        return (
          <div
            key={elementId}
            className="highlight-rect"
            style={{
              left: position.x * zoom,
              top: position.y * zoom,
              width: position.width * zoom,
              height: position.height * zoom,
              borderColor: isHighlighted ? 'rgba(255, 64, 129, 0.7)' : 'rgba(24, 144, 255, 0.7)',
              backgroundColor: isHighlighted ? 'rgba(255, 64, 129, 0.1)' : 'rgba(24, 144, 255, 0.1)',
              zIndex: isHighlighted ? 101 : 100,
            }}
            onMouseEnter={() => onElementHover && onElementHover(elementId)}
            onMouseLeave={() => onElementHover && onElementHover(null)}
            onClick={() => onElementClick && onElementClick(elementId)}
          />
        );
      })
    : null;

  // Element labels
  const elementLabels = showHighlights && imageRef.current
    ? Object.entries(getElementPositions()).map(([elementId, position]) => {
        const isHighlighted = highlightedElementId === elementId;
        
        return (
          <div
            key={`label-${elementId}`}
            className="highlight-label"
            style={{
              left: position.x * zoom,
              top: (position.y * zoom) - 22,
              backgroundColor: isHighlighted ? 'rgba(255, 64, 129, 0.9)' : 'rgba(24, 144, 255, 0.9)',
              zIndex: isHighlighted ? 101 : 100,
            }}
          >
            {elementId}
          </div>
        );
      })
    : null;

  return (
    <Card
      title="Screenshot Viewer"
      style={{ width: '100%' }}
      bodyStyle={{ padding: 0, position: 'relative' }}
      extra={
        <Space>
          <Tooltip title="Zoom In">
            <Button 
              icon={<ZoomInOutlined />} 
              onClick={handleZoomIn} 
              disabled={zoom >= 3}
            />
          </Tooltip>
          <Tooltip title="Zoom Out">
            <Button 
              icon={<ZoomOutOutlined />} 
              onClick={handleZoomOut} 
              disabled={zoom <= 0.5}
            />
          </Tooltip>
          <Tooltip title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <Button 
              icon={fullscreen ? <CompressOutlined /> : <ExpandOutlined />} 
              onClick={handleFullscreenToggle}
            />
          </Tooltip>
          <Tooltip title="Download Screenshot">
            <Button 
              icon={<DownloadOutlined />} 
              onClick={handleDownload}
            />
          </Tooltip>
          <Tooltip title={showHighlights ? "Hide Elements" : "Show Elements"}>
            <Button 
              icon={showHighlights ? <EyeInvisibleOutlined /> : <EyeOutlined />} 
              onClick={handleHighlightToggle}
            />
          </Tooltip>
        </Space>
      }
    >
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          overflow: 'auto',
          maxHeight: fullscreen ? 'calc(100vh - 120px)' : '600px',
          textAlign: 'center',
          backgroundColor: '#f0f0f0',
        }}
      >
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            transition: 'transform 0.2s ease',
          }}
        >
          <img
            ref={imageRef}
            src={actualImageData}
            alt="App Screenshot"
            style={{
              display: 'block',
              maxWidth: '100%',
            }}
          />
          {elementHighlights}
          {elementLabels}
        </div>
      </div>
    </Card>
  );
};

export default ScreenshotViewer;