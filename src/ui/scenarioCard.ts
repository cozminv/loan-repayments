import type { Currency, ScenarioSummary } from '../engine/types.ts';
import { formatMoney, formatMonths, formatPercent } from '../utils/format.ts';

export function renderScenarioCard(s: ScenarioSummary, currency: Currency, investRatePercent: number): string {
  const extraLine =
    s.mode === 'prepay'
      ? `<dt>Plată extra</dt><dd>${formatMoney(s.extraMonthly, currency)}</dd>`
      : `<dt>Investiție lunară</dt><dd>${formatMoney(s.investMonthly, currency)}</dd>`;

  const investLines =
    s.mode === 'invest' && s.investValue != null
      ? `<dt>Valoare investiție</dt><dd>${formatMoney(s.investValue, currency)}</dd>
        <dt>Randament</dt><dd>${formatPercent(investRatePercent)}</dd>
        <dt>După achitare credit</dt><dd>Țintă integrală</dd>`
      : '';

  return `
    <article class="card card--${s.mode}">
      <h3>${s.label}</h3>
      <dl>
        <dt>Rată contractuală</dt><dd>${formatMoney(s.contractualPayment, currency)}</dd>
        ${extraLine}
        <dt>Total lunar (țintă)</dt><dd>${formatMoney(s.totalMonthly, currency)}</dd>
        <dt>Durată credit</dt><dd>${formatMonths(s.payoffMonths)}</dd>
        <dt>Dobândă totală</dt><dd>${formatMoney(s.totalInterest, currency)}</dd>
        <dt>Total plătit credit</dt><dd>${formatMoney(s.totalPaid, currency)}</dd>
        ${investLines}
      </dl>
    </article>`;
}
