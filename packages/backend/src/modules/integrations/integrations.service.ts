import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { ServiceContext } from '../../types';

export class IntegrationsService {
  private db = getDatabase();

  async list(schema: string) {
    return this.db.withSchema(schema).table('integrations').orderBy('provider');
  }

  async getById(schema: string, id: string) {
    const integration = await this.db.withSchema(schema).table('integrations').where({ id }).first();
    if (!integration) throw new AppError('Integration not found', 404);
    // Don't expose secrets
    delete integration.access_token;
    delete integration.refresh_token;
    delete integration.api_secret;
    return integration;
  }

  async connect(ctx: ServiceContext, provider: string, data: any) {
    const existing = await this.db.withSchema(ctx.tenantSchema).table('integrations')
      .where({ provider }).first();
    if (existing) throw new AppError(`${provider} integration already exists`, 400);

    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('integrations').insert({
      id, provider, status: 'connected',
      api_key: data.apiKey, api_secret: data.apiSecret,
      access_token: data.accessToken, refresh_token: data.refreshToken,
      settings: JSON.stringify(data.settings || {}),
      connected_at: new Date(), connected_by: ctx.userId,
    });

    await this.logSync(ctx.tenantSchema, id, 'connected', 'success', 'Integration connected');
    return { id, provider, status: 'connected' };
  }

  async disconnect(ctx: ServiceContext, provider: string) {
    const integration = await this.db.withSchema(ctx.tenantSchema).table('integrations')
      .where({ provider }).first();
    if (!integration) throw new AppError('Integration not found', 404);

    await this.db.withSchema(ctx.tenantSchema).table('integrations')
      .where({ provider }).update({
        status: 'disconnected', access_token: null, refresh_token: null,
        disconnected_at: new Date(), updated_at: new Date(),
      });

    await this.logSync(ctx.tenantSchema, integration.id, 'disconnected', 'success', 'Integration disconnected');
  }

  async updateSettings(ctx: ServiceContext, id: string, data: any) {
    await this.db.withSchema(ctx.tenantSchema).table('integrations').where({ id }).update({
      settings: JSON.stringify(data.settings), updated_at: new Date(),
    });
  }

  async sync(ctx: ServiceContext, id: string) {
    const integration = await this.db.withSchema(ctx.tenantSchema).table('integrations').where({ id }).first();
    if (!integration) throw new AppError('Integration not found', 404);
    if (integration.status !== 'connected') throw new AppError('Integration is not connected', 400);

    // Dispatch to provider-specific sync
    switch (integration.provider) {
      case 'stripe':
        return this.syncStripe(ctx, integration);
      case 'plaid':
        return this.syncPlaid(ctx, integration);
      case 'exchange_rates':
        return this.syncExchangeRates(ctx);
      default:
        throw new AppError(`Sync not supported for provider: ${integration.provider}`, 400);
    }
  }

  async getSyncLogs(schema: string, integrationId: string, options: any) {
    let query = this.db.withSchema(schema).table('integration_sync_logs')
      .where({ integration_id: integrationId });
    if (options.status) query = query.where({ status: options.status });
    return query.orderBy('created_at', 'desc').limit(100);
  }

  // Stripe
  async handleStripeWebhook(headers: any, body: any) {
    // In production, verify webhook signature using Stripe SDK
    // const sig = headers['stripe-signature'];
    // const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    const event = body;
    switch (event.type) {
      case 'checkout.session.completed':
        return this.handleStripeCheckoutComplete(event.data.object);
      case 'invoice.paid':
        return this.handleStripeInvoicePaid(event.data.object);
      case 'customer.subscription.updated':
        return this.handleStripeSubscriptionUpdate(event.data.object);
      case 'customer.subscription.deleted':
        return this.handleStripeSubscriptionCancel(event.data.object);
      default:
        return { handled: false, type: event.type };
    }
  }

  private async handleStripeCheckoutComplete(session: any) {
    // Update tenant subscription based on checkout session
    if (session.metadata?.tenantId) {
      const db = getDatabase();
      await db.table('public.tenant_subscriptions')
        .where({ tenant_id: session.metadata.tenantId })
        .update({
          stripe_subscription_id: session.subscription,
          status: 'active', updated_at: new Date(),
        });
    }
    return { handled: true, type: 'checkout.session.completed' };
  }

  private async handleStripeInvoicePaid(invoice: any) {
    return { handled: true, type: 'invoice.paid', invoiceId: invoice.id };
  }

  private async handleStripeSubscriptionUpdate(subscription: any) {
    const db = getDatabase();
    await db.table('public.tenant_subscriptions')
      .where({ stripe_subscription_id: subscription.id })
      .update({
        status: subscription.status === 'active' ? 'active' : 'past_due',
        current_period_end: new Date(subscription.current_period_end * 1000),
        updated_at: new Date(),
      });
    return { handled: true, type: 'customer.subscription.updated' };
  }

  private async handleStripeSubscriptionCancel(subscription: any) {
    const db = getDatabase();
    await db.table('public.tenant_subscriptions')
      .where({ stripe_subscription_id: subscription.id })
      .update({ status: 'canceled', canceled_at: new Date(), updated_at: new Date() });
    return { handled: true, type: 'customer.subscription.deleted' };
  }

  async createStripeCheckout(ctx: ServiceContext, data: any) {
    // Placeholder: In production use Stripe SDK
    return {
      message: 'Stripe checkout placeholder',
      checkoutUrl: `https://checkout.stripe.com/placeholder?plan=${data.planId}`,
      sessionId: `cs_placeholder_${Date.now()}`,
    };
  }

  async createStripePortal(ctx: ServiceContext) {
    return {
      message: 'Stripe portal placeholder',
      portalUrl: 'https://billing.stripe.com/placeholder',
    };
  }

  // Plaid
  async handlePlaidWebhook(body: any) {
    switch (body.webhook_type) {
      case 'TRANSACTIONS':
        if (body.webhook_code === 'SYNC_UPDATES_AVAILABLE') {
          return { handled: true, type: 'transaction_sync', itemId: body.item_id };
        }
        break;
      case 'ITEM':
        if (body.webhook_code === 'ERROR') {
          return { handled: true, type: 'item_error', itemId: body.item_id, error: body.error };
        }
        break;
    }
    return { handled: false };
  }

  async createPlaidLinkToken(ctx: ServiceContext) {
    // Placeholder: In production use Plaid SDK
    return {
      message: 'Plaid link token placeholder',
      linkToken: `link-sandbox-${uuidv4()}`,
      expiration: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    };
  }

  async exchangePlaidToken(ctx: ServiceContext, data: any) {
    // Placeholder: In production use Plaid SDK to exchange public token
    const accessToken = `access-sandbox-${uuidv4()}`;
    const itemId = `item-sandbox-${uuidv4()}`;

    // Store in integrations table
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('integrations').insert({
      id, provider: 'plaid', status: 'connected',
      access_token: accessToken,
      settings: JSON.stringify({ itemId, institutionId: data.institutionId }),
      connected_at: new Date(), connected_by: ctx.userId,
    });

    return { id, itemId, message: 'Plaid account linked (placeholder)' };
  }

  private async syncStripe(ctx: ServiceContext, integration: any) {
    await this.logSync(ctx.tenantSchema, integration.id, 'sync', 'success',
      'Stripe sync placeholder - would sync payments and invoices');
    return { message: 'Stripe sync placeholder', synced: 0 };
  }

  private async syncPlaid(ctx: ServiceContext, integration: any) {
    await this.logSync(ctx.tenantSchema, integration.id, 'sync', 'success',
      'Plaid sync placeholder - would sync bank transactions');
    return { message: 'Plaid sync placeholder', transactionsImported: 0 };
  }

  async syncExchangeRates(ctx: ServiceContext) {
    // Placeholder: would fetch from external API like Open Exchange Rates
    const currencies = await this.db.withSchema(ctx.tenantSchema).table('currencies')
      .where({ is_active: true }).whereNot({ is_base: true });

    const baseCurrency = await this.db.withSchema(ctx.tenantSchema).table('currencies')
      .where({ is_base: true }).first();

    // In production: fetch rates from API
    const ratesUpdated = 0;
    return {
      message: 'Exchange rate sync placeholder - would fetch from external API',
      baseCurrency: baseCurrency?.code || 'AED',
      currenciesChecked: currencies.length,
      ratesUpdated,
      lastSynced: new Date().toISOString(),
    };
  }

  private async logSync(schema: string, integrationId: string, action: string,
    status: string, message: string, details?: any) {
    await this.db.withSchema(schema).table('integration_sync_logs').insert({
      id: uuidv4(), integration_id: integrationId, action, status, message,
      details: details ? JSON.stringify(details) : null,
    });
  }
}
