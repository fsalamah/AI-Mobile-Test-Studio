export class Logger {
  static subscribers = [];

  static log(message) {
    const logObject = {
      type: 'log',
      message: message,
      timestamp: new Date().toISOString(),
    };
    console.log(`[${logObject.timestamp}] ${logObject.message}`);
    this.notifySubscribers(logObject);
  }

  static error(message, err) {
    const logObject = {
      type: 'error',
      message: message,
      error: err,
      timestamp: new Date().toISOString(),
    };
    console.error(`[${logObject.timestamp}] ERROR: ${logObject.message}`, err);
    this.notifySubscribers(logObject);
  }

  static subscribe(callback) {
    this.subscribers.push(callback);
  }

  static unsubscribe(callback) {
    this.subscribers = this.subscribers.filter(subscriber => subscriber !== callback);
  }

  static notifySubscribers(logObject) {
    this.subscribers.forEach(callback => callback(logObject));
  }
}