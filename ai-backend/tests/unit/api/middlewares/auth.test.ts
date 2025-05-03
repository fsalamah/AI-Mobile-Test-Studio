import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateApiKey, authenticateJWT } from '../../../../src/api/middlewares/auth.js';
import { CONFIG } from '../../../../src/config/index.js';

// Mock config
jest.mock('../../../../src/config/index.js', () => ({
  CONFIG: {
    server: {
      env: 'test',
    },
    security: {
      apiKeys: ['valid-key-1', 'valid-key-2'],
      jwtSecret: 'test-secret',
    },
  },
}));

// Mock logger
jest.mock('../../../../src/utils/logger.js', () => ({
  Logger: {
    warn: jest.fn(),
  },
}));

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

describe('Authentication middleware', () => {
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
      headers: {},
    };
    
    res = {
      status: statusMock,
      json: jsonMock,
    };
    
    next = jest.fn();
  });

  describe('authenticateApiKey', () => {
    it('should call next if API key is valid', () => {
      // Set valid API key
      req.headers = { 'x-api-key': 'valid-key-1' };
      
      // Call middleware
      authenticateApiKey(req as Request, res as Response, next);
      
      // Check next was called
      expect(next).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 401 if API key is missing', () => {
      // Call middleware with no API key
      authenticateApiKey(req as Request, res as Response, next);
      
      // Check response
      expect(next).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'API key is required',
          code: 'UNAUTHORIZED',
        },
      });
    });

    it('should return 401 if API key is invalid', () => {
      // Set invalid API key
      req.headers = { 'x-api-key': 'invalid-key' };
      
      // Call middleware
      authenticateApiKey(req as Request, res as Response, next);
      
      // Check response
      expect(next).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid API key',
          code: 'UNAUTHORIZED',
        },
      });
    });

    it('should allow requests in development mode with no API keys configured', () => {
      // Mock development environment with no API keys
      const originalConfig = { ...CONFIG };
      (CONFIG.server as any).env = 'development';
      (CONFIG.security as any).apiKeys = [];
      
      // Call middleware
      authenticateApiKey(req as Request, res as Response, next);
      
      // Check next was called
      expect(next).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
      
      // Restore original config
      Object.assign(CONFIG, originalConfig);
    });
  });

  describe('authenticateJWT', () => {
    it('should call next with decoded user if token is valid', () => {
      // Set valid authorization header
      req.headers = { authorization: 'Bearer valid-token' };
      
      // Mock jwt.verify to return decoded user
      const decodedUser = { id: '123', email: 'test@example.com' };
      (jwt.verify as jest.Mock).mockReturnValue(decodedUser);
      
      // Call middleware
      authenticateJWT(req as Request, res as Response, next);
      
      // Check jwt.verify was called correctly
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      
      // Check user was added to request
      expect((req as any).user).toEqual(decodedUser);
      
      // Check next was called
      expect(next).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header is missing', () => {
      // Call middleware with no authorization header
      authenticateJWT(req as Request, res as Response, next);
      
      // Check response
      expect(next).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Authorization header is required',
          code: 'UNAUTHORIZED',
        },
      });
    });

    it('should return 401 if token is missing from authorization header', () => {
      // Set authorization header without token
      req.headers = { authorization: 'Bearer ' };
      
      // Call middleware
      authenticateJWT(req as Request, res as Response, next);
      
      // Check response
      expect(next).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Bearer token is required',
          code: 'UNAUTHORIZED',
        },
      });
    });

    it('should return 401 if token verification fails', () => {
      // Set authorization header with invalid token
      req.headers = { authorization: 'Bearer invalid-token' };
      
      // Mock jwt.verify to throw error
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Call middleware
      authenticateJWT(req as Request, res as Response, next);
      
      // Check response
      expect(next).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid token',
          code: 'UNAUTHORIZED',
        },
      });
    });
  });
});