// server/src/middleware/auth.ts
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

// req.user 타입은 server/src/types/express.d.ts 에서 전역 확장됨
function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token; // 쿠키에서 토큰 읽기
  if (!token) {
    res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    // ✅ req.user 에 user_id, username 저장
    req.user = typeof decoded === 'string' ? { username: decoded } : decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다' });
  }
}

export default authMiddleware;
