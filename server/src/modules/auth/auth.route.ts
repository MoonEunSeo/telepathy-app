import express from 'express';
import { validateBody } from '../../middleware/validate';
import { errorHandler } from '../../middleware/errorHandler';
import { requireMember } from '../../middleware/auth';
import {
  loginSchema,
  signupSchema,
  changePasswordSchema,
  resetPasswordSchema,
} from './auth.schema';
import * as authController from './auth.controller';

const router = express.Router();

router.post('/login', validateBody(loginSchema), authController.login);
router.post('/register', validateBody(signupSchema), authController.signup);

// 로그인 상태에서 바꾼다 -> 인증이 검증보다 먼저다.
// 순서가 바뀌면 비로그인 요청도 zod 검사를 통과한 뒤에야 막힌다.
router.patch(
  '/password',
  requireMember,
  validateBody(changePasswordSchema),
  authController.changePassword,
);

// 비로그인. 본인 확인은 ACCOUNT_RECOVERY 인증이 하고, 계정과의 결합은 RPC 가 한다.
router.post('/password/reset', validateBody(resetPasswordSchema), authController.resetPassword);

router.use(errorHandler);

export default router;
