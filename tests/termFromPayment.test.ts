import { describe, it, expect } from 'vitest';
import { annuityPayment } from '../src/engine/annuity.ts';
import { termMonthsFromAnuityPayment } from '../src/engine/termFromPayment.ts';

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
