import { z } from 'zod';
import { addressSchema } from './common.validation';

export const createCustomerSchema = z.object({
  displayName: z.string().min(1).max(255),
  companyName: z.string().max(255).optional(),
  title: z.string().max(50).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  mobile: z.string().max(20).optional(),
  fax: z.string().max(20).optional(),
  website: z.string().url().max(255).optional().or(z.literal('')),
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
  taxRegistrationNumber: z.string().max(50).optional(),
  paymentTerms: z.enum(['due_on_receipt', 'net_15', 'net_30', 'net_60', 'net_90', 'custom']).default('net_30'),
  customPaymentDays: z.number().int().min(1).max(365).optional(),
  preferredPaymentMethod: z.enum(['cash', 'check', 'credit_card', 'bank_transfer', 'ach', 'paypal', 'other']).optional(),
  preferredDeliveryMethod: z.enum(['email', 'print', 'none']).default('email'),
  openingBalance: z.string().default('0'),
  openingBalanceDate: z.string().optional(),
  notes: z.string().max(5000).optional(),
  parentCustomerId: z.string().uuid().optional(),
  customFields: z.record(z.string()).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();
