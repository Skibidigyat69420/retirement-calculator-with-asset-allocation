export const formatCurrency = (val: number, fractionDigits = 0): string => {
  if (val === undefined || val === null || Number.isNaN(val)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(val);
};

export const formatCurrencyCompact = (val: number): string => {
  if (val === undefined || val === null || Number.isNaN(val)) return '₹0';
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(2)}K`;
  return formatCurrency(val);
};

// Alias matching the audit-plan naming; same Lakhs/Crores-by-magnitude logic.
export const formatCompactCurrency = formatCurrencyCompact;

export const formatPercent = (val: number, fractionDigits = 1): string => {
  if (val === undefined || val === null || Number.isNaN(val)) return '0%';
  return `${val.toFixed(fractionDigits)}%`;
};

export const formatNumber = (val: number, fractionDigits = 0): string => {
  if (val === undefined || val === null || Number.isNaN(val)) return '0';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(val);
};

export const formatDate = (val: Date | string | number, withTime = false): string => {
  const date = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
};

export const parseCurrencyInput = (val: string): number => {
  const cleaned = val.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
};
