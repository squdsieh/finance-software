import { Router } from 'express';
import { CompanyController } from './company.controller';
import { authenticate } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const controller = new CompanyController();
export const companyRouter = Router();

companyRouter.use(authenticate);
companyRouter.use(requireTenant);

companyRouter.get('/', controller.getCompany);
companyRouter.put('/', controller.updateCompany);
companyRouter.put('/settings', controller.updateSettings);
companyRouter.get('/onboarding', controller.getOnboardingStatus);
companyRouter.put('/onboarding/:step', controller.completeOnboardingStep);
companyRouter.post('/logo', controller.uploadLogo);
