import { BaseEntity } from './common.types';

export interface TimeEntry extends BaseEntity {
  employeeId: string;
  employeeName: string;
  customerId?: string;
  projectId?: string;
  serviceItemId?: string;
  date: string;
  hours: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  isBillable: boolean;
  billableRate?: string;
  costRate?: string;
  isInvoiced: boolean;
  invoiceId?: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  timesheetId?: string;
}

export interface Timesheet extends BaseEntity {
  employeeId: string;
  employeeName: string;
  weekStartDate: string;
  weekEndDate: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  totalHours: string;
  billableHours: string;
  nonBillableHours: string;
  entries: TimeEntry[];
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
}

export interface Timer {
  id: string;
  userId: string;
  customerId?: string;
  projectId?: string;
  serviceItemId?: string;
  description?: string;
  isBillable: boolean;
  startedAt: string;
  pausedAt?: string;
  totalPausedSeconds: number;
  isRunning: boolean;
}
