import { describe, it, expect } from 'vitest';
import { annuityPayment } from '../src/engine/annuity.ts';
import { amortize } from '../src/engine/amortize.ts';
import { BANK_REFERENCES } from '../src/engine/bankReferences.ts';
import { decreasingPayment } from '../src/engine/decreasing.ts';
import { interestForPeriod } from '../src/engine/interest.ts';

describe('Romanian standard formula (all banks)', () => {
  it('ING Noua Casă official example: 258k, 25y, 7.58%', () => {
    const m = annuityPayment(258_000, 7.58, 300);
    expect(m).toBeCloseTo(1920.04, 1);
    expect(m * 300).toBeCloseTo(576_012, -1);
  });

  it('ING Noua Casă 385k, 28y, 7.58%', () => {
    const m = annuityPayment(385_000, 7.58, 336);
    expect(m).toBeCloseTo(2765.26, 1);
  });

  it('ING decreasing first payment 258k, 25y, 7.58%', () => {
    const first = decreasingPayment(258_000, 7.58, 300);
    expect(first).toBeCloseTo(2489.7, 0);
  });

  it('50k EUR 5.5% 20 years', () => {
    const m = annuityPayment(50_000, 5.5, 240);
    expect(m).toBeGreaterThan(340);
    expect(m).toBeLessThan(350);
  });

  it('monthly_12 equals 30-day actual/360 interest', () => {
    const balance = 100_000;
    const rate = 7.58;
    expect(interestForPeriod(balance, rate, 'monthly_12')).toBeCloseTo(
      interestForPeriod(balance, rate, 'actual_360', 30),
      4,
    );
  });
});

describe('bank reference golden examples', () => {
  const withExamples = BANK_REFERENCES.filter(
    (p) => p.snapshot?.expectedMonthlyPayment != null,
  );
  for (const ref of withExamples) {
    it(`${ref.label} matches published payment`, () => {
      const ex = ref.snapshot!;
      const rate =
        ex.rateMode === 'fixed_then_variable'
          ? {
              mode: 'fixed_then_variable' as const,
              fixedRatePercent: ex.fixedRatePercent!,
              fixedPeriodMonths: (ex.fixedPeriodYears ?? 0) * 12,
              irccPercent: ex.irccPercent,
              marginPercent: ex.marginPercent,
            }
          : {
              mode: 'fixed' as const,
              fixedRatePercent: (ex.irccPercent ?? 0) + (ex.marginPercent ?? 0),
            };
      const result = amortize({
        principal: ex.principal,
        termMonths: ex.termLongYears * 12,
        repaymentType: ex.repaymentType,
        rate,
      });
      expect(
        Math.abs(result.firstPayment - ex.expectedMonthlyPayment!),
      ).toBeLessThanOrEqual(ex.paymentTolerance ?? 5);
    });
  }
});

describe('fixed then variable (BCR-style)', () => {
  it('uses fixed rate during promo period then IRCC+margin', () => {
    const result = amortize({
      principal: 350_000,
      termMonths: 300,
      repaymentType: 'annuity',
      rate: {
        mode: 'fixed_then_variable',
        fixedRatePercent: 4.99,
        fixedPeriodMonths: 36,
        irccPercent: 5.58,
        marginPercent: 2.3,
      },
    });
    expect(result.schedule[0]!.annualRatePercent).toBeCloseTo(4.99, 2);
    expect(result.schedule[37]!.annualRatePercent).toBeCloseTo(7.88, 2);
    expect(result.schedule[0]!.contractualPayment).toBeCloseTo(2044, 0);
  });
});
