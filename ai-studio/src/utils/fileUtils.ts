/**
 * Utility functions for handling files
 */

// Convert a data URL to a Blob
export const dataURLtoBlob = (dataURL: string): Blob => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
};

// Convert a Blob to a data URL
export const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Read a file as data URL
export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Read a file as text
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// Create a download file
export const downloadFile = (
  content: string | Blob,
  filename: string,
  mimeType: string = 'text/plain'
) => {
  const blob = content instanceof Blob 
    ? content 
    : new Blob([content], { type: mimeType });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  link.click();
  
  window.URL.revokeObjectURL(url);
};

// Extract file extension from filename
export const getFileExtension = (filename: string): string => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

// Check if a file is an image
export const isImageFile = (file: File): boolean => {
  const acceptableTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return acceptableTypes.includes(file.type);
};

// Check if a file is XML
export const isXmlFile = (file: File): boolean => {
  const extension = getFileExtension(file.name).toLowerCase();
  const acceptableTypes = ['xml', 'uix', 'appium'];
  return acceptableTypes.includes(extension) || file.type === 'text/xml' || file.type === 'application/xml';
};

// Check if a string is XML
export const isXmlString = (content: string): boolean => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'application/xml');
    const errorNode = doc.querySelector('parsererror');
    return !errorNode;
  } catch (e) {
    return false;
  }
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Export functions
export default {
  dataURLtoBlob,
  blobToDataURL,
  readFileAsDataURL,
  readFileAsText,
  downloadFile,
  getFileExtension,
  isImageFile,
  isXmlFile,
  isXmlString,
  formatFileSize,
};