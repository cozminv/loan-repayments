import {
  Chart,
  type ChartConfiguration,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
  Filler,
} from 'chart.js';
import type { AmortizationResult } from '../engine/types.ts';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
  Filler,
);

let chartInstance: Chart | null = null;
let lastChartData: {
  canvas: HTMLCanvasElement;
  a: AmortizationResult;
  b: AmortizationResult;
} | null = null;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function chartThemeOptions() {
  const text = cssVar('--chart-text') || '#64748b';
  const grid = cssVar('--chart-grid') || '#e2e8f0';
  return {
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: text },
      },
      tooltip: {
        backgroundColor: cssVar('--surface') || '#fff',
        titleColor: cssVar('--text') || '#1a1a2e',
        bodyColor: cssVar('--text-muted') || '#64748b',
        borderColor: grid,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Luna', color: text },
        ticks: { maxTicksLimit: 12, color: text },
        grid: { color: grid },
      },
      y: {
        title: { display: true, text: 'Dobândă cumulată', color: text },
        ticks: { color: text },
        grid: { color: grid },
      },
    },
  };
}

export function renderComparisonChart(
  canvas: HTMLCanvasElement,
  a: AmortizationResult,
  b: AmortizationResult,
): void {
  lastChartData = { canvas, a, b };

  const maxLen = Math.max(a.schedule.length, b.schedule.length);
  const labels = Array.from({ length: maxLen }, (_, i) => `${i + 1}`);

  const cumInterestA: number[] = [];
  const cumInterestB: number[] = [];
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < maxLen; i++) {
    sumA += a.schedule[i]?.interest ?? 0;
    sumB += b.schedule[i]?.interest ?? 0;
    cumInterestA.push(sumA);
    cumInterestB.push(sumB);
  }

  const isDark = document.documentElement.dataset.theme === 'dark';
  const blue = isDark ? '#60a5fa' : '#2563eb';
  const red = isDark ? '#f87171' : '#dc2626';

  const config: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Dobândă cumulată — termen scurt',
          data: cumInterestA,
          borderColor: blue,
          backgroundColor: isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.2,
        },
        {
          label: 'Dobândă cumulată — termen lung + extra',
          data: cumInterestB,
          borderColor: red,
          backgroundColor: isDark ? 'rgba(248, 113, 113, 0.15)' : 'rgba(220, 38, 38, 0.1)',
          fill: true,
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...chartThemeOptions(),
    },
  };

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(canvas, config);
}

export function refreshChartTheme(): void {
  if (lastChartData) {
    renderComparisonChart(
      lastChartData.canvas,
      lastChartData.a,
      lastChartData.b,
    );
  }
}
