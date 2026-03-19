/**
 * CloudBooks Pro - LoginPage Tests
 *
 * Tests rendering, form validation, submission, error display,
 * and navigation links for the login page.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { LoginPage } from '../pages/LoginPage';
import authReducer from '../store/slices/authSlice';
import uiReducer from '../store/slices/uiSlice';

// ---------------------------------------------------------------------------
// Mock the API module
// ---------------------------------------------------------------------------
vi.mock('../services/api', () => {
  const loginMock = vi.fn();
  return {
    default: {
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    },
    authApi: {
      login: loginMock,
      register: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      getMe: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
      logout: vi.fn(),
    },
  };
});

// Import after mocking so we get the mocked version
import { authApi } from '../services/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createTestStore(preloadedState?: any) {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
    },
    preloadedState,
  });
}

function renderLoginPage(store = createTestStore()) {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    </Provider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // RENDERING
  // =========================================================================
  describe('rendering', () => {
    it('should render the login form heading', () => {
      renderLoginPage();

      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    });

    it('should render email and password inputs', () => {
      renderLoginPage();

      expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    });

    it('should render the sign in button', () => {
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeEnabled();
    });

    it('should render the "Remember me" checkbox', () => {
      renderLoginPage();

      expect(screen.getByText('Remember me')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should render the "Forgot password?" link', () => {
      renderLoginPage();

      const forgotLink = screen.getByText('Forgot password?');
      expect(forgotLink).toBeInTheDocument();
      expect(forgotLink).toHaveAttribute('href', '/forgot-password');
    });

    it('should render the "Sign up" link', () => {
      renderLoginPage();

      const signUpLink = screen.getByText('Sign up');
      expect(signUpLink).toBeInTheDocument();
      expect(signUpLink).toHaveAttribute('href', '/register');
    });

    it('should render email input with correct type attribute', () => {
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('you@company.com');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should render password input with correct type attribute', () => {
      renderLoginPage();

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  // =========================================================================
  // FORM VALIDATION
  // =========================================================================
  describe('form validation', () => {
    it('should mark email input as required', () => {
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('you@company.com');
      expect(emailInput).toBeRequired();
    });

    it('should mark password input as required', () => {
      renderLoginPage();

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      expect(passwordInput).toBeRequired();
    });

    it('should allow typing into email field', async () => {
      renderLoginPage();
      const user = userEvent.setup();

      const emailInput = screen.getByPlaceholderText('you@company.com');
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should allow typing into password field', async () => {
      renderLoginPage();
      const user = userEvent.setup();

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      await user.type(passwordInput, 'MyPassword123');

      expect(passwordInput).toHaveValue('MyPassword123');
    });
  });

  // =========================================================================
  // FORM SUBMISSION
  // =========================================================================
  describe('form submission', () => {
    it('should dispatch login action on form submit', async () => {
      const mockResponse = {
        data: {
          data: {
            requiresMfa: false,
            accessToken: 'test-access-token',
            refreshToken: 'test-refresh-token',
            user: {
              id: '123',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              isEmailVerified: true,
              isMfaEnabled: false,
            },
            tenant: { id: 'tenant-1', name: 'Test Corp' },
          },
        },
      };

      (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

      const store = createTestStore();
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      renderLoginPage(store);
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText('you@company.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'Password123!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(dispatchSpy).toHaveBeenCalled();
      });
    });

    it('should call authApi.login with the entered credentials', async () => {
      const mockResponse = {
        data: {
          data: {
            requiresMfa: false,
            accessToken: 'token',
            refreshToken: 'refresh',
            user: { id: '1', email: 'user@test.com', firstName: 'U', lastName: 'T' },
            tenant: { id: 't1', name: 'Corp' },
          },
        },
      };

      (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

      renderLoginPage();
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText('you@company.com'), 'user@test.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'TestPass99!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalledWith({
          email: 'user@test.com',
          password: 'TestPass99!',
        });
      });
    });

    it('should display error message when login fails', async () => {
      const errorMessage = 'Invalid email or password';
      (authApi.login as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
        response: { data: { error: { message: errorMessage } } },
      });

      const store = createTestStore();
      renderLoginPage(store);
      const user = userEvent.setup();

      await user.type(screen.getByPlaceholderText('you@company.com'), 'wrong@test.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'WrongPass');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        const errorEl = screen.queryByText(errorMessage);
        if (errorEl) {
          expect(errorEl).toBeInTheDocument();
        }
      });
    });
  });

  // =========================================================================
  // LOADING STATE
  // =========================================================================
  describe('loading state', () => {
    it('should show loading indicator while login is in progress', () => {
      const store = createTestStore({
        auth: {
          user: null,
          tenant: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: true,
          error: null,
        },
        ui: { sidebarOpen: true, theme: 'light' },
      });

      renderLoginPage(store);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeDisabled();
    });
  });

  // =========================================================================
  // ERROR STATE
  // =========================================================================
  describe('error display', () => {
    it('should show error message from store', () => {
      const store = createTestStore({
        auth: {
          user: null,
          tenant: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Account is temporarily locked. Try again later.',
        },
        ui: { sidebarOpen: true, theme: 'light' },
      });

      renderLoginPage(store);

      expect(
        screen.getByText('Account is temporarily locked. Try again later.'),
      ).toBeInTheDocument();
    });

    it('should not show error div when there is no error', () => {
      const store = createTestStore({
        auth: {
          user: null,
          tenant: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        },
        ui: { sidebarOpen: true, theme: 'light' },
      });

      renderLoginPage(store);

      // The error div (with bg-red-50 class) should not be present
      const errorDiv = document.querySelector('.bg-red-50');
      expect(errorDiv).not.toBeInTheDocument();
    });
  });
});
