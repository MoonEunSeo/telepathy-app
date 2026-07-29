import express from 'express';
import { validateBody } from '../../middleware/validate';
import { errorHandler } from '../../middleware/errorHandler';
import { loginSchema, signupSchema } from './auth.schema';
import * as authController from './auth.controller';

const router = express.Router();

router.post('/login', validateBody(loginSchema), authController.login);
router.post('/register', validateBody(signupSchema), authController.signup);

router.use(errorHandler);

export default router;
