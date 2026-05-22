import { annuityPayment } from './annuity.ts';
import { decreasingPayment } from './decreasing.ts';
import { interestForPeriod, type DayCountConvention } from './interest.ts';
import { annualRateForMonth, isRateChangeMonth } from './variableRate.ts';
import type {
  AmortizationResult,
  LoanParams,
  RateConfig,
  RepaymentType,
  ScheduleRow,
} from './types.ts';

const MAX_MONTHS = 600;
const EPS = 0.01;

function getContractual(
  balance: number,
  monthsRemaining: number,
  annualRatePercent: number,
  repaymentType: RepaymentType,
  convention: DayCountConvention,
): number {
  if (balance <= EPS || monthsRemaining <= 0) return 0;
  if (repaymentType === 'annuity') {
    return annuityPayment(balance, annualRatePercent, monthsRemaining);
  }
  return decreasingPayment(balance, annualRatePercent, monthsRemaining, convention);
}

export function amortize(params: LoanParams): AmortizationResult {
  const {
    principal,
    termMonths,
    repaymentType,
    rate,
    extraMonthly = 0,
    extraStrategy = 'shorten_term',
    dayCountConvention = 'monthly_12',
  } = params;

  const schedule: ScheduleRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;
  let contractual = 0;

  for (let month = 1; month <= MAX_MONTHS && balance > EPS; month++) {
    const annualRate = annualRateForMonth(rate, month);
    const monthsRemaining = Math.max(1, termMonths - month + 1);

    const recalcPayment =
      month === 1 ||
      isRateChangeMonth(rate, month) ||
      repaymentType === 'decreasing' ||
      (extraStrategy === 'reduce_payment' && extraMonthly > 0);

    if (recalcPayment) {
      contractual = getContractual(
        balance,
        monthsRemaining,
        annualRate,
        repaymentType,
        dayCountConvention,
      );
    }

    const interest = interestForPeriod(balance, annualRate, dayCountConvention);
    let principalPortion: number;

    if (repaymentType === 'annuity') {
      principalPortion = Math.min(Math.max(0, contractual - interest), balance);
    } else {
      principalPortion = Math.min(balance / monthsRemaining, balance);
    }

    let appliedExtra = extraMonthly;
    if (principalPortion + appliedExtra > balance) {
      appliedExtra = Math.max(0, balance - principalPortion);
    }

    const totalPayment = interest + principalPortion + appliedExtra;
    balance = Math.max(0, balance - principalPortion - appliedExtra);
    totalInterest += interest;
    totalPaid += totalPayment;

    schedule.push({
      month,
      annualRatePercent: annualRate,
      interest,
      principal: principalPortion,
      extra: appliedExtra,
      contractualPayment: contractual,
      totalPayment,
      balance,
    });

    if (extraStrategy === 'shorten_term' && balance <= EPS) break;
  }

  return {
    schedule,
    firstPayment: schedule[0]?.contractualPayment ?? 0,
    totalInterest,
    totalPaid,
    payoffMonths: schedule.length,
  };
}

export function effectiveAnnualRate(rate: RateConfig, month = 1): number {
  return annualRateForMonth(rate, month);
}
