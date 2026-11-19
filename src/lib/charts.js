import { ArcElement, BarController, BarElement, CategoryScale, Chart, DoughnutController, Legend, LinearScale, Tooltip } from 'chart.js'

// Register only what is used (smaller bundle than chart.js/auto).
Chart.register(ArcElement, BarController, BarElement, CategoryScale, DoughnutController, Legend, LinearScale, Tooltip)
Chart.defaults.font.family = "'Cairo', 'Tajawal', sans-serif"
Chart.defaults.color = '#475569'

export const BRAND = '#EA580C'
export const INK = '#0F172A'
export const TEAL = '#0D9488'
export const SLATE = '#94A3B8'
export const PALETTE = [BRAND, INK, TEAL, SLATE]

const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const base = { responsive: true, maintainAspectRatio: false, ...(reduceMotion ? { animation: false } : {}) }
const legend = { position: 'bottom', rtl: true }

/** Bar chart options for an RTL page: y-axis on the right, RTL legend and tooltips. */
export function barOptions({ max, legendOn = true } = {}) {
  return {
    ...base,
    plugins: { legend: { ...legend, display: legendOn }, tooltip: { rtl: true } },
    scales: {
      x: { grid: { display: false } },
      y: { position: 'right', min: 0, ...(max ? { max } : {}), grid: { color: '#F1F5F9' } },
    },
  }
}

/** Doughnut options; `unit` is appended to tooltip values. */
export function doughnutOptions({ cutout = '64%', format = (v) => String(v) } = {}) {
  return {
    ...base,
    cutout,
    plugins: {
      legend,
      tooltip: { rtl: true, callbacks: { label: (ctx) => ` ${ctx.label}: ${format(ctx.parsed)}` } },
    },
  }
}
