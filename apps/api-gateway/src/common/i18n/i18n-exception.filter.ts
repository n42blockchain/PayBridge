import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nContext, I18nService } from 'nestjs-i18n';

type TranslationRecord = Record<string, unknown>;

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    timestamp: number;
    path: string;
    requestId?: string;
  };
}

/**
 * HTTP Exception filter with i18n support
 * Translates error messages based on request language
 */
@Injectable()
@Catch()
export class I18nExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(I18nExceptionFilter.name);

  constructor(private readonly i18n: I18nService<TranslationRecord>) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = this.getCodeFromStatus(status);
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        code = (responseObj.code as string) || this.getCodeFromStatus(status);
        message = (responseObj.message as string) || message;
        details = responseObj.details as Record<string, unknown>;

        // Handle class-validator errors
        if (Array.isArray(responseObj.message)) {
          code = 'VALIDATION_ERROR';
          message = this.translateError(code, request);
          details = { errors: responseObj.message };
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    }

    // Try to translate the error code
    const translatedMessage = this.translateError(code, request);
    if (translatedMessage !== code) {
      message = translatedMessage;
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      meta: {
        timestamp: Date.now(),
        path: request.url,
        requestId: request.headers['x-request-id'] as string,
      },
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Translate error code to localized message
   */
  private translateError(code: string, request: Request): string {
    try {
      // Get language from I18nContext or fall back to header/query
      const i18nContext = I18nContext.current();
      const lang =
        i18nContext?.lang ||
        (request.headers['x-language'] as string) ||
        (request.query['lang'] as string) ||
        'en';

      const translated = this.i18n.translate(`errors.${code}`, { lang });

      // If translation returns the key, it wasn't found
      if (translated === `errors.${code}`) {
        return code;
      }

      return translated;
    } catch {
      return code;
    }
  }

  private getCodeFromStatus(status: number): string {
    const statusCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };

    return statusCodeMap[status] || 'INTERNAL_ERROR';
  }
}
