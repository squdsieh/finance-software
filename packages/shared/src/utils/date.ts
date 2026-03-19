export function formatDate(date: Date | string, format = 'YYYY-MM-DD'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
    case 'DD-MM-YYYY': return `${day}-${month}-${year}`;
    default: return `${year}-${month}-${day}`;
  }
}

export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function diffDays(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const diff = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getDueDateFromTerms(invoiceDate: string, terms: string, customDays?: number): string {
  const date = new Date(invoiceDate);
  let days = 0;

  switch (terms) {
    case 'due_on_receipt': days = 0; break;
    case 'net_15': days = 15; break;
    case 'net_30': days = 30; break;
    case 'net_60': days = 60; break;
    case 'net_90': days = 90; break;
    case 'custom': days = customDays || 30; break;
    default: days = 30;
  }

  return formatDate(addDays(date, days));
}

export function getStartOfMonth(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function getEndOfMonth(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

export function getFiscalYearDates(date: Date | string, fiscalStartMonth: number) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const currentMonth = d.getUTCMonth() + 1;
  const currentYear = d.getUTCFullYear();

  let startYear = currentMonth >= fiscalStartMonth ? currentYear : currentYear - 1;

  return {
    start: new Date(Date.UTC(startYear, fiscalStartMonth - 1, 1)),
    end: new Date(Date.UTC(startYear + 1, fiscalStartMonth - 1, 0)),
  };
}

export function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}
