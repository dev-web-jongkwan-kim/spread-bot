import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  private readonly SENSITIVE_FIELDS = [
    'password',
    'token',
    'authorization',
    'auth',
    'secret',
    'api_key',
    'apiKey',
    'access_token',
    'refresh_token',
    'hash',
    'telegramBotToken',
    'jwtSecret',
  ];

  private filterSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const filtered = Array.isArray(data) ? [...data] : { ...data };

    for (const key in filtered) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.SENSITIVE_FIELDS.some(field =>
        lowerKey.includes(field.toLowerCase())
      );

      if (isSensitive) {
        filtered[key] = '[REDACTED]';
      } else if (typeof filtered[key] === 'object' && filtered[key] !== null) {
        filtered[key] = this.filterSensitiveData(filtered[key]);
      }
    }

    return filtered;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: string | object = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.message;
    }

    // Log error
    const errorLog = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: exception instanceof Error ? exception.stack : String(exception),
    };

    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Send to Sentry for server errors
    if (status >= 500 && process.env.SENTRY_DSN) {
      Sentry.captureException(exception, {
        tags: {
          path: request.url,
          method: request.method,
        },
        extra: {
          body: this.filterSensitiveData(request.body),
          query: this.filterSensitiveData(request.query),
          params: this.filterSensitiveData(request.params),
        },
      });
    }

    // Don't expose internal errors in production
    const isProduction = process.env.APP_ENV === 'production';
    const responseError = status >= 500 && isProduction
      ? 'Internal server error'
      : error;

    response.status(status).json({
      statusCode: status,
      timestamp: errorLog.timestamp,
      path: request.url,
      message,
      ...(isProduction ? {} : { error: responseError }),
    });
  }
}

