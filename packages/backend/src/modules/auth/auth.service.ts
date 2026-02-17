import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import speakeasy from 'speakeasy';
import { config } from '../../config';
import { logger } from '../../config/logger';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { sendEmail, compileTemplate, EMAIL_TEMPLATES } from '../../utils/email';
import { RegisterRequest, LoginRequest, TokenPayload } from '@cloudbooks/shared';

export class AuthService {
  private db = getDatabase();

  async register(data: RegisterRequest) {
    const { email, password, firstName, lastName, companyName, industry } = data;

    // Check if user exists
    const existingUser = await this.db('public.users').where({ email: email.toLowerCase() }).first();
    if (existingUser) {
      throw new AppError('An account with this email already exists', 409, 'USER_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const emailToken = uuidv4();
    const tenantId = uuidv4();
    const userId = uuidv4();
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;

    await this.db.transaction(async (trx) => {
      // Create tenant
      await trx('public.tenants').insert({
        id: tenantId,
        company_name: companyName,
        industry: industry || 'other',
        email: email.toLowerCase(),
        schema_name: schemaName,
        settings: JSON.stringify({
          enforceMfa: false,
          idleTimeout: 30,
          invoicePrefix: 'INV-',
          invoiceNextNumber: 1,
          estimatePrefix: 'EST-',
          estimateNextNumber: 1,
          billPrefix: 'BILL-',
          billNextNumber: 1,
          journalEntryPrefix: 'JE-',
          journalEntryNextNumber: 1,
          poPrefix: 'PO-',
          poNextNumber: 1,
          defaultPaymentTerms: 'net_30',
          lateFeeEnabled: false,
          lateFeeType: 'percentage',
          lateFeeAmount: '0',
          lateFeeGracePeriod: 0,
          reminderEnabled: false,
          reminderSchedule: [3, 7, 14, 30],
          enableClasses: false,
          enableLocations: false,
          enableProjects: false,
          enableTimeTracking: false,
          enableInventory: false,
          enableBudgets: false,
          enableMultiCurrency: false,
          enablePurchaseOrders: false,
        }),
      });

      // Create user
      await trx('public.users').insert({
        id: userId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        email_verification_token: emailToken,
        email_verification_expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      // Create owner role
      const roleId = uuidv4();
      await trx('public.roles').insert({
        id: roleId,
        tenant_id: tenantId,
        name: 'Owner/Admin',
        description: 'Full access to all features and settings',
        is_system: true,
      });

      // Assign all permissions to owner role
      const allPermissions = await trx('public.permissions').select('id');
      if (allPermissions.length > 0) {
        await trx('public.role_permissions').insert(
          allPermissions.map((p: { id: string }) => ({
            role_id: roleId,
            permission_id: p.id,
          })),
        );
      }

      // Link user to tenant
      await trx('public.tenant_users').insert({
        id: uuidv4(),
        user_id: userId,
        tenant_id: tenantId,
        role_id: roleId,
      });

      // Create subscription (trial)
      await trx('public.subscriptions').insert({
        id: uuidv4(),
        tenant_id: tenantId,
        plan_tier: 'plus',
        status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });

      // Create tenant schema
      await trx.raw(`SELECT create_tenant_schema('${schemaName}')`);
    });

    // Send verification email (non-blocking)
    const verificationUrl = `${config.app.url}/verify-email/${emailToken}`;
    sendEmail({
      to: email,
      subject: 'Verify your CloudBooks Pro email',
      html: compileTemplate(EMAIL_TEMPLATES.verifyEmail, {
        firstName,
        verificationUrl,
      }),
    }).catch((err) => logger.error('Failed to send verification email:', err));

    return {
      message: 'Account created successfully. Please verify your email.',
      userId,
      tenantId,
    };
  }

  async login(data: LoginRequest, ipAddress: string, userAgent: string) {
    const { email, password, mfaCode } = data;

    const user = await this.db('public.users').where({ email: email.toLowerCase() }).first();
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Check account lock
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new AppError('Account is temporarily locked. Try again later.', 423, 'ACCOUNT_LOCKED');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      // Increment failed attempts
      const attempts = (user.failed_login_attempts || 0) + 1;
      const updates: Record<string, any> = { failed_login_attempts: attempts };

      if (attempts >= 5) {
        updates.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 min lock
      }

      await this.db('public.users').where({ id: user.id }).update(updates);
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Check MFA
    if (user.is_mfa_enabled) {
      if (!mfaCode) {
        return { requiresMfa: true, accessToken: '', refreshToken: '', user: null, tenant: null };
      }

      const isValidMfa = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: mfaCode,
      });

      if (!isValidMfa) {
        throw new AppError('Invalid MFA code', 401, 'INVALID_MFA');
      }
    }

    // Get tenant info
    const tenantUser = await this.db('public.tenant_users')
      .where({ user_id: user.id, is_active: true })
      .first();

    if (!tenantUser) {
      throw new AppError('No active organization found', 403, 'NO_TENANT');
    }

    const tenant = await this.db('public.tenants').where({ id: tenantUser.tenant_id }).first();

    // Get role permissions
    const permissions = await this.db('public.role_permissions')
      .join('public.permissions', 'public.permissions.id', 'public.role_permissions.permission_id')
      .where({ role_id: tenantUser.role_id })
      .select('public.permissions.module', 'public.permissions.action');

    const permissionStrings = permissions.map(
      (p: { module: string; action: string }) => `${p.module}:${p.action}`,
    );

    // Check if owner role - grant all
    const role = await this.db('public.roles').where({ id: tenantUser.role_id }).first();
    if (role?.name === 'Owner/Admin') {
      permissionStrings.push('*');
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      tenantId: tenant.id,
      roleId: tenantUser.role_id,
      permissions: permissionStrings,
      iat: Math.floor(Date.now() / 1000),
      exp: 0, // Set by jwt.sign
    };

    const accessToken = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiry,
    });

    const refreshToken = uuidv4();
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // Store session
    await this.db('public.sessions').insert({
      id: uuidv4(),
      user_id: user.id,
      tenant_id: tenant.id,
      refresh_token_hash: refreshTokenHash,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Update login info
    await this.db('public.users').where({ id: user.id }).update({
      last_login_at: new Date(),
      failed_login_attempts: 0,
      locked_until: null,
    });

    return {
      requiresMfa: false,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isEmailVerified: user.is_email_verified,
        isMfaEnabled: user.is_mfa_enabled,
      },
      tenant: {
        id: tenant.id,
        name: tenant.company_name,
      },
    };
  }

  async refreshToken(token: string) {
    if (!token) {
      throw new AppError('Refresh token required', 400, 'MISSING_TOKEN');
    }

    const sessions = await this.db('public.sessions')
      .where({ is_active: true })
      .where('expires_at', '>', new Date());

    let matchedSession = null;
    for (const session of sessions) {
      const isMatch = await bcrypt.compare(token, session.refresh_token_hash);
      if (isMatch) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
    }

    const user = await this.db('public.users').where({ id: matchedSession.user_id }).first();
    const tenantUser = await this.db('public.tenant_users')
      .where({ user_id: user.id, tenant_id: matchedSession.tenant_id, is_active: true })
      .first();

    if (!tenantUser) {
      throw new AppError('User no longer has access', 403, 'ACCESS_REVOKED');
    }

    const permissions = await this.db('public.role_permissions')
      .join('public.permissions', 'public.permissions.id', 'public.role_permissions.permission_id')
      .where({ role_id: tenantUser.role_id })
      .select('public.permissions.module', 'public.permissions.action');

    const permissionStrings = permissions.map(
      (p: { module: string; action: string }) => `${p.module}:${p.action}`,
    );

    const role = await this.db('public.roles').where({ id: tenantUser.role_id }).first();
    if (role?.name === 'Owner/Admin') {
      permissionStrings.push('*');
    }

    const tokenPayload: TokenPayload = {
      userId: user.id,
      tenantId: matchedSession.tenant_id,
      roleId: tenantUser.role_id,
      permissions: permissionStrings,
      iat: Math.floor(Date.now() / 1000),
      exp: 0,
    };

    const accessToken = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiry,
    });

    // Update session activity
    await this.db('public.sessions')
      .where({ id: matchedSession.id })
      .update({ last_active_at: new Date() });

    return { accessToken };
  }

  async forgotPassword(email: string) {
    const user = await this.db('public.users').where({ email: email.toLowerCase() }).first();
    if (!user) return; // Don't reveal if user exists

    const resetToken = uuidv4();
    await this.db('public.users').where({ id: user.id }).update({
      password_reset_token: resetToken,
      password_reset_expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    const resetUrl = `${config.app.url}/reset-password/${resetToken}`;
    await sendEmail({
      to: email,
      subject: 'Reset your CloudBooks Pro password',
      html: compileTemplate(EMAIL_TEMPLATES.resetPassword, {
        firstName: user.first_name,
        resetUrl,
      }),
    });
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.db('public.users')
      .where({ password_reset_token: token })
      .where('password_reset_expires', '>', new Date())
      .first();

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.db('public.users').where({ id: user.id }).update({
      password_hash: passwordHash,
      password_reset_token: null,
      password_reset_expires: null,
      failed_login_attempts: 0,
      locked_until: null,
    });
  }

  async verifyEmail(token: string) {
    const user = await this.db('public.users')
      .where({ email_verification_token: token })
      .where('email_verification_expires', '>', new Date())
      .first();

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400, 'INVALID_TOKEN');
    }

    await this.db('public.users').where({ id: user.id }).update({
      is_email_verified: true,
      email_verification_token: null,
      email_verification_expires: null,
    });
  }

  async getCurrentUser(userId: string) {
    const user = await this.db('public.users')
      .where({ id: userId })
      .select('id', 'email', 'first_name', 'last_name', 'phone', 'avatar_url',
        'is_email_verified', 'is_mfa_enabled', 'last_login_at', 'created_at')
      .first();

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      avatar: user.avatar_url,
      isEmailVerified: user.is_email_verified,
      isMfaEnabled: user.is_mfa_enabled,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
    };
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string }) {
    const updates: Record<string, any> = { updated_at: new Date() };
    if (data.firstName) updates.first_name = data.firstName;
    if (data.lastName) updates.last_name = data.lastName;
    if (data.phone !== undefined) updates.phone = data.phone;

    await this.db('public.users').where({ id: userId }).update(updates);
    return this.getCurrentUser(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.db('public.users').where({ id: userId }).first();
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.db('public.users').where({ id: userId }).update({
      password_hash: passwordHash,
      updated_at: new Date(),
    });
  }

  async enableMfa(userId: string) {
    const secret = speakeasy.generateSecret({
      name: 'CloudBooks Pro',
      issuer: 'CloudBooks',
    });

    await this.db('public.users').where({ id: userId }).update({
      mfa_secret: secret.base32,
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
    };
  }

  async verifyMfa(userId: string, code: string) {
    const user = await this.db('public.users').where({ id: userId }).first();
    if (!user.mfa_secret) {
      throw new AppError('MFA not initialized', 400, 'MFA_NOT_INITIALIZED');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: code,
    });

    if (!isValid) {
      throw new AppError('Invalid MFA code', 400, 'INVALID_MFA');
    }

    await this.db('public.users').where({ id: userId }).update({ is_mfa_enabled: true });
  }

  async disableMfa(userId: string, code: string) {
    const user = await this.db('public.users').where({ id: userId }).first();

    const isValid = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: code,
    });

    if (!isValid) {
      throw new AppError('Invalid MFA code', 400, 'INVALID_MFA');
    }

    await this.db('public.users').where({ id: userId }).update({
      is_mfa_enabled: false,
      mfa_secret: null,
    });
  }

  async getSessions(userId: string) {
    return this.db('public.sessions')
      .where({ user_id: userId, is_active: true })
      .select('id', 'ip_address', 'user_agent', 'created_at', 'last_active_at', 'expires_at')
      .orderBy('last_active_at', 'desc');
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.db('public.sessions')
      .where({ id: sessionId, user_id: userId })
      .update({ is_active: false });
  }

  async logout(userId: string, refreshToken: string) {
    const sessions = await this.db('public.sessions')
      .where({ user_id: userId, is_active: true });

    for (const session of sessions) {
      const isMatch = await bcrypt.compare(refreshToken, session.refresh_token_hash);
      if (isMatch) {
        await this.db('public.sessions').where({ id: session.id }).update({ is_active: false });
        break;
      }
    }
  }

  async inviteUser(tenantId: string, invitedBy: string, data: { email: string; roleId: string }) {
    let user = await this.db('public.users').where({ email: data.email.toLowerCase() }).first();

    if (!user) {
      const tempPassword = uuidv4();
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      const userId = uuidv4();
      await this.db('public.users').insert({
        id: userId,
        email: data.email.toLowerCase(),
        password_hash: passwordHash,
        first_name: 'Invited',
        last_name: 'User',
      });

      user = { id: userId };
    }

    // Check if already in tenant
    const existing = await this.db('public.tenant_users')
      .where({ user_id: user.id, tenant_id: tenantId })
      .first();

    if (existing) {
      throw new AppError('User is already a member of this organization', 409, 'ALREADY_MEMBER');
    }

    await this.db('public.tenant_users').insert({
      id: uuidv4(),
      user_id: user.id,
      tenant_id: tenantId,
      role_id: data.roleId,
      invited_by: invitedBy,
      invited_at: new Date(),
    });

    // Send invite email
    const tenant = await this.db('public.tenants').where({ id: tenantId }).first();
    const inviter = await this.db('public.users').where({ id: invitedBy }).first();

    await sendEmail({
      to: data.email,
      subject: `You're invited to ${tenant.company_name} on CloudBooks Pro`,
      html: compileTemplate(EMAIL_TEMPLATES.inviteUser, {
        inviterName: `${inviter.first_name} ${inviter.last_name}`,
        companyName: tenant.company_name,
        inviteUrl: `${config.app.url}/accept-invite`,
      }),
    });

    return { message: 'Invitation sent' };
  }
}
