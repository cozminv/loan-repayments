import type { LoanFormValues } from './loanForm.ts';
import type { RateConfig } from '../engine/types.ts';

export function formValuesToRateConfig(v: Pick<LoanFormValues, 'rateMode' | 'fixedRatePercent' | 'fixedPeriodYears' | 'irccPercent' | 'marginPercent'>): RateConfig {
  if (v.rateMode === 'fixed') {
    return { mode: 'fixed', fixedRatePercent: v.fixedRatePercent };
  }
  if (v.rateMode === 'fixed_then_variable') {
    return {
      mode: 'fixed_then_variable',
      fixedRatePercent: v.fixedRatePercent,
      fixedPeriodMonths: v.fixedPeriodYears * 12,
      irccPercent: v.irccPercent,
      marginPercent: v.marginPercent,
    };
  }
  return {
    mode: 'variable',
    irccPercent: v.irccPercent,
    marginPercent: v.marginPercent,
  };
}
