import { formatCompactIQD } from './format'
import { CATEGORIES, SEGMENTS } from './ledger'

// Iraqi public salaries are paid at the start of the month, so sales are split into
// "salary days" (day 1-10) and "mid month" (day 11+).
export function getCycleFromDate(dateStr) {
  const day = parseInt(String(dateStr || '').split('-')[2], 10)
  if (Number.isNaN(day)) return 'salary_days'
  return day <= 10 ? 'salary_days' : 'mid_month'
}

export const CYCLE_LABEL = { salary_days: 'أيام الرواتب', mid_month: 'منتصف الشهر' }

/** Delivered sales in a cycle, grouped by buyer segment and by segment x category. */
export function cycleBreakdown(ledger, cycle) {
  const tx = ledger.filter((t) => t.status !== 'returned' && getCycleFromDate(t.order_date) === cycle)
  const gmv = (t) => t.units_sold * t.sell_price_iqd

  const segTotals = SEGMENTS.map((seg) => tx.filter((t) => t.customer_segment === seg).reduce((s, t) => s + gmv(t), 0))
  const total = segTotals.reduce((a, b) => a + b, 0)
  const bySegmentCategory = SEGMENTS.map((seg) =>
    CATEGORIES.map((cat) =>
      tx.filter((t) => t.customer_segment === seg && t.category === cat).reduce((s, t) => s + gmv(t), 0),
    ),
  )
  return { count: tx.length, segTotals, total, bySegmentCategory }
}

/** Three plain-language recommendations computed from the same data. */
export function radarInsights(breakdown, stores) {
  const { segTotals, total } = breakdown
  const topIdx = segTotals.indexOf(Math.max(...segTotals))
  const topSeg = SEGMENTS[topIdx] ?? SEGMENTS[1]
  const topStore = stores[0]
  const weakest = [...stores].sort((a, b) => a.healthScore - b.healthScore)[0]

  return [
    {
      title: `الشريحة الأقوى الآن: ${topSeg}`,
      body: `تستحوذ شريحة ${topSeg} على ${total > 0 ? Math.round((segTotals[topIdx] / total) * 100) : 0}% من مبيعات هذه الفترة (${formatCompactIQD(segTotals[topIdx] ?? 0)}).`,
    },
    {
      title: 'أفضل متجر للعرض المشترك',
      body: topStore
        ? `متجر "${topStore.name}" يحقق هامشاً حقيقياً ${topStore.marginPct}% ومبيعات ${formatCompactIQD(topStore.totalGmv)} — مثالي لحملة خصم مشترك.`
        : 'ارفع بيانات المتاجر لتوليد التوصية.',
    },
    {
      title: 'متجر يحتاج تدخل ومتابعة',
      body: weakest
        ? `متجر "${weakest.name}" (صحة ${weakest.healthScore}/100، إرجاع ${weakest.returnRate}%) يحتاج مراجعة سريعة مع التاجر.`
        : 'جميع المتاجر مستقرة.',
    },
  ]
}
