import { describe, it, expect } from 'vitest';
import { annualRateForMonth, isRateChangeMonth } from '../src/engine/variableRate.ts';
import { amortize } from '../src/engine/amortize.ts';

describe('variableRate', () => {
  it('IRCC + margin applies quarterly', () => {
    const rate = { mode: 'variable' as const, irccPercent: 5.58, marginPercent: 2 };
    expect(annualRateForMonth(rate, 1)).toBeCloseTo(7.58, 2);
    expect(isRateChangeMonth(rate, 4)).toBe(true);
    expect(isRateChangeMonth(rate, 2)).toBe(false);
  });

  it('amortizes with variable rate config', () => {
    const result = amortize({
      principal: 300_000,
      termMonths: 360,
      repaymentType: 'annuity',
      rate: { mode: 'variable', irccPercent: 5.58, marginPercent: 2 },
    });
    expect(result.payoffMonths).toBe(360);
    expect(result.firstPayment).toBeGreaterThan(2100);
    expect(result.firstPayment).toBeLessThan(2130);
  });
});
