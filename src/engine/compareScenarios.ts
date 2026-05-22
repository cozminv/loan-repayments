import { amortize, effectiveAnnualRate } from './amortize.ts';
import { termMonthsFromTargetPayment } from './termFromPayment.ts';
import type { ComparisonInputs, ComparisonResult, ScenarioSummary } from './types.ts';

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
    termLongMonths,
    comparisonMode = 'monthly_budget',
    extraStrategy = 'shorten_term',
  } = inputs;

  const annualRate = effectiveAnnualRate(rate, 1);
  let termShortMonths = inputs.termShortMonths;
  let computedShortTermMonths: number | undefined;

  if (comparisonMode === 'monthly_budget') {
    const target = inputs.targetMonthlyPayment ?? 0;
    const computed = termMonthsFromTargetPayment(
      principal,
      annualRate,
      target,
      repaymentType,
    );
    if (computed == null) {
      throw new Error(
        'Bugetul lunar este prea mic pentru a acoperi dobânda. Mărește suma sau verifică dobânda.',
      );
    }
    termShortMonths = computed;
    computedShortTermMonths = computed;
  }

  const resultA = amortize({
    principal,
    termMonths: termShortMonths,
    repaymentType,
    rate,
    extraMonthly: 0,
  });

  const mHigh = resultA.firstPayment;

  const resultBBase = amortize({
    principal,
    termMonths: termLongMonths,
    repaymentType,
    rate,
    extraMonthly: 0,
  });

  const mLow = resultBBase.firstPayment;

  let extraMonthly = 0;
  let resultB = resultBBase;

  if (comparisonMode === 'fixed_terms') {
    extraMonthly = inputs.extraMonthly ?? Math.max(0, mHigh - mLow);
    resultB = amortize({
      principal,
      termMonths: termLongMonths,
      repaymentType,
      rate,
      extraMonthly,
      extraStrategy,
    });
  }

  const labelA =
    comparisonMode === 'monthly_budget' ? 'Termen scurt (buget lunar)' : 'Termen scurt';
  const labelB =
    comparisonMode === 'monthly_budget' ? 'Termen lung (contractual)' : 'Termen lung + extra';

  const scenarioA = buildSummary(labelA, termShortMonths, mHigh, 0, resultA);
  const scenarioB = buildSummary(labelB, termLongMonths, mLow, extraMonthly, resultB);

  const matchedMonthlyOutflow =
    comparisonMode === 'monthly_budget' ? inputs.targetMonthlyPayment ?? mHigh : mHigh;

  return {
    comparisonMode,
    computedShortTermMonths,
    scenarioA,
    scenarioB,
    interestDelta: scenarioB.totalInterest - scenarioA.totalInterest,
    totalPaidDelta: scenarioB.totalPaid - scenarioA.totalPaid,
    monthsDelta: scenarioB.payoffMonths - scenarioA.payoffMonths,
    matchedMonthlyOutflow,
  };
}
