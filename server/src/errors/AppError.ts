import type { ErrorCode } from '@shared/api';

/**
 * HTTP 상태 코드와 오류 코드를 담은 에러
 *
 * service·repository 는 Express 를 모르므로 res.status() 를 쓸 수 없다.
 * 대신 이 에러를 던지면 errorHandler 가 계획안 §35 응답으로 변환한다.
 *
 * code 를 message 보다 앞에 둔 이유가 있다.
 * 뒤에 두고 선택 인자로 만들면 코드를 빠뜨린 곳이 조용히 남는다.
 * ErrorCode 유니온이라 이 자리에 한글 문구를 넣으면 컴파일이 막힌다.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
