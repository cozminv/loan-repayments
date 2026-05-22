import { monthlyRateFromAnnual } from './interest.ts';

/** Standard annuity payment: M = P * r(1+r)^n / ((1+r)^n - 1) */
export function annuityPayment(
  principal: number,
  annualRatePercent: number,
  termMonths: number,
): number {
  if (termMonths <= 0) return 0;
  if (principal <= 0) return 0;
  const r = monthlyRateFromAnnual(annualRatePercent);
  if (r === 0) return principal / termMonths;
  const factor = Math.pow(1 + r, termMonths);
  return (principal * r * factor) / (factor - 1);
}

/** @deprecated use monthlyRateFromAnnual */
export function monthlyRate(annualRatePercent: number): number {
  return monthlyRateFromAnnual(annualRatePercent);
}
