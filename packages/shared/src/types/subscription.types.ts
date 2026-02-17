export type PlanTier = 'starter' | 'essentials' | 'plus' | 'advanced';

export interface SubscriptionPlan {
  id: string;
  tier: PlanTier;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  usersIncluded: number;
  features: Record<string, boolean>;
  limits: PlanLimits;
}

export interface PlanLimits {
  maxUsers: number;
  maxBankConnections: number;
  maxReports: number;
  hasInvoicing: boolean;
  hasExpenseTracking: boolean;
  hasBillManagement: boolean;
  hasTimeTracking: boolean;
  hasMultiCurrency: boolean;
  hasInventory: boolean;
  hasProjects: boolean;
  hasPurchaseOrders: boolean;
  hasBudgeting: boolean;
  hasClassTracking: boolean;
  hasCustomRoles: boolean;
  hasApprovalWorkflows: boolean;
  hasBatchOperations: boolean;
  hasCustomReportBuilder: boolean;
  hasApiAccess: boolean;
  hasScheduledReports: boolean;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  planTier: PlanTier;
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string;
  cancelledAt?: string;
  addOns: SubscriptionAddOn[];
}

export interface SubscriptionAddOn {
  type: 'payroll' | 'extra_users';
  quantity: number;
  unitPrice: string;
}
