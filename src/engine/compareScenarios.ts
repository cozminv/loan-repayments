import { amortize } from './amortize.ts';
import type { ComparisonInputs, ComparisonResult, ExtraStrategy, RateConfig, RepaymentType, ScenarioSummary } from './types.ts';

function buildSummary(
  label: string,
  termMonths: number,
  contractualPayment: number,
  extraMonthly: number,
  result: ReturnType<typeof amortize>,
): ScenarioSummary {
  return {
    label,
    termMonths,
    contractualPayment,
    extraMonthly,
    totalMonthly: contractualPayment + extraMonthly,
    payoffMonths: result.payoffMonths,
    totalInterest: result.totalInterest,
    totalPaid: result.totalPaid,
    result,
  };
}

/** Plată extra = sumă țintă − rata contractuală la acel termen (≥ 0). */
export function extraFromTargetMonthly(
  contractualPayment: number,
  targetMonthlyPayment: number,
): number {
  return Math.max(0, targetMonthlyPayment - contractualPayment);
}

function contractualPaymentAtTerm(
  principal: number,
  termMonths: number,
  repaymentType: RepaymentType,
  rate: RateConfig,
): number {
  return amortize({
    principal,
    termMonths,
    repaymentType,
    rate,
    extraMonthly: 0,
  }).firstPayment;
}

function amortizeWithTargetExtra(
  principal: number,
  termMonths: number,
  repaymentType: RepaymentType,
  rate: RateConfig,
  targetMonthlyPayment: number,
  extraStrategy: ExtraStrategy,
): { result: ReturnType<typeof amortize>; contractual: number; extra: number } {
  const contractual = contractualPaymentAtTerm(principal, termMonths, repaymentType, rate);
  const extra = extraFromTargetMonthly(contractual, targetMonthlyPayment);
  const result = amortize({
    principal,
    termMonths,
    repaymentType,
    rate,
    extraMonthly: extra,
    extraStrategy,
  });
  return { result, contractual, extra };
}

export function compareScenarios(inputs: ComparisonInputs): ComparisonResult {
  const {
    principal,
    repaymentType,
    rate,
    termShortMonths,
    termLongMonths,
    targetMonthlyPayment,
    extraStrategy = 'shorten_term',
  } = inputs;

  const short = amortizeWithTargetExtra(
    principal,
    termShortMonths,
    repaymentType,
    rate,
    targetMonthlyPayment,
    extraStrategy,
  );

  const long = amortizeWithTargetExtra(
    principal,
    termLongMonths,
    repaymentType,
    rate,
    targetMonthlyPayment,
    extraStrategy,
  );

  const scenarioA = buildSummary(
    'Termen scurt + extra',
    termShortMonths,
    short.contractual,
    short.extra,
    short.result,
  );
  const scenarioB = buildSummary(
    'Termen lung + extra',
    termLongMonths,
    long.contractual,
    long.extra,
    long.result,
  );

  return {
    scenarioA,
    scenarioB,
    interestDelta: scenarioB.totalInterest - scenarioA.totalInterest,
    totalPaidDelta: scenarioB.totalPaid - scenarioA.totalPaid,
    monthsDelta: scenarioB.payoffMonths - scenarioA.payoffMonths,
    matchedMonthlyOutflow: targetMonthlyPayment,
  };
}
