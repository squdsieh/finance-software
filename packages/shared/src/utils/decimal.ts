import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function add(a: string, b: string): string {
  return new Decimal(a).plus(new Decimal(b)).toFixed();
}

export function subtract(a: string, b: string): string {
  return new Decimal(a).minus(new Decimal(b)).toFixed();
}

export function multiply(a: string, b: string): string {
  return new Decimal(a).times(new Decimal(b)).toFixed();
}

export function divide(a: string, b: string, decimalPlaces = 4): string {
  return new Decimal(a).dividedBy(new Decimal(b)).toFixed(decimalPlaces);
}

export function round(value: string, decimalPlaces = 2): string {
  return new Decimal(value).toFixed(decimalPlaces);
}

export function isZero(value: string): boolean {
  return new Decimal(value).isZero();
}

export function isPositive(value: string): boolean {
  return new Decimal(value).isPositive();
}

export function isNegative(value: string): boolean {
  return new Decimal(value).isNegative();
}

export function compare(a: string, b: string): number {
  return new Decimal(a).comparedTo(new Decimal(b));
}

export function max(a: string, b: string): string {
  return Decimal.max(new Decimal(a), new Decimal(b)).toFixed();
}

export function min(a: string, b: string): string {
  return Decimal.min(new Decimal(a), new Decimal(b)).toFixed();
}

export function abs(value: string): string {
  return new Decimal(value).abs().toFixed();
}

export function negate(value: string): string {
  return new Decimal(value).negated().toFixed();
}

export function sumAmounts(amounts: string[]): string {
  return amounts.reduce((total, amount) => add(total, amount), '0');
}

export function calculatePercentage(amount: string, percentage: string): string {
  return round(multiply(amount, divide(percentage, '100')));
}

export function calculateTax(amount: string, taxRate: string): string {
  return round(multiply(amount, divide(taxRate, '100')));
}

export function calculateLineTotal(quantity: string, rate: string): string {
  return round(multiply(quantity, rate));
}
