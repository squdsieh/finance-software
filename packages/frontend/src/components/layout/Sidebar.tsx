import { NavLink, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { toggleSidebarCollapse } from '../../store/slices/uiSlice';
import {
  LayoutDashboard, Users, Building2, Package, FileText, FileCheck,
  Receipt, CreditCard, Landmark, BookOpen, DollarSign, Clock,
  FolderKanban, Warehouse, Calculator, BarChart3, PiggyBank,
  Settings, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '../../utils/cn';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Vendors', path: '/vendors', icon: Building2 },
  { label: 'Products & Services', path: '/products', icon: Package },
  { divider: true, label: 'Sales' },
  { label: 'Invoices', path: '/invoices', icon: FileText },
  { label: 'Estimates', path: '/estimates', icon: FileCheck },
  { divider: true, label: 'Purchases' },
  { label: 'Bills', path: '/bills', icon: Receipt },
  { label: 'Expenses', path: '/expenses', icon: CreditCard },
  { divider: true, label: 'Banking' },
  { label: 'Banking', path: '/banking', icon: Landmark },
  { label: 'Journal Entries', path: '/journal-entries', icon: BookOpen },
  { label: 'Chart of Accounts', path: '/chart-of-accounts', icon: BookOpen },
  { divider: true, label: 'Payroll & Time' },
  { label: 'Payroll', path: '/payroll', icon: DollarSign },
  { label: 'Time Tracking', path: '/time-tracking', icon: Clock },
  { label: 'Projects', path: '/projects', icon: FolderKanban },
  { divider: true, label: 'Other' },
  { label: 'Inventory', path: '/inventory', icon: Warehouse },
  { label: 'Tax', path: '/tax', icon: Calculator },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Budgets', path: '/budgets', icon: PiggyBank },
  { divider: true, label: 'System' },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export function Sidebar() {
  const dispatch = useDispatch();
  const collapsed = useSelector((state: RootState) => state.ui.sidebarCollapsed);
  const location = useLocation();

  return (
    <aside className={cn(
      'flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
      collapsed ? 'w-16' : 'w-64',
    )}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <span className="text-lg font-bold text-primary-600">CloudBooks</span>
        )}
        <button
          onClick={() => dispatch(toggleSidebarCollapse())}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((item, index) => {
          if ('divider' in item && item.divider) {
            if (collapsed) return null;
            return (
              <div key={index} className="px-4 pt-4 pb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
            );
          }

          const Icon = item.icon!;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path!}
              className={cn(
                'flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50',
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
