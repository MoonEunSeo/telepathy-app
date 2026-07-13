// shared/api.ts
// REST API 요청/응답 DTO (client ↔ server 공유). ⚠️ 타입만.
// 라우트를 변환하면서 계속 추가해 나갑니다.

// POST /api/payments/verify
export interface PaymentVerifyRequest {
  imp_uid: string;
  userId: string;
  count: number;
  amount: number;
}

export interface PaymentVerifyResponse {
  success: boolean;
  message?: string;
}

// GET /api/auth/check
export interface AuthCheckResponse {
  loggedIn: boolean;
}
