import express from 'express';
import { validateBody } from '../../middleware/validate';
import { errorHandler } from '../../middleware/errorHandler';
import { sendCodeSchema, verifyCodeSchema } from './phone.schema';
import * as phoneController from './phone.controller';

const router = express.Router();

// 둘 다 비로그인 경로다. 본인 확인이 아직 성립하지 않은 단계이기 때문이다.
// 남용 방어는 인증이 아니라 발송 제한(번호·IP)이 맡는다.
router.post('/send', validateBody(sendCodeSchema), phoneController.sendCode);
router.post('/verify', validateBody(verifyCodeSchema), phoneController.verifyCode);

router.use(errorHandler);

export default router;
