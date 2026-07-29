/**
 * HTTP 상태 코드를 담은 에러
 *
 * service·repository 는 Express 를 모르므로 res.status() 를 쓸 수 없다.
 * 대신 이 에러를 던지면 errorHandler 가 상태 코드로 변환한다
 *
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    (super(message), (this.name = 'AppError'));
  }
}
