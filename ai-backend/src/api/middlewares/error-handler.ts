import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger.js';
import { CONFIG } from '../../config/index.js';
import { ApiError } from '../../types/api.js';

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Get error details
  const status = 'statusCode' in err ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';
  const errorCode = 'code' in err ? err.code : 'INTERNAL_ERROR';
  const details = 'details' in err ? err.details : undefined;

  // Log the error
  const logMessage = `${req.method} ${req.path} - ${status} ${message}`;
  if (status >= 500) {
    Logger.error(logMessage, err);
  } else {
    Logger.warn(logMessage);
  }

  // Send error response
  res.status(status).json({
    success: false,
    error: {
      message,
      code: errorCode,
      details,
      stack: CONFIG.server.env === 'development' ? err.stack : undefined,
    },
  });
};