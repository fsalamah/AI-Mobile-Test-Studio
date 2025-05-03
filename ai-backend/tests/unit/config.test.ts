import { CONFIG } from '../../src/config/index.js';

describe('Configuration', () => {
  // Store original environment
  const originalEnv = process.env;

  // Mock environment variables before tests
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  // Restore original environment after tests
  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load default values when environment variables are not set', () => {
    // Clear environment variables that might affect tests
    delete process.env.PORT;
    delete process.env.HOST;
    delete process.env.AI_MODEL;
    
    // Test default values
    expect(CONFIG.server.port).toBe(3000);
    expect(CONFIG.server.host).toBe('localhost');
    expect(CONFIG.ai.model).toBe('gpt-4');
  });

  it('should use environment variables when provided', () => {
    // Set test environment variables
    process.env.PORT = '4000';
    process.env.HOST = 'test-host';
    process.env.AI_MODEL = 'test-model';
    process.env.OS_VERSIONS = 'ios,android,web';
    
    // Reload config module to pick up new environment variables
    jest.isolateModules(() => {
      const { CONFIG: newConfig } = require('../../src/config/index.js');
      
      // Test that environment variables are used
      expect(newConfig.server.port).toBe(4000);
      expect(newConfig.server.host).toBe('test-host');
      expect(newConfig.ai.model).toBe('test-model');
      expect(newConfig.osVersions).toEqual(['ios', 'android', 'web']);
    });
  });

  it('should parse numeric values correctly', () => {
    // Set test environment variables with numeric values
    process.env.PORT = '5000';
    process.env.MAX_OUTPUT_TOKENS = '2048';
    process.env.TOP_P = '0.5';
    process.env.TEMPERATURE = '0.7';
    
    // Reload config module
    jest.isolateModules(() => {
      const { CONFIG: newConfig } = require('../../src/config/index.js');
      
      // Test numeric parsing
      expect(newConfig.server.port).toBe(5000);
      expect(newConfig.ai.generation.maxOutputTokens).toBe(2048);
      expect(newConfig.ai.generation.topP).toBe(0.5);
      expect(newConfig.ai.generation.temperature).toBe(0.7);
    });
  });

  it('should parse array values correctly', () => {
    // Set test environment variables with array values
    process.env.API_KEYS = 'key1,key2,key3';
    process.env.OS_VERSIONS = 'ios,android';
    
    // Reload config module
    jest.isolateModules(() => {
      const { CONFIG: newConfig } = require('../../src/config/index.js');
      
      // Test array parsing
      expect(newConfig.security.apiKeys).toEqual(['key1', 'key2', 'key3']);
      expect(newConfig.osVersions).toEqual(['ios', 'android']);
    });
  });

  it('should handle empty array values correctly', () => {
    // Set empty array environment variable
    process.env.API_KEYS = '';
    
    // Reload config module
    jest.isolateModules(() => {
      const { CONFIG: newConfig } = require('../../src/config/index.js');
      
      // Test empty array handling
      expect(newConfig.security.apiKeys).toEqual([]);
    });
  });
});