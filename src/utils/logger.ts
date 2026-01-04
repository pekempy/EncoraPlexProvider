/**
 * Logger utility using Winston
 * Supports configurable log levels via LOG_LEVEL environment variable
 */

import winston from 'winston';

// Define log level from environment variable or default to 'info'
const logLevel = process.env.LOG_LEVEL || 'info';

// Define custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Include additional metadata if present
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
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
