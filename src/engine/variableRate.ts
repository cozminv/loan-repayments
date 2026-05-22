import type { RateConfig } from './types.ts';

/** Annual nominal rate for month (1-based). */
export function annualRateForMonth(rate: RateConfig, month: number): number {
  if (rate.mode === 'fixed') {
    return rate.fixedRatePercent ?? 0;
  }

  if (rate.mode === 'fixed_then_variable') {
    const fixedMonths = rate.fixedPeriodMonths ?? 0;
    if (month <= fixedMonths) {
      return rate.fixedRatePercent ?? 0;
    }
    return (rate.irccPercent ?? 0) + (rate.marginPercent ?? 0);
  }

  // variable: IRCC + marjă
  return (rate.irccPercent ?? 0) + (rate.marginPercent ?? 0);
}

/** Rate changes at start of month (quarterly for variable leg). */
export function isRateChangeMonth(rate: RateConfig, month: number): boolean {
  if (rate.mode === 'fixed') return month === 1;

  if (rate.mode === 'fixed_then_variable') {
    const fixedMonths = rate.fixedPeriodMonths ?? 0;
    if (month === 1) return true;
    if (month === fixedMonths + 1) return true;
    if (month > fixedMonths) {
      return (month - fixedMonths - 1) % 3 === 0;
    }
    return false;
  }

  return month === 1 || (month - 1) % 3 === 0;
}
