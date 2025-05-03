import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger.js';
import { JobQueue } from '../../services/job-queue.js';

export const jobController = {
  /**
   * Get job status
   */
  async getJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId } = req.params;
      const jobType = req.query.type as string || 'visual-analysis';
      
      // Get job status
      const jobStatus = await JobQueue.getJobStatus(jobId, jobType);
      
      // Check if job exists
      if (jobStatus.error === 'Job not found') {
        return res.status(404).json({
          success: false,
          error: {
            message: `Job ${jobId} not found`,
            code: 'JOB_NOT_FOUND',
          },
        });
      }
      
      // Return job status
      res.status(200).json({
        success: true,
        data: jobStatus,
      });
    } catch (error) {
      Logger.error(`Error getting job status:`, error);
      next(error);
    }
  },

  /**
   * Cancel a job
   */
  async cancelJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId } = req.params;
      const jobType = req.query.type as string || 'visual-analysis';
      
      // This is a placeholder since actual job cancellation will be implemented later
      // In a real implementation, we would use bull queue's remove() method
      
      res.status(200).json({
        success: true,
        data: {
          message: `Job ${jobId} of type ${jobType} cancelled successfully`,
        },
      });
    } catch (error) {
      Logger.error(`Error cancelling job:`, error);
      next(error);
    }
  },
};