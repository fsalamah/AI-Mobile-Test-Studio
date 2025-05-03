import React, { useRef, useEffect } from 'react';
import MonacoEditor, { MonacoEditorProps } from 'react-monaco-editor';

interface CodeEditorProps extends Omit<MonacoEditorProps, 'editorDidMount'> {
  value?: string;
  code?: string; // Alias for value property for backward compatibility
  language?: string;
  readOnly?: boolean;
  height?: number | string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  code,
  language = 'java',
  readOnly = false,
  height = 500,
  onChange,
  onSave,
  ...props
}) => {
  // Use code prop if value is not provided (backwards compatibility)
  const editorValue = value !== undefined ? value : (code || '');
  const editorRef = useRef<any>(null);

  // Editor configuration options
  const editorOptions = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly,
    cursorStyle: 'line' as 'line' | 'block' | 'underline' | 'line-thin' | 'block-outline' | 'underline-thin',
    automaticLayout: true,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    wordWrap: 'on' as const,
  };

  // Set up save shortcut (Ctrl+S or Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (onSave && editorRef.current) {
          onSave(editorRef.current.getValue());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSave]);

  // Handle editor initialization
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Add keyboard binding for save action
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) {
        onSave(editor.getValue());
      }
    });

    // Focus the editor
    editor.focus();
  };

  // Handle editor value change
  const handleChange = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    }
  };

  // Set language-specific settings
  const beforeMount = (monaco: any) => {
    monaco.editor.defineTheme('customTheme', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#f5f5f5',
      },
    });

    // Configure indentation based on language
    const indentationSize = language === 'python' ? 4 : 2;
    
    monaco.languages.setLanguageConfiguration(language, {
      indentationRules: {
        increaseIndentPattern: /^.*[{([].*$/,
        decreaseIndentPattern: /^.*[})].*$/,
      },
      onEnterRules: [
        {
          beforeText: /^\s*\/\*\*(?!\/)([^*]|\*(?!\/))*$/,
          afterText: /^\s*\*\/$/,
          action: {
            indentAction: monaco.languages.IndentAction.IndentOutdent,
            appendText: ' * ',
          },
        },
        {
          beforeText: /^\s*\/\*\*(?!\/)([^*]|\*(?!\/))*$/,
          action: {
            indentAction: monaco.languages.IndentAction.None,
            appendText: ' * ',
          },
        },
        {
          beforeText: /^(\t|[ ])*[ ]\*([ ]([^*]|\*(?!\/))*)?$/,
          action: {
            indentAction: monaco.languages.IndentAction.None,
            appendText: '* ',
          },
        },
        {
          beforeText: /^(\t|[ ])*[ ]\*\/\s*$/,
          action: {
            indentAction: monaco.languages.IndentAction.None,
            removeText: 1,
          },
        },
      ],
    });
    
    // Set language-specific editor options
    monaco.editor.getModels().forEach((model: any) => {
      if (model.getLanguageId() === language) {
        model.updateOptions({
          tabSize: indentationSize,
          insertSpaces: true,
        });
      }
    });
  };

  return (
    <div className="code-editor-container" style={{ height }}>
      <MonacoEditor
        width="100%"
        height={height}
        language={language}
        theme="vs"
        value={editorValue}
        options={editorOptions}
        onChange={handleChange}
        editorDidMount={(editor, monaco) => {
          handleEditorDidMount(editor, monaco);
          // Call beforeMount here as a workaround since onMount is not available
          beforeMount(monaco);
        }}
        {...props}
      />
    </div>
  );
};

export default CodeEditor;