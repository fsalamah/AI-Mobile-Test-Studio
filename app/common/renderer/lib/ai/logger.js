export class Logger {
  static log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
  
  static error(message, err) {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`, err);
  }
}