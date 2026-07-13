// server/src/types/express.d.ts
// Express Request 객체에 auth 미들웨어가 주입하는 user 필드를 전역 확장합니다.
import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id?: string;
        username?: string;
        [key: string]: unknown;
      };
    }
  }
}
