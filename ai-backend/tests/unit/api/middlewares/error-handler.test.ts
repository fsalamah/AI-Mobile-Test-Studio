import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../../../src/api/middlewares/error-handler.js';
import { ApiError } from '../../../../src/types/api.js';
import { CONFIG } from '../../../../src/config/index.js';
import { Logger } from '../../../../src/utils/logger.js';

// Mock config
jest.mock('../../../../src/config/index.js', () => ({
  CONFIG: {
    server: {
      env: 'test',
    },
  },
}));

// Mock logger
jest.mock('../../../../src/utils/logger.js', () => ({
  Logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Error handler middleware', () => {
  // Set up request, response, and next function mocks
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    // Create mocks
    req = {
      method: 'GET',
      path: '/test',
    };
    
    res = {
      status: statusMock,
      json: jsonMock,
    };
    
    next = jest.fn();
    
    // Clear logger mocks
    jest.clearAllMocks();
  });

  it('should handle standard Error objects', () => {
    // Create test error
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n    at test.js:1:1';
    
    // Call error handler
    errorHandler(error, req as Request, res as Response, next);
    
    // Check response
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Test error',
        code: 'INTERNAL_ERROR',
        stack: 'Error: Test error\n    at test.js:1:1',
      },
    });
    
    // Check logger
    expect(Logger.error).toHaveBeenCalledWith('GET /test - 500 Test error', error);
  });

  it('should handle ApiError objects with custom status code', () => {
    // Create test API error
    const error: ApiError = {
      name: 'ApiError',
      message: 'Validation failed',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: { field: 'username', issue: 'required' },
    };
    
    // Call error handler
    errorHandler(error, req as Request, res as Response, next);
    
    // Check response
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { field: 'username', issue: 'required' },
        stack: undefined,
      },
    });
    
    // Check logger
    expect(Logger.warn).toHaveBeenCalledWith('GET /test - 400 Validation failed');
  });

  it('should use different logging levels based on status code', () => {
    // Create test client error (4xx)
    const clientError: ApiError = {
      name: 'ApiError',
      message: 'Not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    };
    
    // Call error handler with client error
    errorHandler(clientError, req as Request, res as Response, next);
    
    // Check logger for client error
    expect(Logger.warn).toHaveBeenCalledWith('GET /test - 404 Not found');
    expect(Logger.error).not.toHaveBeenCalled();
    
    // Create test server error (5xx)
    const serverError: ApiError = {
      name: 'ApiError',
      message: 'Database error',
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
    };
    
    // Call error handler with server error
    errorHandler(serverError, req as Request, res as Response, next);
    
    // Check logger for server error
    expect(Logger.error).toHaveBeenCalledWith('GET /test - 503 Database error', serverError);
  });

  it('should include stack trace in development mode only', () => {
    // Create test error
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n    at test.js:1:1';
    
    // Test in development mode
    const originalEnv = CONFIG.server.env;
    (CONFIG.server as any).env = 'development';
    
    // Call error handler
    errorHandler(error, req as Request, res as Response, next);
    
    // Check stack trace is included
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Test error',
        code: 'INTERNAL_ERROR',
        stack: 'Error: Test error\n    at test.js:1:1',
      },
    });
    
    // Test in production mode
    (CONFIG.server as any).env = 'production';
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Call error handler
    errorHandler(error, req as Request, res as Response, next);
    
    // Check stack trace is excluded
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Test error',
        code: 'INTERNAL_ERROR',
        stack: undefined,
      },
    });
    
    // Restore original environment
    (CONFIG.server as any).env = originalEnv;
  });
});