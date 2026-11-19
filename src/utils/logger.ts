import config from 'config/env';
import winston from 'winston';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

const ENABLE_ERROR_FILE_LOGGING =false

// Custom format for console logging with colors
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }), // Log the full stack trace
  printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} ${level}: ${stack || message}`;
  })
);

// JSON format for file logging
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }), // Ensure stack trace is included
  json()
);

const transports: winston.transport[] = [
  // Console transport for development
  new winston.transports.Console({
    format: consoleFormat,
    level: 'debug',
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: config.LOG_FILE,
    format: fileFormat,
    level: 'info',
  }),
];

// Conditionally add error log file
if (ENABLE_ERROR_FILE_LOGGING) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      format: fileFormat,
      level: 'error',
    })
  );
}

const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// Create a stream object with a 'write' function that will be used by morgan
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
