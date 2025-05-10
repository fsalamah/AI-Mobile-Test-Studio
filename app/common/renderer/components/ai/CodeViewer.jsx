// Enhanced CodeViewer.jsx with syntax highlighting
import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  SaveOutlined,
  ReloadOutlined,
  FileOutlined
} from '@ant-design/icons';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { xml } from '@codemirror/lang-xml';
import { java } from '@codemirror/lang-java';

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
  const [detectedLanguage, setDetectedLanguage] = useState(null);

  // Improved effect to handle code loading more reliably
  useEffect(() => {
    // Load code from page.aiAnalysis.code if available
    if (page && page.aiAnalysis && page.aiAnalysis.code) {
      const rawCode = page.aiAnalysis.code;

      // Check if the code starts with a language identifier
      // For example: ```groovy or ```java at the beginning
      const languageMatch = rawCode.trim().match(/^```(\w+)\s*([\s\S]*)$/);

      if (languageMatch) {
        // Extract the language and actual code content
        const detectedLanguage = languageMatch[1];
        const actualCode = languageMatch[2].replace(/```$/, '').trim();

        // Set the detected language
        setDetectedLanguage(detectedLanguage);

        // Set the actual code content
        setCode(actualCode);
      } else {
        // No language identifier, use the raw code
        setCode(rawCode);
      }
    } else {
      // Reset code when page is invalid or has no code
      setCode("");
    }
  }, [page]); // Simplify by just tracking the page object

  // Function to download the code as a file
  const downloadCode = () => {
    if (!code) return;

    // Use detected language for file extension if available
    const langForExtension = detectedLanguage || language;
    const filename = `${title.toLowerCase().replace(/\s+/g, '-')}.${getFileExtension(langForExtension)}`;
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
      'css': 'css',
      'xml': 'xml',
      'groovy': 'groovy' // Add groovy extension
    };
    return extensions[lang ? lang.toLowerCase() : ''] || 'txt';
  };

  // Helper function to get the appropriate language extension for CodeMirror
  const getLanguageExtension = (lang) => {
    // Prioritize detected language over prop language
    const langToUse = detectedLanguage || lang;

    // Normalize the language name
    const normalizedLang = langToUse.toLowerCase();

    // Return the appropriate language extension
    switch (normalizedLang) {
      case 'java':
        return java();
      case 'groovy':
        // Groovy is similar to Java, so we can use Java highlighting
        return java();
      case 'xml':
        return xml();
      // For other languages, we'll default to Java since we're primarily
      // dealing with Java files for Appium Page Object Models
      default:
        return java();
    }
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
            {title} {page?.name ? `- ${page.name}` : ''}
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
            disabled={!code}
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
              disabled={!code}
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
            disabled={!page}
          >
            <FileOutlined style={{ fontSize: '14px' }} />
          </button>
        </div>
      </div>
      
      {/* Code content area with CodeMirror for syntax highlighting */}
      <div className="code-content" style={{
        flex: '1 1 auto',
        overflow: 'auto', // Change to auto to enable scrolling
        padding: '0',
        position: 'relative',
        height: 'calc(100% - 48px)'
      }}>
        {code ? (
          <div style={{ height: '100%', overflow: 'auto' }}>
            <CodeMirror
              value={code}
              height="auto" // Change to auto to allow expanding
              maxHeight="none" // Remove height restrictions
              theme={oneDark}
              extensions={[getLanguageExtension(language)]}
              readOnly={true}
              basicSetup={{
                foldGutter: true,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
                lineNumbers: true,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
                syntaxHighlighting: true
            }}
            style={{
              fontSize: '14px',
              fontFamily: "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
            }}
            />
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#6a737d',
            fontSize: '16px',
            backgroundColor: '#282c34'
          }}>
            No code available for this page
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeViewer;