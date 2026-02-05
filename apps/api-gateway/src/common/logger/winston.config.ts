import * as winston from 'winston';
import 'winston-daily-rotate-file';

/**
 * Create Winston logger configuration
 * In production: JSON format with file rotation
 * In development: Colorized console output
 */
export function createWinstonConfig(isProduction: boolean): winston.LoggerOptions {
  const transports: winston.transport[] = [];

  // Console transport (always enabled)
  if (isProduction) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    );
  } else {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            const contextStr = context ? `[${context}] ` : '';
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} ${level} ${contextStr}${message}${metaStr}`;
          }),
        ),
      }),
    );
  }

  // File transport with daily rotation (production only)
  if (isProduction) {
    // Application logs
    transports.push(
      new winston.transports.DailyRotateFile({
        filename: 'logs/app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '100m',
        maxFiles: '30d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    );

    // Error logs (separate file for easy filtering)
    transports.push(
      new winston.transports.DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '100m',
        maxFiles: '30d',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    );
  }

  return {
    level: isProduction ? 'info' : 'debug',
    transports,
  };
}

/**
 * Create a Winston logger instance
 */
export function createWinstonLogger(isProduction: boolean): winston.Logger {
  return winston.createLogger(createWinstonConfig(isProduction));
}
