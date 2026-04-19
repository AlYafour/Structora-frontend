/**
 * Centralized logging service
 * Replaces all console statements with proper logging
 */

const isDev = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

/**
 * Logger service
 * - In development: logs to console
 * - In production: only errors are logged
 * - Can be extended to send logs to external service
 */
export const logger = {
  /**
   * Log informational messages (dev only)
   */
  log: (...args) => {
    if (isDev) {
      console.log('[LOG]', ...args);
    }
  },

  /**
   * Log errors (always logged)
   */
  error: (...args) => {
    console.error('[ERROR]', ...args);
    
    // In production, could send to error tracking service
    if (isProduction) {
      // Example: Send to Sentry, LogRocket, etc.
      // errorTrackingService.captureException(...args);
    }
  },

  /**
   * Log warnings (dev only)
   */
  warn: (...args) => {
    if (isDev) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Log debug messages (dev only)
   */
  debug: (...args) => {
    if (isDev) {
      console.debug('[DEBUG]', ...args);
    }
  },

  /**
   * Log grouped messages (dev only)
   */
  group: (label, callback) => {
    if (isDev) {
      console.group(label);
      callback();
      console.groupEnd();
    } else {
      callback();
    }
  },

  /**
   * Log collapsed group (dev only)
   */
  groupCollapsed: (label, callback) => {
    if (isDev) {
      console.groupCollapsed(label);
      callback();
      console.groupEnd();
    } else {
      callback();
    }
  },
};

export default logger;
