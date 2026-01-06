import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorMessage } from '../utils/error-code.enum';

/**
 * 业务异常类
 * 用于业务逻辑错误的统一处理
 */
export class BusinessException extends HttpException {
  private readonly errorCode: number;

  constructor(code: ErrorCode, message?: string) {
    const errorMessage = message || ErrorMessage[code] || '未知错误';
    super(
      {
        code,
        message: errorMessage,
      },
      HttpStatus.OK, // 业务异常返回200，通过code区分
    );
    this.errorCode = code;
  }

  getErrorCode(): number {
    return this.errorCode;
  }
}

/**
 * 快速创建业务异常的工厂方法
 */
export function throwBusiness(code: ErrorCode, message?: string): never {
  throw new BusinessException(code, message);
}
