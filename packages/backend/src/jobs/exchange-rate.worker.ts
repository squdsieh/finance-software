import { Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { getDatabase } from '../database/connection';
import { config } from '../config';
import { logger } from '../config/logger';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface FetchRatesData {
  tenantSchema?: string;
  baseCurrency?: string;
  targetCurrencies?: string[];
}

interface UpdateRatesData {
  tenantSchema: string;
  rates: Array<{
    fromCurrency: string;
    toCurrency: string;
    rate: number;
  }>;
  source?: string;
}

interface LogRateChangeData {
  tenantSchema: string;
  fromCurrency: string;
  toCurrency: string;
  oldRate: number;
  newRate: number;
}

interface ExchangeRateApiResponse {
  success: boolean;
  base: string;
  date: string;
  rates: Record<string, number>;
}

// ------------------------------------------------------------------
// Main Job Processor
// ------------------------------------------------------------------

export async function processExchangeRateJob(job: Job): Promise<any> {
  logger.info(`Processing exchange-rate job: ${job.name} (${job.id})`);

  switch (job.name) {
    case 'fetch-rates':
      return fetchExchangeRates(job);
    case 'update-rates':
      return updateRatesInDatabase(job);
    case 'log-rate-change':
      return logRateChange(job);
    default:
      throw new Error(`Unknown exchange-rate job name: ${job.name}`);
  }
}

// ------------------------------------------------------------------
// fetch-rates: Fetch latest exchange rates from API
// ------------------------------------------------------------------

async function fetchExchangeRates(job: Job<FetchRatesData>): Promise<{
  tenantsUpdated: number;
  ratesUpdated: number;
}> {
  const db = getDatabase();
  let tenantsUpdated = 0;
  let ratesUpdated = 0;

  try {
    // Determine which tenants need rate updates
    const tenantSchemas: Array<{ schema: string; homeCurrency: string }> = [];

    if (job.data.tenantSchema) {
      const tenant = await db('public.tenants')
        .whereRaw("schema_name = ?", [job.data.tenantSchema])
        .first();
      if (tenant) {
        tenantSchemas.push({
          schema: tenant.schema_name,
          homeCurrency: job.data.baseCurrency || tenant.home_currency || 'AED',
        });
      }
    } else {
      const tenants = await db('public.tenants')
        .where({ is_active: true })
        .select('schema_name', 'home_currency');
      for (const t of tenants) {
        tenantSchemas.push({
          schema: t.schema_name,
          homeCurrency: t.home_currency || 'AED',
        });
      }
    }

    // Group tenants by home currency to minimize API calls
    const currencyGroups: Record<string, string[]> = {};
    for (const tenant of tenantSchemas) {
      if (!currencyGroups[tenant.homeCurrency]) {
        currencyGroups[tenant.homeCurrency] = [];
      }
      currencyGroups[tenant.homeCurrency].push(tenant.schema);
    }

    // Fetch rates for each unique base currency
    const allRates: Record<string, Record<string, number>> = {};

    for (const baseCurrency of Object.keys(currencyGroups)) {
      try {
        // Collect all active currencies across tenants with this base currency
        const schemas = currencyGroups[baseCurrency];
        const targetCurrenciesSet = new Set<string>();

        for (const schema of schemas) {
          const currencies = await db.withSchema(schema).table('currencies')
            .where({ is_active: true })
            .where('code', '!=', baseCurrency)
            .pluck('code');
          for (const code of currencies) {
            targetCurrenciesSet.add(code);
          }
        }

        // Also include explicitly requested target currencies
        if (job.data.targetCurrencies) {
          for (const code of job.data.targetCurrencies) {
            targetCurrenciesSet.add(code);
          }
        }

        const targetCurrencies = Array.from(targetCurrenciesSet);

        if (targetCurrencies.length === 0) {
          logger.info(`No target currencies found for base ${baseCurrency}, skipping`);
          continue;
        }

        // Fetch rates from the exchange rate API
        const rates = await fetchRatesFromApi(baseCurrency, targetCurrencies);
        allRates[baseCurrency] = rates;

        await job.updateProgress(
          Math.floor((Object.keys(allRates).length / Object.keys(currencyGroups).length) * 50),
        );
      } catch (fetchError) {
        logger.error(`Failed to fetch exchange rates for base currency ${baseCurrency}:`, fetchError);
        // Continue with other currencies
      }
    }

    // Apply rates to each tenant
    for (const tenant of tenantSchemas) {
      const rates = allRates[tenant.homeCurrency];
      if (!rates) {
        continue;
      }

      try {
        const today = new Date().toISOString().split('T')[0];

        // Get current rates for comparison
        const currentCurrencies = await db.withSchema(tenant.schema).table('currencies')
          .where({ is_active: true })
          .where('code', '!=', tenant.homeCurrency);

        for (const currency of currentCurrencies) {
          const newRate = rates[currency.code];
          if (newRate === undefined) {
            continue;
          }

          const oldRate = parseFloat(currency.latest_rate || '1');
          const newRateDecimal = new Decimal(newRate);

          // Check if rate has changed significantly (more than 0.0001%)
          const changePercent = oldRate > 0
            ? Math.abs((newRate - oldRate) / oldRate * 100)
            : 100;

          if (changePercent < 0.0001 && oldRate > 0) {
            continue; // Skip insignificant changes
          }

          // Update the currency record
          await db.withSchema(tenant.schema).table('currencies')
            .where({ id: currency.id })
            .update({
              latest_rate: newRateDecimal.toFixed(6),
              last_updated: new Date(),
              updated_at: new Date(),
            });

          // Insert rate history record
          await db.withSchema(tenant.schema).table('exchange_rates').insert({
            id: uuidv4(),
            from_currency: tenant.homeCurrency,
            to_currency: currency.code,
            rate: newRateDecimal.toFixed(6),
            effective_date: today,
            source: 'api',
            created_at: new Date(),
          });

          ratesUpdated++;

          // Log significant rate changes (more than 1%)
          if (changePercent >= 1) {
            logger.warn(
              `Significant exchange rate change for ${tenant.homeCurrency}/${currency.code}: ` +
              `${oldRate.toFixed(6)} -> ${newRate.toFixed(6)} (${changePercent.toFixed(2)}%)`,
            );

            // Queue a rate change log entry
            const { exchangeRateQueue } = await import('./index');
            await exchangeRateQueue.add('log-rate-change', {
              tenantSchema: tenant.schema,
              fromCurrency: tenant.homeCurrency,
              toCurrency: currency.code,
              oldRate,
              newRate,
            });
          }
        }

        tenantsUpdated++;
      } catch (tenantError) {
        logger.error(
          `Failed to update exchange rates for schema ${tenant.schema}:`,
          tenantError,
        );
      }
    }

    await job.updateProgress(100);

    logger.info(
      `Exchange rate update complete: ${tenantsUpdated} tenants updated, ${ratesUpdated} rates refreshed`,
    );

    return { tenantsUpdated, ratesUpdated };
  } catch (error) {
    logger.error('Failed to fetch exchange rates:', error);
    throw error;
  }
}

// ------------------------------------------------------------------
// update-rates: Manually update rates in the database
// ------------------------------------------------------------------

async function updateRatesInDatabase(job: Job<UpdateRatesData>): Promise<{
  updated: number;
}> {
  const { tenantSchema, rates, source } = job.data;
  const db = getDatabase();
  let updated = 0;

  try {
    const today = new Date().toISOString().split('T')[0];

    for (const rateEntry of rates) {
      try {
        const newRateDecimal = new Decimal(rateEntry.rate);

        // Update the currency table
        await db.withSchema(tenantSchema).table('currencies')
          .where({ code: rateEntry.toCurrency, is_active: true })
          .update({
            latest_rate: newRateDecimal.toFixed(6),
            last_updated: new Date(),
            updated_at: new Date(),
          });

        // Insert exchange rate history
        await db.withSchema(tenantSchema).table('exchange_rates').insert({
          id: uuidv4(),
          from_currency: rateEntry.fromCurrency,
          to_currency: rateEntry.toCurrency,
          rate: newRateDecimal.toFixed(6),
          effective_date: today,
          source: source || 'manual',
          created_at: new Date(),
        });

        updated++;
      } catch (rateError) {
        logger.error(
          `Failed to update rate ${rateEntry.fromCurrency}/${rateEntry.toCurrency}:`,
          rateError,
        );
      }
    }

    logger.info(`Manual rate update complete for schema ${tenantSchema}: ${updated} rates updated`);
    return { updated };
  } catch (error) {
    logger.error(`Failed to update rates in database for schema ${tenantSchema}:`, error);
    throw error;
  }
}

// ------------------------------------------------------------------
// log-rate-change: Record significant rate changes
// ------------------------------------------------------------------

async function logRateChange(job: Job<LogRateChangeData>): Promise<void> {
  const { tenantSchema, fromCurrency, toCurrency, oldRate, newRate } = job.data;
  const db = getDatabase();

  try {
    const changePercent = oldRate > 0
      ? ((newRate - oldRate) / oldRate * 100)
      : 0;

    const direction = changePercent > 0 ? 'strengthened' : 'weakened';

    // Create an audit log entry for the rate change
    await db.withSchema(tenantSchema).table('audit_logs').insert({
      id: uuidv4(),
      timestamp: new Date(),
      action: 'update',
      entity_type: 'exchange_rate',
      entity_id: `${fromCurrency}-${toCurrency}`,
      changes: JSON.stringify([
        {
          field: 'rate',
          oldValue: oldRate.toFixed(6),
          newValue: newRate.toFixed(6),
        },
        {
          field: 'change_percent',
          newValue: `${changePercent.toFixed(4)}%`,
        },
      ]),
      metadata: JSON.stringify({
        fromCurrency,
        toCurrency,
        direction,
        significance: Math.abs(changePercent) >= 5 ? 'high' : Math.abs(changePercent) >= 2 ? 'medium' : 'low',
      }),
    });

    // For high significance changes, create a notification for admins
    if (Math.abs(changePercent) >= 2) {
      // Find admin users for this tenant
      const tenant = await db('public.tenants')
        .whereRaw("schema_name = ?", [tenantSchema])
        .first();

      if (tenant) {
        const adminUsers = await db('public.tenant_users')
          .join('public.roles', 'roles.id', 'tenant_users.role_id')
          .where({ 'tenant_users.tenant_id': tenant.id, 'tenant_users.is_active': true })
          .where('roles.name', 'ilike', '%admin%')
          .pluck('tenant_users.user_id');

        for (const userId of adminUsers) {
          await db.withSchema(tenantSchema).table('notifications').insert({
            id: uuidv4(),
            user_id: userId,
            type: 'exchange_rate_alert',
            title: `Exchange Rate Alert: ${toCurrency} ${direction}`,
            message: `${fromCurrency}/${toCurrency} rate changed by ${Math.abs(changePercent).toFixed(2)}% ` +
              `(${oldRate.toFixed(4)} -> ${newRate.toFixed(4)}).`,
            link: '/settings/currencies',
            is_read: false,
            created_at: new Date(),
          });
        }
      }
    }

    logger.info(
      `Exchange rate change logged: ${fromCurrency}/${toCurrency} ` +
      `${oldRate.toFixed(6)} -> ${newRate.toFixed(6)} (${changePercent.toFixed(4)}%)`,
    );
  } catch (error) {
    logger.error(`Failed to log exchange rate change:`, error);
    throw error;
  }
}

// ------------------------------------------------------------------
// API Integration
// ------------------------------------------------------------------

/**
 * Fetches exchange rates from an external API provider.
 * Uses the exchangeratesapi.io (or similar) service.
 * Falls back to cached rates if the API is unavailable.
 */
async function fetchRatesFromApi(
  baseCurrency: string,
  targetCurrencies: string[],
): Promise<Record<string, number>> {
  const apiKey = config.exchangeRates.apiKey;

  if (!apiKey) {
    logger.warn('Exchange rate API key not configured. Using fallback rates.');
    return getFallbackRates(baseCurrency, targetCurrencies);
  }

  try {
    const symbols = targetCurrencies.join(',');
    const url = `https://api.exchangeratesapi.io/v1/latest?access_key=${apiKey}&base=${baseCurrency}&symbols=${symbols}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000), // 15-second timeout
    });

    if (!response.ok) {
      throw new Error(`Exchange rate API returned status ${response.status}: ${response.statusText}`);
    }

    const data: ExchangeRateApiResponse = await response.json();

    if (!data.success) {
      throw new Error('Exchange rate API returned unsuccessful response');
    }

    logger.info(
      `Fetched ${Object.keys(data.rates).length} exchange rates for base ${baseCurrency} (date: ${data.date})`,
    );

    return data.rates;
  } catch (error) {
    logger.error(`Failed to fetch rates from API for ${baseCurrency}:`, error);

    // Try alternative API endpoint
    try {
      return await fetchRatesFromAlternativeApi(baseCurrency, targetCurrencies);
    } catch (altError) {
      logger.error('Alternative API also failed, using fallback rates:', altError);
      return getFallbackRates(baseCurrency, targetCurrencies);
    }
  }
}

/**
 * Alternative exchange rate API as a fallback.
 */
async function fetchRatesFromAlternativeApi(
  baseCurrency: string,
  targetCurrencies: string[],
): Promise<Record<string, number>> {
  const url = `https://open.er-api.com/v6/latest/${baseCurrency}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Alternative exchange rate API returned status ${response.status}`);
  }

  const data = await response.json();

  if (data.result !== 'success') {
    throw new Error('Alternative exchange rate API returned unsuccessful response');
  }

  // Filter to only requested currencies
  const filteredRates: Record<string, number> = {};
  for (const currency of targetCurrencies) {
    if (data.rates[currency] !== undefined) {
      filteredRates[currency] = data.rates[currency];
    }
  }

  logger.info(
    `Fetched ${Object.keys(filteredRates).length} exchange rates from alternative API for base ${baseCurrency}`,
  );

  return filteredRates;
}

/**
 * Returns hardcoded fallback rates for common currency pairs
 * when all API sources are unavailable. These rates are
 * approximate and for development/testing only.
 */
function getFallbackRates(
  baseCurrency: string,
  targetCurrencies: string[],
): Record<string, number> {
  // Approximate rates relative to USD as of a recent snapshot
  const usdRates: Record<string, number> = {
    AED: 3.6725,
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    SAR: 3.75,
    QAR: 3.64,
    BHD: 0.376,
    KWD: 0.307,
    OMR: 0.385,
    JOD: 0.709,
    EGP: 30.9,
    INR: 83.1,
    PKR: 278.5,
    CNY: 7.24,
    JPY: 149.5,
    CAD: 1.36,
    AUD: 1.53,
    CHF: 0.88,
    SGD: 1.34,
    HKD: 7.82,
  };

  // Convert from USD-based rates to the requested base currency
  const baseToUsd = usdRates[baseCurrency] || 1;
  const rates: Record<string, number> = {};

  for (const target of targetCurrencies) {
    const targetFromUsd = usdRates[target];
    if (targetFromUsd !== undefined) {
      rates[target] = targetFromUsd / baseToUsd;
    }
  }

  logger.warn(
    `Using fallback exchange rates for ${baseCurrency}. These are approximate and not suitable for production.`,
  );

  return rates;
}
