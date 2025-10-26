import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(typeof message === 'string' ? { message } : message),
    };

    // Log error
    if (status >= 500) {
      this.logger.error(
        `Internal Server Error: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
        exception instanceof Error ? exception.stack : undefined,
        'HttpExceptionFilter',
      );
    } else {
      this.logger.warn(
        `HTTP ${status} Error: ${request.method} ${request.url}`,
        'HttpExceptionFilter',
      );
    }

    response.status(status).json(errorResponse);
  }
}
