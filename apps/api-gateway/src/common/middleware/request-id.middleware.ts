import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Request ID header names
 */
export const REQUEST_ID_HEADER = 'x-request-id';
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Extended Request interface with request ID
 */
export interface RequestWithId extends Request {
  requestId: string;
  correlationId: string;
}

/**
 * Middleware to add request ID for distributed tracing
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    // Get or generate request ID
    const requestId = req.headers[REQUEST_ID_HEADER] as string || randomUUID();

    // Get or use request ID as correlation ID
    const correlationId = req.headers[CORRELATION_ID_HEADER] as string || requestId;

    // Attach to request object
    req.requestId = requestId;
    req.correlationId = correlationId;

    // Set response headers for tracing
    res.setHeader(REQUEST_ID_HEADER, requestId);
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    next();
  }
}

/**
 * Get request ID from request object
 */
export function getRequestId(req: Request): string | undefined {
  return (req as RequestWithId).requestId;
}

/**
 * Get correlation ID from request object
 */
export function getCorrelationId(req: Request): string | undefined {
  return (req as RequestWithId).correlationId;
}
