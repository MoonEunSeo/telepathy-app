import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../errors/AppError';

/**
 * 스키마로 req.body 를 검사하는 미들웨어를 생성한다.
 *
 * 통과하면 req.body 를 "파싱한 값"으로 교체한다.
 * trim 등 스키마의 변환이 이후 계층에 반영되게 하기 위함이다.
 */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // safeParse는 예외를 던지지 않고 { success, data } 또는 { success, error }를 돌려줍니다
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // 첫 번째 문제만 알린다.
      // (문제를 전부 나열하면 공격자에게 스키마를 알려주는 것이기 때문)
      const message = result.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.';
      next(new AppError(400, 'VALIDATION_FAILED', message));
      return;
    }

    req.body = result.data;
    next();
  };
}
