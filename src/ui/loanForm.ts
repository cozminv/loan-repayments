import type { LoanFormSnapshot } from '../engine/bankReferences.ts';
import type { Currency, ExtraStrategy, RateMode, RepaymentType } from '../engine/types.ts';

export interface LoanFormValues {
  principal: number;
  currency: Currency;
  repaymentType: RepaymentType;
  rateMode: RateMode;
  fixedRatePercent: number;
  fixedPeriodYears: number;
  irccPercent: number;
  marginPercent: number;
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

const STORAGE_KEY = 'loan-repayments-form-v1';

export function saveFormToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readFormValues()));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadFormFromStorage(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const v = JSON.parse(raw) as LoanFormValues;
    applyFormSnapshot({
      principal: v.principal,
      currency: v.currency,
      repaymentType: v.repaymentType,
      rateMode: v.rateMode,
      fixedRatePercent: v.fixedRatePercent,
      fixedPeriodYears: v.fixedPeriodYears,
      irccPercent: v.irccPercent,
      marginPercent: v.marginPercent,
      termShortYears: v.termShortYears,
      termLongYears: v.termLongYears,
    });
    return true;
  } catch {
    return false;
  }
}
