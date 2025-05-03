import { Request, Response, NextFunction } from 'express';
import { AnalysisService } from '../../services/analysis-service.js';
import { Logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { JobQueue } from '../../services/job-queue.js';

// Initialize services
const analysisService = new AnalysisService();

export class AnalysisController {
  /**
   * Analyze visual elements of a page
   */
  async analyzeVisualElements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, osVersions = ['ios', 'android'] } = req.body;
      
      // Validate request
      if (!page) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Page object is required',
            code: 'INVALID_REQUEST',
          },
        });
      }
      
      // Generate job ID
      const jobId = uuidv4();
      
      // Add to job queue
      await JobQueue.addAnalysisJob(jobId, { page, osVersions });
      
      Logger.info(`Started visual analysis job ${jobId}`);
      
      // Return job ID immediately
      res.status(202).json({
        success: true,
        data: {
          jobId,
          status: 'pending',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate XPath locators for elements
   */
  async generateXpathLocators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { elements, platforms = ['ios', 'android'] } = req.body;
      
      // Validate request
      if (!elements || !Array.isArray(elements) || elements.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Elements array is required and must not be empty',
            code: 'INVALID_REQUEST',
          },
        });
      }
      
      // Generate job ID
      const jobId = uuidv4();
      
      // Process this job in the background
      // In a real implementation, we would add this to a job queue
      setImmediate(async () => {
        try {
          Logger.info(`Processing XPath generation job ${jobId}`);
          await analysisService.generateLocators(elements, platforms, jobId);
          Logger.info(`Completed XPath generation job ${jobId}`);
        } catch (error) {
          Logger.error(`Error in XPath generation job ${jobId}:`, error);
        }
      });
      
      // Return job ID immediately
      res.status(202).json({
        success: true,
        data: {
          jobId,
          status: 'pending',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Repair failed XPath expressions
   */
  async repairFailedXpaths(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { elements, page } = req.body;
      
      // Validate request
      if (!elements || !Array.isArray(elements) || elements.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Elements array is required and must not be empty',
            code: 'INVALID_REQUEST',
          },
        });
      }
      
      if (!page) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Page object is required',
            code: 'INVALID_REQUEST',
          },
        });
      }
      
      // Generate job ID
      const jobId = uuidv4();
      
      // Process this job in the background
      // In a real implementation, we would add this to a job queue
      setImmediate(async () => {
        try {
          Logger.info(`Processing XPath repair job ${jobId}`);
          await analysisService.repairLocators(elements, page, jobId);
          Logger.info(`Completed XPath repair job ${jobId}`);
        } catch (error) {
          Logger.error(`Error in XPath repair job ${jobId}:`, error);
        }
      });
      
      // Return job ID immediately
      res.status(202).json({
        success: true,
        data: {
          jobId,
          status: 'pending',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate Page Object Model class
   */
  async generatePOMClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // This functionality will be handled by the code-controller
      // but included here for backward compatibility
      res.status(501).json({
        success: false,
        error: {
          message: 'POM generation has been moved to /code/generate endpoint',
          code: 'ENDPOINT_MOVED',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get progress of an analysis operation
   */
  async getAnalysisProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { operationId } = req.params;
      
      // Get job status
      const jobStatus = await JobQueue.getJobStatus(operationId);
      
      // Check if job exists
      if (jobStatus.error === 'Job not found') {
        return res.status(404).json({
          success: false,
          error: {
            message: `Operation ${operationId} not found`,
            code: 'OPERATION_NOT_FOUND',
          },
        });
      }
      
      // Map internal state to client-friendly status
      const statusMap: Record<string, string> = {
        'waiting': 'pending',
        'active': 'processing',
        'completed': 'completed',
        'failed': 'failed',
      };
      
      const clientStatus = statusMap[jobStatus.state] || jobStatus.state;
      
      // Return operation status
      res.status(200).json({
        success: true,
        data: {
          operationId,
          status: clientStatus,
          progress: jobStatus.progress || 0,
          result: jobStatus.data,
          error: jobStatus.error,
          timestamps: jobStatus.timestamp,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel an ongoing analysis operation
   */
  async cancelAnalysisOperation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // This functionality will be implemented in a future update
      res.status(501).json({
        success: false,
        error: {
          message: 'Operation cancellation not yet implemented',
          code: 'NOT_IMPLEMENTED',
        },
      });
    } catch (error) {
      next(error);
    }
  }
}