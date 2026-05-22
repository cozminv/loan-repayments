import { describe, it, expect } from 'vitest';
import { annuityPayment } from '../src/engine/annuity.ts';
import { termMonthsFromAnuityPayment } from '../src/engine/termFromPayment.ts';
import { compareScenarios } from '../src/engine/compareScenarios.ts';

describe('termMonthsFromAnuityPayment', () => {
  it('round-trip: computed term yields target payment', () => {
    const principal = 300_000;
    const rate = 7.58;
    const target = 2500;
    const months = termMonthsFromAnuityPayment(principal, rate, target)!;
    const payment = annuityPayment(principal, rate, months);
    expect(Math.abs(payment - target)).toBeLessThan(5);
  });

  it('higher payment implies shorter term', () => {
    const principal = 250_000;
    const rate = 6.5;
    const short = termMonthsFromAnuityPayment(principal, rate, 2200)!;
    const long = termMonthsFromAnuityPayment(principal, rate, 1800)!;
    expect(short).toBeLessThan(long);
  });
});

describe('compareScenarios monthly_budget', () => {
  it('computes short term from monthly budget without extra', () => {
    const c = compareScenarios({
      principal: 300_000,
      repaymentType: 'annuity',
      rate: { mode: 'fixed', fixedRatePercent: 7.58 },
      comparisonMode: 'monthly_budget',
      targetMonthlyPayment: 2500,
      termShortMonths: 0,
      termLongMonths: 360,
    });
    expect(c.comparisonMode).toBe('monthly_budget');
    expect(c.computedShortTermMonths).toBeGreaterThan(0);
    expect(c.computedShortTermMonths!).toBeLessThan(360);
    expect(c.scenarioB.extraMonthly).toBe(0);
    expect(Math.abs(c.scenarioA.totalMonthly - 2500)).toBeLessThan(5);
  });
});
