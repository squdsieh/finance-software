import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';

const authService = new AuthService();

export class AuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body, req.ip || 'unknown', req.headers['user-agent'] || '');
    res.json({ success: true, data: result });
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);
    res.json({ success: true, data: result });
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    res.json({ success: true, data: { message: 'If the email exists, a reset link has been sent' } });
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ success: true, data: { message: 'Password reset successfully' } });
  });

  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    await authService.verifyEmail(req.params.token);
    res.json({ success: true, data: { message: 'Email verified successfully' } });
  });

  getCurrentUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await authService.getCurrentUser(req.user!.userId);
    res.json({ success: true, data: user });
  });

  updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await authService.updateProfile(req.user!.userId, req.body);
    res.json({ success: true, data: user });
  });

  changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    await authService.changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword);
    res.json({ success: true, data: { message: 'Password changed successfully' } });
  });

  enableMfa = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await authService.enableMfa(req.user!.userId);
    res.json({ success: true, data: result });
  });

  verifyMfa = asyncHandler(async (req: AuthRequest, res: Response) => {
    await authService.verifyMfa(req.user!.userId, req.body.code);
    res.json({ success: true, data: { message: 'MFA enabled successfully' } });
  });

  disableMfa = asyncHandler(async (req: AuthRequest, res: Response) => {
    await authService.disableMfa(req.user!.userId, req.body.code);
    res.json({ success: true, data: { message: 'MFA disabled' } });
  });

  getSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const sessions = await authService.getSessions(req.user!.userId);
    res.json({ success: true, data: sessions });
  });

  revokeSession = asyncHandler(async (req: AuthRequest, res: Response) => {
    await authService.revokeSession(req.user!.userId, req.params.id);
    res.json({ success: true, data: { message: 'Session revoked' } });
  });

  logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    const refreshToken = req.body.refreshToken;
    if (refreshToken) {
      await authService.logout(req.user!.userId, refreshToken);
    }
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  });

  inviteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await authService.inviteUser(
      req.user!.tenantId,
      req.user!.userId,
      req.body,
    );
    res.status(201).json({ success: true, data: result });
  });
}
