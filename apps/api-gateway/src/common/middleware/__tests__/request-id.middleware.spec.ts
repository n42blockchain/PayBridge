import { RequestIdMiddleware, REQUEST_ID_HEADER, CORRELATION_ID_HEADER, RequestWithId } from '../request-id.middleware';
import { Response, NextFunction } from 'express';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let mockRequest: Partial<RequestWithId>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should generate request ID if not provided', () => {
    middleware.use(
      mockRequest as RequestWithId,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockRequest.requestId).toBeDefined();
    expect(mockRequest.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should use existing request ID from header', () => {
    const existingId = 'existing-request-id';
    mockRequest.headers = { [REQUEST_ID_HEADER]: existingId };

    middleware.use(
      mockRequest as RequestWithId,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockRequest.requestId).toBe(existingId);
  });

  it('should use request ID as correlation ID if not provided', () => {
    middleware.use(
      mockRequest as RequestWithId,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockRequest.correlationId).toBe(mockRequest.requestId);
  });

  it('should use existing correlation ID from header', () => {
    const existingCorrelationId = 'existing-correlation-id';
    mockRequest.headers = { [CORRELATION_ID_HEADER]: existingCorrelationId };

    middleware.use(
      mockRequest as RequestWithId,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockRequest.correlationId).toBe(existingCorrelationId);
  });

  it('should set response headers', () => {
    middleware.use(
      mockRequest as RequestWithId,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      REQUEST_ID_HEADER,
      mockRequest.requestId,
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      mockRequest.correlationId,
    );
  });

  it('should call next function', () => {
    middleware.use(
      mockRequest as RequestWithId,
      mockResponse as Response,
      nextFunction,
    );

    expect(nextFunction).toHaveBeenCalled();
  });
});
