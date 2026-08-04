import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * 요청마다 고유 id 를 부여한다. 계획안 §35 의 ApiError.requestId 가 이 값이다.
 *
 * 목적은 "사용자가 말한 그 오류" 를 서버 로그에서 찾는 것이다.
 * 응답에만 넣고 로그에 남기지 않으면 아무 쓸모가 없다 — errorHandler 가 함께 출력한다.
 *
 * 클라이언트가 보낸 X-Request-Id 는 신뢰하지 않는다.
 * 위조하면 서로 다른 요청이 같은 id 로 묶여 추적이 무너진다.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = randomUUID();
  req.requestId = id;
  // 사용자가 오류 화면에서 확인하거나 문의에 첨부할 수 있도록 헤더로도 내린다.
  res.setHeader('X-Request-Id', id);
  next();
}
