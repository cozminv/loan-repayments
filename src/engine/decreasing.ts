import { interestForPeriod } from './interest.ts';
import type { DayCountConvention } from './interest.ts';

/** Decreasing installment: equal principal slice + interest on remaining balance. */
export function decreasingPayment(
  balance: number,
  annualRatePercent: number,
  monthsRemaining: number,
  convention: DayCountConvention = 'monthly_12',
): number {
  if (monthsRemaining <= 0 || balance <= 0) return 0;
  const principalSlice = balance / monthsRemaining;
  const interest = interestForPeriod(balance, annualRatePercent, convention);
  return principalSlice + interest;
}
