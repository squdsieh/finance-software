import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { ServiceContext } from '../../types';

interface PlanDefinition {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
  features: Record<string, boolean | number>;
  limits: Record<string, number>;
}

const PLANS: PlanDefinition[] = [
  {
    id: 'free', name: 'Free', price: 0, billingPeriod: 'monthly',
    features: {
      invoicing: true, expenses: true, banking: false, payroll: false,
      inventory: false, projects: false, time_tracking: false,
      multi_currency: false, custom_reports: false, api_access: false,
    },
    limits: { users: 1, customers: 5, invoices_per_month: 5, storage_mb: 100 },
  },
  {
    id: 'starter', name: 'Starter', price: 29, billingPeriod: 'monthly',
    features: {
      invoicing: true, expenses: true, banking: true, payroll: false,
      inventory: false, projects: false, time_tracking: false,
      multi_currency: false, custom_reports: false, api_access: false,
    },
    limits: { users: 3, customers: 50, invoices_per_month: 50, storage_mb: 1024 },
  },
  {
    id: 'professional', name: 'Professional', price: 79, billingPeriod: 'monthly',
    features: {
      invoicing: true, expenses: true, banking: true, payroll: true,
      inventory: true, projects: true, time_tracking: true,
      multi_currency: true, custom_reports: false, api_access: true,
    },
    limits: { users: 10, customers: 500, invoices_per_month: 500, storage_mb: 5120 },
  },
  {
    id: 'enterprise', name: 'Enterprise', price: 199, billingPeriod: 'monthly',
    features: {
      invoicing: true, expenses: true, banking: true, payroll: true,
      inventory: true, projects: true, time_tracking: true,
      multi_currency: true, custom_reports: true, api_access: true,
    },
    limits: { users: -1, customers: -1, invoices_per_month: -1, storage_mb: 51200 },
  },
];

export class SubscriptionsService {
  private db = getDatabase();

  async getCurrent(schema: string) {
    const subscription = await this.db.withSchema(schema).table('tenant_subscription').first();
    if (!subscription) {
      return { planId: 'free', planName: 'Free', status: 'active', ...PLANS[0] };
    }
    const plan = PLANS.find(p => p.id === subscription.plan_id) || PLANS[0];
    return { ...subscription, plan };
  }

  async upgrade(ctx: ServiceContext, data: any) {
    const currentSub = await this.db.withSchema(ctx.tenantSchema).table('tenant_subscription').first();
    const newPlan = PLANS.find(p => p.id === data.planId);
    if (!newPlan) throw new AppError('Plan not found', 404);

    const currentPlanIndex = PLANS.findIndex(p => p.id === (currentSub?.plan_id || 'free'));
    const newPlanIndex = PLANS.findIndex(p => p.id === data.planId);
    if (newPlanIndex <= currentPlanIndex) {
      throw new AppError('New plan must be higher tier. Use downgrade endpoint instead.', 400);
    }

    // In production: create Stripe checkout session for the upgrade
    if (currentSub) {
      await this.db.withSchema(ctx.tenantSchema).table('tenant_subscription')
        .where({ id: currentSub.id }).update({
          plan_id: data.planId, plan_name: newPlan.name,
          price: newPlan.price, status: 'active',
          features: JSON.stringify(newPlan.features), limits: JSON.stringify(newPlan.limits),
          updated_at: new Date(), updated_by: ctx.userId,
        });
    } else {
      await this.db.withSchema(ctx.tenantSchema).table('tenant_subscription').insert({
        id: uuidv4(), plan_id: data.planId, plan_name: newPlan.name,
        price: newPlan.price, status: 'active', billing_period: 'monthly',
        features: JSON.stringify(newPlan.features), limits: JSON.stringify(newPlan.limits),
        started_at: new Date(), current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        created_by: ctx.userId, updated_by: ctx.userId,
      });
    }

    // Record usage event
    await this.recordUsageEvent(ctx.tenantSchema, 'plan_upgrade', {
      from: currentSub?.plan_id || 'free', to: data.planId,
    });

    return { planId: data.planId, planName: newPlan.name, status: 'active' };
  }

  async downgrade(ctx: ServiceContext, data: any) {
    const currentSub = await this.db.withSchema(ctx.tenantSchema).table('tenant_subscription').first();
    if (!currentSub) throw new AppError('No active subscription', 400);

    const newPlan = PLANS.find(p => p.id === data.planId);
    if (!newPlan) throw new AppError('Plan not found', 404);

    // Check if downgrade is possible (e.g., usage within new limits)
    const usage = await this.getUsage(ctx.tenantSchema);
    if (newPlan.limits.users > 0 && parseInt(usage.users) > newPlan.limits.users) {
      throw new AppError(`Cannot downgrade: you have ${usage.users} users but plan allows ${newPlan.limits.users}`, 400);
    }

    // Schedule downgrade at end of current billing period
    await this.db.withSchema(ctx.tenantSchema).table('tenant_subscription')
      .where({ id: currentSub.id }).update({
        pending_plan_id: data.planId, pending_plan_name: newPlan.name,
        downgrade_scheduled_at: currentSub.current_period_end,
        updated_at: new Date(), updated_by: ctx.userId,
      });

    return {
      message: `Downgrade to ${newPlan.name} scheduled at end of current billing period`,
      effectiveDate: currentSub.current_period_end,
    };
  }

  async cancel(ctx: ServiceContext, data: any) {
    const currentSub = await this.db.withSchema(ctx.tenantSchema).table('tenant_subscription').first();
    if (!currentSub) throw new AppError('No active subscription', 400);
    if (currentSub.status === 'canceled') throw new AppError('Subscription already canceled', 400);

    // Cancel at end of period (don't immediately revoke access)
    await this.db.withSchema(ctx.tenantSchema).table('tenant_subscription')
      .where({ id: currentSub.id }).update({
        status: 'canceling', cancel_at_period_end: true,
        cancellation_reason: data.reason,
        updated_at: new Date(), updated_by: ctx.userId,
      });

    return { message: 'Subscription will be canceled at end of current billing period' };
  }

  async reactivate(ctx: ServiceContext) {
    const currentSub = await this.db.withSchema(ctx.tenantSchema).table('tenant_subscription').first();
    if (!currentSub) throw new AppError('No subscription found', 400);
    if (currentSub.status === 'active') throw new AppError('Subscription is already active', 400);

    await this.db.withSchema(ctx.tenantSchema).table('tenant_subscription')
      .where({ id: currentSub.id }).update({
        status: 'active', cancel_at_period_end: false,
        cancellation_reason: null, updated_at: new Date(), updated_by: ctx.userId,
      });

    return { message: 'Subscription reactivated' };
  }

  async listPlans() {
    return PLANS.map(p => ({
      id: p.id, name: p.name, price: p.price, billingPeriod: p.billingPeriod,
      features: p.features, limits: p.limits,
    }));
  }

  async getPlan(planId: string) {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) throw new AppError('Plan not found', 404);
    return plan;
  }

  async listFeatures(schema: string) {
    const sub = await this.getCurrent(schema);
    return sub.plan?.features || PLANS[0].features;
  }

  async checkFeature(schema: string, feature: string) {
    const sub = await this.getCurrent(schema);
    const features = sub.plan?.features || PLANS[0].features;
    const enabled = features[feature] === true || (typeof features[feature] === 'number' && features[feature] > 0);
    return { feature, enabled, plan: sub.plan?.name || 'Free' };
  }

  async getUsage(schema: string) {
    const userCount = await this.db.withSchema(schema).table('users')
      .where({ is_active: true }).count('id as count').first();
    const customerCount = await this.db.withSchema(schema).table('customers')
      .where({ is_deleted: false }).count('id as count').first();
    const invoiceCount = await this.db.withSchema(schema).table('invoices')
      .whereRaw("date >= date_trunc('month', CURRENT_DATE)")
      .count('id as count').first();

    const sub = await this.getCurrent(schema);
    const limits = sub.plan?.limits || PLANS[0].limits;

    return {
      users: String(userCount?.count || 0),
      usersLimit: limits.users === -1 ? 'Unlimited' : String(limits.users),
      customers: String(customerCount?.count || 0),
      customersLimit: limits.customers === -1 ? 'Unlimited' : String(limits.customers),
      invoicesThisMonth: String(invoiceCount?.count || 0),
      invoicesLimit: limits.invoices_per_month === -1 ? 'Unlimited' : String(limits.invoices_per_month),
      storageMB: limits.storage_mb,
    };
  }

  async getUsageHistory(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('usage_events');
    if (options.fromDate) query = query.where('created_at', '>=', options.fromDate);
    if (options.toDate) query = query.where('created_at', '<=', options.toDate);
    return query.orderBy('created_at', 'desc').limit(100);
  }

  async listInvoices(schema: string) {
    return this.db.withSchema(schema).table('subscription_invoices')
      .orderBy('created_at', 'desc').limit(24);
  }

  async getInvoice(schema: string, id: string) {
    const invoice = await this.db.withSchema(schema).table('subscription_invoices').where({ id }).first();
    if (!invoice) throw new AppError('Invoice not found', 404);
    return invoice;
  }

  async updatePaymentMethod(ctx: ServiceContext, data: any) {
    // In production: update Stripe payment method
    await this.db.withSchema(ctx.tenantSchema).table('tenant_subscription')
      .update({
        payment_method_last4: data.last4, payment_method_brand: data.brand,
        payment_method_exp: data.expiration, updated_at: new Date(),
      });
  }

  // Feature gating middleware helper
  static async requireFeature(schema: string, feature: string): Promise<boolean> {
    const db = getDatabase();
    const sub = await db.withSchema(schema).table('tenant_subscription').first();
    const planId = sub?.plan_id || 'free';
    const plan = PLANS.find(p => p.id === planId) || PLANS[0];
    return plan.features[feature] === true;
  }

  // Usage limit check helper
  static async checkLimit(schema: string, limitType: string, currentCount: number): Promise<boolean> {
    const db = getDatabase();
    const sub = await db.withSchema(schema).table('tenant_subscription').first();
    const planId = sub?.plan_id || 'free';
    const plan = PLANS.find(p => p.id === planId) || PLANS[0];
    const limit = plan.limits[limitType];
    return limit === -1 || currentCount < limit;
  }

  private async recordUsageEvent(schema: string, eventType: string, data: any) {
    await this.db.withSchema(schema).table('usage_events').insert({
      id: uuidv4(), event_type: eventType, data: JSON.stringify(data),
    });
  }
}
