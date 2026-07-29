import express from 'express';
import { validateBody } from '../../middleware/validate';
import { errorHandler } from '../../middleware/errorHandler';
import { loginSchema } from './auth.schema';
import * as authController from './auth.controller';

const router = express.Router();

router.post('/login', validateBody(loginSchema), authController.login);

// 임시 앱 전역 에러 핸들러가 아직 없어 이 라우터에만 붙인다.
// 모듈이 늘어나면 app.ts 맨 끝으로 옮긴다.
router.use(errorHandler);

export default router;
