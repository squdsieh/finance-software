import { BaseEntity } from './common.types';

export type TaxType = 'sales_tax' | 'vat' | 'service_tax';

export interface TaxRate extends BaseEntity {
  name: string;
  rate: string;
  taxAgency: string;
  taxType: TaxType;
  effectiveDate: string;
  isCompound: boolean;
  isActive: boolean;
}

export interface TaxGroup extends BaseEntity {
  name: string;
  taxRateIds: string[];
  combinedRate: string;
  isActive: boolean;
}

export interface TaxExemption {
  entityType: 'customer' | 'product';
  entityId: string;
  exemptReasonCode: string;
  certificateNumber?: string;
  effectiveDate: string;
  expirationDate?: string;
}

export type VatCategory = 'standard' | 'reduced' | 'zero_rated' | 'exempt' | 'reverse_charge' | 'out_of_scope';

export interface VatReturn extends BaseEntity {
  periodStart: string;
  periodEnd: string;
  status: 'draft' | 'filed' | 'amended';
  outputTax: string;
  inputTax: string;
  netTax: string;
  standardRatedSales: string;
  zeroRatedSales: string;
  exemptSales: string;
  standardRatedPurchases: string;
  filedAt?: string;
  filedBy?: string;
  referenceNumber?: string;
}
