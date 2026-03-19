import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authRateLimiter } from '../../middleware/rate-limiter';
import { authenticate } from '../../middleware/auth';
import { loginSchema, registerSchema, resetPasswordSchema, changePasswordSchema } from '@cloudbooks/shared';

const controller = new AuthController();

export const authRouter = Router();

// Public endpoints
authRouter.post('/register', authRateLimiter, validate(registerSchema), controller.register);
authRouter.post('/login', authRateLimiter, validate(loginSchema), controller.login);
authRouter.post('/refresh-token', controller.refreshToken);
authRouter.post('/forgot-password', authRateLimiter, controller.forgotPassword);
authRouter.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword);
authRouter.get('/verify-email/:token', controller.verifyEmail);

// Protected endpoints
authRouter.use(authenticate);
authRouter.get('/me', controller.getCurrentUser);
authRouter.put('/profile', controller.updateProfile);
authRouter.post('/change-password', validate(changePasswordSchema), controller.changePassword);
authRouter.post('/mfa/enable', controller.enableMfa);
authRouter.post('/mfa/verify', controller.verifyMfa);
authRouter.post('/mfa/disable', controller.disableMfa);
authRouter.get('/sessions', controller.getSessions);
authRouter.delete('/sessions/:id', controller.revokeSession);
authRouter.post('/logout', controller.logout);
authRouter.post('/invite', controller.inviteUser);
