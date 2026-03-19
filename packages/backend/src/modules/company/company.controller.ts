import { Response } from 'express';
import { CompanyService } from './company.service';
import { asyncHandler } from '../../utils/async-handler';
import { AuthRequest } from '../../middleware/auth';

const service = new CompanyService();

export class CompanyController {
  getCompany = asyncHandler(async (req: AuthRequest, res: Response) => {
    const company = await service.getCompany(req.user!.tenantId);
    res.json({ success: true, data: company });
  });

  updateCompany = asyncHandler(async (req: AuthRequest, res: Response) => {
    const company = await service.updateCompany(req.user!.tenantId, req.body);
    res.json({ success: true, data: company });
  });

  updateSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const settings = await service.updateSettings(req.user!.tenantId, req.body);
    res.json({ success: true, data: settings });
  });

  getOnboardingStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const status = await service.getOnboardingStatus(req.user!.tenantId);
    res.json({ success: true, data: status });
  });

  completeOnboardingStep = asyncHandler(async (req: AuthRequest, res: Response) => {
    const step = parseInt(req.params.step, 10);
    await service.completeOnboardingStep(req.user!.tenantId, step, req.body);
    res.json({ success: true, data: { message: 'Step completed' } });
  });

  uploadLogo = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json({ success: true, data: { message: 'Logo upload endpoint' } });
  });
}
