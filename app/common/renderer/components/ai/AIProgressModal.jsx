import React, { useState, useEffect } from 'react';
import { Modal, Typography, Row, Col, Progress } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
// Removed unused icon imports

const { Text, Title } = Typography;

/**
 * Styles configuration for enterprise theming
 */
const THEME = {
  colors: {
    primary: '#0055aa',           // Corporate blue
    secondary: '#007ac2',         // Secondary blue
    accent: '#0088cc',            // Accent blue
    background: '#f7f9fc',        // Light background
    backgroundDark: '#edf2f7',    // Secondary background
    border: '#d1dbe8',            // Border color
    text: {
      primary: '#2c3e50',         // Main text
      secondary: '#515e70',       // Secondary text
      light: '#7b8a9b'            // Tertiary text
    }
  },
  shadows: {
    small: '0 2px 4px rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px rgba(0, 0, 0, 0.07)',
    large: '0 8px 16px rgba(0, 0, 0, 0.1)'
  },
  borders: {
    radius: '6px',
    width: '1px'
  },
  transitions: {
    default: 'all 0.3s ease'
  }
};

/**
 * GridBackground - Subtle professional grid pattern
 */
const GridBackground = () => (
  <div style={{
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0 L60 0 L60 60 L0 60 Z' stroke='rgba(209, 219, 232, 0.3)' fill='none' /%3E%3C/svg%3E")`,
    backgroundSize: '60px 60px',
    opacity: 0.5,
    pointerEvents: 'none',
    zIndex: 0,
    borderRadius: THEME.borders.radius
  }}/>
);

/**
 * ProcessingIcon - Processing animation with rings
 */
const ProcessingIcon = () => (
  <div style={{
    position: 'relative',
    width: 48,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  }}>
    {/* Outer processing ring */}
    <div style={{
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      border: `2px solid ${THEME.colors.backgroundDark}`,
      borderTopColor: THEME.colors.primary,
      animation: 'rotate 2s linear infinite'
    }}/>
    
    {/* Inner icon */}
    <LoadingOutlined style={{ 
      fontSize: 20, 
      color: THEME.colors.primary 
    }}/>
    
    <style>{`
      @keyframes rotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

/**
 * StatusIndicator - Shows current process with icon
 */
// StatusIndicator component removed as it's no longer needed

/**
 * AIProgressModal - Enterprise-grade progress modal component
 * 
 * @param {boolean} visible - Controls modal visibility
 * @param {string} message - Primary message
 * @param {string} subMessage - Secondary message
 * @param {function} onCancel - Cancel handler
 * @param {boolean} allowCancel - Whether cancellation is allowed
 */
const AIProgressModal = ({ 
  visible, 
  message = "Processing request", 
  subMessage = "Please wait while we process your data",
  onCancel = null,
  allowCancel = false
}) => {
  const [progressPercent, setProgressPercent] = useState(0);
  // Phase state removed as it's no longer needed
  
  // Process phases removed as requested

  // Progress and phase updater effect
  useEffect(() => {
    if (!visible) return;
    
    // Progress updater
    const progressInterval = setInterval(() => {
      setProgressPercent(prev => {
        const remaining = 100 - prev;
        // Slow down as we approach completion
        const increment = Math.max(0.3, remaining / 25);
        const newValue = Math.min(99, prev + increment);
        
        // Phase updates removed as they're no longer needed
        
        return newValue;
      });
    }, 800);
    
    return () => {
      clearInterval(progressInterval);
    };
  }, [visible]);

  return (
    <Modal
      open={visible}
      footer={null}
      closable={allowCancel}
      onCancel={allowCancel ? onCancel : null}
      centered
      width={580}
      bodyStyle={{
        padding: "24px",
        borderRadius: THEME.borders.radius,
        background: THEME.colors.background,
        position: 'relative',
        overflow: 'hidden',
        border: `${THEME.borders.width} solid ${THEME.colors.border}`
      }}
      maskStyle={{
        background: 'rgba(44, 62, 80, 0.25)',
        backdropFilter: 'blur(2px)'
      }}
      style={{ 
        borderRadius: THEME.borders.radius, 
        overflow: 'hidden' 
      }}
      wrapClassName="enterprise-modal-wrap"
    >
      <style>{`
        .enterprise-modal-wrap .ant-modal-content {
          border-radius: ${THEME.borders.radius};
          overflow: hidden;
          background: transparent;
          box-shadow: ${THEME.shadows.large};
        }
        .enterprise-modal-wrap .ant-modal-close {
          color: ${THEME.colors.text.secondary};
        }
        .enterprise-modal-wrap .ant-modal-close:hover {
          color: ${THEME.colors.text.primary};
        }
        .enterprise-progress .ant-progress-inner {
          background-color: ${THEME.colors.backgroundDark};
        }
        .enterprise-progress .ant-progress-bg {
          background-color: ${THEME.colors.primary};
        }
      `}</style>

      {/* Subtle background grid */}
      <GridBackground />

      <Row gutter={[0, 16]}>
        {/* Header with title and icon */}
        <Col span={24}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            marginBottom: 8
          }}>
            <ProcessingIcon />
            <Title level={4} style={{ 
              margin: 0,
              color: THEME.colors.text.primary,
              fontWeight: 500,
              fontSize: '18px'
            }}>
              {message}
            </Title>
          </div>
          <Text style={{ 
            color: THEME.colors.text.secondary,
            fontSize: '14px',
            display: 'block',
            marginLeft: 60
          }}>
            {subMessage}
          </Text>
        </Col>
        
        {/* Progress indicator */}
        <Col span={24}>
          <div style={{ 
            padding: '16px',
            backgroundColor: THEME.colors.backgroundDark,
            borderRadius: THEME.borders.radius,
            boxShadow: THEME.shadows.small,
            marginBottom: 16
          }}>
            <Progress 
              percent={Math.round(progressPercent)} 
              strokeColor={THEME.colors.primary}
              className="enterprise-progress"
              size="small"
            />
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginTop: 4
            }}>
              <Text style={{ 
                color: THEME.colors.text.light,
                fontSize: '12px'
              }}>
                {Math.round(progressPercent) < 100 ? 'Processing' : 'Complete'}
              </Text>
              <Text style={{ 
                color: THEME.colors.text.light,
                fontSize: '12px'
              }}>
                {Math.round(progressPercent)}%
              </Text>
            </div>
          </div>
        </Col>
        
        {/* Intentionally left empty - status phases and estimated time removed */}
      </Row>
    </Modal>
  );
};

export default AIProgressModal;