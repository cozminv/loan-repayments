import { amortize } from './amortize.ts';
import { investSurplusValue } from './investBreakeven.ts';
import type {
  ComparisonInputs,
  ComparisonResult,
  ExtraStrategy,
  RateConfig,
  RepaymentType,
  ScenarioSummary,
} from './types.ts';

function buildPrepaySummary(
  label: string,
  termMonths: number,
  contractualPayment: number,
  extraMonthly: number,
  result: ReturnType<typeof amortize>,
): ScenarioSummary {
  return {
    label,
    mode: 'prepay',
    termMonths,
    contractualPayment,
    extraMonthly,
    investMonthly: 0,
    totalMonthly: contractualPayment + extraMonthly,
    payoffMonths: result.payoffMonths,
    totalInterest: result.totalInterest,
    totalPaid: result.totalPaid,
    result,
  };
}

/** Plată extra / investiție lunară = sumă țintă − rata contractuală la acel termen (≥ 0). */
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

function buildInvestSummary(
  label: string,
  termMonths: number,
  investHorizonMonths: number,
  principal: number,
  repaymentType: RepaymentType,
  rate: RateConfig,
  targetMonthlyPayment: number,
  investRatePercent: number,
  capitalGainsTaxPercent: number,
): ScenarioSummary {
  const contractual = contractualPaymentAtTerm(principal, termMonths, repaymentType, rate);
  const investMonthly = extraFromTargetMonthly(contractual, targetMonthlyPayment);
  const result = amortize({
    principal,
    termMonths,
    repaymentType,
    rate,
    extraMonthly: 0,
  });

  // După achitarea creditului, toată suma țintă merge în investiție până la orizontul de comparație.
  const investValue = investSurplusValue(
    investMonthly,
    investRatePercent,
    result.payoffMonths,
    investHorizonMonths,
    targetMonthlyPayment,
    true,
    capitalGainsTaxPercent,
  );

  return {
    label,
    mode: 'invest',
    termMonths,
    contractualPayment: contractual,
    extraMonthly: 0,
    investMonthly,
    totalMonthly: targetMonthlyPayment,
    payoffMonths: result.payoffMonths,
    totalInterest: result.totalInterest,
    totalPaid: result.totalPaid,
    investValue,
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
    targetMonthlyPayment,
    extraStrategy = 'shorten_term',
    investRatePercent,
    capitalGainsTaxPercent = 0,
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

  const scenarioShortPrepay = buildPrepaySummary(
    'Termen scurt + prepay',
    termShortMonths,
    short.contractual,
    short.extra,
    short.result,
  );
  const scenarioLongPrepay = buildPrepaySummary(
    'Termen lung + prepay',
    termLongMonths,
    long.contractual,
    long.extra,
    long.result,
  );

  const investHorizonMonths = termLongMonths;

  const scenarioShortInvest = buildInvestSummary(
    'Termen scurt + investiție',
    termShortMonths,
    investHorizonMonths,
    principal,
    repaymentType,
    rate,
    targetMonthlyPayment,
    investRatePercent,
    capitalGainsTaxPercent,
  );
  const scenarioLongInvest = buildInvestSummary(
    'Termen lung + investiție',
    termLongMonths,
    investHorizonMonths,
    principal,
    repaymentType,
    rate,
    targetMonthlyPayment,
    investRatePercent,
    capitalGainsTaxPercent,
  );

  return {
    scenarioShortPrepay,
    scenarioLongPrepay,
    scenarioShortInvest,
    scenarioLongInvest,
    scenarioA: scenarioShortPrepay,
    scenarioB: scenarioLongPrepay,
    interestDelta: scenarioLongPrepay.totalInterest - scenarioShortPrepay.totalInterest,
    totalPaidDelta: scenarioLongPrepay.totalPaid - scenarioShortPrepay.totalPaid,
    monthsDelta: scenarioLongPrepay.payoffMonths - scenarioShortPrepay.payoffMonths,
    matchedMonthlyOutflow: targetMonthlyPayment,
    investHorizonMonths,
  };
}
