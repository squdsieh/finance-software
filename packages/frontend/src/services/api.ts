import axios from 'axios';
import { store } from '../store';
import { setTokens, logout } from '../store/slices/authSlice';

const API_BASE = '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const state = store.getState();
  const token = state.auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const state = store.getState();
      const refreshToken = state.auth.refreshToken;

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE}/auth/refresh-token`, { refreshToken });
          const { accessToken } = response.data.data;
          store.dispatch(setTokens({ accessToken }));
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          store.dispatch(logout());
        }
      } else {
        store.dispatch(logout());
      }
    }

    return Promise.reject(error);
  },
);

export default api;

// Auth API
export const authApi = {
  login: (data: { email: string; password: string; mfaCode?: string }) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: any) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  changePassword: (data: any) => api.post('/auth/change-password', data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
};

// Company API
export const companyApi = {
  get: () => api.get('/company'),
  update: (data: any) => api.put('/company', data),
  updateSettings: (data: any) => api.put('/company/settings', data),
  getOnboarding: () => api.get('/company/onboarding'),
  completeStep: (step: number, data: any) => api.put(`/company/onboarding/${step}`, data),
};

// Generic CRUD API factory
function createCrudApi(basePath: string) {
  return {
    list: (params?: any) => api.get(basePath, { params }),
    getById: (id: string) => api.get(`${basePath}/${id}`),
    create: (data: any) => api.post(basePath, data),
    update: (id: string, data: any) => api.put(`${basePath}/${id}`, data),
    delete: (id: string) => api.delete(`${basePath}/${id}`),
  };
}

export const customersApi = { ...createCrudApi('/customers'),
  getTransactions: (id: string) => api.get(`/customers/${id}/transactions`),
  getStatement: (id: string, params: any) => api.get(`/customers/${id}/statement`, { params }),
  sendStatement: (id: string, data: any) => api.post(`/customers/${id}/statement/send`, data),
};

export const vendorsApi = createCrudApi('/vendors');
export const productsApi = createCrudApi('/products');
export const accountsApi = { ...createCrudApi('/accounts'),
  getTree: () => api.get('/accounts/tree'),
  getActivity: (id: string, params: any) => api.get(`/accounts/${id}/activity`, { params }),
  merge: (data: any) => api.post('/accounts/merge', data),
};

export const invoicesApi = { ...createCrudApi('/invoices'),
  send: (id: string, data?: any) => api.post(`/invoices/${id}/send`, data),
  recordPayment: (data: any) => api.post(`/invoices/${data.invoiceId}/payment`, data),
  void: (id: string) => api.post(`/invoices/${id}/void`),
  duplicate: (id: string) => api.post(`/invoices/${id}/duplicate`),
  getPdf: (id: string) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
};

export const estimatesApi = { ...createCrudApi('/estimates'),
  send: (id: string) => api.post(`/estimates/${id}/send`),
  convert: (id: string) => api.post(`/estimates/${id}/convert`),
  accept: (id: string, signature?: string) => api.post(`/estimates/${id}/accept`, { signature }),
  reject: (id: string, reason?: string) => api.post(`/estimates/${id}/reject`, { reason }),
};

export const billsApi = { ...createCrudApi('/bills'),
  recordPayment: (id: string, data: any) => api.post(`/bills/${id}/payment`, data),
  approve: (id: string) => api.post(`/bills/${id}/approve`),
  void: (id: string) => api.post(`/bills/${id}/void`),
  listPOs: (params?: any) => api.get('/bills/purchase-orders', { params }),
  createPO: (data: any) => api.post('/bills/purchase-orders', data),
};

export const expensesApi = { ...createCrudApi('/expenses'),
  scanReceipt: (data: any) => api.post('/expenses/receipt-scan', data),
  createMileage: (data: any) => api.post('/expenses/mileage', data),
  listClaims: (params?: any) => api.get('/expenses/claims', { params }),
  createClaim: (data: any) => api.post('/expenses/claims', data),
};

export const bankingApi = {
  listAccounts: () => api.get('/banking/accounts'),
  createAccount: (data: any) => api.post('/banking/accounts', data),
  syncTransactions: (id: string) => api.post(`/banking/accounts/${id}/sync`),
  listTransactions: (params?: any) => api.get('/banking/transactions', { params }),
  categorize: (id: string, data: any) => api.put(`/banking/transactions/${id}/categorize`, data),
  match: (id: string, data: any) => api.put(`/banking/transactions/${id}/match`, data),
  listRules: () => api.get('/banking/rules'),
  createRule: (data: any) => api.post('/banking/rules', data),
  listReconciliations: (params?: any) => api.get('/banking/reconciliations', { params }),
  startReconciliation: (data: any) => api.post('/banking/reconciliations', data),
  completeReconciliation: (id: string) => api.post(`/banking/reconciliations/${id}/complete`),
  createTransfer: (data: any) => api.post('/banking/transfers', data),
  createDeposit: (data: any) => api.post('/banking/deposits', data),
};

export const journalEntriesApi = createCrudApi('/journal-entries');
export const payrollApi = {
  ...createCrudApi('/payroll/employees'),
  listPayRuns: (params?: any) => api.get('/payroll/pay-runs', { params }),
  createPayRun: (data: any) => api.post('/payroll/pay-runs', data),
  processPayRun: (id: string) => api.post(`/payroll/pay-runs/${id}/process`),
};
export const timeTrackingApi = {
  ...createCrudApi('/time-tracking'),
  startTimer: (data: any) => api.post('/time-tracking/timer/start', data),
  stopTimer: () => api.post('/time-tracking/timer/stop'),
  listTimesheets: (params?: any) => api.get('/time-tracking/timesheets', { params }),
  submitTimesheet: (id: string) => api.post(`/time-tracking/timesheets/${id}/submit`),
  approveTimesheet: (id: string) => api.post(`/time-tracking/timesheets/${id}/approve`),
};
export const projectsApi = createCrudApi('/projects');
export const inventoryApi = {
  list: (params?: any) => api.get('/inventory', { params }),
  adjust: (data: any) => api.post('/inventory/adjustments', data),
  transfer: (data: any) => api.post('/inventory/transfers', data),
};
export const taxApi = {
  listRates: () => api.get('/tax/rates'),
  createRate: (data: any) => api.post('/tax/rates', data),
  listGroups: () => api.get('/tax/groups'),
  createGroup: (data: any) => api.post('/tax/groups', data),
  listVatReturns: () => api.get('/tax/vat-returns'),
  createVatReturn: (data: any) => api.post('/tax/vat-returns', data),
};
export const reportsApi = {
  generate: (type: string, params: any) => api.get(`/reports/${type}`, { params }),
  listCustom: () => api.get('/reports/custom'),
  saveCustom: (data: any) => api.post('/reports/custom', data),
  export: (type: string, format: string, params: any) => api.get(`/reports/${type}/export/${format}`, { params, responseType: 'blob' }),
};
export const budgetsApi = createCrudApi('/budgets');
export const currencyApi = {
  list: () => api.get('/currencies'),
  updateRates: () => api.post('/currencies/update-rates'),
};
export const auditApi = {
  list: (params?: any) => api.get('/audit', { params }),
  getEntityHistory: (type: string, id: string) => api.get(`/audit/${type}/${id}`),
};
export const notificationsApi = {
  list: (params?: any) => api.get('/notifications', { params }),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};
