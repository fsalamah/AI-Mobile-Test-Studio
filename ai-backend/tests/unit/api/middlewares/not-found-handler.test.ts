import { Request, Response } from 'express';
import { notFoundHandler } from '../../../../src/api/middlewares/not-found-handler.js';

describe('Not found handler middleware', () => {
  // Set up request and response mocks
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    // Create mocks
    req = {
      method: 'GET',
      path: '/nonexistent-route',
    };
    
    res = {
      status: statusMock,
      json: jsonMock,
    };
  });

  it('should return 404 status with route information', () => {
    // Call not found handler
    notFoundHandler(req as Request, res as Response);
    
    // Check response
    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Route not found: GET /nonexistent-route',
        code: 'NOT_FOUND',
      },
    });
  });

  it('should handle different HTTP methods', () => {
    // Test with POST method
    req.method = 'POST';
    
    // Call not found handler
    notFoundHandler(req as Request, res as Response);
    
    // Check response includes POST method
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Route not found: POST /nonexistent-route',
        code: 'NOT_FOUND',
      },
    });
  });

  it('should handle different paths', () => {
    // Test with different path
    req.path = '/api/unknown-endpoint';
    
    // Call not found handler
    notFoundHandler(req as Request, res as Response);
    
    // Check response includes correct path
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Route not found: GET /api/unknown-endpoint',
        code: 'NOT_FOUND',
      },
    });
  });
});