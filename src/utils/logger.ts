/**
 * Logger utility using Winston
 * Supports configurable log levels via LOG_LEVEL environment variable
 */

import winston from 'winston';

// Define log level from environment variable or default to 'info'
const logLevel = process.env.LOG_LEVEL || 'info';

/**
 * Safe JSON stringify that handles circular references
 */
const safeStringify = (obj: any) => {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular]';
      }
      cache.add(value);
    }
    // Handle Error objects specifically so we get their message/stack
    if (value instanceof Error) {
      const errorObj: any = {
        message: value.message,
        stack: value.stack,
      };
      // Copy other enumerable properties
      Object.getOwnPropertyNames(value).forEach(prop => {
        if (prop !== 'message' && prop !== 'stack') {
          errorObj[prop] = (value as any)[prop];
        }
      });
      return errorObj;
    }
    return value;
  }, 2);
};

// Define custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Include additional metadata if present
    if (Object.keys(meta).length > 0) {
      try {
        // Use safe stringify for meta objects
        msg += ` ${safeStringify(meta)}`;
      } catch (e) {
        msg += ` [Metadata serialization failed]`;
      }
    }

    return msg;
  })
);

// Create the logger instance
const logger = winston.createLogger({
  level: logLevel,
  levels: winston.config.npm.levels,
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Export the logger
export default logger;
