import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { OptimisticLockVersionMismatchError } from 'typeorm';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code: string | undefined;
    let errors: any = null;
    let lockoutSeconds: number | undefined;

    if (exception instanceof OptimisticLockVersionMismatchError) {
      status = HttpStatus.CONFLICT;
      message =
        'Dữ liệu đã được cập nhật bởi thao tác khác. Vui lòng tải lại trước khi thử lại.';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || exception.message;
        code = typeof resObj.code === 'string' ? resObj.code : undefined;
        lockoutSeconds = resObj.lockoutSeconds;
        errors =
          resObj.errors ||
          (Array.isArray(resObj.message) ? resObj.message : null);
        if (Array.isArray(resObj.message)) {
          message = resObj.message[0];
        }
      }
    } else if (exception instanceof Error) {
      message =
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : exception.message;
      this.logger.error(
        `Unhandled Exception at ${request.method} ${request.url}`,
        exception.stack,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      ...(code !== undefined ? { code } : {}),
      message,
      ...(lockoutSeconds !== undefined ? { lockoutSeconds } : {}),
      errors,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
