import { annuityPayment } from './annuity.ts';
import { monthlyRateFromAnnual } from './interest.ts';
import type { RepaymentType } from './types.ts';

const MAX_TERM_MONTHS = 600;

/**
 * Months needed so annuity payment equals target (rate egale).
 * M = P·r·(1+r)^n / ((1+r)^n − 1)  →  n = log(M/(M−P·r)) / log(1+r)
 */
export function termMonthsFromAnuityPayment(
  principal: number,
  annualRatePercent: number,
  targetPayment: number,
): number | null {
  if (principal <= 0 || targetPayment <= 0) return null;
  const r = monthlyRateFromAnnual(annualRatePercent);
  if (r === 0) return Math.min(MAX_TERM_MONTHS, Math.ceil(principal / targetPayment));

  const interestOnly = principal * r;
  if (targetPayment <= interestOnly) return null;

  const maxPayment = annuityPayment(principal, annualRatePercent, 1);
  if (targetPayment >= maxPayment) return 1;

  const u = targetPayment / (targetPayment - interestOnly);
  const nExact = Math.log(u) / Math.log(1 + r);
  const candidates = [
    Math.floor(nExact),
    Math.ceil(nExact),
    Math.round(nExact),
  ].filter((m, i, arr) => m >= 1 && m <= MAX_TERM_MONTHS && arr.indexOf(m) === i);

  let best = candidates[0]!;
  let bestDiff = Infinity;
  for (const m of candidates) {
    const p = annuityPayment(principal, annualRatePercent, m);
    const diff = Math.abs(p - targetPayment);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = m;
    }
  }
  return best;
}

/** Months so first decreasing installment equals target. */
export function termMonthsFromDecreasingPayment(
  principal: number,
  annualRatePercent: number,
  targetPayment: number,
): number | null {
  if (principal <= 0 || targetPayment <= 0) return null;
  const r = monthlyRateFromAnnual(annualRatePercent);
  const minFirst = principal * r;
  if (targetPayment <= minFirst) return null;

  const nExact = principal / (targetPayment - minFirst);
  const candidates = [
    Math.floor(nExact),
    Math.ceil(nExact),
    Math.round(nExact),
  ].filter((m, i, arr) => m >= 1 && m <= MAX_TERM_MONTHS && arr.indexOf(m) === i);
  return candidates.length > 0 ? candidates[0]! : null;
}

export function termMonthsFromTargetPayment(
  principal: number,
  annualRatePercent: number,
  targetPayment: number,
  repaymentType: RepaymentType,
): number | null {
  if (repaymentType === 'annuity') {
    return termMonthsFromAnuityPayment(principal, annualRatePercent, targetPayment);
  }
  return termMonthsFromDecreasingPayment(principal, annualRatePercent, targetPayment);
}
