
export enum LeaseStatus {
  PENDING = 'Pending',
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

export enum CarStatus {
  AVAILABLE = 'Available',
  LEASED = 'Leased',
  MAINTENANCE = 'Maintenance'
}

// Added TabType to fix import error in App.tsx
export type TabType = 'home' | 'clients' | 'leasing' | 'cars' | 'finance';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  licensePlate: string;
  status: CarStatus;
  mileage: number;
  dailyRate: number;
}

export interface Lease {
  id: string;
  clientId: string;
  carId: string;
  startDate: string;
  endDate: string;
  totalValue: number;
  status: LeaseStatus;
  deposit: number;
}

export interface Transaction {
  id: string;
  leaseId?: string;
  amount: number;
  type: 'Income' | 'Expense';
  category: string;
  date: string;
  description: string;
}

export interface DashboardStats {
  activeLeases: number;
  pendingApprovals: number;
  totalClients: number;
  availableCars: number;
  monthlyRevenue: number;
}

export interface Activity {
  id: string;
  type: 'Lease' | 'Client' | 'Car' | 'Finance';
  action: string;
  timestamp: string;
  user: string;
  details: string;
}
