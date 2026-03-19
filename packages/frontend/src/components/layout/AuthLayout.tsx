import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function AuthLayout() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">CloudBooks Pro</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Cloud-Based Accounting & Financial Management
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
