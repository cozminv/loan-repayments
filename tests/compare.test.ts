import { describe, it, expect } from 'vitest';
import {
  compareScenarios,
  extraFromTargetMonthly,
} from '../src/engine/compareScenarios.ts';
import { analyzeInvestVsPrepay } from '../src/engine/investBreakeven.ts';
import { amortize } from '../src/engine/amortize.ts';
import { annuityPayment } from '../src/engine/annuity.ts';

describe('extraFromTargetMonthly', () => {
  it('is target minus contractual payment, floored at 0', () => {
    expect(extraFromTargetMonthly(1800, 2500)).toBe(700);
    expect(extraFromTargetMonthly(2500, 2000)).toBe(0);
  });
});

describe('compareScenarios', () => {
  it('both scenarios match target when extra bridges contractual rates', () => {
    const principal = 300_000;
    const rate = 7.58;
    const termShortMonths = 240;
    const termLongMonths = 360;
    const target = annuityPayment(principal, rate, termShortMonths);

    const c = compareScenarios({
      principal,
      repaymentType: 'annuity',
      rate: { mode: 'fixed', fixedRatePercent: rate },
      termShortMonths,
      termLongMonths,
      targetMonthlyPayment: target,
    });

    expect(c.scenarioA.totalMonthly).toBeCloseTo(target, 0);
    expect(c.scenarioB.totalMonthly).toBeCloseTo(target, 0);
    expect(c.scenarioA.extraMonthly).toBe(0);
    expect(c.scenarioB.extraMonthly).toBeGreaterThan(0);
  });

  it('short term extra is target minus short contractual payment', () => {
    const principal = 300_000;
    const rate = 7.58;
    const termShortMonths = 120;
    const termLongMonths = 360;
    const shortPayment = annuityPayment(principal, rate, termShortMonths);
    const target = shortPayment + 400;

    const c = compareScenarios({
      principal,
      repaymentType: 'annuity',
      rate: { mode: 'fixed', fixedRatePercent: rate },
      termShortMonths,
      termLongMonths,
      targetMonthlyPayment: target,
    });

    expect(c.scenarioA.extraMonthly).toBeCloseTo(400, 0);
    expect(c.scenarioA.totalMonthly).toBeCloseTo(target, 0);
    expect(c.scenarioB.extraMonthly).toBeGreaterThan(c.scenarioA.extraMonthly);
  });

  it('long term extra is target minus long contractual payment', () => {
    const principal = 300_000;
    const rate = 7.58;
    const termLongMonths = 360;
    const longPayment = annuityPayment(principal, rate, termLongMonths);
    const target = longPayment + 500;

    const c = compareScenarios({
      principal,
      repaymentType: 'annuity',
      rate: { mode: 'fixed', fixedRatePercent: rate },
      termShortMonths: 200,
      termLongMonths,
      targetMonthlyPayment: target,
    });

    expect(c.scenarioB.extraMonthly).toBeCloseTo(500, 0);
    expect(c.scenarioB.totalMonthly).toBeCloseTo(target, 0);
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
