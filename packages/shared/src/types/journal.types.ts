import { BaseEntity, Attachment } from './common.types';

export interface JournalEntry extends BaseEntity {
  entryNumber: string;
  date: string;
  lines: JournalEntryLine[];
  memo?: string;
  attachments: Attachment[];
  isAdjusting: boolean;
  isReversing: boolean;
  reversingDate?: string;
  reversedEntryId?: string;
  recurringTemplateId?: string;
  sourceType?: 'manual' | 'invoice' | 'bill' | 'payment' | 'payroll' | 'expense' | 'transfer' | 'adjustment';
  sourceId?: string;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountName?: string;
  debitAmount: string;
  creditAmount: string;
  description?: string;
  customerId?: string;
  vendorId?: string;
  classId?: string;
  locationId?: string;
  projectId?: string;
  sortOrder: number;
}
