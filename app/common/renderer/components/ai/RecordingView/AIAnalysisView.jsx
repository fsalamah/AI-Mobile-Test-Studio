import React, { useState } from 'react';
import { 
  Typography, 
  Radio, 
  Space, 
  Button, 
  message, 
  Spin, 
  Badge, 
  Tooltip, 
  Card,
  Divider 
} from 'antd';
import { 
  ExperimentOutlined, 
  CodeOutlined, 
  CopyOutlined, 
  ThunderboltOutlined 
} from '@ant-design/icons';

const { Text } = Typography;

// Helper function to syntax highlight JSON
const syntaxHighlightJson = (json) => {
  // If it's not a string (already an object), stringify it
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2);
  }
  
  // Replace specific JSON syntax elements with HTML spans
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, 
      function (match) {
        let cls = 'number'; // default is number
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'key'; // it's a key
            match = match.replace(/"/g, '').replace(/:$/, '');
            return '<span style="color: #9cdcfe;">"' + match + '"</span><span style="color: #d4d4d4;">:</span>';
          } else {
            cls = 'string'; // it's a string
            return '<span style="color: #ce9178;">' + match + '</span>';
          }
        } else if (/true|false/.test(match)) {
          cls = 'boolean'; // it's a boolean
          return '<span style="color: #569cd6;">' + match + '</span>';
        } else if (/null/.test(match)) {
          cls = 'null'; // it's null
          return '<span style="color: #569cd6;">' + match + '</span>';
        } else {
          // it's a number
          return '<span style="color: #b5cea8;">' + match + '</span>';
        }
      }
    )
    .replace(/\{/g, '<span style="color: #d4d4d4;">{</span>')
    .replace(/\}/g, '<span style="color: #d4d4d4;">}</span>')
    .replace(/\[/g, '<span style="color: #d4d4d4;">[</span>')
    .replace(/\]/g, '<span style="color: #d4d4d4;">]</span>')
    .replace(/,/g, '<span style="color: #d4d4d4;">,</span>');
};

const AIAnalysisView = ({ 
  aiAnalysis, 
  aiAnalysisRaw, 
  handleProcessWithAI,
  processingAI
}) => {
  const [viewMode, setViewMode] = useState('raw');

  // Process the AI analysis raw data safely
  const processRawData = () => {
    try {
      // Make a deep copy of the analysis to safely modify without affecting the original
      if (!aiAnalysisRaw) return "{}";
      
      // First stringify with a try-catch in case the object has circular references
      let jsonString;
      try {
        jsonString = JSON.stringify(aiAnalysisRaw);
      } catch (err) {
        console.error("Error stringifying analysis data:", err);
        return `{"error": "Could not stringify AI analysis data: ${err.message}"}`;
      }

      // Now parse back to get a safe copy
      const safeAnalysis = JSON.parse(jsonString);

      // Handle empty object or null/undefined in actionValue
      if (safeAnalysis) {
        // Process actionValue if it exists
        if (typeof safeAnalysis.actionValue === 'object') {
          if (safeAnalysis.actionValue === null || 
            Object.keys(safeAnalysis.actionValue).length === 0) {
            safeAnalysis.actionValue = null;
          }
        }
        
        // Process any other potentially problematic fields
        ['currentPageDescription', 'inferredUserActivity', 'transitionDescription'].forEach(field => {
          if (typeof safeAnalysis[field] === 'object' && safeAnalysis[field] !== null) {
            safeAnalysis[field] = JSON.stringify(safeAnalysis[field]);
          }
        });
      }

      return JSON.stringify(safeAnalysis, null, 2);
    } catch (error) {
      console.error("Error processing AI analysis data:", error);
      return `{"error": "Could not process AI analysis data: ${error.message}"}`;
    }
  };

  if (!aiAnalysis && !aiAnalysisRaw) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%',
        color: '#722ED1',
        padding: '30px',
      }}>
        <div style={{
          backgroundColor: '#f9f0ff',
          borderRadius: '8px',
          padding: '30px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '500px',
          border: '1px dashed #d3adf7'
        }}>
          <ExperimentOutlined style={{ fontSize: '64px', marginBottom: '16px', color: '#722ED1' }} />
          <Text strong style={{ fontSize: '18px', color: '#722ED1', marginBottom: '10px' }}>
            No AI Analysis Available
          </Text>
          <Text style={{ fontSize: '14px', textAlign: 'center', marginBottom: '20px', color: '#333' }}>
            This recording state hasn't been processed with AI yet.
          </Text>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '15px', 
            borderRadius: '6px',
            border: '1px solid #d3adf7',
            marginBottom: '16px',
            width: '100%'
          }}>
            <Text strong style={{ display: 'block', marginBottom: '8px', color: '#222' }}>
              How to Generate AI Analysis:
            </Text>
            <ol style={{ paddingLeft: '20px', margin: '0', color: '#333' }}>
              <li style={{ marginBottom: '6px' }}>Complete your recording session</li>
              <li style={{ marginBottom: '6px' }}>Click the <Text strong style={{ color: '#722ED1' }}>Process with AI</Text> button in the toolbar</li>
              <li style={{ marginBottom: '6px' }}>Wait for the AI to analyze all transitions</li>
              <li>View detailed insights for each state</li>
            </ol>
          </div>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handleProcessWithAI}
            loading={processingAI}
            style={{ background: '#722ED1', borderColor: '#722ED1' }}
          >
            Process with AI Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="custom-scrollbar force-scrollbar" style={{ 
      padding: '16px', 
      height: '100%',
      background: '#ffffff',
      overflow: 'auto'
    }}>
      {/* Toggle button header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        backgroundColor: '#f9f0ff', 
        padding: '8px 12px',
        borderRadius: '4px',
        border: '1px solid #d3adf7'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center'
        }}>
          <ExperimentOutlined style={{ fontSize: '18px', color: '#722ED1', marginRight: '8px' }} />
          <Text strong style={{ color: '#722ED1' }}>AI-Generated Analysis</Text>
        </div>
        
        <Space>
          <Text type="secondary" style={{ marginRight: '8px', fontSize: '13px' }}>View mode:</Text>
          <Radio.Group 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value)}
            size="small"
            buttonStyle="solid"
          >
            <Radio.Button value="formatted">
              <CodeOutlined style={{ marginRight: '4px' }} />
              Formatted
            </Radio.Button>
            <Radio.Button value="raw">
              <span style={{ marginRight: '4px', fontFamily: 'monospace' }}>{"{}"}</span>
              Raw JSON
            </Radio.Button>
          </Radio.Group>
        </Space>
      </div>
      
      {/* Content based on view mode */}
      {viewMode === 'formatted' ? (
        // Formatted view
        <div style={{
          backgroundColor: '#f9f0ff', 
          padding: '20px', 
          borderRadius: '6px', 
          overflow: 'auto',
          height: 'calc(100% - 50px)',
          border: '1px solid #d3adf7',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        }}>
          <div
            style={{ 
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontSize: '14px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap'
            }}
            dangerouslySetInnerHTML={{
              __html: aiAnalysis
                // Convert markdown headings to styled HTML
                .replace(/## (.*)/g, '<h2 style="color: #722ED1; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #d3adf7; padding-bottom: 8px;">$1</h2>')
                .replace(/### (.*)/g, '<h3 style="color: #722ED1; margin-top: 16px; margin-bottom: 8px;">$1</h3>')
                // Make code blocks look nicer
                .replace(/```java([\s\S]*?)```/g, '<div style="background-color: #f0f0f0; padding: 12px; border-radius: 4px; margin: 12px 0; border-left: 4px solid #722ED1;"><pre style="margin: 0; overflow-x: auto;">$1</pre></div>')
                // Style list items with purple bullets
                .replace(/- (.*)/g, '<div style="margin: 4px 0; padding-left: 8px; display: flex; align-items: flex-start;"><span style="color: #722ED1; margin-right: 8px;">•</span><span>$1</span></div>')
            }}
          />
        </div>
      ) : (
        // Raw JSON view
        <div style={{
          backgroundColor: '#1e1e1e', 
          padding: '16px', 
          borderRadius: '6px', 
          overflow: 'auto',
          height: 'calc(100% - 50px)',
          border: '1px solid #444',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          color: '#d4d4d4'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '12px',
            borderBottom: '1px solid #444',
            paddingBottom: '8px'
          }}>
            <Text strong style={{ color: '#c586c0' }}>
              AI Analysis Raw Response
            </Text>
            <Button 
              size="small" 
              type="text"
              icon={<CopyOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(processRawData());
                message.success('JSON copied to clipboard!');
              }}
              style={{ color: '#d4d4d4' }}
            >
              Copy JSON
            </Button>
          </div>
          
          <pre style={{
            margin: 0,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: '13px',
            lineHeight: '1.5',
            color: '#d4d4d4',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}>
            <div dangerouslySetInnerHTML={{
              __html: syntaxHighlightJson(processRawData())
            }}/>
          </pre>
        </div>
      )}
    </div>
  );
};

export default AIAnalysisView;