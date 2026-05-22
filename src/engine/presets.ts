import { BANK_REFERENCES, DEFAULT_IRCC_PERCENT, type BankReferenceId } from './bankReferences.ts';
import type { LoanFormSnapshot } from './bankReferences.ts';

export type PresetId =
  | 'custom'
  | 'typical_ron_300k'
  | 'typical_eur_100k'
  | 'compare_20_vs_30'
  | `bank:${BankReferenceId}`;

export interface LoanPreset {
  id: PresetId;
  label: string;
  description: string;
  snapshot?: LoanFormSnapshot;
}

const GENERIC_PRESETS: LoanPreset[] = [
  {
    id: 'custom',
    label: '— Fără preset (valorile curente) —',
    description: 'Nu modifică nimic. Editează manual sau reîncarcă din browser.',
  },
  {
    id: 'typical_ron_300k',
    label: 'Ipotecar tipic · 300.000 RON · 30 ani',
    description: 'IRCC + marjă 2%, variabilă. Punct de plecare pentru oferte în lei.',
    snapshot: {
      principal: 300_000,
      currency: 'RON',
      repaymentType: 'annuity',
      rateMode: 'variable',
      irccPercent: DEFAULT_IRCC_PERCENT,
      marginPercent: 2,
      termShortYears: 20,
      termLongYears: 30,
    },
  },
  {
    id: 'typical_eur_100k',
    label: 'Ipotecar tipic · 100.000 EUR · 25 ani',
    description: 'Dobândă fixă 5,5% (orientativ). Ajustează după oferta băncii.',
    snapshot: {
      principal: 100_000,
      currency: 'EUR',
      repaymentType: 'annuity',
      rateMode: 'fixed',
      fixedRatePercent: 5.5,
      termShortYears: 15,
      termLongYears: 25,
    },
  },
  {
    id: 'compare_20_vs_30',
    label: 'Comparație 20 vs 30 ani · 250.000 RON',
    description: 'Scenariu pentru „termen scurt vs lung + extra” la același flux lunar.',
    snapshot: {
      principal: 250_000,
      currency: 'RON',
      repaymentType: 'annuity',
      rateMode: 'variable',
      irccPercent: DEFAULT_IRCC_PERCENT,
      marginPercent: 2,
      termShortYears: 20,
      termLongYears: 30,
    },
  },
];

const BANK_PRESETS: LoanPreset[] = BANK_REFERENCES.filter((b) => b.snapshot).map((b) => ({
  id: `bank:${b.id}` as PresetId,
  label: `${b.label} (exemplu publicat)`,
  description: b.sourceLabel,
  snapshot: b.snapshot,
}));

export const LOAN_PRESETS: LoanPreset[] = [...GENERIC_PRESETS, ...BANK_PRESETS];

export function getPreset(id: PresetId): LoanPreset | undefined {
  return LOAN_PRESETS.find((p) => p.id === id);
}
