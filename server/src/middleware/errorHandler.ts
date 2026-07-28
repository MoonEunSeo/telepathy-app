import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

/**
 * 인자가 4개여야 Express 가 에러 핸들러로 인식한다
 * _next 를 쓰지 않아도 지우면 안 되는 이유다
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ success: false, message: err.message });
    return;
  }

  // 의도하지 않은 에러 (내부 사정을 밖으로 노출하지 않는다.)
  console.error('❌ 처리되지 않은 오류:', err);
  res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
}
