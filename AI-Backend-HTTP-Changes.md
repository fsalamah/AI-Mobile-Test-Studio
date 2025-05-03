# Required Changes for AI Backend as HTTP Service

## Current Backend Dependencies

Before migrating the AI module to an HTTP service, we need to identify and resolve these key dependencies:

### 1. Electron/Renderer Dependencies

The AI backend currently relies on Electron-specific features:

```javascript
// Example from aiService.js
import { ipcRenderer } from '../../polyfills.js';
```

These need to be replaced with server-appropriate alternatives.

### 2. UI-Coupled Logging

The current logger notifies UI subscribers directly:

```javascript
// From logger.js
static notifySubscribers(logObject) {
  this.subscribers.forEach(callback => callback(logObject));
}
```

This needs to be replaced with server-appropriate logging.

### 3. Local File System Direct Access

The backend directly accesses the file system:

```javascript
// From fileUtils.js
export class FileUtils {
  static async readJsonFile(filePath) {
    // Direct file system access
  }
}
```

This needs to be replaced with proper file handling for a server context.

## Required Backend Changes

### 1. Create Express.js Server Structure

```javascript
// server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'body-parser';
import morgan from 'morgan';
import { analysisRoutes, locatorRoutes, codeRoutes } from './routes/index.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(json({ limit: '50mb' })); // For large payloads (screenshots)
app.use(urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined'));

// Routes
app.use('/api/v1/analysis', analysisRoutes);
app.use('/api/v1/locators', locatorRoutes);
app.use('/api/v1/code', codeRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`AI Backend Service running on port ${port}`);
});
```

### 2. Replace UI-Coupled Logging

```javascript
// logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

export class Logger {
  static log(message, level = 'info') {
    logger.log({
      level,
      message,
      timestamp: new Date().toISOString()
    });
  }

  static error(message, err) {
    logger.error({
      message,
      error: err?.toString(),
      stack: err?.stack,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 3. Implement File Handling for Server Context

```javascript
// fileUtils.js
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class FileUtils {
  constructor(baseDir = './uploads') {
    this.baseDir = baseDir;
    this.ensureDirectoryExists(baseDir);
  }

  async ensureDirectoryExists(directory) {
    try {
      await fs.access(directory);
    } catch {
      await fs.mkdir(directory, { recursive: true });
    }
  }

  async writeFile(content, extension = 'json') {
    const filename = `${uuidv4()}.${extension}`;
    const filePath = path.join(this.baseDir, filename);
    
    if (typeof content === 'object') {
      await fs.writeFile(filePath, JSON.stringify(content, null, 2));
    } else {
      await fs.writeFile(filePath, content);
    }
    
    return { filename, filePath };
  }

  async readFile(filename) {
    const filePath = path.join(this.baseDir, filename);
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  }

  async readJsonFile(filename) {
    const content = await this.readFile(filename);
    return JSON.parse(content);
  }

  async deleteFile(filename) {
    const filePath = path.join(this.baseDir, filename);
    await fs.unlink(filePath);
  }
}
```

### 4. Implement API Route Handlers

```javascript
// routes/analysis.js
import { Router } from 'express';
import { analysisController } from '../controllers/index.js';
import { validateAnalysisRequest } from '../middleware/validation.js';

const router = Router();

router.post('/visual', validateAnalysisRequest, analysisController.analyzeVisualElements);

export default router;
```

```javascript
// controllers/analysis.js
import { executeVisualPipeline } from '../pipelines/visual-pipeline.js';
import { Logger } from '../utils/logger.js';
import { FileUtils } from '../utils/file-utils.js';

const fileUtils = new FileUtils('./data/analysis');

export const analysisController = {
  async analyzeVisualElements(req, res, next) {
    try {
      const { page, osVersions } = req.body;
      
      // Validate input
      if (!page || !page.states || !Array.isArray(page.states)) {
        return res.status(400).json({ error: 'Invalid page data' });
      }
      
      // Store input for processing
      const { filename } = await fileUtils.writeFile(page, 'json');
      
      // Process with pipeline
      Logger.log(`Starting visual analysis for job ${filename}`);
      const result = await executeVisualPipeline(page, osVersions);
      
      // Store result
      const outputFilename = `${filename.split('.')[0]}_result.json`;
      await fileUtils.writeFile(result, outputFilename);
      
      res.json({
        jobId: filename.split('.')[0],
        elementsCount: result.length,
        result
      });
    } catch (error) {
      Logger.error('Error in visual analysis', error);
      next(error);
    }
  }
};
```

### 5. Implement Request Validation Middleware

```javascript
// middleware/validation.js
import { z } from 'zod';

const stateSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  versions: z.record(z.object({
    screenShot: z.string(),
    pageSource: z.string()
  }))
});

const pageSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  states: z.array(stateSchema)
});

const analysisRequestSchema = z.object({
  page: pageSchema,
  osVersions: z.array(z.string()).default(['ios', 'android'])
});

export const validateAnalysisRequest = (req, res, next) => {
  try {
    const validatedData = analysisRequestSchema.parse(req.body);
    // Replace request body with validated data
    req.body = validatedData;
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Validation error',
      details: error.errors
    });
  }
};
```

### 6. Implement Authentication

```javascript
// middleware/auth.js
import jwt from 'jsonwebtoken';

const API_KEYS = process.env.API_KEYS?.split(',') || [];
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

export const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || !API_KEYS.includes(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
};

export const authenticateJwt = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### 7. Implement Configuration System

```javascript
// config.js
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

export const CONFIG = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },
  ai: {
    model: process.env.AI_MODEL || 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_API_BASE_URL
  },
  storage: {
    baseDir: process.env.STORAGE_DIR || path.join(process.cwd(), 'data')
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    apiKeys: process.env.API_KEYS?.split(',') || []
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'ai-service.log'
  }
};
```

### 8. Modify AI Service for Server Context

```javascript
// services/ai-service.js
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { CONFIG } from '../config.js';
import { createOsSpecifVisualElementSchema, createXpathLocatorSchema } from '../schemas/index.js';
import { Logger } from '../utils/logger.js';
import { createXpathRepairSchema } from "../schemas/xpath-repair-schema.js";

export class AIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: CONFIG.ai.apiKey,
      baseURL: CONFIG.ai.baseUrl,
    });
  }

  async analyzeVisualElements(model, prompt, possibleStateIds, n = 3, temperature = 0) {
    try {
      Logger.log(`Calling ${model} for visual element analysis`);
      return await this.client.chat.completions.create({
        model,
        messages: [prompt],
        temperature,
        n,
        top_p: 0.1,
        response_format: zodResponseFormat(createOsSpecifVisualElementSchema(possibleStateIds), "VisualPageAnalysis"),
      });
    } catch (error) {
      Logger.error(`Error calling ${model}:`, error);
      throw error;
    }
  }

  // Other methods similarly modified...
}
```

### 9. Implement Job Queue for Long-Running Tasks

```javascript
// services/job-queue.js
import Queue from 'bull';
import { CONFIG } from '../config.js';
import { Logger } from '../utils/logger.js';

// Create Redis connection
const redisConfig = {
  host: CONFIG.redis.host || 'localhost',
  port: CONFIG.redis.port || 6379,
  password: CONFIG.redis.password
};

// Create queues for different job types
const analysisQueue = new Queue('visual-analysis', { redis: redisConfig });
const xpathQueue = new Queue('xpath-generation', { redis: redisConfig });
const repairQueue = new Queue('xpath-repair', { redis: redisConfig });
const codeQueue = new Queue('code-generation', { redis: redisConfig });

// Process visual analysis jobs
analysisQueue.process(async (job) => {
  try {
    Logger.log(`Processing visual analysis job ${job.id}`);
    const { page, osVersions } = job.data;
    
    // Update job progress
    job.progress(10);
    
    // Execute pipeline
    const pipeline = await import('../pipelines/visual-pipeline.js');
    const result = await pipeline.executeVisualPipeline(page, osVersions);
    
    job.progress(100);
    return result;
  } catch (error) {
    Logger.error(`Error processing analysis job ${job.id}:`, error);
    throw error;
  }
});

// Similar processors for other job types...

export const JobQueue = {
  // Add a visual analysis job to the queue
  async addAnalysisJob(page, osVersions) {
    const job = await analysisQueue.add({
      page,
      osVersions
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });
    
    Logger.log(`Added visual analysis job ${job.id} to queue`);
    return job.id;
  },
  
  // Check status of a job
  async getJobStatus(jobId, jobType = 'visual-analysis') {
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
        finished: job.finishedOn
      }
    };
  }
};
```

## Configuration and Environment Setup

### Environment Variables

Create a `.env` file with the following variables:

```
# Server configuration
PORT=3000
HOST=localhost

# AI service configuration
OPENAI_API_KEY=your_api_key_here
OPENAI_API_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4

# Security
JWT_SECRET=your_jwt_secret_here
API_KEYS=key1,key2,key3

# Redis for job queue
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Storage
STORAGE_DIR=./data

# Logging
LOG_LEVEL=info
LOG_FILE=ai-service.log
```

### Directory Structure

```
/ai-backend/
├── data/               # Stored files
│   ├── analysis/       # Analysis inputs and results
│   ├── uploads/        # Temporary file uploads
│   └── exports/        # Generated files for download
├── src/
│   ├── server.js       # Main entry point
│   ├── config.js       # Configuration
│   ├── services/       # Core services
│   ├── pipelines/      # AI pipelines
│   ├── routes/         # API routes
│   ├── controllers/    # Route handlers
│   ├── middleware/     # Express middleware
│   ├── utils/          # Utility functions
│   └── schemas/        # Data validation schemas
├── .env                # Environment variables
├── package.json        # Dependencies
└── README.md           # Documentation
```

## Docker Deployment

Create a `Dockerfile` for containerization:

```dockerfile
FROM node:18-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create data directory with proper permissions
RUN mkdir -p /app/data/analysis /app/data/uploads /app/data/exports && \
    chown -R node:node /app/data

# Use non-root user
USER node

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Start application
CMD ["node", "src/server.js"]
```

Create a `docker-compose.yml` for local development:

```yaml
version: '3.8'

services:
  ai-backend:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    env_file:
      - .env
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
```

## Performance Optimizations

### 1. Caching

Implement caching for expensive operations:

```javascript
import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: 600, // 10 minutes
  checkperiod: 120 // 2 minutes
});

export const cacheMiddleware = (req, res, next) => {
  const key = req.originalUrl;
  const cachedResponse = cache.get(key);
  
  if (cachedResponse) {
    return res.json(cachedResponse);
  }
  
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    cache.set(key, body);
    return originalJson(body);
  };
  
  next();
};
```

### 2. Rate Limiting

Implement rate limiting to prevent abuse:

```javascript
import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later.'
  }
});
```

### 3. Compression

Enable response compression:

```javascript
import compression from 'compression';

app.use(compression());
```

## Monitoring and Diagnostics

### 1. Implement Health Check Endpoint

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'up',
    version: process.env.npm_package_version,
    uptime: process.uptime()
  });
});
```

### 2. Structured Logging

Enhance the logger with structured metadata:

```javascript
logger.log({
  level: 'info',
  message: 'API request received',
  endpoint: req.originalUrl,
  method: req.method,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  requestId: req.id
});
```

### 3. Error Tracking

Implement comprehensive error tracking:

```javascript
import Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

app.use(Sentry.Handlers.requestHandler());

// Routes go here

app.use(Sentry.Handlers.errorHandler());

// Regular error handler after Sentry's
```

## Security Considerations

### 1. Input Validation

Thoroughly validate all inputs using Zod schemas.

### 2. Rate Limiting

Implement rate limiting based on API key to prevent abuse.

### 3. Content Security

Sanitize and validate XML and other untrusted content.

### 4. Secure Headers

Use Helmet to set secure HTTP headers:

```javascript
import helmet from 'helmet';

app.use(helmet());
```

### 5. HTTPS

Force HTTPS in production:

```javascript
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```