import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { login, register, logout, clearError } from '../store/slices/authSlice';

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((state: RootState) => state.auth);

  return {
    user: auth.user,
    tenant: auth.tenant,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    login: (credentials: { email: string; password: string; mfaCode?: string }) =>
      dispatch(login(credentials)),
    register: (data: { email: string; password: string; firstName: string; lastName: string; companyName: string }) =>
      dispatch(register(data)),
    logout: () => dispatch(logout()),
    clearError: () => dispatch(clearError()),
  };
}
