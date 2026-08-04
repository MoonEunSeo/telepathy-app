// server/src/types/express.d.ts
// Express Request 객체에 auth 미들웨어가 주입하는 user 필드를 전역 확장합니다.
import 'express';
import { SessionUser } from '../middleware/auth';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      // middleware/requestId 가 넣는다. 오류 응답과 서버 로그를 잇는 값이다.
      // 미들웨어를 거치지 않는 경로가 있으므로 선택 필드다 — errorHandler 가 보충한다.
      requestId?: string;
    }
  }
}
