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

export type ScenarioMode = 'prepay' | 'invest';

export interface ComparisonInputs {
  principal: number;
  repaymentType: RepaymentType;
  rate: RateConfig;
  termShortMonths: number;
  termLongMonths: number;
  targetMonthlyPayment: number;
  extraStrategy?: ExtraStrategy;
  investRatePercent: number;
  capitalGainsTaxPercent?: number;
  dayCountConvention?: DayCountConvention;
}

export interface ScenarioSummary {
  label: string;
  mode: ScenarioMode;
  termMonths: number;
  contractualPayment: number;
  /** Prepay on loan (0 for invest mode) */
  extraMonthly: number;
  /** Monthly amount invested instead of prepay */
  investMonthly: number;
  totalMonthly: number;
  payoffMonths: number;
  totalInterest: number;
  totalPaid: number;
  /** FV of surplus invested at expected rate (invest mode) */
  investValue?: number;
  result: AmortizationResult;
}

export interface ComparisonResult {
  scenarioShortPrepay: ScenarioSummary;
  scenarioLongPrepay: ScenarioSummary;
  scenarioShortInvest: ScenarioSummary;
  scenarioLongInvest: ScenarioSummary;
  /** @deprecated use scenarioShortPrepay */
  scenarioA: ScenarioSummary;
  /** @deprecated use scenarioLongPrepay */
  scenarioB: ScenarioSummary;
  interestDelta: number;
  totalPaidDelta: number;
  monthsDelta: number;
  matchedMonthlyOutflow: number;
  /** Luna finală pentru simularea investiției (= termen contractual lung) */
  investHorizonMonths: number;
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
