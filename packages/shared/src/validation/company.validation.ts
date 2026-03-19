import { z } from 'zod';
import { addressSchema } from './common.validation';

export const companySetupSchema = z.object({
  companyName: z.string().min(1).max(255),
  legalName: z.string().max(255).optional(),
  industry: z.string().min(1),
  address: addressSchema,
  phone: z.string().max(20).optional(),
  email: z.string().email(),
  website: z.string().url().optional(),
});

export const accountingPreferencesSchema = z.object({
  fiscalYearStartMonth: z.number().int().min(1).max(12),
  accountingMethod: z.enum(['cash', 'accrual']),
  homeCurrency: z.string().length(3),
  dateFormat: z.string().min(1),
  numberFormat: z.object({
    thousandSeparator: z.string().max(1),
    decimalSeparator: z.string().max(1),
  }),
});

export const tenantSettingsSchema = z.object({
  enforceMfa: z.boolean().optional(),
  idleTimeout: z.number().int().min(5).max(120).optional(),
  invoicePrefix: z.string().max(10).optional(),
  estimatePrefix: z.string().max(10).optional(),
  defaultPaymentTerms: z.string().optional(),
  lateFeeEnabled: z.boolean().optional(),
  lateFeeType: z.enum(['percentage', 'fixed']).optional(),
  lateFeeAmount: z.string().optional(),
  lateFeeGracePeriod: z.number().int().min(0).optional(),
  reminderEnabled: z.boolean().optional(),
  reminderSchedule: z.array(z.number().int()).optional(),
  enableClasses: z.boolean().optional(),
  enableLocations: z.boolean().optional(),
  enableProjects: z.boolean().optional(),
  enableTimeTracking: z.boolean().optional(),
  enableInventory: z.boolean().optional(),
  enableBudgets: z.boolean().optional(),
  enableMultiCurrency: z.boolean().optional(),
  enablePurchaseOrders: z.boolean().optional(),
});
