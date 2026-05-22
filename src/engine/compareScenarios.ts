import { amortize, effectiveAnnualRate } from './amortize.ts';
import { annuityPayment } from './annuity.ts';
import type {
  ComparisonInputs,
  ComparisonResult,
  ScenarioSummary,
} from './types.ts';

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

export function compareScenarios(inputs: ComparisonInputs): ComparisonResult {
  const {
    principal,
    repaymentType,
    rate,
    termShortMonths,
    termLongMonths,
    extraStrategy = 'shorten_term',
  } = inputs;

  const annualRate = effectiveAnnualRate(rate, 1);

  const resultA = amortize({
    principal,
    termMonths: termShortMonths,
    repaymentType,
    rate,
    extraMonthly: 0,
  });

  const mHigh = resultA.firstPayment || annuityPayment(principal, annualRate, termShortMonths);

  const resultBBase = amortize({
    principal,
    termMonths: termLongMonths,
    repaymentType,
    rate,
    extraMonthly: 0,
  });

  const mLow = resultBBase.firstPayment || annuityPayment(principal, annualRate, termLongMonths);
  const extraMonthly = inputs.extraMonthly ?? Math.max(0, mHigh - mLow);

  const resultB = amortize({
    principal,
    termMonths: termLongMonths,
    repaymentType,
    rate,
    extraMonthly,
    extraStrategy,
  });

  const scenarioA = buildSummary('Termen scurt', termShortMonths, mHigh, 0, resultA);
  const scenarioB = buildSummary(
    'Termen lung + extra',
    termLongMonths,
    resultBBase.firstPayment,
    extraMonthly,
    resultB,
  );

  return {
    scenarioA,
    scenarioB,
    interestDelta: scenarioB.totalInterest - scenarioA.totalInterest,
    totalPaidDelta: scenarioB.totalPaid - scenarioA.totalPaid,
    monthsDelta: scenarioB.payoffMonths - scenarioA.payoffMonths,
    matchedMonthlyOutflow: mHigh,
  };
}
