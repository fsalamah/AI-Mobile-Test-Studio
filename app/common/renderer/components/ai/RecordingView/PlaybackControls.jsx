import React, { useState, useEffect } from 'react';
import { Button, Slider, Tooltip, Space } from 'antd';
import { 
  CaretRightOutlined, 
  PauseOutlined, 
  StepBackwardOutlined, 
  StepForwardOutlined, 
  FastBackwardOutlined,
  FastForwardOutlined
} from '@ant-design/icons';

const PlaybackControls = ({ 
  detailedRecording,
  selectedEntryIndex, 
  setSelectedEntryIndex,
  isPlaying,
  setIsPlaying
}) => {
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // milliseconds between state changes
  const [playbackIntervalId, setPlaybackIntervalId] = useState(null);

  // Start playback function
  const startPlayback = () => {
    if (detailedRecording.length === 0 || isPlaying) return;
    
    // If we're at the end or no state is selected, start from the beginning
    if (selectedEntryIndex === null || selectedEntryIndex >= detailedRecording.length - 1) {
      setSelectedEntryIndex(0);
    }
    
    setIsPlaying(true);
    
    // Create interval to advance through states
    const intervalId = setInterval(() => {
      setSelectedEntryIndex(prevIndex => {
        // If we're at the end, stop playback
        if (prevIndex === null || prevIndex >= detailedRecording.length - 1) {
          clearInterval(intervalId);
          setIsPlaying(false);
          setPlaybackIntervalId(null);
          return prevIndex; // Keep the last index
        }
        
        // Otherwise, advance to the next state
        return prevIndex + 1;
      });
    }, playbackSpeed);
    
    setPlaybackIntervalId(intervalId);
  };

  // Pause playback function
  const pausePlayback = () => {
    if (playbackIntervalId) {
      clearInterval(playbackIntervalId);
      setPlaybackIntervalId(null);
    }
    setIsPlaying(false);
  };

  // Stop playback function
  const stopPlayback = () => {
    pausePlayback();
    setSelectedEntryIndex(0); // Return to first state
  };

  // Step backward to previous state
  const stepBackward = () => {
    if (isPlaying) pausePlayback();
    if (selectedEntryIndex > 0) {
      setSelectedEntryIndex(selectedEntryIndex - 1);
    }
  };

  // Step forward to next state
  const stepForward = () => {
    if (isPlaying) pausePlayback();
    if (selectedEntryIndex < detailedRecording.length - 1) {
      setSelectedEntryIndex(selectedEntryIndex + 1);
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (playbackIntervalId) {
        clearInterval(playbackIntervalId);
      }
    };
  }, [playbackIntervalId]);

  // Handle speed change
  const handleSpeedChange = (value) => {
    setPlaybackSpeed(3000 - value); // Invert value so slider feels natural (right = faster)
    
    // If currently playing, restart the interval with the new speed
    if (isPlaying && playbackIntervalId) {
      clearInterval(playbackIntervalId);
      
      const newIntervalId = setInterval(() => {
        setSelectedEntryIndex(prevIndex => {
          if (prevIndex === null || prevIndex >= detailedRecording.length - 1) {
            clearInterval(newIntervalId);
            setIsPlaying(false);
            setPlaybackIntervalId(null);
            return prevIndex;
          }
          return prevIndex + 1;
        });
      }, 3000 - value);
      
      setPlaybackIntervalId(newIntervalId);
    }
  };

  const disabled = detailedRecording.length === 0;

  return (
    <div style={{ 
      padding: '12px 16px',
      backgroundColor: '#f5f5f5',
      borderRadius: '4px',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <Tooltip title="First state">
            <Button 
              icon={<FastBackwardOutlined />} 
              disabled={disabled || selectedEntryIndex === 0}
              onClick={() => setSelectedEntryIndex(0)}
            />
          </Tooltip>
          <Tooltip title="Previous state">
            <Button 
              icon={<StepBackwardOutlined />} 
              disabled={disabled || selectedEntryIndex === 0}
              onClick={stepBackward}
            />
          </Tooltip>
          {isPlaying ? (
            <Tooltip title="Pause">
              <Button 
                type="primary" 
                icon={<PauseOutlined />} 
                onClick={pausePlayback}
                disabled={disabled}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Play">
              <Button 
                type="primary" 
                icon={<CaretRightOutlined />} 
                onClick={startPlayback}
                disabled={disabled}
              />
            </Tooltip>
          )}
          <Tooltip title="Next state">
            <Button 
              icon={<StepForwardOutlined />} 
              disabled={disabled || selectedEntryIndex === detailedRecording.length - 1}
              onClick={stepForward}
            />
          </Tooltip>
          <Tooltip title="Last state">
            <Button 
              icon={<FastForwardOutlined />} 
              disabled={disabled || selectedEntryIndex === detailedRecording.length - 1}
              onClick={() => setSelectedEntryIndex(detailedRecording.length - 1)}
            />
          </Tooltip>
        </Space>
        
        <div style={{ display: 'flex', alignItems: 'center', width: '160px' }}>
          <span style={{ marginRight: '12px', fontSize: '12px' }}>Speed:</span>
          <Slider 
            min={200} 
            max={2800} 
            defaultValue={2000}
            value={3000 - playbackSpeed}
            disabled={disabled}
            onChange={handleSpeedChange}
            style={{ flex: 1 }}
          />
        </div>
      </div>
      
      {selectedEntryIndex !== null && (
        <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
          {`State ${selectedEntryIndex + 1} of ${detailedRecording.length}`}
        </div>
      )}
    </div>
  );
};

export default PlaybackControls;