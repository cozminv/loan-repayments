import {
  Chart,
  type ChartConfiguration,
  type Plugin,
  type TooltipItem,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
  Filler,
} from 'chart.js';
import type { AmortizationResult, Currency } from '../engine/types.ts';
import { formatMoney } from '../utils/format.ts';
import { cumulativeInvestWealthSeries } from '../engine/investBreakeven.ts';

const monthCrosshairPlugin: Plugin<'line'> = {
  id: 'monthCrosshair',
  afterDraw(chart) {
    const tooltip = chart.tooltip;
    if (!tooltip || tooltip.opacity === 0) return;
    const points = tooltip.dataPoints;
    if (!points?.length) return;
    const x = points[0]!.element.x;
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;
    const grid = cssVar('--chart-grid') || '#94a3b8';
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = grid;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.restore();
  },
};

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
  Filler,
  monthCrosshairPlugin,
);

/** Exponent > 1: compress bottom, spread top (inverse of log / sqrt). */
const WEALTH_CHART_Y_POWER = 2.5;

const INDEX_INTERACTION = { mode: 'index' as const, intersect: false };

type LineDatasetWithStyle = {
  label: string;
  borderColor: string;
  backgroundColor: string;
};

type InvestWealthDataset = LineDatasetWithStyle & {
  data: number[];
  wealthRon: number[];
  fill: boolean;
  tension: number;
  borderWidth: number;
  pointRadius: number;
  pointHoverRadius: number;
};

export interface ChartSeries {
  label: string;
  result: AmortizationResult;
  borderColor: string;
  backgroundColor: string;
}

export interface InvestChartSeries {
  label: string;
  horizonMonths: number;
  payoffMonth: number;
  surplusMonthly: number;
  targetMonthly: number;
  investRatePercent: number;
  capitalGainsTaxPercent?: number;
  borderColor: string;
  backgroundColor: string;
}

const LINE_WIDTH = 1.5;
const POINT_RADIUS = 0;

let prepayChartInstance: Chart | null = null;
let investChartInstance: Chart | null = null;

let lastPrepayChart: {
  canvas: HTMLCanvasElement;
  series: ChartSeries[];
  currency: Currency;
} | null = null;
let lastInvestChart: {
  canvas: HTMLCanvasElement;
  series: InvestChartSeries[];
  currency: Currency;
} | null = null;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function indexTooltipOptions(
  currency: Currency,
  valueAt: (datasetIndex: number, dataIndex: number, chart: Chart) => number | null,
) {
  const text = cssVar('--chart-text') || '#64748b';
  const grid = cssVar('--chart-grid') || '#e2e8f0';

  return {
    mode: 'index' as const,
    intersect: false,
    backgroundColor: cssVar('--surface') || '#fff',
    titleColor: cssVar('--text') || '#1a1a2e',
    bodyColor: cssVar('--text-muted') || '#64748b',
    borderColor: grid,
    borderWidth: 1,
    displayColors: true,
    callbacks: {
      title: (items: TooltipItem<'line'>[]) => {
        const idx = items[0]?.dataIndex;
        return idx == null ? '' : `Luna ${idx + 1}`;
      },
      label: (item: TooltipItem<'line'>) => {
        const ds = item.chart.data.datasets[item.datasetIndex] as LineDatasetWithStyle;
        const raw = valueAt(item.datasetIndex, item.dataIndex, item.chart);
        const line =
          raw != null && Number.isFinite(raw) ? formatMoney(Math.max(0, raw), currency) : '—';
        return ` ${ds.label}: ${line}`;
      },
      labelColor: (item: TooltipItem<'line'>) => {
        const ds = item.chart.data.datasets[item.datasetIndex] as LineDatasetWithStyle;
        return { borderColor: ds.borderColor, backgroundColor: ds.borderColor };
      },
      labelTextColor: () => text,
    },
  };
}

function chartThemeOptions(
  yTitle: string,
  yTicks?: { callback: (plotY: number) => string },
) {
  const text = cssVar('--chart-text') || '#64748b';
  const grid = cssVar('--chart-grid') || '#e2e8f0';
  return {
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: text },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Luna', color: text },
        ticks: { maxTicksLimit: 12, color: text },
        grid: { color: grid },
      },
      y: {
        type: 'linear' as const,
        title: { display: true, text: yTitle, color: text },
        ticks: {
          color: text,
          callback: yTicks
            ? (tick: string | number) => {
                const plotY = typeof tick === 'string' ? Number(tick) : Number(tick);
                if (!Number.isFinite(plotY) || plotY <= 0) return '';
                return yTicks.callback(plotY);
              }
            : undefined,
        },
        grid: { color: grid },
      },
    },
  };
}

function wealthToPlotY(value: number): number {
  return value > 0 ? value ** WEALTH_CHART_Y_POWER : 0;
}

function plotYToWealth(plotY: number): number {
  return plotY > 0 ? plotY ** (1 / WEALTH_CHART_Y_POWER) : 0;
}

function wealthDataForTopHeavyAxis(values: number[]): number[] {
  return values.map(wealthToPlotY);
}

function cumulativeInterest(result: AmortizationResult, length: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < length; i++) {
    sum += result.schedule[i]?.interest ?? 0;
    out.push(sum);
  }
  return out;
}

export function renderPrepayChart(
  canvas: HTMLCanvasElement,
  series: ChartSeries[],
  currency: Currency,
): void {
  lastPrepayChart = { canvas, series, currency };

  const maxLen = Math.max(...series.map((s) => s.result.schedule.length), 1);
  const labels = Array.from({ length: maxLen }, (_, i) => `${i + 1}`);

  const datasets = series.map((s) => ({
    label: s.label,
    data: cumulativeInterest(s.result, maxLen),
    borderColor: s.borderColor,
    backgroundColor: s.backgroundColor,
    fill: false,
    tension: 0.2,
    borderWidth: LINE_WIDTH,
    pointRadius: POINT_RADIUS,
    pointHoverRadius: 3,
  }));

  const theme = chartThemeOptions('Dobândă cumulată (credit)');

  const config: ChartConfiguration<'line'> = {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: INDEX_INTERACTION,
      ...theme,
      plugins: {
        ...theme.plugins,
        tooltip: indexTooltipOptions(currency, (datasetIndex, dataIndex, chart) => {
          const ds = chart.data.datasets[datasetIndex];
          const v = ds?.data[dataIndex];
          return typeof v === 'number' ? v : null;
        }),
      },
    },
  };

  if (prepayChartInstance) prepayChartInstance.destroy();
  prepayChartInstance = new Chart(canvas, config);
}

export function renderInvestWealthChart(
  canvas: HTMLCanvasElement,
  series: InvestChartSeries[],
  currency: Currency,
): void {
  lastInvestChart = { canvas, series, currency };

  const yTicks = {
    callback: (plotY: number) => formatMoney(plotYToWealth(plotY), currency),
  };

  const maxLen = Math.max(...series.map((s) => s.horizonMonths), 1);
  const labels = Array.from({ length: maxLen }, (_, i) => `${i + 1}`);

  const datasets: InvestWealthDataset[] = series.map((s) => {
    const wealth = cumulativeInvestWealthSeries(
      s.horizonMonths,
      s.payoffMonth,
      s.surplusMonthly,
      s.targetMonthly,
      s.investRatePercent,
      s.capitalGainsTaxPercent ?? 0,
    );
    const padded = [...wealth];
    while (padded.length < maxLen) {
      padded.push(padded[padded.length - 1] ?? 0);
    }
    return {
      label: s.label,
      data: wealthDataForTopHeavyAxis(padded),
      wealthRon: padded,
      borderColor: s.borderColor,
      backgroundColor: s.backgroundColor,
      fill: false,
      tension: 0.2,
      borderWidth: LINE_WIDTH,
      pointRadius: POINT_RADIUS,
      pointHoverRadius: 3,
    };
  });

  const theme = chartThemeOptions(
    `Portofoliu (RON^${WEALTH_CHART_Y_POWER} — diferențe mai vizibile sus)`,
    yTicks,
  );

  const config: ChartConfiguration<'line'> = {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: INDEX_INTERACTION,
      ...theme,
      plugins: {
        ...theme.plugins,
        tooltip: indexTooltipOptions(currency, (datasetIndex, dataIndex, chart) => {
          const ds = chart.data.datasets[datasetIndex] as InvestWealthDataset;
          return ds.wealthRon[dataIndex] ?? null;
        }),
      },
    },
  };

  if (investChartInstance) investChartInstance.destroy();
  investChartInstance = new Chart(canvas, config);
}

/** @deprecated use renderPrepayChart */
export function renderComparisonChart(
  canvas: HTMLCanvasElement,
  series: ChartSeries[],
  currency: Currency,
): void {
  renderPrepayChart(canvas, series, currency);
}

export function refreshChartTheme(): void {
  if (lastPrepayChart) {
    renderPrepayChart(lastPrepayChart.canvas, lastPrepayChart.series, lastPrepayChart.currency);
  }
  if (lastInvestChart) {
    renderInvestWealthChart(
      lastInvestChart.canvas,
      lastInvestChart.series,
      lastInvestChart.currency,
    );
  }
}

export function chartColorsForSeries(count: number): Pick<ChartSeries, 'borderColor' | 'backgroundColor'>[] {
  const isDark = document.documentElement.dataset.theme === 'dark';
  const palette = isDark
    ? ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#f472b6']
    : ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777'];
  return palette.slice(0, count).map((borderColor) => ({
    borderColor,
    backgroundColor: `${borderColor}22`,
  }));
}
