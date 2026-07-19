// server/src/middleware/auth.ts
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

// 게스트 기본 닉네임 (하드코딩 주입)
export const GUEST_NICKNAME = '익명의 사용자';

export interface SessionUser {
  user_id: string;
  username?: string;
  nickname?: string;
  role: 'member' | 'guest';
}

// 토큰 해석 - HTTP 미들웨어와 소켓 io.use가 공유
export function decodeToken(token?: string): SessionUser | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    if (typeof decoded !== 'object' || decoded === null) return null;

    // 하위 호환: role이 없는 기존 토큰은 member로 간주
    const role = decoded.role === 'guest' ? 'guest' : 'member';

    return role === 'guest'
      ? {
          user_id: decoded.user_id as string,
          nickname: (decoded.nickname as string) || GUEST_NICKNAME,
          role,
        }
      : {
          user_id: decoded.user_id as string,
          username: decoded.username as string,
          role,
        };
  } catch {
    return null;
  }
}

// 회원 전용 - 결제 / 확성기 / 마이페이지
export function requireMember(req: Request, res: Response, next: NextFunction): void {
  const user = decodeToken(req.cookies?.token);
  if (!user) {
    res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    return;
  }
  if (user.role !== 'member') {
    res.status(401).json({ success: false, message: '회원 전용 기능입니다' });
    return;
  }
  req.user = user;
  next();
}

// 회원 게스트 모두 - 신고 피드백
export function requireSession(req: Request, res: Response, next: NextFunction): void {
  const user = decodeToken(req.cookies?.token);
  if (!user) {
    res.status(401).json({ success: false, message: '세션이 필요합니다.' });
    return;
  }
  req.user = user;
  next();
}

export default requireMember;
