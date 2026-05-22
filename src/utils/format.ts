import type { Currency } from '../engine/types.ts';

export function formatMoney(amount: number, currency: Currency): string {
  const code = currency === 'RON' ? 'RON' : 'EUR';
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatMonths(months: number): string {
  const years = Math.floor(months / 12);
  const m = months % 12;
  if (years === 0) return `${months} luni`;
  if (m === 0) return `${years} ani`;
  return `${years} ani, ${m} luni`;
}
