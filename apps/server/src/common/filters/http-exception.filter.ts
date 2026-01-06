import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../utils/error-code.enum';
import { BusinessException } from './business.exception';

/**
 * 全局异常过滤器
 * 统一处理所有异常，返回标准格式
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let code: number;
    let message: string;
    let httpStatus: number;

    if (exception instanceof BusinessException) {
      // 业务异常
      const exceptionResponse = exception.getResponse() as {
        code: number;
        message: string;
      };
      code = exceptionResponse.code;
      message = exceptionResponse.message;
      httpStatus = HttpStatus.OK;
    } else if (exception instanceof HttpException) {
      // HTTP异常
      httpStatus = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message =
          (responseObj['message'] as string) ||
          (Array.isArray(responseObj['message'])
            ? (responseObj['message'] as string[]).join(', ')
            : exception.message);
        code = (responseObj['code'] as number) || httpStatus;
      } else {
        message = exception.message;
        code = httpStatus;
      }
    } else if (exception instanceof Error) {
      // 系统错误
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      code = ErrorCode.SERVER_ERROR;
      message = '服务器内部错误';

      // 记录错误日志
      this.logger.error(
        `${request.method} ${request.url} - ${exception.message}`,
        exception.stack,
      );
    } else {
      // 未知错误
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      code = ErrorCode.SERVER_ERROR;
      message = '未知错误';

      this.logger.error(`${request.method} ${request.url} - 未知错误`, String(exception));
    }

    response.status(httpStatus).json({
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
