import { describe, it, expect } from 'vitest';
import {
  cumulativeInvestWealthSeries,
  cumulativePrepayThenInvestSeries,
  investSurplusValue,
} from '../src/engine/investBreakeven.ts';
import { compareScenarios } from '../src/engine/compareScenarios.ts';
import { annuityPayment } from '../src/engine/annuity.ts';

describe('cumulativeInvestWealthSeries', () => {
  it('switches to full target contribution after payoff month', () => {
    const series = cumulativeInvestWealthSeries(24, 12, 500, 2500, 7);
    expect(series).toHaveLength(24);
    const growthAfterPayoff = series[13]! - series[12]!;
    const growthDuringLoan = series[1]! - series[0]!;
    expect(growthAfterPayoff).toBeGreaterThan(growthDuringLoan);
  });
});

describe('cumulativePrepayThenInvestSeries', () => {
  it('stays flat during prepay then grows with full target', () => {
    const series = cumulativePrepayThenInvestSeries(36, 12, 2500, 7);
    expect(series[11]).toBe(0);
    expect(series[35]!).toBeGreaterThan(series[12]!);
  });
});

describe('invest scenario after payoff', () => {
  it('short term invest uses full target redirect after loan ends', () => {
    const principal = 300_000;
    const rate = 7.58;
    const termShortMonths = 120;
    const termLongMonths = 360;
    const shortPay = annuityPayment(principal, rate, termShortMonths);
    const target = shortPay + 300;

    const c = compareScenarios({
      principal,
      repaymentType: 'annuity',
      rate: { mode: 'fixed', fixedRatePercent: rate },
      termShortMonths,
      termLongMonths,
      targetMonthlyPayment: target,
      investRatePercent: 7,
    });

    const withRedirect = investSurplusValue(
      c.scenarioShortInvest.investMonthly,
      7,
      c.scenarioShortInvest.payoffMonths,
      c.investHorizonMonths,
      target,
      true,
      0,
    );
    expect(c.scenarioShortInvest.investValue).toBeCloseTo(withRedirect, 0);
    expect(c.investHorizonMonths).toBe(termLongMonths);
  });
});
