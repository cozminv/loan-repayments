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

/** Prepay pe credit (fără investiție), apoi sumă țintă integrală investită până la orizont. */
export function cumulativePrepayThenInvestSeries(
  horizonMonths: number,
  loanPayoffMonth: number,
  targetMonthly: number,
  annualRatePercent: number,
  taxPercent = 0,
): number[] {
  return cumulativeInvestWealthSeries(
    horizonMonths,
    loanPayoffMonth,
    0,
    targetMonthly,
    annualRatePercent,
    taxPercent,
  );
}

/** Cumulative portfolio value by month (în timpul creditului: surplus; după achitare: suma țintă integrală). */
export function cumulativeInvestWealthSeries(
  horizonMonths: number,
  loanPayoffMonth: number,
  surplusMonthly: number,
  targetMonthly: number,
  annualRatePercent: number,
  taxPercent = 0,
): number[] {
  if (horizonMonths <= 0) return [];
  const i = annualRatePercent / 12 / 100;
  const out: number[] = [];
  let wealth = 0;
  let totalContrib = 0;
  for (let m = 1; m <= horizonMonths; m++) {
    const contrib = m <= loanPayoffMonth ? surplusMonthly : targetMonthly;
    wealth = wealth * (1 + i) + contrib;
    totalContrib += contrib;
    out.push(taxPercent > 0 ? afterTaxValue(wealth, totalContrib, taxPercent) : wealth);
  }
  return out;
}

/** FV of monthly surplus invested during loan; optional redirect of full target after payoff. */
export function investSurplusValue(
  investMonthly: number,
  annualRatePercent: number,
  loanPayoffMonths: number,
  contractualTermMonths: number,
  targetMonthly: number,
  postPayoffRedirect: boolean,
  taxPercent: number,
): number {
  if (investMonthly <= 0) return 0;
  if (postPayoffRedirect && targetMonthly > 0) {
    const redirectMonths = Math.max(0, contractualTermMonths - loanPayoffMonths);
    return investWithRedirect(
      investMonthly,
      annualRatePercent,
      loanPayoffMonths,
      targetMonthly,
      redirectMonths,
      taxPercent,
    );
  }
  const fv = futureValueMonthly(investMonthly, annualRatePercent, loanPayoffMonths);
  const contrib = investMonthly * loanPayoffMonths;
  return afterTaxValue(fv, contrib, taxPercent);
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

  const rates = [
    ...new Set(
      [3, 5, 7, 9, 11, breakEvenRatePercent, compareAtRatePercent].filter(
        (r): r is number => r != null && r >= 0 && r <= 30,
      ),
    ),
  ].sort((a, b) => a - b);

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
