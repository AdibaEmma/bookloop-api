import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import * as Sentry from '@sentry/nestjs';

export class ResponseObject {
  @ApiProperty({
    type: Boolean,
    description: 'status of response',
    example: true,
  })
  status: boolean;

  @ApiProperty({
    type: String,
    description: 'Path of request',
    example: '/v1/auth/login',
  })
  path: string;

  @ApiProperty({
    type: Number,
    description: 'Status of request',
    example: 200,
  })
  statusCode: number;

  @ApiProperty()
  result: any;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((res: unknown) => this.responseHandler(res, context)),
      catchError((err: HttpException) =>
        throwError(() => this.errorHandler(err, context)),
      ),
    );
  }

  errorHandler(exception: HttpException, context: ExecutionContext) {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const logger = new Logger('ResponseInterceptor');

    // Log the full error internally for debugging
    logger.error(`Exception: ${exception.message}`, exception.stack);

    // Send error to Sentry with additional context
    Sentry.withScope((scope) => {
      scope.setTag('interceptor', 'response');
      scope.setLevel('error');
      scope.setContext('http', {
        method: request.method,
        url: request.url,
        status_code: status,
        user_agent: request.headers['user-agent'],
      });

      // Add user context if available
      if (request.user) {
        scope.setUser({
          id: request.user.userId,
          email: request.user.email,
        });
      }

      Sentry.captureException(exception);
    });

    // Prepare safe error message for client
    let message = 'An error occurred';
    let errorDetails: any = undefined;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        message = (exceptionResponse as any).message || exception.message;
        // Only include validation errors, not full exception details
        if ((exceptionResponse as any).errors) {
          errorDetails = (exceptionResponse as any).errors;
        }
      }
    } else if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      // Don't expose internal error details to client
      message = 'Internal server error';
    }

    const errorResponse: any = {
      status: false,
      statusCode: status,
      path: request.url,
      message: message,
    };

    if (errorDetails) {
      errorResponse.errors = errorDetails;
    }

    response.status(status).json(errorResponse);
  }

  responseHandler(res: any, context: ExecutionContext) {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const statusCode = response.statusCode;

    return {
      status: true,
      path: request.url,
      statusCode,
      result: res,
    };
  }
}
