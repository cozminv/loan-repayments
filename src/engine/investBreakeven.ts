import type { AmortizationResult, InvestAnalysis, InvestOptions } from './types.ts';

/** Future value of monthly contributions at monthly rate i for n months */
export function futureValueMonthly(
  contribution: number,
  annualRatePercent: number,
  months: number,
): number {
  if (months <= 0 || contribution <= 0) return 0;
  const i = annualRatePercent / 12 / 100;
  if (i === 0) return contribution * months;
  return contribution * ((Math.pow(1 + i, months) - 1) / i);
}

function afterTaxValue(
  fv: number,
  contributions: number,
  taxPercent: number,
): number {
  const gains = Math.max(0, fv - contributions);
  return fv - gains * (taxPercent / 100);
}

export function investWithRedirect(
  extraMonthly: number,
  annualRatePercent: number,
  investMonths: number,
  redirectMonthly: number,
  redirectMonths: number,
  taxPercent: number,
): number {
  const phase1 = futureValueMonthly(extraMonthly, annualRatePercent, investMonths);
  const phase1Contrib = extraMonthly * investMonths;
  let wealth = afterTaxValue(phase1, phase1Contrib, taxPercent);

  if (redirectMonths > 0 && redirectMonthly > 0) {
    const phase2 = futureValueMonthly(redirectMonthly, annualRatePercent, redirectMonths);
    const phase2Contrib = redirectMonthly * redirectMonths;
    wealth += afterTaxValue(phase2, phase2Contrib, taxPercent);
  }

  return wealth;
}

export function analyzeInvestVsPrepay(
  baseline: AmortizationResult,
  withExtra: AmortizationResult,
  options: InvestOptions,
  compareAtRatePercent?: number,
): InvestAnalysis {
  const interestSaved = baseline.totalInterest - withExtra.totalInterest;
  const horizonMonths = options.horizonMonths;
  const extra = options.extraMonthly;
  const tax = options.capitalGainsTaxPercent ?? 0;
  const payoffMonths = withExtra.payoffMonths;

  function investValueAt(ratePercent: number): number {
    if (options.postPayoffRedirect && options.redirectMonthly) {
      const investMonths = payoffMonths;
      const redirectMonths = Math.max(0, horizonMonths - payoffMonths);
      return investWithRedirect(
        extra,
        ratePercent,
        investMonths,
        options.redirectMonthly,
        redirectMonths,
        tax,
      );
    }
    const fv = futureValueMonthly(extra, ratePercent, horizonMonths);
    const contrib = extra * horizonMonths;
    return afterTaxValue(fv, contrib, tax);
  }

  let lo = 0;
  let hi = 30;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (investValueAt(mid) < interestSaved) lo = mid;
    else hi = mid;
  }
  const breakEvenRatePercent = (lo + hi) / 2;

  const rates = [3, 5, 7, 9, 11];
  const sensitivity = rates.map((ratePercent) => {
    const investValue = investValueAt(ratePercent);
    const delta = investValue - interestSaved;
    return {
      ratePercent,
      investValue,
      prepayWins: delta < 0,
      delta,
    };
  });

  let atRate: InvestAnalysis['atRate'];
  if (compareAtRatePercent !== undefined) {
    const investValue = investValueAt(compareAtRatePercent);
    atRate = {
      ratePercent: compareAtRatePercent,
      investValue,
      delta: investValue - interestSaved,
    };
  }

  return {
    interestSaved,
    breakEvenRatePercent,
    sensitivity,
    atRate,
  };
}
