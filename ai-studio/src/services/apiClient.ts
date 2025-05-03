import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse, JobResponse } from '../types/api';

class ApiClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor to add API key to all requests
    this.client.interceptors.request.use(
      (config) => {
        if (this.apiKey) {
          config.headers['X-API-Key'] = this.apiKey;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        const customError = {
          status: error.response?.status,
          message: error.response?.data?.error?.message || error.message,
          code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
          details: error.response?.data?.error?.details,
        };
        return Promise.reject(customError);
      }
    );
  }

  // Update API configuration
  updateConfig(baseUrl?: string, apiKey?: string) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
      this.client.defaults.baseURL = baseUrl;
    }

    if (apiKey) {
      this.apiKey = apiKey;
    }
  }

  // Generic request method
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }
  
  // Mock method to emulate the real API - in real implementation, this would be a proper API call
  async request2<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.request(config);
    return {
      success: true,
      data: response.data as T
    };
  }

  // Health check endpoint
  async healthCheck() {
    return this.request({
      method: 'GET',
      url: '/health',
    });
  }

  // Analysis endpoints
  async startVisualAnalysis(page: any, osVersions: string[] = ['ios', 'android']): Promise<ApiResponse<JobResponse>> {
    return this.request2<JobResponse>({
      method: 'POST',
      url: '/analysis/visual',
      data: {
        page,
        osVersions,
      },
    });
  }
  
  // Alternative name for backwards compatibility
  async startCodeGeneration(request: any): Promise<ApiResponse<JobResponse>> {
    // For testing return a fake response
    return {
      success: true,
      data: {
        jobId: 'code-' + Date.now(),
        status: 'pending',
        progress: 0,
        createdAt: new Date().toISOString()
      }
    };
  }

  async generateXpathLocators(elements: any[], platforms: string[] = ['ios', 'android']) {
    return this.request({
      method: 'POST',
      url: '/analysis/xpath',
      data: {
        elements,
        platforms,
      },
    });
  }

  async repairFailedXpaths(elements: any[], page: any) {
    return this.request({
      method: 'POST',
      url: '/analysis/xpath/repair',
      data: {
        elements,
        page,
      },
    });
  }
  
  // Alternative name for backwards compatibility
  async startXPathRepair(request: any): Promise<ApiResponse<JobResponse>> {
    // For testing return a fake response
    return {
      success: true,
      data: {
        jobId: 'xpath-' + Date.now(),
        status: 'pending',
        progress: 0,
        createdAt: new Date().toISOString()
      }
    };
  }

  async getAnalysisProgress(operationId: string) {
    return this.request({
      method: 'GET',
      url: `/analysis/progress/${operationId}`,
    });
  }

  // Code generation endpoints
  async generateCode(page: any, language: string = 'java', framework: string = 'junit4') {
    return this.request({
      method: 'POST',
      url: '/code/generate',
      data: {
        page,
        language,
        framework,
      },
    });
  }

  async getSupportedLanguages() {
    return this.request({
      method: 'GET',
      url: '/code/languages',
    });
  }

  // Job management endpoints
  async getJobStatus(jobId: string, jobType?: string): Promise<ApiResponse<JobResponse>> {
    // For testing return a fake response with completed status after a brief delay
    // In real implementation, this would actually check the job status
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      data: {
        jobId,
        status: 'completed',
        progress: 100,
        result: {
          message: 'Job completed successfully',
          data: { /* sample result data */ }
        },
        completedAt: new Date().toISOString()
      }
    };
  }

  async cancelJob(jobId: string, jobType?: string) {
    return this.request({
      method: 'POST',
      url: `/jobs/${jobId}/cancel`,
      params: jobType ? { type: jobType } : undefined,
    });
  }
}

// Create singleton instance
let apiClientInstance: ApiClient | null = null;

export const getApiClient = (baseUrl?: string, apiKey?: string): ApiClient => {
  if (!apiClientInstance) {
    // Initialize with default values, these will be overridden by context
    apiClientInstance = new ApiClient(
      baseUrl || process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
      apiKey || ''
    );
  } else if (baseUrl || apiKey) {
    // Update existing instance if new config provided
    apiClientInstance.updateConfig(baseUrl, apiKey);
  }

  return apiClientInstance;
};

// Create a default instance with environment variables
const defaultApiClient = getApiClient();

// Export the default instance
export default defaultApiClient;