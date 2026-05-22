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

export function renderComparisonChart(
  canvas: HTMLCanvasElement,
  a: AmortizationResult,
  b: AmortizationResult,
): void {
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

  const config: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Dobândă cumulată — termen scurt',
          data: cumInterestA,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.2,
        },
        {
          label: 'Dobândă cumulată — termen lung + extra',
          data: cumInterestB,
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          fill: true,
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
      },
      scales: {
        x: {
          title: { display: true, text: 'Luna' },
          ticks: { maxTicksLimit: 12 },
        },
        y: {
          title: { display: true, text: 'Dobândă cumulată' },
        },
      },
    },
  };

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(canvas, config);
}
