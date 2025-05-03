import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ApiConfig {
  baseUrl: string;
  apiKey: string;
}

interface ApiConfigContextType {
  apiConfig: ApiConfig;
  updateApiConfig: (newConfig: Partial<ApiConfig>) => void;
  resetApiConfig: () => void;
}

const defaultApiConfig: ApiConfig = {
  baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  apiKey: process.env.REACT_APP_API_KEY || '',
};

const ApiConfigContext = createContext<ApiConfigContextType | undefined>(undefined);

export const ApiConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    // Initialize from localStorage if available
    const savedConfig = localStorage.getItem('apiConfig');
    return savedConfig ? JSON.parse(savedConfig) : defaultApiConfig;
  });

  // Save to localStorage whenever config changes
  useEffect(() => {
    localStorage.setItem('apiConfig', JSON.stringify(apiConfig));
  }, [apiConfig]);

  const updateApiConfig = (newConfig: Partial<ApiConfig>) => {
    setApiConfig(prev => ({ ...prev, ...newConfig }));
  };

  const resetApiConfig = () => {
    setApiConfig(defaultApiConfig);
  };

  return (
    <ApiConfigContext.Provider value={{ apiConfig, updateApiConfig, resetApiConfig }}>
      {children}
    </ApiConfigContext.Provider>
  );
};

export const useApiConfig = (): ApiConfigContextType => {
  const context = useContext(ApiConfigContext);
  if (!context) {
    throw new Error('useApiConfig must be used within an ApiConfigProvider');
  }
  return context;
};