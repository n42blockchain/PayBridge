import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  requestId?: string;
  correlationId?: string;
  userId?: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Structured logger service for JSON logging
 * Suitable for log aggregation tools like ELK, Datadog, etc.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLoggerService implements LoggerService {
  private context?: string;
  private requestId?: string;
  private correlationId?: string;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = configService.get('NODE_ENV') === 'production';
  }

  /**
   * Set the context for this logger instance
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Set request ID for tracing
   */
  setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  /**
   * Set correlation ID for distributed tracing
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Log a message
   */
  log(message: string, context?: string): void;
  log(message: string, data?: Record<string, unknown>, context?: string): void;
  log(
    message: string,
    dataOrContext?: Record<string, unknown> | string,
    context?: string,
  ): void {
    const { data, ctx } = this.parseArgs(dataOrContext, context);
    this.writeLog(LogLevel.INFO, message, ctx, data);
  }

  /**
   * Log an error
   */
  error(message: string, trace?: string, context?: string): void;
  error(
    message: string,
    error?: Error | Record<string, unknown>,
    context?: string,
  ): void;
  error(
    message: string,
    errorOrTrace?: Error | Record<string, unknown> | string,
    context?: string,
  ): void {
    let errorInfo: LogEntry['error'];
    let data: Record<string, unknown> | undefined;

    if (errorOrTrace instanceof Error) {
      errorInfo = {
        name: errorOrTrace.name,
        message: errorOrTrace.message,
        stack: errorOrTrace.stack,
      };
    } else if (typeof errorOrTrace === 'string') {
      errorInfo = {
        name: 'Error',
        message: message,
        stack: errorOrTrace,
      };
    } else if (errorOrTrace && typeof errorOrTrace === 'object') {
      data = errorOrTrace;
    }

    this.writeLog(LogLevel.ERROR, message, context, data, errorInfo);
  }

  /**
   * Log a warning
   */
  warn(message: string, context?: string): void;
  warn(message: string, data?: Record<string, unknown>, context?: string): void;
  warn(
    message: string,
    dataOrContext?: Record<string, unknown> | string,
    context?: string,
  ): void {
    const { data, ctx } = this.parseArgs(dataOrContext, context);
    this.writeLog(LogLevel.WARN, message, ctx, data);
  }

  /**
   * Log debug information
   */
  debug(message: string, context?: string): void;
  debug(message: string, data?: Record<string, unknown>, context?: string): void;
  debug(
    message: string,
    dataOrContext?: Record<string, unknown> | string,
    context?: string,
  ): void {
    const { data, ctx } = this.parseArgs(dataOrContext, context);
    this.writeLog(LogLevel.DEBUG, message, ctx, data);
  }

  /**
   * Log verbose information
   */
  verbose(message: string, context?: string): void;
  verbose(message: string, data?: Record<string, unknown>, context?: string): void;
  verbose(
    message: string,
    dataOrContext?: Record<string, unknown> | string,
    context?: string,
  ): void {
    const { data, ctx } = this.parseArgs(dataOrContext, context);
    this.writeLog(LogLevel.VERBOSE, message, ctx, data);
  }

  /**
   * Parse arguments to extract data and context
   */
  private parseArgs(
    dataOrContext?: Record<string, unknown> | string,
    context?: string,
  ): { data?: Record<string, unknown>; ctx?: string } {
    if (typeof dataOrContext === 'string') {
      return { ctx: dataOrContext };
    }
    return { data: dataOrContext, ctx: context };
  }

  /**
   * Write structured log entry
   */
  private writeLog(
    level: LogLevel,
    message: string,
    context?: string,
    data?: Record<string, unknown>,
    error?: LogEntry['error'],
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ?? this.context,
      requestId: this.requestId,
      correlationId: this.correlationId,
      data,
      error,
    };

    // Remove undefined fields
    const cleanEntry = Object.fromEntries(
      Object.entries(entry).filter(([, value]) => value !== undefined),
    );

    if (this.isProduction) {
      // JSON output for production (log aggregation)
      console.log(JSON.stringify(cleanEntry));
    } else {
      // Pretty output for development
      this.prettyPrint(cleanEntry as LogEntry);
    }
  }

  /**
   * Pretty print for development
   */
  private prettyPrint(entry: LogEntry): void {
    const levelColors: Record<LogLevel, string> = {
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.VERBOSE]: '\x1b[37m', // White
    };
    const reset = '\x1b[0m';
    const color = levelColors[entry.level] || reset;

    const parts = [
      `${color}[${entry.level.toUpperCase()}]${reset}`,
      entry.context ? `[${entry.context}]` : '',
      entry.message,
    ].filter(Boolean);

    console.log(parts.join(' '));

    if (entry.data) {
      console.log('  Data:', JSON.stringify(entry.data, null, 2));
    }

    if (entry.error) {
      console.log(`  ${color}Error: ${entry.error.message}${reset}`);
      if (entry.error.stack) {
        console.log(`  ${entry.error.stack}`);
      }
    }
  }
}
