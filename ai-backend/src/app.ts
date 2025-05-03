import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { json, urlencoded } from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import { apiRouter } from './api/routes/index.js';
import { errorHandler } from './api/middlewares/error-handler.js';
import { notFoundHandler } from './api/middlewares/not-found-handler.js';
import { specs } from './api/docs/swagger.js';
import { Logger } from './utils/logger.js';

// Initialize Express app
const app = express();

// Apply middlewares
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(json({ limit: '50mb' })); // For large payloads (screenshots)
app.use(urlencoded({ extended: true, limit: '50mb' }));

// Setup request logging
const stream = {
  write: (message: string) => {
    Logger.http(message.trim());
  },
};

app.use(morgan('combined', { stream }));

// API routes
app.use('/api', apiRouter);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export { app };