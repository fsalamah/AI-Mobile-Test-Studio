import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../utils/logger.js';
import { LocatorRequest, RepairRequest } from '../../types/api.js';

export const locatorController = {
  /**
   * Generate XPath locators for elements
   */
  async generateLocators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const locatorRequest = req.body as LocatorRequest;
      
      // Validate request
      if (!locatorRequest.elements || !Array.isArray(locatorRequest.elements) || locatorRequest.elements.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Elements array is required and must not be empty',
            code: 'INVALID_REQUEST',
          },
        });
      }
      
      if (!locatorRequest.pageSource) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Page source is required',
            code: 'INVALID_REQUEST',
          },
        });
      }
      
      if (!locatorRequest.platform) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Platform is required',
            code: 'INVALID_REQUEST',
          },
        });
      }
      
      // Generate job ID
      const jobId = uuidv4();
      
      // In a real implementation, we would add this to a job queue
      // await JobQueue.addLocatorJob(jobId, locatorRequest);
      
      Logger.info(`Added locator generation job ${jobId} to queue`);
      
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
  },

  /**
   * Repair failing XPath locators
   */
  async repairLocators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const repairRequest = req.body as RepairRequest;
      
      // Validate request
      if (!repairRequest.elements || !Array.isArray(repairRequest.elements) || repairRequest.elements.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Elements array is required and must not be empty',
            code: 'INVALID_REQUEST',
          },
        });
      }
      
      if (!repairRequest.pageSource) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Page source is required',
            code: 'INVALID_REQUEST',
          },
        });
      }
      
      if (!repairRequest.platform) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Platform is required',
            code: 'INVALID_REQUEST',
          },
        });
      }
      
      // Generate job ID
      const jobId = uuidv4();
      
      // In a real implementation, we would add this to a job queue
      // await JobQueue.addRepairJob(jobId, repairRequest);
      
      Logger.info(`Added locator repair job ${jobId} to queue`);
      
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
  },
};