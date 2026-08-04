import { createHmac } from 'node:crypto';
import type { Request } from 'express';

/**
 * IP 를 그대로 저장하지 않는다. 개인을 식별할 수 있는 값이다.
 *
 * bcrypt 가 아니라 HMAC 인 이유 — 여기서는 대조가 아니라 "같은 IP 를 세는" 것이 목적이라
 * 같은 입력이 항상 같은 값이어야 한다. bcrypt 는 salt 때문에 매번 달라져 셀 수 없다.
 * 맨 SHA-256 은 IPv4 43억 개를 전수 대입해 역산되므로 서버 비밀키를 섞는다.
 *
 * ⚠️ app.ts 에 `app.set('trust proxy', 1)` 이 걸려 있어야 실제 클라이언트 IP 가 온다.
 * 걸지 않으면 Render 프록시의 IP 하나로 전부 묶여, IP 제한이 서비스 전체 한도가 된다.
 */
export function hashClientIp(req: Request): string {
  const secret = process.env.IP_HASH_SECRET;
  if (!secret) throw new Error('환경변수 IP_HASH_SECRET 가 없습니다.');

  const ip = req.ip ?? 'unknown';
  return createHmac('sha256', secret).update(ip).digest('hex');
}
