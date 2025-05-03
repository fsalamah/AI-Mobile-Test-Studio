import React, { useCallback, useState } from 'react';
import { Upload, Button, message, Spin, Typography } from 'antd';
import { InboxOutlined, UploadOutlined } from '@ant-design/icons';
import { RcFile, UploadChangeParam, UploadFile, UploadProps } from 'antd/es/upload';
import fileUtils from '../../utils/fileUtils';

const { Dragger } = Upload;
const { Text } = Typography;

interface FileUploaderProps {
  accept?: string; // File types to accept
  acceptedFileTypes?: string; // Alias for accept for backward compatibility
  maxSize?: number; // Maximum file size in bytes
  onChange?: (fileContent: string, fileType: string, fileName: string) => void;
  onRemove?: () => void;
  onFileUploaded?: (fileData: any) => void; // New prop for batch file upload processing
  multiple?: boolean;
  disabled?: boolean;
  listType?: 'text' | 'picture' | 'picture-card';
  buttonText?: string;
  dragText?: string;
  hintText?: string;
  description?: string; // Alternative to hintText
  showUploadList?: boolean;
  loading?: boolean;
  allowDrop?: boolean; // Whether to use drag-and-drop UI
}

const FileUploader: React.FC<FileUploaderProps> = ({
  accept = '.png,.jpg,.jpeg,.xml,text/xml,application/xml',
  acceptedFileTypes,
  maxSize = 5 * 1024 * 1024, // 5MB
  onChange,
  onRemove,
  onFileUploaded,
  multiple = false,
  disabled = false,
  listType = 'text',
  buttonText = 'Upload File',
  dragText = 'Click or drag file to this area to upload',
  hintText = 'Support for a single or bulk upload. Maximum file size: 5MB.',
  description,
  showUploadList = true,
  loading = false,
  allowDrop = false,
}) => {
  // For backward compatibility
  const actualAccept = acceptedFileTypes || accept;
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleBeforeUpload = useCallback((file: RcFile) => {
    // Check file size
    if (file.size > maxSize) {
      message.error(`File ${file.name} exceeds the maximum size of ${fileUtils.formatFileSize(maxSize)}`);
      return Upload.LIST_IGNORE;
    }

    return false; // Prevent default upload behavior
  }, [maxSize]);

  const handleChange = async (info: UploadChangeParam) => {
    setFileList(info.fileList);

    // Handle file removal
    if (info.file.status === 'removed') {
      if (onRemove) {
        onRemove();
      }
      return;
    }

    // Process uploaded file
    if (info.file.originFileObj && !uploading) {
      setUploading(true);
      
      try {
        const file = info.file.originFileObj;
        let content = '';
        let fileType = file.type;

        // Read file based on type
        if (fileUtils.isImageFile(file)) {
          content = await fileUtils.readFileAsDataURL(file);
          fileType = 'image';
        } else {
          content = await fileUtils.readFileAsText(file);
          
          // Check if content is XML
          if (fileUtils.isXmlString(content)) {
            fileType = 'xml';
          } else {
            fileType = 'text';
          }
        }

        // Call onChange with processed content
        if (onChange) {
          onChange(content, fileType, file.name);
        }
        
        // If using batch processing mode with onFileUploaded
        if (onFileUploaded && info.fileList.length === info.fileList.filter(f => !!f.originFileObj).length) {
          // Process all files at once
          const allFiles = info.fileList.map(f => f.originFileObj).filter(Boolean) as RcFile[];
          if (allFiles.length > 0) {
            const fileData: Record<string, any> = {};
            
            for (const file of allFiles) {
              try {
                if (!file) continue; // Skip undefined files
                
                const fileName = file.name.toLowerCase();
                let content;
                
                // Read content based on file type
                if (fileUtils.isImageFile(file as File)) {
                  content = await fileUtils.readFileAsDataURL(file as File);
                  const platform = fileName.includes('android') ? 'android' : 'ios';
                  fileData[`${platform}Screenshot`] = content;
                } else {
                  content = await fileUtils.readFileAsText(file as File);
                  
                  if (fileUtils.isXmlString(content)) {
                    const platform = fileName.includes('android') ? 'android' : 'ios';
                    fileData[`${platform}Source`] = content;
                  } else if (fileName.endsWith('.json')) {
                    try {
                      const jsonData = JSON.parse(content);
                      Object.assign(fileData, { json: jsonData });
                    } catch (e) {
                      console.error('Error parsing JSON:', e);
                    }
                  }
                }
              } catch (e) {
                console.error('Error processing file:', e);
              }
            }
            
            // Call the batch processing callback
            onFileUploaded(fileData);
          }
        }
      } catch (error) {
        console.error('Error processing file:', error);
        message.error('Error processing file. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    accept: actualAccept,
    multiple,
    disabled: disabled || loading || uploading,
    fileList,
    beforeUpload: handleBeforeUpload,
    onChange: handleChange,
    showUploadList,
    listType,
  };

  // Render as a drag-and-drop area or a simple button
  if (allowDrop || listType === 'picture-card') {
    return (
      <div className="file-uploader">
        <Spin spinning={loading || uploading}>
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">{dragText}</p>
            <p className="ant-upload-hint">{description || hintText}</p>
          </Dragger>
        </Spin>
      </div>
    );
  }

  return (
    <div className="file-uploader">
      <Spin spinning={loading || uploading}>
        <Upload {...uploadProps}>
          <Button disabled={disabled || loading || uploading} icon={<UploadOutlined />}>
            {buttonText}
          </Button>
        </Upload>
        {(description || hintText) && (
          <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
            {description || hintText}
          </Text>
        )}
      </Spin>
    </div>
  );
};

export default FileUploader;