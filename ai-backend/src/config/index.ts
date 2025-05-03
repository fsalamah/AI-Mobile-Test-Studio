import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

// Get directory name (ESM doesn't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration object
export const CONFIG = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development',
  },
  ai: {
    model: process.env.AI_MODEL || 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
    generation: {
      maxOutputTokens: parseInt(process.env.MAX_OUTPUT_TOKENS || '4096', 10),
      topP: parseFloat(process.env.TOP_P || '0.1'),
      temperature: parseFloat(process.env.TEMPERATURE || '0'),
      analysisRuns: parseInt(process.env.ANALYSIS_RUNS || '1', 10),
      xpathAnalysisRuns: parseInt(process.env.XPATH_ANALYSIS_RUNS || '1', 10),
    },
  },
  storage: {
    baseDir: process.env.STORAGE_DIR || path.join(process.cwd(), 'data'),
    tempDir: path.join(process.cwd(), 'data', 'temp'),
    uploadsDir: path.join(process.cwd(), 'data', 'uploads'),
    outputDir: path.join(process.cwd(), 'data', 'output'),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    apiKeys: (process.env.API_KEYS || '').split(',').filter(Boolean),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'ai-service.log',
  },
  defaultOs: process.env.DEFAULT_OS || 'ios',
  osVersions: (process.env.OS_VERSIONS || 'ios,android').split(',').filter(Boolean),
};