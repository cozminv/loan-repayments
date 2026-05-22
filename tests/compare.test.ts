import { describe, it, expect } from 'vitest';
import {
  compareScenarios,
  extraFromTargetMonthly,
} from '../src/engine/compareScenarios.ts';
import { analyzeInvestVsPrepay } from '../src/engine/investBreakeven.ts';
import { amortize } from '../src/engine/amortize.ts';
import { annuityPayment } from '../src/engine/annuity.ts';

const baseInputs = {
  principal: 300_000,
  repaymentType: 'annuity' as const,
  rate: { mode: 'fixed' as const, fixedRatePercent: 7.58 },
  termShortMonths: 240,
  termLongMonths: 360,
  investRatePercent: 7,
};

describe('extraFromTargetMonthly', () => {
  it('is target minus contractual payment, floored at 0', () => {
    expect(extraFromTargetMonthly(1800, 2500)).toBe(700);
    expect(extraFromTargetMonthly(2500, 2000)).toBe(0);
  });
});

describe('compareScenarios', () => {
  it('returns four scenarios: short/long prepay and invest', () => {
    const target = annuityPayment(300_000, 7.58, 240);
    const c = compareScenarios({
      ...baseInputs,
      targetMonthlyPayment: target,
    });

    expect(c.scenarioShortPrepay.mode).toBe('prepay');
    expect(c.scenarioLongPrepay.mode).toBe('prepay');
    expect(c.scenarioShortInvest.mode).toBe('invest');
    expect(c.scenarioLongInvest.mode).toBe('invest');
    expect(c.scenarioShortPrepay.totalMonthly).toBeCloseTo(target, 0);
    expect(c.scenarioLongPrepay.totalMonthly).toBeCloseTo(target, 0);
  });

  it('invest scenarios have no loan extra but invest monthly surplus', () => {
    const shortPayment = annuityPayment(300_000, 7.58, 120);
    const target = shortPayment + 400;

    const c = compareScenarios({
      ...baseInputs,
      termShortMonths: 120,
      targetMonthlyPayment: target,
    });

    expect(c.scenarioShortInvest.extraMonthly).toBe(0);
    expect(c.scenarioShortInvest.investMonthly).toBeCloseTo(400, 0);
    expect(c.scenarioShortInvest.investValue).toBeGreaterThan(0);
    expect(c.scenarioShortPrepay.extraMonthly).toBeCloseTo(400, 0);
  });

  it('long prepay matches target when extra bridges contractual rates', () => {
    const target = annuityPayment(300_000, 7.58, 240);
    const longPayment = annuityPayment(300_000, 7.58, 360);
    const extra = extraFromTargetMonthly(longPayment, target);

    const c = compareScenarios({
      ...baseInputs,
      targetMonthlyPayment: target,
    });

    expect(c.scenarioLongPrepay.extraMonthly).toBeCloseTo(extra, 0);
    expect(c.scenarioLongPrepay.totalMonthly).toBeCloseTo(target, 0);
  });

  it('invest horizon matches contractual long term', () => {
    const c = compareScenarios({
      ...baseInputs,
      targetMonthlyPayment: 2500,
    });
    expect(c.investHorizonMonths).toBe(baseInputs.termLongMonths);
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
