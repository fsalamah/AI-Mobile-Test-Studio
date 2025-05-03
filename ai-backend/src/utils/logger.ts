import winston from 'winston';
import { CONFIG } from '../config/index.js';

// Create log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${stack ? '\n' + stack : ''}`;
  })
);

// Create console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `[${timestamp}] ${level}: ${message} ${stack ? '\n' + stack : ''}`;
  })
);

// Create transports
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// Add file transport in production
if (CONFIG.server.env === 'production') {
  transports.push(
    new winston.transports.File({
      filename: CONFIG.logging.file,
      format: logFormat,
    })
  );
}

// Create logger
const winstonLogger = winston.createLogger({
  level: CONFIG.logging.level,
  levels: winston.config.npm.levels,
  transports,
  exitOnError: false,
});

// Export logger
export class Logger {
  static debug(message: string, meta?: Record<string, unknown>): void {
    winstonLogger.debug(message, meta);
  }

  static info(message: string, meta?: Record<string, unknown>): void {
    winstonLogger.info(message, meta);
  }

  static warn(message: string, meta?: Record<string, unknown>): void {
    winstonLogger.warn(message, meta);
  }

  static error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    if (error instanceof Error) {
      winstonLogger.error(`${message}: ${error.message}`, {
        ...meta,
        stack: error.stack,
      });
    } else {
      winstonLogger.error(`${message}: ${error}`, meta);
    }
  }

  static http(message: string): void {
    winstonLogger.http(message);
  }
}