import Queue from 'bull';
import { CONFIG } from '../config/index.js';
import { Logger } from '../utils/logger.js';

// Create Redis connection
const redisConfig = {
  host: CONFIG.redis.host || 'localhost',
  port: CONFIG.redis.port || 6379,
  password: CONFIG.redis.password,
};

// Create queues for different job types
const analysisQueue = new Queue('visual-analysis', { redis: redisConfig });
const xpathQueue = new Queue('xpath-generation', { redis: redisConfig });
const repairQueue = new Queue('xpath-repair', { redis: redisConfig });
const codeQueue = new Queue('code-generation', { redis: redisConfig });

// Process visual analysis jobs
analysisQueue.process(async (job) => {
  try {
    Logger.info(`Processing visual analysis job ${job.id}`);
    const { analysisRequest } = job.data;
    
    // Update job progress
    job.progress(10);
    
    // Execute pipeline (will be implemented in later phases)
    // const visualPipeline = await import('../core/pipelines/visual-pipeline.js');
    // const result = await visualPipeline.executeVisualPipeline(
    //   analysisRequest.page,
    //   analysisRequest.osVersions || CONFIG.osVersions
    // );
    
    // Placeholder result for now
    const result = {
      jobId: job.id,
      elementsCount: 0,
      elements: [],
    };
    
    job.progress(100);
    return result;
  } catch (error) {
    Logger.error(`Error processing analysis job ${job.id}:`, error);
    throw error;
  }
});

// Similar processors for other job types will be added

export const JobQueue = {
  // Add a visual analysis job to the queue
  async addAnalysisJob(jobId, analysisRequest) {
    try {
      const job = await analysisQueue.add(
        {
          jobId,
          analysisRequest,
        },
        {
          jobId,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: false, // Keep job for history
          removeOnFail: false, // Keep failed jobs
        }
      );
      
      Logger.info(`Added visual analysis job ${job.id} to queue`);
      return job.id;
    } catch (error) {
      Logger.error(`Error adding analysis job to queue:`, error);
      throw error;
    }
  },
  
  // Check status of a job
  async getJobStatus(jobId, jobType = 'visual-analysis') {
    try {
      let queue;
      switch (jobType) {
        case 'visual-analysis':
          queue = analysisQueue;
          break;
        case 'xpath-generation':
          queue = xpathQueue;
          break;
        case 'xpath-repair':
          queue = repairQueue;
          break;
        case 'code-generation':
          queue = codeQueue;
          break;
        default:
          throw new Error(`Unknown job type: ${jobType}`);
      }
      
      const job = await queue.getJob(jobId);
      if (!job) {
        return { error: 'Job not found' };
      }
      
      const state = await job.getState();
      const progress = await job.progress();
      
      return {
        id: job.id,
        state,
        progress,
        data: job.returnvalue,
        error: job.failedReason,
        timestamp: {
          created: job.timestamp,
          started: job.processedOn,
          finished: job.finishedOn,
        },
      };
    } catch (error) {
      Logger.error(`Error getting job status:`, error);
      throw error;
    }
  },
  
  // Clean up completed jobs older than specified time
  async cleanupJobs(olderThan = 24 * 60 * 60 * 1000) { // Default 24 hours
    try {
      // Get timestamp for jobs older than specified time
      const timestamp = Date.now() - olderThan;
      
      // Clean up completed jobs
      const [
        cleanedAnalysis,
        cleanedXpath,
        cleanedRepair,
        cleanedCode,
      ] = await Promise.all([
        analysisQueue.clean(timestamp, 'completed'),
        xpathQueue.clean(timestamp, 'completed'),
        repairQueue.clean(timestamp, 'completed'),
        codeQueue.clean(timestamp, 'completed'),
      ]);
      
      Logger.info(`Cleaned up ${cleanedAnalysis.length + cleanedXpath.length + 
        cleanedRepair.length + cleanedCode.length} completed jobs`);
      
      return {
        cleanedAnalysis: cleanedAnalysis.length,
        cleanedXpath: cleanedXpath.length,
        cleanedRepair: cleanedRepair.length,
        cleanedCode: cleanedCode.length,
      };
    } catch (error) {
      Logger.error(`Error cleaning up jobs:`, error);
      throw error;
    }
  },
};