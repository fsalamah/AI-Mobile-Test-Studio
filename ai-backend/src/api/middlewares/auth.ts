import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../../config/index.js';
import { Logger } from '../../utils/logger.js';

// API key authentication middleware
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  // Skip authentication in development mode if no API keys configured
  if (CONFIG.server.env === 'development' && CONFIG.security.apiKeys.length === 0) {
    Logger.warn('Running without API key authentication in development mode');
    return next();
  }

  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'API key is required',
        code: 'UNAUTHORIZED',
      },
    });
  }

  if (!CONFIG.security.apiKeys.includes(apiKey)) {
    Logger.warn(`Invalid API key attempt: ${apiKey.substring(0, 8)}...`);
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid API key',
        code: 'UNAUTHORIZED',
      },
    });
  }

  next();
};

// JWT authentication middleware
export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authorization header is required',
        code: 'UNAUTHORIZED',
      },
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Bearer token is required',
        code: 'UNAUTHORIZED',
      },
    });
  }

  try {
    const decoded = jwt.verify(token, CONFIG.security.jwtSecret);
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token',
        code: 'UNAUTHORIZED',
      },
    });
  }
};