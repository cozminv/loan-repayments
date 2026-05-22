import type { DayCountConvention } from './interest.ts';

export type RepaymentType = 'annuity' | 'decreasing';
export type RateMode = 'fixed' | 'variable' | 'fixed_then_variable';
export type Currency = 'RON' | 'EUR';
export type ExtraStrategy = 'shorten_term' | 'reduce_payment';

export interface RateConfig {
  mode: RateMode;
  /** Fixed nominal annual rate (%) — entire term or promo period */
  fixedRatePercent?: number;
  /** Months at fixed rate before switching to IRCC+marjă */
  fixedPeriodMonths?: number;
  /** IRCC index (%) for variable / post-fix leg */
  irccPercent?: number;
  /** Bank margin (%) */
  marginPercent?: number;
}

export interface LoanParams {
  principal: number;
  termMonths: number;
  repaymentType: RepaymentType;
  rate: RateConfig;
  extraMonthly?: number;
  extraStrategy?: ExtraStrategy;
  dayCountConvention?: DayCountConvention;
}

export interface ScheduleRow {
  month: number;
  annualRatePercent: number;
  interest: number;
  principal: number;
  extra: number;
  contractualPayment: number;
  totalPayment: number;
  balance: number;
}

export interface AmortizationResult {
  schedule: ScheduleRow[];
  firstPayment: number;
  totalInterest: number;
  totalPaid: number;
  payoffMonths: number;
}

export interface ComparisonInputs {
  principal: number;
  repaymentType: RepaymentType;
  rate: RateConfig;
  termShortMonths: number;
  termLongMonths: number;
  targetMonthlyPayment: number;
  extraStrategy?: ExtraStrategy;
  dayCountConvention?: DayCountConvention;
}

export interface ScenarioSummary {
  label: string;
  termMonths: number;
  contractualPayment: number;
  extraMonthly: number;
  totalMonthly: number;
  payoffMonths: number;
  totalInterest: number;
  totalPaid: number;
  result: AmortizationResult;
}

export interface ComparisonResult {
  scenarioA: ScenarioSummary;
  scenarioB: ScenarioSummary;
  interestDelta: number;
  totalPaidDelta: number;
  monthsDelta: number;
  matchedMonthlyOutflow: number;
}

export interface InvestOptions {
  extraMonthly: number;
  horizonMonths: number;
  capitalGainsTaxPercent?: number;
  postPayoffRedirect?: boolean;
  redirectMonthly?: number;
}

export interface InvestAnalysis {
  interestSaved: number;
  breakEvenRatePercent: number;
  sensitivity: { ratePercent: number; investValue: number; prepayWins: boolean; delta: number }[];
  atRate?: { ratePercent: number; investValue: number; delta: number };
}
