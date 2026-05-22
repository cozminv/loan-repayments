import { describe, it, expect } from 'vitest';
import { annuityPayment } from '../src/engine/annuity.ts';
import { amortize } from '../src/engine/amortize.ts';

describe('annuityPayment', () => {
  it('computes standard 50k EUR 5.5% 20 years example', () => {
    const m = annuityPayment(50_000, 5.5, 240);
    expect(m).toBeGreaterThan(340);
    expect(m).toBeLessThan(350);
  });
});

describe('amortize annuity', () => {
  it('total paid is principal plus interest', () => {
    const result = amortize({
      principal: 100_000,
      termMonths: 120,
      repaymentType: 'annuity',
      rate: { mode: 'fixed', fixedRatePercent: 6 },
    });
    expect(result.payoffMonths).toBe(120);
    expect(result.totalPaid).toBeGreaterThan(100_000);
    expect(result.schedule[0]!.balance).toBeLessThan(100_000);
  });

  it('extra payment shortens term', () => {
    const base = amortize({
      principal: 200_000,
      termMonths: 240,
      repaymentType: 'annuity',
      rate: { mode: 'fixed', fixedRatePercent: 7 },
    });
    const extra = amortize({
      principal: 200_000,
      termMonths: 240,
      repaymentType: 'annuity',
      rate: { mode: 'fixed', fixedRatePercent: 7 },
      extraMonthly: 500,
      extraStrategy: 'shorten_term',
    });
    expect(extra.payoffMonths).toBeLessThan(base.payoffMonths);
    expect(extra.totalInterest).toBeLessThan(base.totalInterest);
  });
});

describe('decreasing installments', () => {
  it('first payment higher than last', () => {
    const result = amortize({
      principal: 100_000,
      termMonths: 60,
      repaymentType: 'decreasing',
      rate: { mode: 'fixed', fixedRatePercent: 6 },
    });
    const first = result.schedule[0]!.totalPayment;
    const last = result.schedule[result.schedule.length - 1]!.totalPayment;
    expect(first).toBeGreaterThan(last);
  });
});
