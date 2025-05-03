import { useEffect, useMemo } from 'react';
import { getApiClient } from '../services/apiClient';
import { useApiConfig } from '../context/ApiConfigContext';

// Hook to provide access to the API client
export const useApi = () => {
  const { apiConfig } = useApiConfig();
  
  // Create or update the API client when configuration changes
  const apiClient = useMemo(() => {
    return getApiClient(apiConfig.baseUrl, apiConfig.apiKey);
  }, [apiConfig.baseUrl, apiConfig.apiKey]);

  // Verify API connection on config changes
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await apiClient.healthCheck();
        console.log('API connection successful');
      } catch (error) {
        console.error('API connection failed:', error);
      }
    };

    if (apiConfig.baseUrl && apiConfig.apiKey) {
      checkConnection();
    }
  }, [apiClient, apiConfig.baseUrl, apiConfig.apiKey]);

  return apiClient;
};

export default useApi;