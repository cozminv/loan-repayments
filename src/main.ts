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
import type { RateConfig, ScenarioSummary } from './engine/types.ts';
import {
  applyFormSnapshot,
  loadFormFromStorage,
  readFormValues,
  saveFormToStorage,
  toggleRateFields,
  autofillShortTermFromTarget,
  type LoanFormValues,
} from './ui/loanForm.ts';
import { formValuesToRateConfig } from './ui/rateConfig.ts';
import { formatMoney, formatPercent } from './utils/format.ts';
import {
  chartColorsForSeries,
  renderInvestWealthChart,
  renderPrepayChart,
} from './ui/charts.ts';
import { renderScheduleTable } from './ui/scheduleTable.ts';
import { renderScenarioCard } from './ui/scenarioCard.ts';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

/** Set when user explicitly loads a bank-published example */
let loadedExamplePayment: { expected: number; tolerance: number; label: string } | null =
  null;

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
  const rate = formValuesToRateConfig(v);

  if (termShortMonths >= termLongMonths) {
    alert('Termenul scurt trebuie să fie mai mic decât termenul lung.');
    return;
  }

  const taxPercent = v.applyCapitalGainsTax ? 10 : 0;

  const comparison = compareScenarios({
    principal: v.principal,
    repaymentType: v.repaymentType,
    rate,
    termShortMonths,
    termLongMonths,
    targetMonthlyPayment: v.targetMonthlyPayment,
    extraStrategy: v.extraStrategy,
    investRatePercent: v.expectedReturnPercent,
    capitalGainsTaxPercent: taxPercent,
  });

  const prepayShort = comparison.scenarioShortPrepay;
  const prepayLong = comparison.scenarioLongPrepay;
  const investShort = comparison.scenarioShortInvest;
  const investLong = comparison.scenarioLongInvest;
  const { matchedMonthlyOutflow, investHorizonMonths } = comparison;

  $('results').classList.remove('hidden');
  $('schedules').classList.remove('hidden');

  showPaymentCheck(v.currency, termLongMonths, v);

  $('matchedOutflow').textContent = `Țintă ${formatMoney(matchedMonthlyOutflow, v.currency)}/lună la toate scenariile`;

  const winnerPrepay =
    prepayShort.totalInterest < prepayLong.totalInterest
      ? 'Prepay termen scurt: mai puțină dobândă decât prepay termen lung'
      : prepayLong.totalInterest < prepayShort.totalInterest
        ? 'Prepay termen lung: mai puțină dobândă decât prepay termen scurt'
        : 'Prepay scurt/lung: același cost al dobânzii';

  $('scenarioCards').innerHTML = [
    prepayShort,
    prepayLong,
    investShort,
    investLong,
  ]
    .map((s) => renderScenarioCard(s, v.currency, v.expectedReturnPercent))
    .join('');

  const deltaInterest = comparison.interestDelta;
  $('deltaRow').innerHTML = `
    <p><strong>Prepay — diferență dobândă scurt vs lung:</strong> ${formatMoney(Math.abs(deltaInterest), v.currency)}
      ${deltaInterest > 0 ? '(mai mult la termen lung)' : deltaInterest < 0 ? '(mai mult la termen scurt)' : ''}</p>
    <p><strong>Prepay — diferență durată:</strong> ${Math.abs(comparison.monthsDelta)} luni</p>
    <p class="verdict">${winnerPrepay}</p>
  `;

  const colors = chartColorsForSeries(6);
  renderPrepayChart(
    $('prepayChart') as HTMLCanvasElement,
    [
      { label: prepayShort.label, result: prepayShort.result, ...colors[0]! },
      { label: prepayLong.label, result: prepayLong.result, ...colors[1]! },
    ],
    v.currency,
  );
  const investChartSeries = [
    {
      label: investShort.label,
      horizonMonths: investHorizonMonths,
      payoffMonth: investShort.payoffMonths,
      surplusMonthly: investShort.investMonthly,
      targetMonthly: matchedMonthlyOutflow,
      investRatePercent: v.expectedReturnPercent,
      capitalGainsTaxPercent: taxPercent,
      ...colors[2]!,
    },
    {
      label: investLong.label,
      horizonMonths: investHorizonMonths,
      payoffMonth: investLong.payoffMonths,
      surplusMonthly: investLong.investMonthly,
      targetMonthly: matchedMonthlyOutflow,
      investRatePercent: v.expectedReturnPercent,
      capitalGainsTaxPercent: taxPercent,
      ...colors[3]!,
    },
  ];
  investChartSeries.push(
    {
      label: 'Termen scurt prepay → investiție',
      horizonMonths: investHorizonMonths,
      payoffMonth: prepayShort.payoffMonths,
      surplusMonthly: 0,
      targetMonthly: matchedMonthlyOutflow,
      investRatePercent: v.expectedReturnPercent,
      capitalGainsTaxPercent: taxPercent,
      ...colors[4]!,
    },
    {
      label: 'Termen lung prepay → investiție',
      horizonMonths: investHorizonMonths,
      payoffMonth: prepayLong.payoffMonths,
      surplusMonthly: 0,
      targetMonthly: matchedMonthlyOutflow,
      investRatePercent: v.expectedReturnPercent,
      capitalGainsTaxPercent: taxPercent,
      ...colors[5]!,
    },
  );
  renderInvestWealthChart($('investWealthChart') as HTMLCanvasElement, investChartSeries, v.currency);

  renderInvestSection(v, termLongMonths, rate, prepayLong, matchedMonthlyOutflow, taxPercent, investHorizonMonths);
  renderScheduleTable($('scheduleShortPrepay'), prepayShort.result, v.currency, prepayShort.label);
  renderScheduleTable($('scheduleLongPrepay'), prepayLong.result, v.currency, prepayLong.label);
  renderScheduleTable($('scheduleShortInvest'), investShort.result, v.currency, investShort.label);
  renderScheduleTable($('scheduleLongInvest'), investLong.result, v.currency, investLong.label);
}

function renderInvestSection(
  v: LoanFormValues,
  termLongMonths: number,
  rate: RateConfig,
  longPrepay: ScenarioSummary,
  targetMonthly: number,
  taxPercent: number,
  investHorizonMonths: number,
): void {
  const section = $('invest-section');
  section.classList.remove('hidden');

  const investExtra = longPrepay.extraMonthly;
  const intro = $('investIntro');
  const tbody = document.querySelector('#sensitivityTable tbody')!;

  if (investExtra <= 0) {
    intro.textContent = `Suma țintă (${formatMoney(targetMonthly, v.currency)}/lună) nu depășește rata contractuală la termen lung (${formatMoney(longPrepay.contractualPayment, v.currency)}). Mărește suma țintă pentru a compara investiția cu prepay.`;
    $('breakevenSummary').innerHTML = '';
    tbody.innerHTML = '';
    return;
  }

  intro.textContent = `Suma țintă: ${formatMoney(targetMonthly, v.currency)}/lună → surplus la termen lung (de investit sau prepay): ${formatMoney(investExtra, v.currency)}/lună (= țintă − ${formatMoney(longPrepay.contractualPayment, v.currency)} contractual). Vezi și cardurile „+ investiție” în comparație.`;

  const baselineLong = amortize({
    principal: v.principal,
    termMonths: termLongMonths,
    repaymentType: v.repaymentType,
    rate,
    extraMonthly: 0,
  });

  const invest = analyzeInvestVsPrepay(
    baselineLong,
    longPrepay.result,
    {
      extraMonthly: investExtra,
      horizonMonths: investHorizonMonths,
      capitalGainsTaxPercent: taxPercent,
      postPayoffRedirect: true,
      redirectMonthly: targetMonthly,
    },
    v.expectedReturnPercent,
  );

  const verdictAtExpected =
    invest.atRate != null
      ? invest.atRate.delta < 0
        ? `La randamentul așteptat de ${formatPercent(v.expectedReturnPercent)}, <strong>prepay</strong> este mai bun cu ${formatMoney(Math.abs(invest.atRate.delta), v.currency)}.`
        : `La randamentul așteptat de ${formatPercent(v.expectedReturnPercent)}, <strong>investiția</strong> este mai bună cu ${formatMoney(Math.abs(invest.atRate.delta), v.currency)}.`
      : '';

  $('breakevenSummary').innerHTML = `
    <p><strong>Surplus lunar (din suma țintă):</strong> ${formatMoney(investExtra, v.currency)}</p>
    <p><strong>Dobândă economisită</strong> dacă mergi pe prepay la termen lung: ${formatMoney(invest.interestSaved, v.currency)}</p>
    <p><strong>Randament de echilibru (ROI):</strong> ${formatPercent(invest.breakEvenRatePercent)} / an — sub această valoare prepay câștigă, peste ea investiția.</p>
    ${verdictAtExpected ? `<p class="verdict">${verdictAtExpected}</p>` : ''}
  `;

  tbody.innerHTML = invest.sensitivity
    .map((row) => {
      const isBreakEven =
        Math.abs(row.ratePercent - invest.breakEvenRatePercent) < 0.75;
      const isExpected =
        invest.atRate != null && Math.abs(row.ratePercent - v.expectedReturnPercent) < 0.25;
      const rowClass = isBreakEven || isExpected ? ' class="highlight-row"' : '';
      return `
    <tr${rowClass}>
      <td>${formatPercent(row.ratePercent, 1)}${isBreakEven ? ' (echilibru)' : ''}${isExpected ? ' (așteptat)' : ''}</td>
      <td>${formatMoney(row.investValue, v.currency)}</td>
      <td>${formatMoney(invest.interestSaved, v.currency)}</td>
      <td>${formatMoney(row.delta, v.currency)}</td>
      <td>${row.prepayWins ? 'Prepay' : 'Investiție'}</td>
    </tr>`;
    })
    .join('');
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
  $('autofillShortTerm').addEventListener('click', () => {
    const err = autofillShortTermFromTarget();
    if (err) alert(err);
  });
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

  const recalcIfResultsVisible = () => {
    if (!$('results').classList.contains('hidden')) run();
  };
  $('expectedReturn').addEventListener('input', recalcIfResultsVisible);
  $('expectedReturn').addEventListener('change', recalcIfResultsVisible);
  $('applyTax').addEventListener('change', recalcIfResultsVisible);
  $('applyTax').addEventListener('click', recalcIfResultsVisible);
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
