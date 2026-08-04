import type { Response } from 'express';
import type { ApiSuccess } from '@shared/api';

/**
 * 성공 응답을 계획안 §35 형태로 내린다.
 *
 * 제네릭에 응답 계약 타입을 넣는다 — `sendOk<LoginResponse>(res, 200, null)`.
 * data 인자가 그 계약의 payload 로 좁혀지므로, 컨트롤러가 계약과 다른 값을 넣으면
 * 컴파일이 막힌다. 전환 전 `satisfies LoginResponse` 가 하던 역할이다.
 *
 * message 는 §35 에 없는 과도기 필드다. 레거시 프론트가 최상위 message 를 읽고 있어
 * 지금 빼면 화면이 한꺼번에 깨진다. 각 화면이 새 형태로 옮겨가면 제거한다.
 *
 * 헬퍼로 감싸는 이유가 그 제거다. 과도기 필드를 컨트롤러마다 손으로 넣으면
 * 걷어낼 때 빠뜨린 곳이 남는다. 지울 자리가 한 곳이어야 한다.
 */
export function sendOk<R extends ApiSuccess<unknown>>(
  res: Response,
  status: number,
  data: R['data'],
  message?: string,
): void {
  const body: ApiSuccess<R['data']> = { success: true, data };
  if (message !== undefined) body.message = message;
  res.status(status).json(body);
}
