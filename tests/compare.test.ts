import { describe, it, expect } from 'vitest';
import { compareScenarios } from '../src/engine/compareScenarios.ts';
import { analyzeInvestVsPrepay } from '../src/engine/investBreakeven.ts';
import { amortize } from '../src/engine/amortize.ts';

describe('compareScenarios', () => {
  it('matches monthly outflow between short and long+extra', () => {
    const c = compareScenarios({
      principal: 300_000,
      repaymentType: 'annuity',
      rate: { mode: 'fixed', fixedRatePercent: 7.58 },
      comparisonMode: 'fixed_terms',
      termShortMonths: 240,
      termLongMonths: 360,
    });
    expect(c.scenarioA.totalMonthly).toBeCloseTo(c.scenarioB.totalMonthly, 0);
    expect(c.matchedMonthlyOutflow).toBeCloseTo(c.scenarioA.totalMonthly, 0);
  });

  it('shorter term pays less or equal interest at matched monthly outflow', () => {
    const c = compareScenarios({
      principal: 250_000,
      repaymentType: 'annuity',
      rate: { mode: 'fixed', fixedRatePercent: 6.5 },
      comparisonMode: 'fixed_terms',
      termShortMonths: 120,
      termLongMonths: 360,
    });
    expect(c.scenarioA.totalInterest).toBeLessThanOrEqual(c.scenarioB.totalInterest + 1);
  });
});

describe('investBreakeven', () => {
  it('finds break-even between prepay savings and investment FV', () => {
    const baseline = amortize({
      principal: 200_000,
      termMonths: 300,
      repaymentType: 'annuity',
      rate: { mode: 'fixed', fixedRatePercent: 7 },
    });
    const withExtra = amortize({
      principal: 200_000,
      termMonths: 300,
      repaymentType: 'annuity',
      rate: { mode: 'fixed', fixedRatePercent: 7 },
      extraMonthly: 400,
    });
    const analysis = analyzeInvestVsPrepay(baseline, withExtra, {
      extraMonthly: 400,
      horizonMonths: withExtra.payoffMonths,
    });
    expect(analysis.breakEvenRatePercent).toBeGreaterThan(0);
    expect(analysis.breakEvenRatePercent).toBeLessThan(15);
    expect(analysis.interestSaved).toBeGreaterThan(0);
  });
});
