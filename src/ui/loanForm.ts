import type { LoanFormSnapshot } from '../engine/bankReferences.ts';
import { effectiveAnnualRate } from '../engine/amortize.ts';
import { formValuesToRateConfig } from './rateConfig.ts';
import { termMonthsFromTargetPayment } from '../engine/termFromPayment.ts';
import type { ComparisonMode, Currency, ExtraStrategy, RateMode, RepaymentType } from '../engine/types.ts';

export interface LoanFormValues {
  principal: number;
  currency: Currency;
  repaymentType: RepaymentType;
  rateMode: RateMode;
  fixedRatePercent: number;
  fixedPeriodYears: number;
  irccPercent: number;
  marginPercent: number;
  comparisonMode: ComparisonMode;
  targetMonthlyPayment: number;
  termShortYears: number;
  termLongYears: number;
  extraOverride?: number;
  extraStrategy: ExtraStrategy;
}

const FIELD_IDS = {
  principal: 'principal',
  currency: 'currency',
  repaymentType: 'repaymentType',
  rateMode: 'rateMode',
  fixedRate: 'fixedRate',
  fixedPeriodYears: 'fixedPeriodYears',
  ircc: 'ircc',
  margin: 'margin',
  comparisonMode: 'comparisonMode',
  targetMonthly: 'targetMonthly',
  termShort: 'termShort',
  termLong: 'termLong',
  extraOverride: 'extraOverride',
  extraStrategy: 'extraStrategy',
} as const;

function input(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

function select(id: string): HTMLSelectElement {
  return document.getElementById(id) as HTMLSelectElement;
}

export function readFormValues(): LoanFormValues {
  const extraRaw = input(FIELD_IDS.extraOverride).value;
  return {
    principal: parseFloat(input(FIELD_IDS.principal).value),
    currency: select(FIELD_IDS.currency).value as Currency,
    repaymentType: select(FIELD_IDS.repaymentType).value as RepaymentType,
    rateMode: select(FIELD_IDS.rateMode).value as RateMode,
    fixedRatePercent: parseFloat(input(FIELD_IDS.fixedRate).value),
    fixedPeriodYears: parseInt(input(FIELD_IDS.fixedPeriodYears).value, 10),
    irccPercent: parseFloat(input(FIELD_IDS.ircc).value),
    marginPercent: parseFloat(input(FIELD_IDS.margin).value),
    comparisonMode: select(FIELD_IDS.comparisonMode).value as ComparisonMode,
    targetMonthlyPayment: parseFloat(input(FIELD_IDS.targetMonthly).value),
    termShortYears: parseInt(input(FIELD_IDS.termShort).value, 10),
    termLongYears: parseInt(input(FIELD_IDS.termLong).value, 10),
    extraOverride: extraRaw ? parseFloat(extraRaw) : undefined,
    extraStrategy: select(FIELD_IDS.extraStrategy).value as ExtraStrategy,
  };
}

export function applyFormSnapshot(snapshot: LoanFormSnapshot): void {
  input(FIELD_IDS.principal).value = String(snapshot.principal);
  select(FIELD_IDS.currency).value = snapshot.currency;
  select(FIELD_IDS.repaymentType).value = snapshot.repaymentType;
  select(FIELD_IDS.rateMode).value = snapshot.rateMode;
  if (snapshot.fixedRatePercent != null) {
    input(FIELD_IDS.fixedRate).value = String(snapshot.fixedRatePercent);
  }
  if (snapshot.fixedPeriodYears != null) {
    input(FIELD_IDS.fixedPeriodYears).value = String(snapshot.fixedPeriodYears);
  }
  if (snapshot.irccPercent != null) {
    input(FIELD_IDS.ircc).value = String(snapshot.irccPercent);
  }
  if (snapshot.marginPercent != null) {
    input(FIELD_IDS.margin).value = String(snapshot.marginPercent);
  }
  input(FIELD_IDS.termShort).value = String(snapshot.termShortYears);
  input(FIELD_IDS.termLong).value = String(snapshot.termLongYears);
}

export function toggleRateFields(): void {
  const mode = select(FIELD_IDS.rateMode).value;
  const fixedWrap = document.getElementById('fixedRateWrap');
  const periodWrap = document.getElementById('fixedPeriodWrap');
  const irccWrap = document.getElementById('irccWrap');
  const marginWrap = document.getElementById('marginWrap');
  const variableOnly = document.getElementById('variableRateFields');

  fixedWrap?.classList.toggle('hidden', mode === 'variable');
  periodWrap?.classList.toggle('hidden', mode !== 'fixed_then_variable');
  variableOnly?.classList.toggle('hidden', mode === 'fixed');
  irccWrap?.classList.toggle('hidden', mode === 'fixed');
  marginWrap?.classList.toggle('hidden', mode === 'fixed');

  updateEffectiveRateDisplay();
  updateComputedTermHint();
}

export function toggleComparisonFields(): void {
  const mode = select(FIELD_IDS.comparisonMode).value;
  document.getElementById('monthlyBudgetFields')?.classList.toggle('hidden', mode !== 'monthly_budget');
  document.getElementById('fixedTermsFields')?.classList.toggle('hidden', mode !== 'fixed_terms');
  updateComputedTermHint();
}

export function updateEffectiveRateDisplay(): void {
  const el = document.getElementById('effectiveRate');
  if (!el) return;
  const mode = select(FIELD_IDS.rateMode).value;
  if (mode === 'fixed') {
    el.textContent = `Dobândă utilizată: ${input(FIELD_IDS.fixedRate).value}%`;
    return;
  }
  const ircc = parseFloat(input(FIELD_IDS.ircc).value) || 0;
  const margin = parseFloat(input(FIELD_IDS.margin).value) || 0;
  el.textContent = `Dobândă variabilă (IRCC + marjă): ${(ircc + margin).toFixed(2)}%`;
}

export function updateComputedTermHint(): void {
  const hint = document.getElementById('computedTermHint');
  if (!hint || select(FIELD_IDS.comparisonMode).value !== 'monthly_budget') {
    if (hint) hint.textContent = '';
    return;
  }

  const v = readFormValues();
  const rate = formValuesToRateConfig(v);
  const annualRate = effectiveAnnualRate(rate, 1);
  const months = termMonthsFromTargetPayment(
    v.principal,
    annualRate,
    v.targetMonthlyPayment,
    v.repaymentType,
  );

  if (months == null) {
    hint.textContent = 'Bugetul lunar este prea mic — nu acoperă dobânda la această sumă.';
    return;
  }

  const years = (months / 12).toFixed(1);
  hint.textContent = `Termen scurt calculat: ${months} luni (≈ ${years} ani) la această rată lunară.`;
}

const STORAGE_KEY = 'loan-repayments-form-v2';

export function saveFormToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readFormValues()));
  } catch {
    /* ignore */
  }
}

export function loadFormFromStorage(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('loan-repayments-form-v1');
    if (!raw) return false;
    const v = JSON.parse(raw) as Partial<LoanFormValues>;
    applyFormSnapshot({
      principal: v.principal ?? 300000,
      currency: v.currency ?? 'RON',
      repaymentType: v.repaymentType ?? 'annuity',
      rateMode: v.rateMode ?? 'variable',
      fixedRatePercent: v.fixedRatePercent,
      fixedPeriodYears: v.fixedPeriodYears,
      irccPercent: v.irccPercent,
      marginPercent: v.marginPercent,
      termShortYears: v.termShortYears ?? 20,
      termLongYears: v.termLongYears ?? 30,
    });
    if (v.comparisonMode) select(FIELD_IDS.comparisonMode).value = v.comparisonMode;
    if (v.targetMonthlyPayment) input(FIELD_IDS.targetMonthly).value = String(v.targetMonthlyPayment);
    toggleComparisonFields();
    return true;
  } catch {
    return false;
  }
}
