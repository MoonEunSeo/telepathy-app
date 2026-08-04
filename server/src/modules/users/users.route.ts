import express from 'express';
import { validateBody } from '../../middleware/validate';
import { errorHandler } from '../../middleware/errorHandler';
import { requireMember } from '../../middleware/auth';
import { setNicknameSchema } from './users.schema';
import * as usersController from './users.controller';

const router = express.Router();

// 레거시와 같은 경로다 (app.ts 가 /api/nickname 으로 마운트했다).
// 마운트를 교체할 때 URL 이 그대로여야 프론트 라우팅을 건드리지 않는다.
//
// ! 다만 /profile 은 응답 모양이 바뀐다 — 레거시는 최상위, V2 는 data 안이다.
//   마운트 교체 시 프론트 4곳을 함께 고쳐야 한다 (shared/api.ts 참조).
//
// TEL-26 에서 /api/user/* 가 이 모듈로 합류하면 접두사를 정리한다.
router.post(
  '/set-nickname',
  requireMember,
  validateBody(setNicknameSchema),
  usersController.setNickname,
);
router.get('/profile', requireMember, usersController.getProfile);

router.use(errorHandler);

export default router;
