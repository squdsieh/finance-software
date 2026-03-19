export function formatCurrency(
  amount: string,
  currency = 'USD',
  locale = 'en-US',
): string {
  const num = parseFloat(amount);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(
  value: string | number,
  decimalPlaces = 2,
  thousandSeparator = ',',
  decimalSeparator = '.',
): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const parts = num.toFixed(decimalPlaces).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
  return parts.join(decimalSeparator);
}

export function formatPercentage(value: string, decimalPlaces = 1): string {
  const num = parseFloat(value);
  return `${num.toFixed(decimalPlaces)}%`;
}

export function generateSequenceNumber(prefix: string, nextNumber: number, padding = 4): string {
  return `${prefix}${String(nextNumber).padStart(padding, '0')}`;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function generateTenantSchema(tenantId: string): string {
  return `tenant_${tenantId.replace(/-/g, '_')}`;
}
