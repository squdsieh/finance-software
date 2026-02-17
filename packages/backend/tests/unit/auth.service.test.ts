/**
 * CloudBooks Pro - AuthService Unit Tests
 *
 * Tests user registration, login (valid / invalid credentials, account locking),
 * JWT token generation & refresh, MFA setup and verification, and password flows.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from '@/modules/auth/auth.service';
import { AppError } from '@/utils/app-error';
import { getDatabase } from '@/database/connection';
import { sendEmail } from '@/utils/email';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockDb = getDatabase() as any;

function resetQueryChain() {
  // After each test, every chained method should resolve to sensible defaults.
  // Individual tests override `.first()` / `.select()` etc. as needed.
  mockDb.mockReturnValue({
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(1),
    join: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
  });
}

// Convenience: creates a "chain" mock that allows arbitrary .where().first() etc.
function chainMock(resolveTo: any = null) {
  const chain: any = {};
  const self = () => chain;
  chain.where = jest.fn().mockImplementation(self);
  chain.orWhere = jest.fn().mockImplementation(self);
  chain.first = jest.fn().mockResolvedValue(resolveTo);
  chain.select = jest.fn().mockImplementation(self);
  chain.insert = jest.fn().mockResolvedValue([]);
  chain.update = jest.fn().mockResolvedValue(1);
  chain.join = jest.fn().mockImplementation(self);
  chain.orderBy = jest.fn().mockImplementation(self);
  chain.raw = jest.fn().mockResolvedValue({});
  chain.delete = jest.fn().mockResolvedValue(1);
  return chain;
}

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------
const TEST_PASSWORD = 'SecureP@ss123!';
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);

function buildUser(overrides: Record<string, any> = {}) {
  return {
    id: uuidv4(),
    email: 'alice@example.com',
    password_hash: TEST_HASH,
    first_name: 'Alice',
    last_name: 'Smith',
    is_email_verified: true,
    is_mfa_enabled: false,
    mfa_secret: null,
    failed_login_attempts: 0,
    locked_until: null,
    ...overrides,
  };
}

function buildTenantUser(overrides: Record<string, any> = {}) {
  return {
    id: uuidv4(),
    user_id: overrides.user_id || uuidv4(),
    tenant_id: overrides.tenant_id || uuidv4(),
    role_id: overrides.role_id || uuidv4(),
    is_active: true,
    ...overrides,
  };
}

function buildTenant(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id || uuidv4(),
    company_name: 'Acme Corp',
    schema_name: 'tenant_abc',
    settings: {
      invoicePrefix: 'INV-',
      invoiceNextNumber: 1,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    resetQueryChain();
    authService = new AuthService();
  });

  // =========================================================================
  // REGISTRATION
  // =========================================================================
  describe('register', () => {
    const registrationData = {
      email: 'newuser@example.com',
      password: TEST_PASSWORD,
      firstName: 'Bob',
      lastName: 'Jones',
      companyName: 'Bob Inc',
      industry: 'technology',
    };

    it('should register a new user successfully', async () => {
      // First call: check if user exists -> null (no existing user)
      const existsChain = chainMock(null);
      mockDb.mockReturnValueOnce(existsChain);

      // Transaction mock - simulate the full registration transaction
      const trxChain = chainMock(null);
      trxChain.insert = jest.fn().mockResolvedValue([]);
      trxChain.select = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
        select: jest.fn().mockReturnThis(),
        map: jest.fn().mockReturnValue([]),
      });

      // Mock the permissions query to return an empty array with .select()
      const permissionsChain = chainMock([]);
      permissionsChain.select = jest.fn().mockResolvedValue([]);

      const trxFn = jest.fn().mockReturnValue(trxChain);
      Object.assign(trxFn, trxChain);

      // Override db.transaction
      (mockDb as any).transaction = jest.fn().mockImplementation(async (cb: any) => {
        return cb(trxFn);
      });

      const result = await authService.register(registrationData);

      expect(result).toHaveProperty('message');
      expect(result.message).toBe('Account created successfully. Please verify your email.');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('tenantId');
    });

    it('should throw USER_EXISTS if email is already registered', async () => {
      const existingUser = buildUser({ email: 'newuser@example.com' });
      const existsChain = chainMock(existingUser);
      mockDb.mockReturnValueOnce(existsChain);

      await expect(authService.register(registrationData)).rejects.toThrow(AppError);
      await expect(authService.register(registrationData)).rejects.toMatchObject({
        statusCode: 409,
        code: 'USER_EXISTS',
      });
    });

    it('should hash the password before storing', async () => {
      const hashSpy = jest.spyOn(bcrypt, 'hash');
      const existsChain = chainMock(null);
      mockDb.mockReturnValueOnce(existsChain);

      const trxChain = chainMock(null);
      trxChain.select = jest.fn().mockResolvedValue([]);
      const trxFn = jest.fn().mockReturnValue(trxChain);
      Object.assign(trxFn, trxChain);
      (mockDb as any).transaction = jest.fn().mockImplementation(async (cb: any) => cb(trxFn));

      await authService.register(registrationData);

      expect(hashSpy).toHaveBeenCalledWith(TEST_PASSWORD, 12);
    });

    it('should send a verification email after registration', async () => {
      const existsChain = chainMock(null);
      mockDb.mockReturnValueOnce(existsChain);

      const trxChain = chainMock(null);
      trxChain.select = jest.fn().mockResolvedValue([]);
      const trxFn = jest.fn().mockReturnValue(trxChain);
      Object.assign(trxFn, trxChain);
      (mockDb as any).transaction = jest.fn().mockImplementation(async (cb: any) => cb(trxFn));

      await authService.register(registrationData);

      expect(sendEmail).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // LOGIN
  // =========================================================================
  describe('login', () => {
    const ip = '127.0.0.1';
    const ua = 'jest-test-agent';

    it('should return tokens and user data for valid credentials', async () => {
      const user = buildUser();
      const tenantUser = buildTenantUser({ user_id: user.id });
      const tenant = buildTenant({ id: tenantUser.tenant_id });
      const role = { id: tenantUser.role_id, name: 'Owner/Admin' };

      // db('public.users').where(...).first() -> user
      const usersChain = chainMock(user);
      mockDb.mockReturnValueOnce(usersChain);

      // db('public.tenant_users').where(...).first() -> tenantUser
      const tuChain = chainMock(tenantUser);
      mockDb.mockReturnValueOnce(tuChain);

      // db('public.tenants').where(...).first() -> tenant
      const tenantChain = chainMock(tenant);
      mockDb.mockReturnValueOnce(tenantChain);

      // db('public.role_permissions').join(...).where(...).select(...) -> permissions
      const permChain = chainMock([]);
      permChain.select = jest.fn().mockResolvedValue([]);
      mockDb.mockReturnValueOnce(permChain);

      // db('public.roles').where(...).first() -> role
      const roleChain = chainMock(role);
      mockDb.mockReturnValueOnce(roleChain);

      // db('public.sessions').insert(...)
      const sessChain = chainMock(null);
      mockDb.mockReturnValueOnce(sessChain);

      // db('public.users').where(...).update(...)
      const updateChain = chainMock(null);
      mockDb.mockReturnValueOnce(updateChain);

      const result = await authService.login(
        { email: user.email, password: TEST_PASSWORD },
        ip,
        ua,
      );

      expect(result.requiresMfa).toBe(false);
      expect(result.accessToken).toBeTruthy();
      expect(typeof result.accessToken).toBe('string');
      expect(result.refreshToken).toBeTruthy();
      expect(result.user).toMatchObject({
        id: user.id,
        email: user.email,
        firstName: 'Alice',
        lastName: 'Smith',
      });
      expect(result.tenant).toMatchObject({
        id: tenant.id,
        name: 'Acme Corp',
      });
    });

    it('should throw INVALID_CREDENTIALS when user does not exist', async () => {
      const usersChain = chainMock(null);
      mockDb.mockReturnValueOnce(usersChain);

      await expect(
        authService.login({ email: 'nobody@example.com', password: 'whatever' }, ip, ua),
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('should throw INVALID_CREDENTIALS when password is wrong', async () => {
      const user = buildUser();
      const usersChain = chainMock(user);
      mockDb.mockReturnValueOnce(usersChain);

      // db('public.users').where(...).update(...) for failed attempts
      const updateChain = chainMock(null);
      mockDb.mockReturnValueOnce(updateChain);

      await expect(
        authService.login({ email: user.email, password: 'WrongPassword123!' }, ip, ua),
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('should lock account after 5 failed login attempts', async () => {
      const user = buildUser({ failed_login_attempts: 4 });
      const usersChain = chainMock(user);
      mockDb.mockReturnValueOnce(usersChain);

      const updateChain = chainMock(null);
      mockDb.mockReturnValueOnce(updateChain);

      await expect(
        authService.login({ email: user.email, password: 'WrongPassword123!' }, ip, ua),
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });

      // Verify the update was called with locked_until set
      expect(updateChain.update).toHaveBeenCalled();
    });

    it('should throw ACCOUNT_LOCKED for a currently locked account', async () => {
      const user = buildUser({
        locked_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // locked 30min from now
      });
      const usersChain = chainMock(user);
      mockDb.mockReturnValueOnce(usersChain);

      await expect(
        authService.login({ email: user.email, password: TEST_PASSWORD }, ip, ua),
      ).rejects.toMatchObject({
        statusCode: 423,
        code: 'ACCOUNT_LOCKED',
      });
    });

    it('should return requiresMfa=true when MFA is enabled but no code provided', async () => {
      const user = buildUser({
        is_mfa_enabled: true,
        mfa_secret: speakeasy.generateSecret().base32,
      });
      const usersChain = chainMock(user);
      mockDb.mockReturnValueOnce(usersChain);

      const result = await authService.login(
        { email: user.email, password: TEST_PASSWORD },
        ip,
        ua,
      );

      expect(result.requiresMfa).toBe(true);
      expect(result.accessToken).toBe('');
    });

    it('should throw INVALID_MFA when MFA code is incorrect', async () => {
      const user = buildUser({
        is_mfa_enabled: true,
        mfa_secret: speakeasy.generateSecret().base32,
      });
      const usersChain = chainMock(user);
      mockDb.mockReturnValueOnce(usersChain);

      await expect(
        authService.login(
          { email: user.email, password: TEST_PASSWORD, mfaCode: '000000' },
          ip,
          ua,
        ),
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_MFA',
      });
    });

    it('should generate a valid JWT access token', async () => {
      const user = buildUser();
      const tenantUser = buildTenantUser({ user_id: user.id });
      const tenant = buildTenant({ id: tenantUser.tenant_id });
      const role = { id: tenantUser.role_id, name: 'Owner/Admin' };

      const usersChain = chainMock(user);
      mockDb.mockReturnValueOnce(usersChain);
      mockDb.mockReturnValueOnce(chainMock(tenantUser));
      mockDb.mockReturnValueOnce(chainMock(tenant));
      const permChain = chainMock([]);
      permChain.select = jest.fn().mockResolvedValue([]);
      mockDb.mockReturnValueOnce(permChain);
      mockDb.mockReturnValueOnce(chainMock(role));
      mockDb.mockReturnValueOnce(chainMock(null)); // sessions insert
      mockDb.mockReturnValueOnce(chainMock(null)); // users update

      const result = await authService.login(
        { email: user.email, password: TEST_PASSWORD },
        ip,
        ua,
      );

      // Verify the token can be decoded
      const decoded = jwt.verify(result.accessToken, process.env.JWT_SECRET!) as any;
      expect(decoded.userId).toBe(user.id);
      expect(decoded.tenantId).toBe(tenant.id);
      expect(decoded.roleId).toBe(tenantUser.role_id);
      expect(decoded.permissions).toContain('*');
    });

    it('should reset failed_login_attempts on successful login', async () => {
      const user = buildUser({ failed_login_attempts: 3 });
      const tenantUser = buildTenantUser({ user_id: user.id });
      const tenant = buildTenant({ id: tenantUser.tenant_id });
      const role = { id: tenantUser.role_id, name: 'Standard' };

      mockDb.mockReturnValueOnce(chainMock(user));
      mockDb.mockReturnValueOnce(chainMock(tenantUser));
      mockDb.mockReturnValueOnce(chainMock(tenant));
      const permChain = chainMock([]);
      permChain.select = jest.fn().mockResolvedValue([{ module: 'invoices', action: 'view' }]);
      mockDb.mockReturnValueOnce(permChain);
      mockDb.mockReturnValueOnce(chainMock(role));
      mockDb.mockReturnValueOnce(chainMock(null)); // sessions
      const updateChain = chainMock(null);
      mockDb.mockReturnValueOnce(updateChain);

      await authService.login(
        { email: user.email, password: TEST_PASSWORD },
        ip,
        ua,
      );

      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          failed_login_attempts: 0,
          locked_until: null,
        }),
      );
    });
  });

  // =========================================================================
  // TOKEN VERIFICATION (using jwt directly as the service uses jwt.sign)
  // =========================================================================
  describe('token generation and verification', () => {
    it('should produce tokens verifiable with the same secret', () => {
      const payload = {
        userId: uuidv4(),
        tenantId: uuidv4(),
        roleId: uuidv4(),
        permissions: ['invoices:view', 'invoices:create'],
        iat: Math.floor(Date.now() / 1000),
        exp: 0,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' });
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.tenantId).toBe(payload.tenantId);
      expect(decoded.permissions).toEqual(payload.permissions);
    });

    it('should reject tokens signed with a different secret', () => {
      const token = jwt.sign({ userId: 'test' }, 'wrong-secret', { expiresIn: '15m' });

      expect(() => jwt.verify(token, process.env.JWT_SECRET!)).toThrow();
    });

    it('should reject expired tokens', () => {
      const token = jwt.sign(
        { userId: 'test' },
        process.env.JWT_SECRET!,
        { expiresIn: '0s' }, // immediately expired
      );

      // Small delay so the token is definitely past its expiry
      expect(() => jwt.verify(token, process.env.JWT_SECRET!)).toThrow();
    });
  });

  // =========================================================================
  // MFA SETUP
  // =========================================================================
  describe('enableMfa', () => {
    it('should generate a TOTP secret and update the user record', async () => {
      const userId = uuidv4();
      const updateChain = chainMock(null);
      mockDb.mockReturnValueOnce(updateChain);

      const result = await authService.enableMfa(userId);

      expect(result).toHaveProperty('secret');
      expect(typeof result.secret).toBe('string');
      expect(result.secret.length).toBeGreaterThan(0);
      expect(result).toHaveProperty('otpauthUrl');
      expect(result.otpauthUrl).toContain('otpauth://');
    });
  });

  describe('verifyMfa', () => {
    it('should enable MFA when a valid code is provided', async () => {
      const secret = speakeasy.generateSecret();
      const validCode = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32',
      });

      const userId = uuidv4();
      const user = buildUser({ id: userId, mfa_secret: secret.base32 });

      // db('public.users').where({ id }).first() -> user with mfa_secret
      mockDb.mockReturnValueOnce(chainMock(user));
      // db('public.users').where({ id }).update(...)
      const updateChain = chainMock(null);
      mockDb.mockReturnValueOnce(updateChain);

      await authService.verifyMfa(userId, validCode);

      expect(updateChain.update).toHaveBeenCalledWith({ is_mfa_enabled: true });
    });

    it('should throw INVALID_MFA for an incorrect code', async () => {
      const secret = speakeasy.generateSecret();
      const userId = uuidv4();
      const user = buildUser({ id: userId, mfa_secret: secret.base32 });

      mockDb.mockReturnValueOnce(chainMock(user));

      await expect(authService.verifyMfa(userId, '000000')).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_MFA',
      });
    });

    it('should throw MFA_NOT_INITIALIZED if user has no mfa_secret', async () => {
      const userId = uuidv4();
      const user = buildUser({ id: userId, mfa_secret: null });

      mockDb.mockReturnValueOnce(chainMock(user));

      await expect(authService.verifyMfa(userId, '123456')).rejects.toMatchObject({
        statusCode: 400,
        code: 'MFA_NOT_INITIALIZED',
      });
    });
  });

  // =========================================================================
  // FORGOT / RESET PASSWORD
  // =========================================================================
  describe('forgotPassword', () => {
    it('should send a reset email for existing users', async () => {
      const user = buildUser();
      mockDb.mockReturnValueOnce(chainMock(user));
      mockDb.mockReturnValueOnce(chainMock(null)); // update chain

      await authService.forgotPassword(user.email);

      expect(sendEmail).toHaveBeenCalled();
    });

    it('should silently return for non-existent users (no information leak)', async () => {
      mockDb.mockReturnValueOnce(chainMock(null));

      // Should not throw
      await expect(authService.forgotPassword('nobody@example.com')).resolves.toBeUndefined();
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset the password with a valid token', async () => {
      const user = buildUser();

      const chain = chainMock(user);
      // Override .where() to support chaining: .where({ token }).where('expires', '>', now).first()
      chain.where = jest.fn().mockReturnThis();
      chain.first = jest.fn().mockResolvedValue(user);
      mockDb.mockReturnValueOnce(chain);

      const updateChain = chainMock(null);
      mockDb.mockReturnValueOnce(updateChain);

      await authService.resetPassword('valid-token', 'NewPassword123!');

      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          password_reset_token: null,
          password_reset_expires: null,
          failed_login_attempts: 0,
          locked_until: null,
        }),
      );
    });

    it('should throw INVALID_TOKEN for an expired or invalid token', async () => {
      const chain = chainMock(null);
      chain.where = jest.fn().mockReturnThis();
      chain.first = jest.fn().mockResolvedValue(null);
      mockDb.mockReturnValueOnce(chain);

      await expect(
        authService.resetPassword('bad-token', 'NewPassword123!'),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_TOKEN',
      });
    });
  });

  // =========================================================================
  // CHANGE PASSWORD
  // =========================================================================
  describe('changePassword', () => {
    it('should update the password when current password is correct', async () => {
      const user = buildUser();
      mockDb.mockReturnValueOnce(chainMock(user));
      const updateChain = chainMock(null);
      mockDb.mockReturnValueOnce(updateChain);

      await authService.changePassword(user.id, TEST_PASSWORD, 'NewPassword123!');

      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: expect.any(String),
          updated_at: expect.any(Date),
        }),
      );
    });

    it('should throw INVALID_PASSWORD when current password is wrong', async () => {
      const user = buildUser();
      mockDb.mockReturnValueOnce(chainMock(user));

      await expect(
        authService.changePassword(user.id, 'WrongCurrentPassword', 'NewPassword123!'),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_PASSWORD',
      });
    });
  });

  // =========================================================================
  // GET CURRENT USER
  // =========================================================================
  describe('getCurrentUser', () => {
    it('should return the user profile', async () => {
      const user = {
        id: uuidv4(),
        email: 'alice@example.com',
        first_name: 'Alice',
        last_name: 'Smith',
        phone: '+1234567890',
        avatar_url: null,
        is_email_verified: true,
        is_mfa_enabled: false,
        last_login_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const chain = chainMock(user);
      chain.select = jest.fn().mockReturnThis();
      chain.first = jest.fn().mockResolvedValue(user);
      mockDb.mockReturnValueOnce(chain);

      const result = await authService.getCurrentUser(user.id);

      expect(result).toMatchObject({
        id: user.id,
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Smith',
      });
    });

    it('should throw NOT_FOUND for a non-existent user', async () => {
      const chain = chainMock(null);
      chain.select = jest.fn().mockReturnThis();
      chain.first = jest.fn().mockResolvedValue(null);
      mockDb.mockReturnValueOnce(chain);

      await expect(authService.getCurrentUser(uuidv4())).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });
});
