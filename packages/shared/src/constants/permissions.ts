export const PERMISSION_MODULES = [
  'customers', 'vendors', 'invoices', 'bills', 'expenses',
  'banking', 'reports', 'payroll', 'inventory', 'taxes',
  'settings', 'users', 'journal_entries', 'budgets',
  'projects', 'time_tracking', 'estimates', 'products',
] as const;

export const PERMISSION_ACTIONS = [
  'view', 'create', 'edit', 'delete', 'approve', 'export',
] as const;

export const DEFAULT_ROLES = {
  owner: {
    name: 'Owner/Admin',
    description: 'Full access to all features and settings',
    permissions: 'all',
  },
  accountant: {
    name: 'Accountant',
    description: 'Full financial access without admin capabilities',
    permissions: {
      customers: ['view', 'create', 'edit', 'export'],
      vendors: ['view', 'create', 'edit', 'export'],
      invoices: ['view', 'create', 'edit', 'delete', 'approve', 'export'],
      bills: ['view', 'create', 'edit', 'delete', 'approve', 'export'],
      expenses: ['view', 'create', 'edit', 'delete', 'approve', 'export'],
      banking: ['view', 'create', 'edit', 'export'],
      reports: ['view', 'export'],
      payroll: ['view', 'create', 'edit', 'approve', 'export'],
      inventory: ['view', 'create', 'edit', 'export'],
      taxes: ['view', 'create', 'edit', 'export'],
      journal_entries: ['view', 'create', 'edit', 'delete', 'export'],
      budgets: ['view', 'create', 'edit', 'export'],
      projects: ['view', 'export'],
      time_tracking: ['view', 'approve', 'export'],
      estimates: ['view', 'create', 'edit', 'delete', 'export'],
      products: ['view', 'create', 'edit', 'export'],
    },
  },
  standard: {
    name: 'Standard User',
    description: 'Basic access to create and view transactions',
    permissions: {
      customers: ['view', 'create', 'edit'],
      vendors: ['view'],
      invoices: ['view', 'create', 'edit'],
      bills: ['view', 'create'],
      expenses: ['view', 'create', 'edit'],
      banking: ['view'],
      reports: ['view'],
      time_tracking: ['view', 'create', 'edit'],
      estimates: ['view', 'create', 'edit'],
      products: ['view'],
    },
  },
  reports_only: {
    name: 'Reports Only',
    description: 'Read-only access to reports',
    permissions: {
      reports: ['view', 'export'],
    },
  },
  time_tracking_only: {
    name: 'Time Tracking Only',
    description: 'Access limited to time tracking features',
    permissions: {
      time_tracking: ['view', 'create', 'edit'],
      projects: ['view'],
    },
  },
} as const;
