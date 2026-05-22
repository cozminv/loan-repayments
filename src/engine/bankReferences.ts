/**
 * Static reference data from bank-published examples and calculator URLs.
 * Not live-fetched: bank sites block browser CORS; use links + manual entry or “Load example”.
 */

import type { Currency, RateMode, RepaymentType } from './types.ts';

export type BankReferenceId =
  | 'ing_noua_casa'
  | 'ing_ipotecar'
  | 'bcr_casa_mea'
  | 'brd'
  | 'raiffeisen'
  | 'bt';

/** Values the user can load explicitly into the form */
export interface LoanFormSnapshot {
  principal: number;
  currency: Currency;
  repaymentType: RepaymentType;
  rateMode: RateMode;
  fixedRatePercent?: number;
  fixedPeriodYears?: number;
  irccPercent?: number;
  marginPercent?: number;
  termShortYears: number;
  termLongYears: number;
  /** For validation against bank-published payment */
  expectedMonthlyPayment?: number;
  paymentTolerance?: number;
}

export interface BankReference {
  id: BankReferenceId;
  label: string;
  calculatorUrl: string;
  sourceLabel: string;
  sourceUrl: string;
  lastVerified?: string;
  snapshot?: LoanFormSnapshot;
}

export const DEFAULT_IRCC_PERCENT = 5.58;

export const BANK_REFERENCES: BankReference[] = [
  {
    id: 'ing_noua_casa',
    label: 'ING Noua Casă',
    calculatorUrl: 'https://ing.ro/persoane-fizice/credite/noua-casa',
    sourceLabel: 'Exemplu reprezentativ ING (mai 2026)',
    sourceUrl: 'https://ing.ro/persoane-fizice/credite/noua-casa',
    lastVerified: '2026-05',
    snapshot: {
      principal: 258_000,
      currency: 'RON',
      repaymentType: 'annuity',
      rateMode: 'variable',
      irccPercent: 5.58,
      marginPercent: 2,
      termShortYears: 20,
      termLongYears: 25,
      expectedMonthlyPayment: 1920.04,
      paymentTolerance: 1,
    },
  },
  {
    id: 'ing_ipotecar',
    label: 'ING Ipotecar',
    calculatorUrl: 'https://ing.ro/persoane-fizice/credite/ipotecar',
    sourceLabel: 'Calculator oficial ING',
    sourceUrl: 'https://ing.ro/persoane-fizice/credite/ipotecar',
    lastVerified: '2026-05',
    snapshot: {
      principal: 300_000,
      currency: 'RON',
      repaymentType: 'annuity',
      rateMode: 'fixed_then_variable',
      fixedRatePercent: 6.2,
      fixedPeriodYears: 5,
      irccPercent: 5.58,
      marginPercent: 1.9,
      termShortYears: 20,
      termLongYears: 30,
    },
  },
  {
    id: 'bcr_casa_mea',
    label: 'BCR Casa Mea',
    calculatorUrl: 'https://www.bcr.ro/ro/persoane-fizice/credite/credite-pentru-casa/casa-mea-bcr',
    sourceLabel: 'Exemplu BCR Casa Mea (pachet Max)',
    sourceUrl: 'https://www.bcr.ro/ro/persoane-fizice/credite/credite-pentru-casa/casa-mea-bcr',
    lastVerified: '2026-05',
    snapshot: {
      principal: 350_000,
      currency: 'RON',
      repaymentType: 'annuity',
      rateMode: 'fixed_then_variable',
      fixedRatePercent: 4.99,
      fixedPeriodYears: 3,
      irccPercent: 5.58,
      marginPercent: 2.3,
      termShortYears: 20,
      termLongYears: 25,
    },
  },
  {
    id: 'brd',
    label: 'BRD',
    calculatorUrl: 'https://www.brd.ro/ro/persoane-fizice/credite/credit-ipotecar',
    sourceLabel: 'Calculator BRD',
    sourceUrl: 'https://www.brd.ro/ro/persoane-fizice/credite/credit-ipotecar',
    snapshot: {
      principal: 250_000,
      currency: 'RON',
      repaymentType: 'annuity',
      rateMode: 'variable',
      irccPercent: 5.58,
      marginPercent: 2.27,
      termShortYears: 20,
      termLongYears: 30,
    },
  },
  {
    id: 'raiffeisen',
    label: 'Raiffeisen',
    calculatorUrl: 'https://www.raiffeisen.ro/ro/persoane-fizice/credite/credit-ipotecar.html',
    sourceLabel: 'Calculator Raiffeisen',
    sourceUrl: 'https://www.raiffeisen.ro/ro/persoane-fizice/credite/credit-ipotecar.html',
    snapshot: {
      principal: 250_000,
      currency: 'RON',
      repaymentType: 'annuity',
      rateMode: 'variable',
      irccPercent: 5.58,
      marginPercent: 2.41,
      termShortYears: 20,
      termLongYears: 30,
    },
  },
  {
    id: 'bt',
    label: 'Banca Transilvania',
    calculatorUrl: 'https://www.bancatransilvania.ro/ro/persoane-fizice/credite/credit-ipotecar',
    sourceLabel: 'Calculator BT',
    sourceUrl: 'https://www.bancatransilvania.ro/ro/persoane-fizice/credite/credit-ipotecar',
    snapshot: {
      principal: 250_000,
      currency: 'RON',
      repaymentType: 'annuity',
      rateMode: 'variable',
      irccPercent: 5.58,
      marginPercent: 2.5,
      termShortYears: 20,
      termLongYears: 30,
    },
  },
];

export function getBankReference(id: BankReferenceId): BankReference | undefined {
  return BANK_REFERENCES.find((b) => b.id === id);
}

/** BNR IRCC page — user opens manually; no reliable public CORS API */
export const BNR_IRCC_URL = 'https://www.bnr.ro/nbrfxrates.aspx';
