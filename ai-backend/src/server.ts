import { app } from './app.js';
import { CONFIG } from './config/index.js';
import { Logger } from './utils/logger.js';

const port = CONFIG.server.port || 3000;
const host = CONFIG.server.host || 'localhost';

const server = app.listen(port, () => {
  Logger.info(`AI Backend Service running on http://${host}:${port}`);
  Logger.info(`API Documentation available at http://${host}:${port}/api-docs`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  Logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    Logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  Logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    Logger.info('Server closed');
    process.exit(0);
  });
});

export { server };