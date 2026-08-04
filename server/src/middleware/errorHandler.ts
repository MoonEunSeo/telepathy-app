import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { AppError } from '../errors/AppError';
import type { ApiError, ErrorCode } from '@shared/api';

/**
 * 인자가 4개여야 Express 가 에러 핸들러로 인식한다
 * _next 를 쓰지 않아도 지우면 안 되는 이유다
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // §35 는 requestId 를 필수 필드로 정의한다.
  // requestId 미들웨어를 거치지 않은 경로에서도 형식을 지키기 위해 여기서 보충한다.
  const requestId = req.requestId ?? randomUUID();

  if (err instanceof AppError) {
    // 4xx 는 정상적인 거절이라 로그를 남기지 않는다.
    // 남기면 잘못된 비밀번호 입력 같은 일상적인 실패가 오류 로그를 채워
    // 진짜 장애가 묻힌다.
    if (err.status >= 500) {
      console.error(`❌ [${requestId}] ${err.code}: ${err.message}`);
    }
    res.status(err.status).json(build(err.code, err.message, requestId));
    return;
  }

  // 의도하지 않은 에러 (내부 사정을 밖으로 노출하지 않는다.)
  console.error(`❌ [${requestId}] 처리되지 않은 오류:`, err);
  res.status(500).json(build('INTERNAL_ERROR', '서버 오류가 발생했습니다.', requestId));
}

function build(code: ErrorCode, message: string, requestId: string): ApiError {
  return {
    success: false,
    error: { code, message, requestId },
    // 과도기 — 레거시 프론트가 최상위 message 를 읽는다 (shared/api.ts 참조)
    message,
  };
}
