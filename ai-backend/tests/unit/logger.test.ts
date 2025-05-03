import { Logger } from '../../src/utils/logger.js';
import winston from 'winston';

// Mock winston
jest.mock('winston', () => {
  const mFormat = {
    combine: jest.fn().mockReturnThis(),
    timestamp: jest.fn().mockReturnThis(),
    errors: jest.fn().mockReturnThis(),
    printf: jest.fn().mockReturnThis(),
    colorize: jest.fn().mockReturnThis(),
  };
  
  const mTransports = {
    Console: jest.fn(),
    File: jest.fn(),
  };
  
  const mLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    http: jest.fn(),
  };
  
  return {
    format: mFormat,
    transports: mTransports,
    createLogger: jest.fn().mockReturnValue(mLogger),
    config: {
      npm: {
        levels: {
          error: 0,
          warn: 1,
          info: 2,
          http: 3,
          debug: 4,
        },
      },
    },
  };
});

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a logger with correct configuration', () => {
    // Trigger logger initialization by accessing a method
    Logger.info('test');
    
    // Verify createLogger was called
    expect(winston.createLogger).toHaveBeenCalled();
    
    // Verify format functions were called
    expect(winston.format.combine).toHaveBeenCalled();
    expect(winston.format.timestamp).toHaveBeenCalled();
    expect(winston.format.errors).toHaveBeenCalled();
    expect(winston.format.printf).toHaveBeenCalled();
    
    // Verify Console transport was created
    expect(winston.transports.Console).toHaveBeenCalled();
  });

  it('should log messages at different levels', () => {
    // Get mock logger instance
    const mockLogger = (winston.createLogger as jest.Mock).mock.results[0].value;
    
    // Call logger methods
    Logger.debug('debug message');
    Logger.info('info message');
    Logger.warn('warn message');
    Logger.error('error message');
    Logger.http('http message');
    
    // Verify logger methods were called with correct messages
    expect(mockLogger.debug).toHaveBeenCalledWith('debug message', undefined);
    expect(mockLogger.info).toHaveBeenCalledWith('info message', undefined);
    expect(mockLogger.warn).toHaveBeenCalledWith('warn message', undefined);
    expect(mockLogger.http).toHaveBeenCalledWith('http message');
  });

  it('should handle errors correctly', () => {
    // Get mock logger instance
    const mockLogger = (winston.createLogger as jest.Mock).mock.results[0].value;
    
    // Create test error
    const testError = new Error('test error');
    testError.stack = 'Error: test error\n    at test.js:1:1';
    
    // Call error method with Error object
    Logger.error('error occurred', testError);
    
    // Verify error logger was called with correct format
    expect(mockLogger.error).toHaveBeenCalledWith('error occurred: test error', {
      stack: 'Error: test error\n    at test.js:1:1',
    });
  });

  it('should handle non-Error objects in error method', () => {
    // Get mock logger instance
    const mockLogger = (winston.createLogger as jest.Mock).mock.results[0].value;
    
    // Call error method with string
    Logger.error('error occurred', 'string error');
    
    // Verify error logger was called with string format
    expect(mockLogger.error).toHaveBeenCalledWith('error occurred: string error', undefined);
  });

  it('should accept metadata in log methods', () => {
    // Get mock logger instance
    const mockLogger = (winston.createLogger as jest.Mock).mock.results[0].value;
    
    // Create test metadata
    const metadata = { userId: '123', action: 'test' };
    
    // Call logger methods with metadata
    Logger.debug('debug message', metadata);
    Logger.info('info message', metadata);
    Logger.warn('warn message', metadata);
    
    // Verify logger methods were called with metadata
    expect(mockLogger.debug).toHaveBeenCalledWith('debug message', metadata);
    expect(mockLogger.info).toHaveBeenCalledWith('info message', metadata);
    expect(mockLogger.warn).toHaveBeenCalledWith('warn message', metadata);
  });
});