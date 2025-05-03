import { useState, useEffect, useCallback } from 'react';
import useApi from './useApi';
import { JobResponse, ApiResponse } from '../types/api';

interface UseJobPollingParams {
  pollInterval?: number; // milliseconds
  maxAttempts?: number;
  onSuccess?: (result: any) => void;
  onFailure?: (error: any) => void;
}

export interface JobPollingResult {
  jobId: string | null;
  status: 'idle' | 'polling' | 'completed' | 'failed';
  progress: number;
  result: any;
  error: any;
  jobStatus?: JobResponse; // For backward compatibility
  jobResult?: any; // For backward compatibility
  startPolling: (newJobId: string) => void;
  stopPolling: () => void;
  startVisualAnalysis: (page: any, osVersions?: string[]) => Promise<string>;
  generateXpathLocators: (elements: any[], platforms?: string[]) => Promise<string>;
  repairFailedXpaths: (elements: any[], page: any) => Promise<string>;
  generateCode: (page: any, language?: string, framework?: string) => Promise<string>;
  startJob: <T>(
    startFn: () => Promise<any>, 
    getStatusFnProvider?: () => (jobId: string) => Promise<any>
  ) => Promise<string>;
}

export const useJobPolling = ({
  pollInterval = 2000,
  maxAttempts = 300, // 10 minutes maximum polling by default
  onSuccess,
  onFailure,
}: UseJobPollingParams = {}): JobPollingResult => {
  const apiClient = useApi();
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'polling' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<any>(null);
  const [attempts, setAttempts] = useState<number>(0);

  // Function to start polling for a job
  const startPolling = useCallback((newJobId: string) => {
    setJobId(newJobId);
    setStatus('polling');
    setProgress(0);
    setError(null);
    setAttempts(0);
    setResult(null);
  }, []);

  // Function to stop polling
  const stopPolling = useCallback(() => {
    setStatus('idle');
    setJobId(null);
  }, []);

  // Poll for job status
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const pollJob = async () => {
      if (!jobId || status !== 'polling') return;

      try {
        const response = await apiClient.getJobStatus(jobId);
        const typedResponse = response as ApiResponse<JobResponse>;
        
        // Update progress
        if (typedResponse.data?.progress) {
          setProgress(typedResponse.data.progress);
        }

        // Check job status
        const jobStatus = typedResponse.data?.status;

        if (jobStatus === 'completed') {
          setResult(typedResponse.data?.result);
          setStatus('completed');
          if (onSuccess) {
            onSuccess(typedResponse.data?.result);
          }
        } else if (jobStatus === 'failed') {
          setError(typedResponse.data?.error || 'Job failed');
          setStatus('failed');
          if (onFailure) {
            onFailure(typedResponse.data?.error || 'Job failed');
          }
        } else {
          // Continue polling if not at max attempts
          if (attempts < maxAttempts) {
            setAttempts(prev => prev + 1);
            timeoutId = setTimeout(pollJob, pollInterval);
          } else {
            setError('Polling timeout exceeded');
            setStatus('failed');
            if (onFailure) {
              onFailure('Polling timeout exceeded');
            }
          }
        }
      } catch (err) {
        console.error('Error polling job:', err);
        
        // Continue polling on error (might be temporary)
        if (attempts < maxAttempts) {
          setAttempts(prev => prev + 1);
          timeoutId = setTimeout(pollJob, pollInterval);
        } else {
          setError(err);
          setStatus('failed');
          if (onFailure) {
            onFailure(err);
          }
        }
      }
    };

    if (jobId && status === 'polling') {
      pollJob();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [jobId, status, attempts, apiClient, pollInterval, maxAttempts, onSuccess, onFailure]);

  // Generic function to start a job
  const startJob = useCallback(async <T>(
    startFn: () => Promise<ApiResponse<JobResponse>>,
    getStatusFnProvider?: () => (jobId: string) => Promise<ApiResponse<JobResponse>>
  ): Promise<string> => {
    try {
      const response = await startFn();
      const typedResponse = response as ApiResponse<JobResponse>;
      const newJobId = typedResponse.data?.jobId;
      
      if (newJobId) {
        startPolling(newJobId);
        return newJobId;
      } else {
        throw new Error('No job ID returned');
      }
    } catch (err) {
      setError(err);
      setStatus('failed');
      if (onFailure) {
        onFailure(err);
      }
      throw err;
    }
  }, [startPolling, onFailure]);

  // Function to start visual analysis
  const startVisualAnalysis = useCallback(async (page: any, osVersions: string[] = ['ios', 'android']): Promise<string> => {
    try {
      const response = await apiClient.startVisualAnalysis(page, osVersions);
      const typedResponse = response as ApiResponse<JobResponse>;
      const newJobId = typedResponse.data?.jobId;
      
      if (newJobId) {
        startPolling(newJobId);
        return newJobId;
      } else {
        throw new Error('No job ID returned');
      }
    } catch (err) {
      setError(err);
      setStatus('failed');
      if (onFailure) {
        onFailure(err);
      }
      throw err;
    }
  }, [apiClient, startPolling, onFailure]);

  // Function to generate XPath locators
  const generateXpathLocators = useCallback(async (elements: any[], platforms: string[] = ['ios', 'android']): Promise<string> => {
    try {
      const response = await apiClient.generateXpathLocators(elements, platforms);
      const typedResponse = response as ApiResponse<JobResponse>;
      const newJobId = typedResponse.data?.jobId;
      
      if (newJobId) {
        startPolling(newJobId);
        return newJobId;
      } else {
        throw new Error('No job ID returned');
      }
    } catch (err) {
      setError(err);
      setStatus('failed');
      if (onFailure) {
        onFailure(err);
      }
      throw err;
    }
  }, [apiClient, startPolling, onFailure]);

  // Function to repair failed XPaths
  const repairFailedXpaths = useCallback(async (elements: any[], page: any): Promise<string> => {
    try {
      const response = await apiClient.repairFailedXpaths(elements, page);
      const typedResponse = response as ApiResponse<JobResponse>;
      const newJobId = typedResponse.data?.jobId;
      
      if (newJobId) {
        startPolling(newJobId);
        return newJobId;
      } else {
        throw new Error('No job ID returned');
      }
    } catch (err) {
      setError(err);
      setStatus('failed');
      if (onFailure) {
        onFailure(err);
      }
      throw err;
    }
  }, [apiClient, startPolling, onFailure]);

  // Function to generate code
  const generateCode = useCallback(async (page: any, language: string = 'java', framework: string = 'junit4'): Promise<string> => {
    try {
      const response = await apiClient.generateCode(page, language, framework);
      const typedResponse = response as ApiResponse<JobResponse>;
      const newJobId = typedResponse.data?.jobId;
      
      if (newJobId) {
        startPolling(newJobId);
        return newJobId;
      } else {
        throw new Error('No job ID returned');
      }
    } catch (err) {
      setError(err);
      setStatus('failed');
      if (onFailure) {
        onFailure(err);
      }
      throw err;
    }
  }, [apiClient, startPolling, onFailure]);

  return {
    jobId,
    status,
    progress,
    result,
    error,
    jobStatus: {
      jobId,
      status,
      progress,
      result,
      error
    } as JobResponse,
    jobResult: result,
    startPolling,
    stopPolling,
    startVisualAnalysis,
    generateXpathLocators,
    repairFailedXpaths,
    generateCode,
    startJob,
  };
};

export default useJobPolling;