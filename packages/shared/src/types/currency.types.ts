import { BaseEntity } from './common.types';

export interface Currency extends BaseEntity {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isHomeCurrency: boolean;
  isActive: boolean;
  latestRate: string;
  lastUpdated: string;
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  effectiveDate: string;
  source: 'api' | 'manual';
}

export interface CurrencyRevaluation extends BaseEntity {
  date: string;
  currencyCode: string;
  exchangeRate: string;
  unrealizedGainLoss: string;
  journalEntryId: string;
  status: 'draft' | 'posted';
}
