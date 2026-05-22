import type { AmortizationResult } from '../engine/types.ts';
import type { Currency } from '../engine/types.ts';
import { formatMoney } from '../utils/format.ts';

export function renderScheduleTable(
  container: HTMLElement,
  result: AmortizationResult,
  currency: Currency,
  title: string,
): void {
  const rows = result.schedule;
  const showAll = container.dataset.expanded === 'true';

  const html = `
    <details class="schedule-block" ${showAll ? 'open' : ''}>
      <summary>${title} (${rows.length} luni)</summary>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Luna</th>
              <th>Dobândă %</th>
              <th>Dobândă</th>
              <th>Principal</th>
              <th>Extra</th>
              <th>Rată</th>
              <th>Sold</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .slice(0, showAll ? undefined : 24)
              .map(
                (r) => `
              <tr>
                <td>${r.month}</td>
                <td>${r.annualRatePercent.toFixed(2)}</td>
                <td>${formatMoney(r.interest, currency)}</td>
                <td>${formatMoney(r.principal, currency)}</td>
                <td>${r.extra > 0 ? formatMoney(r.extra, currency) : '—'}</td>
                <td>${formatMoney(r.totalPayment, currency)}</td>
                <td>${formatMoney(r.balance, currency)}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>
        ${rows.length > 24 && !showAll ? `<p class="hint">Primele 24 luni. Deschide pentru tot graficul de mai sus.</p>` : ''}
      </div>
    </details>
  `;
  container.innerHTML = html;
}
