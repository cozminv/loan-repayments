import './style.css';
import { bindThemeToggle, initTheme, onThemeChange } from './ui/theme.ts';
import { refreshChartTheme } from './ui/charts.ts';
import {
  BANK_REFERENCES,
  getBankReference,
  type BankReferenceId,
} from './engine/bankReferences.ts';
import { getPreset, LOAN_PRESETS, type PresetId } from './engine/presets.ts';
import { compareScenarios } from './engine/compareScenarios.ts';
import { amortize } from './engine/amortize.ts';
import { analyzeInvestVsPrepay } from './engine/investBreakeven.ts';
import type { RateConfig } from './engine/types.ts';
import {
  applyFormSnapshot,
  loadFormFromStorage,
  readFormValues,
  saveFormToStorage,
  toggleRateFields,
  type LoanFormValues,
} from './ui/loanForm.ts';
import { formatMoney, formatMonths, formatPercent } from './utils/format.ts';
import { renderComparisonChart } from './ui/charts.ts';
import { renderScheduleTable } from './ui/scheduleTable.ts';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

/** Set when user explicitly loads a bank-published example */
let loadedExamplePayment: { expected: number; tolerance: number; label: string } | null =
  null;

function formValuesToRateConfig(v: LoanFormValues): RateConfig {
  if (v.rateMode === 'fixed') {
    return { mode: 'fixed', fixedRatePercent: v.fixedRatePercent };
  }
  if (v.rateMode === 'fixed_then_variable') {
    return {
      mode: 'fixed_then_variable',
      fixedRatePercent: v.fixedRatePercent,
      fixedPeriodMonths: v.fixedPeriodYears * 12,
      irccPercent: v.irccPercent,
      marginPercent: v.marginPercent,
    };
  }
  return {
    mode: 'variable',
    irccPercent: v.irccPercent,
    marginPercent: v.marginPercent,
  };
}

function initQuickPresets(): void {
  const select = $('quickPreset') as HTMLSelectElement;
  select.innerHTML = LOAN_PRESETS.map(
    (p) => `<option value="${p.id}">${p.label}</option>`,
  ).join('');
  select.value = 'typical_ron_300k';
  updatePresetDescription();
}

function updatePresetDescription(): void {
  const id = ($('quickPreset') as HTMLSelectElement).value as PresetId;
  const preset = getPreset(id);
  ($('presetDescription') as HTMLElement).textContent = preset?.description ?? '';
}

function applyQuickPreset(): void {
  const id = ($('quickPreset') as HTMLSelectElement).value as PresetId;
  const preset = getPreset(id);
  if (!preset?.snapshot) return;

  applyFormSnapshot(preset.snapshot);
  toggleRateFields();

  loadedExamplePayment =
    preset.snapshot.expectedMonthlyPayment != null
      ? {
          expected: preset.snapshot.expectedMonthlyPayment,
          tolerance: preset.snapshot.paymentTolerance ?? 5,
          label: preset.label,
        }
      : null;

  if (id.startsWith('bank:')) {
    const bankId = id.replace('bank:', '') as BankReferenceId;
    ($('bankReference') as HTMLSelectElement).value = bankId;
    updateBankRefMeta();
  }

  const check = $('paymentCheck');
  check.textContent = `Preset „${preset.label}” aplicat. Poți modifica orice câmp înainte de Calculează.`;
  check.className = 'bank-validation ok';
  check.classList.remove('hidden');
}

function initBankReferences(): void {
  const select = $('bankReference') as HTMLSelectElement;
  select.innerHTML = BANK_REFERENCES.map(
    (b) => `<option value="${b.id}">${b.label}</option>`,
  ).join('');
  updateBankRefMeta();
}

function updateBankRefMeta(): void {
  const id = ($('bankReference') as HTMLSelectElement).value as BankReferenceId;
  const ref = getBankReference(id);
  const meta = $('bankRefMeta');
  if (!ref) {
    meta.textContent = '';
    return;
  }
  const parts = [ref.sourceLabel];
  if (ref.lastVerified) parts.push(`verificat ${ref.lastVerified}`);
  if (ref.snapshot?.expectedMonthlyPayment) {
    parts.push(
      `exemplu: ${ref.snapshot.expectedMonthlyPayment.toLocaleString('ro-RO')} lei/lună`,
    );
  }
  meta.textContent = parts.join(' · ');
}

function openBankCalculator(): void {
  const id = ($('bankReference') as HTMLSelectElement).value as BankReferenceId;
  const ref = getBankReference(id);
  if (ref?.calculatorUrl) window.open(ref.calculatorUrl, '_blank', 'noopener,noreferrer');
}

function loadBankExample(): void {
  const id = ($('bankReference') as HTMLSelectElement).value as BankReferenceId;
  const ref = getBankReference(id);
  if (!ref?.snapshot) {
    alert('Această bancă nu are un exemplu publicat salvat. Folosește calculatorul băncii.');
    return;
  }
  applyFormSnapshot(ref.snapshot);
  toggleRateFields();
  loadedExamplePayment =
    ref.snapshot.expectedMonthlyPayment != null
      ? {
          expected: ref.snapshot.expectedMonthlyPayment,
          tolerance: ref.snapshot.paymentTolerance ?? 5,
          label: ref.label,
        }
      : null;
  $('paymentCheck').textContent = loadedExamplePayment
    ? `Exemplu încărcat de la ${ref.label}. Apasă Calculează pentru a verifica rata față de ${loadedExamplePayment.expected} lei.`
    : `Parametri încărcați de la ${ref.label}. Ajustează după oferta ta.`;
  $('paymentCheck').className = 'bank-validation ok';
  $('paymentCheck').classList.remove('hidden');
}

function showPaymentCheck(
  currency: LoanFormValues['currency'],
  termLongMonths: number,
  v: LoanFormValues,
): void {
  const el = $('paymentCheck');
  if (!loadedExamplePayment) {
    el.classList.add('hidden');
    return;
  }

  const rate = formValuesToRateConfig(v);
  const annual =
    rate.mode === 'fixed'
      ? rate.fixedRatePercent!
      : (rate.irccPercent ?? 0) + (rate.marginPercent ?? 0);

  const simulated = amortize({
    principal: v.principal,
    termMonths: termLongMonths,
    repaymentType: v.repaymentType,
    rate:
      v.rateMode === 'fixed_then_variable'
        ? rate
        : { mode: 'fixed', fixedRatePercent: annual },
  });

  const diff = Math.abs(simulated.firstPayment - loadedExamplePayment.expected);
  if (diff <= loadedExamplePayment.tolerance) {
    el.textContent = `✓ Rata ${formatMoney(simulated.firstPayment, currency)} ≈ exemplul ${loadedExamplePayment.label} (${formatMoney(loadedExamplePayment.expected, currency)}).`;
    el.className = 'bank-validation ok';
  } else {
    el.textContent = `Rata calculată ${formatMoney(simulated.firstPayment, currency)} vs exemplu bancă ${formatMoney(loadedExamplePayment.expected, currency)}. Ajustează dobânda/termenul după ESIS-ul tău.`;
    el.className = 'bank-validation warn';
  }
  el.classList.remove('hidden');
}

function run(): void {
  const v = readFormValues();
  saveFormToStorage();

  const termShortMonths = v.termShortYears * 12;
  const termLongMonths = v.termLongYears * 12;

  if (termLongMonths <= termShortMonths) {
    alert('Termenul lung trebuie să fie mai mare decât termenul scurt.');
    return;
  }

  const rate = formValuesToRateConfig(v);
  const comparison = compareScenarios({
    principal: v.principal,
    repaymentType: v.repaymentType,
    rate,
    termShortMonths,
    termLongMonths,
    extraMonthly: v.extraOverride,
    extraStrategy: v.extraStrategy,
  });

  const { scenarioA: a, scenarioB: b, matchedMonthlyOutflow } = comparison;

  $('results').classList.remove('hidden');
  $('invest-section').classList.remove('hidden');
  $('schedules').classList.remove('hidden');

  showPaymentCheck(v.currency, termLongMonths, v);

  $('matchedOutflow').textContent = `Flux lunar egal: ${formatMoney(matchedMonthlyOutflow, v.currency)}/lună`;

  const winner =
    a.totalInterest < b.totalInterest
      ? 'Termenul scurt economisește dobândă'
      : b.totalInterest < a.totalInterest
        ? 'Termenul lung + extra economisește dobândă'
        : 'Același cost al dobânzii';

  $('scenarioCards').innerHTML = `
    <article class="card">
      <h3>${a.label}</h3>
      <dl>
        <dt>Rată contractuală</dt><dd>${formatMoney(a.contractualPayment, v.currency)}</dd>
        <dt>Extra</dt><dd>—</dd>
        <dt>Total lunar</dt><dd>${formatMoney(a.totalMonthly, v.currency)}</dd>
        <dt>Durată</dt><dd>${formatMonths(a.payoffMonths)}</dd>
        <dt>Dobândă totală</dt><dd>${formatMoney(a.totalInterest, v.currency)}</dd>
        <dt>Total plătit</dt><dd>${formatMoney(a.totalPaid, v.currency)}</dd>
      </dl>
    </article>
    <article class="card">
      <h3>${b.label}</h3>
      <dl>
        <dt>Rată contractuală</dt><dd>${formatMoney(b.contractualPayment, v.currency)}</dd>
        <dt>Extra</dt><dd>${formatMoney(b.extraMonthly, v.currency)}</dd>
        <dt>Total lunar</dt><dd>${formatMoney(b.totalMonthly, v.currency)}</dd>
        <dt>Durată</dt><dd>${formatMonths(b.payoffMonths)}</dd>
        <dt>Dobândă totală</dt><dd>${formatMoney(b.totalInterest, v.currency)}</dd>
        <dt>Total plătit</dt><dd>${formatMoney(b.totalPaid, v.currency)}</dd>
      </dl>
    </article>
  `;

  const deltaInterest = comparison.interestDelta;
  $('deltaRow').innerHTML = `
    <p><strong>Diferență dobândă:</strong> ${formatMoney(Math.abs(deltaInterest), v.currency)}
      ${deltaInterest > 0 ? '(mai mult la termen lung)' : deltaInterest < 0 ? '(mai mult la termen scurt)' : ''}</p>
    <p><strong>Diferență durată:</strong> ${Math.abs(comparison.monthsDelta)} luni</p>
    <p class="verdict">${winner}</p>
  `;

  renderComparisonChart($('interestChart') as HTMLCanvasElement, a.result, b.result);

  const baselineLong = amortize({
    principal: v.principal,
    termMonths: termLongMonths,
    repaymentType: v.repaymentType,
    rate,
    extraMonthly: 0,
  });

  const applyTax = ($('applyTax') as HTMLInputElement).checked;
  const postPayoffRedirect = ($('postPayoffRedirect') as HTMLInputElement).checked;
  const expectedReturn = parseFloat(($('expectedReturn') as HTMLInputElement).value);

  const invest = analyzeInvestVsPrepay(
    baselineLong,
    b.result,
    {
      extraMonthly: b.extraMonthly,
      horizonMonths: b.payoffMonths,
      capitalGainsTaxPercent: applyTax ? 10 : 0,
      postPayoffRedirect,
      redirectMonthly: postPayoffRedirect ? matchedMonthlyOutflow : 0,
    },
    expectedReturn,
  );

  $('breakevenSummary').innerHTML = `
    <p><strong>Dobândă economisită</strong> (extra vs fără extra): ${formatMoney(invest.interestSaved, v.currency)}</p>
    <p><strong>Randament de echilibru:</strong> ${formatPercent(invest.breakEvenRatePercent)} / an</p>
    ${
      invest.atRate
        ? `<p>La ${formatPercent(expectedReturn)}: ${invest.atRate.delta >= 0 ? 'investiția câștigă' : 'prepay câștigă'} cu ${formatMoney(Math.abs(invest.atRate.delta), v.currency)}.</p>`
        : ''
    }
  `;

  const tbody = document.querySelector('#sensitivityTable tbody')!;
  tbody.innerHTML = invest.sensitivity
    .map(
      (row) => `
    <tr>
      <td>${formatPercent(row.ratePercent, 1)}</td>
      <td>${formatMoney(row.investValue, v.currency)}</td>
      <td>${formatMoney(invest.interestSaved, v.currency)}</td>
      <td>${formatMoney(row.delta, v.currency)}</td>
      <td>${row.prepayWins ? 'Prepay' : 'Investiție'}</td>
    </tr>`,
    )
    .join('');

  renderScheduleTable($('scheduleA'), a.result, v.currency, 'Termen scurt');
  renderScheduleTable($('scheduleB'), b.result, v.currency, 'Termen lung + extra');
}

function bindFormListeners(): void {
  const rateInputs = ['rateMode', 'fixedRate', 'ircc', 'margin', 'fixedPeriodYears'];
  for (const id of rateInputs) {
    document.getElementById(id)?.addEventListener('input', () => {
      toggleRateFields();
      loadedExamplePayment = null;
    });
    document.getElementById(id)?.addEventListener('change', () => {
      toggleRateFields();
      loadedExamplePayment = null;
    });
  }

  $('rateMode').addEventListener('change', toggleRateFields);
  $('quickPreset').addEventListener('change', updatePresetDescription);
  $('applyPreset').addEventListener('click', applyQuickPreset);
  $('bankReference').addEventListener('change', updateBankRefMeta);
  $('openBankCalculator').addEventListener('click', openBankCalculator);
  $('loadBankExample').addEventListener('click', loadBankExample);
  $('calculate').addEventListener('click', run);
  $('saveParams').addEventListener('click', () => {
    saveFormToStorage();
    alert('Parametrii salvați în browser (localStorage).');
  });

  for (const id of ['principal', 'termShort', 'termLong', 'repaymentType']) {
    document.getElementById(id)?.addEventListener('change', () => {
      loadedExamplePayment = null;
    });
  }
}

initTheme();
bindThemeToggle();
onThemeChange(() => refreshChartTheme());

initQuickPresets();
initBankReferences();
if (!loadFormFromStorage()) {
  applyQuickPreset();
}
bindFormListeners();
toggleRateFields();
run();
