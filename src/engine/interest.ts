/**
 * Romanian mortgage interest conventions (BNR / OUG 52/2016 market practice):
 *
 * - Rate egale: annuity M = P × r(1+r)^n / ((1+r)^n − 1), r = dobândă anuală / 12
 * - Dobândă lunară pe sold: sold × dobândă_anuală / 12 (echivalent cu an comercial 360 zile × 30 zile)
 * - IRCC + marjă fixă, actualizare trimestrială a ratei și recalcularea ratei (anuități)
 *
 * All major banks (ING, BCR, BRD, Raiffeisen, BT) use this framework; differences are
 * marjă, perioadă fixă promoțională, and fees — not a different amortization formula.
 */

export type DayCountConvention = 'monthly_12' | 'actual_360';

/** Monthly rate for annuity formula: annual% / 12 / 100 */
export function monthlyRateFromAnnual(annualRatePercent: number): number {
  return annualRatePercent / 12 / 100;
}

/** Interest for one period on remaining balance */
export function interestForPeriod(
  balance: number,
  annualRatePercent: number,
  convention: DayCountConvention = 'monthly_12',
  daysInMonth = 30,
): number {
  if (balance <= 0) return 0;
  if (convention === 'monthly_12') {
    return balance * monthlyRateFromAnnual(annualRatePercent);
  }
  // Actual/360: used in ESIS / some contracts; 30-day month ≡ monthly_12
  return balance * (annualRatePercent / 100 / 360) * daysInMonth;
}
