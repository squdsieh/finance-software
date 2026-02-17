import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';

export class CompanyService {
  private db = getDatabase();

  async getCompany(tenantId: string) {
    const tenant = await this.db('public.tenants').where({ id: tenantId }).first();
    if (!tenant) {
      throw new AppError('Company not found', 404, 'NOT_FOUND');
    }

    return {
      id: tenant.id,
      companyName: tenant.company_name,
      legalName: tenant.legal_name,
      industry: tenant.industry,
      address: tenant.address,
      phone: tenant.phone,
      email: tenant.email,
      website: tenant.website,
      logoUrl: tenant.logo_url,
      fiscalYearStartMonth: tenant.fiscal_year_start_month,
      accountingMethod: tenant.accounting_method,
      homeCurrency: tenant.home_currency,
      dateFormat: tenant.date_format,
      numberFormat: tenant.number_format,
      taxRegistrationNumber: tenant.tax_registration_number,
      onboardingCompleted: tenant.onboarding_completed,
      onboardingStep: tenant.onboarding_step,
      settings: tenant.settings,
    };
  }

  async updateCompany(tenantId: string, data: Record<string, any>) {
    const updates: Record<string, any> = { updated_at: new Date() };

    const fieldMap: Record<string, string> = {
      companyName: 'company_name',
      legalName: 'legal_name',
      industry: 'industry',
      address: 'address',
      phone: 'phone',
      email: 'email',
      website: 'website',
      fiscalYearStartMonth: 'fiscal_year_start_month',
      accountingMethod: 'accounting_method',
      homeCurrency: 'home_currency',
      dateFormat: 'date_format',
      numberFormat: 'number_format',
      taxRegistrationNumber: 'tax_registration_number',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        updates[dbField] = typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key];
      }
    }

    await this.db('public.tenants').where({ id: tenantId }).update(updates);
    return this.getCompany(tenantId);
  }

  async updateSettings(tenantId: string, newSettings: Record<string, any>) {
    const tenant = await this.db('public.tenants').where({ id: tenantId }).first();
    const currentSettings = tenant.settings || {};
    const merged = { ...currentSettings, ...newSettings };

    await this.db('public.tenants').where({ id: tenantId }).update({
      settings: JSON.stringify(merged),
      updated_at: new Date(),
    });

    return merged;
  }

  async getOnboardingStatus(tenantId: string) {
    const tenant = await this.db('public.tenants').where({ id: tenantId }).first();
    const steps = [
      { step: 1, name: 'Company Information', completed: tenant.onboarding_step >= 1 },
      { step: 2, name: 'Accounting Preferences', completed: tenant.onboarding_step >= 2 },
      { step: 3, name: 'Chart of Accounts', completed: tenant.onboarding_step >= 3 },
      { step: 4, name: 'Bank Account Connection', completed: tenant.onboarding_step >= 4 },
      { step: 5, name: 'Data Import', completed: tenant.onboarding_step >= 5 },
      { step: 6, name: 'Invoice Customization', completed: tenant.onboarding_step >= 6 },
      { step: 7, name: 'Tax Setup', completed: tenant.onboarding_step >= 7 },
      { step: 8, name: 'Team Invitations', completed: tenant.onboarding_step >= 8 },
      { step: 9, name: 'Module Selection', completed: tenant.onboarding_step >= 9 },
      { step: 10, name: 'Interactive Tour', completed: tenant.onboarding_step >= 10 },
    ];

    return {
      currentStep: tenant.onboarding_step,
      completed: tenant.onboarding_completed,
      steps,
    };
  }

  async completeOnboardingStep(tenantId: string, step: number, _data: Record<string, any>) {
    const tenant = await this.db('public.tenants').where({ id: tenantId }).first();
    const newStep = Math.max(tenant.onboarding_step, step);
    const completed = newStep >= 10;

    await this.db('public.tenants').where({ id: tenantId }).update({
      onboarding_step: newStep,
      onboarding_completed: completed,
      updated_at: new Date(),
    });
  }
}
