import { BaseEntity } from './common.types';

export type ProjectStatus = 'in_progress' | 'completed' | 'cancelled' | 'on_hold';

export interface Project extends BaseEntity {
  name: string;
  customerId: string;
  customerName: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  budgetType?: 'revenue' | 'cost' | 'both';
  revenueBudget?: string;
  costBudget?: string;
  projectManagerId?: string;
  projectManagerName?: string;
  totalIncome: string;
  totalCosts: string;
  laborCosts: string;
  expenseCosts: string;
  grossProfit: string;
  profitMargin: string;
  templateId?: string;
}

export interface ProjectTemplate extends BaseEntity {
  name: string;
  description?: string;
  budgetType?: 'revenue' | 'cost' | 'both';
  defaultRevenueBudget?: string;
  defaultCostBudget?: string;
  tasks: ProjectTask[];
  milestones: ProjectMilestone[];
}

export interface ProjectTask {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
}

export interface ProjectMilestone {
  id: string;
  name: string;
  description?: string;
  targetDate?: string;
  sortOrder: number;
}
