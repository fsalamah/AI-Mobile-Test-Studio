import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftOutlined, 
  DownloadOutlined, 
  SaveOutlined, 
  ReloadOutlined, 
  FileOutlined 
} from '@ant-design/icons';

/**
 * CodeViewer component that displays code with syntax highlighting
 * 
 * @param {Object} props Component props
 * @param {Object} props.page Page object containing the code to display
 * @param {string} [props.language="java"] Programming language for syntax highlighting
 * @param {string} [props.title="Code Viewer"] Title to display in the header
 * @param {Function} [props.onBack] Function to call when the back button is clicked
 * @param {Function} [props.onSave] Function to call when saving the code
 * @param {Function} [props.onRegenerate] Function to call when regenerating the code
 * @returns {JSX.Element} The CodeViewer component
 */
const CodeViewer = ({ 
  page, 
  language = "java", 
  title = "Code Viewer",
  onBack = () => {},
  onSave = null,
  onRegenerate = null
}) => {
  const [code, setCode] = useState("");

  useEffect(() => {
    // Load code from page.aiAnalysis.code if available
    if (page && page.aiAnalysis && page.aiAnalysis.code) {
      setCode(page.aiAnalysis.code);
    }
  }, [page, page?.aiAnalysis?.code]); // Add dependency on page.aiAnalysis.code

  // Function to download the code as a file
  const downloadCode = () => {
    if (!code) return;
    
    const filename = `${title.toLowerCase().replace(/\s+/g, '-')}.${getFileExtension(language)}`;
    const blob = new Blob([code], { type: 'text/plain' });
    downloadBlob(blob, filename);
  };

  // Function to download the page object as JSON
  const downloadPageAsJson = () => {
    if (!page) return;
    
    const filename = `page-data-${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(page, null, 2)], { type: 'application/json' });
    downloadBlob(blob, filename);
  };

  // Helper function to download a blob
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper function to get file extension based on language
  const getFileExtension = (lang) => {
    const extensions = {
      'java': 'java',
      'javascript': 'js',
      'typescript': 'ts',
      'python': 'py',
      'ruby': 'rb',
      'csharp': 'cs',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'php': 'php',
      'html': 'html',
      'css': 'css'
    };
    return extensions[lang.toLowerCase()] || 'txt';
  };

  // Handle saving the code
  const handleSave = () => {
    if (onSave) {
      // Clone the page object and update the code
      const updatedPage = {
        ...page,
        aiAnalysis: {
          ...(page.aiAnalysis || {}),
          code
        }
      };
      onSave(updatedPage);
    }
  };

  // Handle regenerate button click
  const handleRegenerate = async () => {
    if (onRegenerate) {
      // Call the regenerate function
      await onRegenerate();
      
      // Note: We don't need to update the code here as the useEffect will
      // automatically update when page.aiAnalysis.code changes
    }
  };

  return (
    <div className="code-viewer-container" style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      overflow: 'hidden'
    }}>
      {/* Header with back button, title and action buttons */}
      <div className="code-viewer-header" style={{ 
        display: 'flex', 
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #e8e8e8',
        backgroundColor: '#fafafa',
        minHeight: '48px',
        flexShrink: 0,
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            className="back-button" 
            onClick={onBack}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              marginRight: '12px',
              padding: '4px'
            }}
          >
            <ArrowLeftOutlined style={{ fontSize: '16px' }} />
          </button>
          
          <h2 style={{ 
            margin: 0,
            fontSize: '16px',
            fontWeight: '500'
          }}>
            {title}
          </h2>
        </div>
        
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            title="Download Code"
            onClick={downloadCode}
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: '2px',
              background: 'white',
              cursor: 'pointer',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px'
            }}
          >
            <DownloadOutlined style={{ fontSize: '14px' }} />
          </button>
          
          {onSave && (
            <button 
              title="Save Code"
              onClick={handleSave}
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: '2px',
                background: 'white',
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}
            >
              <SaveOutlined style={{ fontSize: '14px' }} />
            </button>
          )}
          
          {onRegenerate && (
            <button 
              title="Regenerate Code"
              onClick={handleRegenerate}
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: '2px',
                background: 'white',
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}
            >
              <ReloadOutlined style={{ fontSize: '14px' }} />
            </button>
          )}
          
          <button 
            title="Download Page as JSON"
            onClick={downloadPageAsJson}
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: '2px',
              background: 'white',
              cursor: 'pointer',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px'
            }}
          >
            <FileOutlined style={{ fontSize: '14px' }} />
          </button>
        </div>
      </div>
      
      {/* Code content area */}
      <div className="code-content" style={{ 
        flex: '1 1 auto',
        overflow: 'auto',
        padding: '0',
        backgroundColor: '#282c34',
        position: 'relative'
      }}>
        <pre style={{
          margin: 0,
          padding: '16px',
          fontSize: '14px',
          lineHeight: '1.5',
          fontFamily: "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
          overflowX: 'auto',
          color: '#abb2bf'
        }}>
          <code className={`language-${language}`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default CodeViewer;