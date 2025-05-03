/**
 * Notification Manager - Centralize and deduplicate notifications
 * 
 * This singleton manager ensures we don't show duplicate notifications
 * by tracking recent notifications and implementing a cooldown period.
 */

// Store for recent notifications to prevent duplicates
const recentNotifications = new Map();

// Global notification manager
const notificationManager = {
  /**
   * Show success notification if not recently shown
   * @param {string} message - Message to show
   * @param {number} duration - Duration in seconds
   * @param {object} antd - Antd message API
   */
  success(message, antdMessage, duration = 2) {
    // Generate a key based on the message
    const key = `success:${message}`;
    
    // Check if we've shown this notification recently
    if (this._shouldSuppress(key)) {
      console.log(`🔇 SUPPRESSED duplicate notification: ${message}`);
      return;
    }
    
    // Show the notification and record it
    console.log(`🔔 NOTIFICATION: ${message}`);
    antdMessage.success(message, duration);
    this._recordNotification(key);
  },
  
  /**
   * Show error notification if not recently shown
   * @param {string} message - Message to show
   * @param {number} duration - Duration in seconds
   * @param {object} antd - Antd message API
   */
  error(message, antdMessage, duration = 2) {
    // Generate a key based on the message
    const key = `error:${message}`;
    
    // Check if we've shown this notification recently
    if (this._shouldSuppress(key)) {
      console.log(`🔇 SUPPRESSED duplicate notification: ${message}`);
      return;
    }
    
    // Show the notification and record it
    console.log(`🔔 NOTIFICATION: ${message}`);
    antdMessage.error(message, duration);
    this._recordNotification(key);
  },
  
  /**
   * Show warning notification if not recently shown
   * @param {string} message - Message to show
   * @param {number} duration - Duration in seconds
   * @param {object} antd - Antd message API
   */
  warning(message, antdMessage, duration = 2) {
    // Generate a key based on the message
    const key = `warning:${message}`;
    
    // Check if we've shown this notification recently
    if (this._shouldSuppress(key)) {
      console.log(`🔇 SUPPRESSED duplicate notification: ${message}`);
      return;
    }
    
    // Show the notification and record it
    console.log(`🔔 NOTIFICATION: ${message}`);
    antdMessage.warning(message, duration);
    this._recordNotification(key);
  },
  
  /**
   * Reset all notification tracking - use when changing context
   */
  resetAll() {
    recentNotifications.clear();
  },
  
  /**
   * Check if a notification should be suppressed (internal)
   * @param {string} key - Notification key
   * @returns {boolean} - True if should suppress
   * @private
   */
  _shouldSuppress(key) {
    const now = Date.now();
    const lastShown = recentNotifications.get(key);
    
    // Suppress if shown in the last 3 seconds
    return lastShown && (now - lastShown) < 3000;
  },
  
  /**
   * Record that a notification was shown (internal)
   * @param {string} key - Notification key
   * @private
   */
  _recordNotification(key) {
    recentNotifications.set(key, Date.now());
    
    // Clean up old notifications
    this._cleanupOldNotifications();
  },
  
  /**
   * Remove expired notification records (internal)
   * @private
   */
  _cleanupOldNotifications() {
    const now = Date.now();
    
    // Remove entries older than 1 minute
    for (const [key, timestamp] of recentNotifications.entries()) {
      if (now - timestamp > 60000) {
        recentNotifications.delete(key);
      }
    }
  }
};

export default notificationManager;