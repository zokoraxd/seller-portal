// Ledger -> per-store metrics -> health score. Pure functions, no global state.

export const isInstallment = (payment) => /تقسيط|أقساط|اقساط|bnpl|installment/i.test(String(payment ?? ''))

/**
 * Health score, 0-100, with the points each factor contributed so the UI can
 * explain "why 72?". Weights: volume 25, sales 20, low returns 25, delivery 20, margin 10.
 */
export function computeHealth({ deliveredUnits, totalGmv, returnRate, avgDeliveryHours, marginPct }) {
  const volume = Math.min(25, (Math.log10(Math.max(10, deliveredUnits)) / Math.log10(600)) * 25)
  const sales = Math.min(20, (totalGmv / 60_000_000) * 20)
  const returns = Math.max(0, 25 - returnRate * 1.7)
  const delivery = avgDeliveryHours <= 18 ? 20 : Math.max(2, 20 - ((avgDeliveryHours - 18) / 48) * 18)
  const margin = Math.min(10, Math.max(0, (marginPct / 35) * 10))
  const score = Math.round(Math.max(15, Math.min(100, volume + sales + returns + delivery + margin)))
  return { score, parts: { volume, sales, returns, delivery, margin } }
}

export const HEALTH_PART_MAX = { volume: 25, sales: 20, returns: 25, delivery: 20, margin: 10 }
export const HEALTH_PART_LABEL = {
  volume: 'حجم الطلبات',
  sales: 'المبيعات',
  returns: 'انخفاض الإرجاع',
  delivery: 'سرعة التوصيل',
  margin: 'هامش الربح',
}

export function getHealthBadge(score) {
  if (score >= 80) return { label: 'ممتاز', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (score >= 60) return { label: 'جيد', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: 'يحتاج تحسين', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
}

/** Group the ledger by store and compute KPIs. Sorted by total sales, highest first. */
export function aggregateStores(ledger) {
  const map = new Map()

  for (const tx of ledger) {
    if (!map.has(tx.store_name)) {
      map.set(tx.store_name, {
        name: tx.store_name,
        category: tx.category,
        city: tx.city,
        deliveredUnits: 0,
        returnedUnits: 0,
        totalGmv: 0,
        totalBuyCost: 0,
        totalGrossProfit: 0,
        deliveryHoursWeighted: 0,
        totalUnitsAll: 0,
        installmentUnits: 0,
        txCount: 0,
      })
    }

    const s = map.get(tx.store_name)
    const units = Number(tx.units_sold) || 0
    const buy = Number(tx.buy_cost_iqd) || 0
    const sell = Number(tx.sell_price_iqd) || 0
    const del = Number(tx.delivery_hours) || 24

    s.totalUnitsAll += units
    s.deliveryHoursWeighted += del * units
    s.txCount += 1

    if (tx.status === 'returned') {
      s.returnedUnits += units
    } else {
      s.deliveredUnits += units
      s.totalGmv += units * sell
      s.totalBuyCost += units * buy
      s.totalGrossProfit += units * (sell - buy)
      if (isInstallment(tx.payment_method)) s.installmentUnits += units
    }
  }

  const stores = []
  for (const s of map.values()) {
    const aov = s.deliveredUnits > 0 ? Math.round(s.totalGmv / s.deliveredUnits) : 0
    const marginPct = s.totalGmv > 0 ? (s.totalGrossProfit / s.totalGmv) * 100 : 0
    const returnRate = s.totalUnitsAll > 0 ? (s.returnedUnits / s.totalUnitsAll) * 100 : 0
    const avgDeliveryHours = s.totalUnitsAll > 0 ? Math.round(s.deliveryHoursWeighted / s.totalUnitsAll) : 24
    const installmentShare = s.deliveredUnits > 0 ? Math.round((s.installmentUnits / s.deliveredUnits) * 100) : 0
    const health = computeHealth({ ...s, returnRate, avgDeliveryHours, marginPct })

    stores.push({
      ...s,
      aov,
      marginPct: Number(marginPct.toFixed(1)),
      returnRate: Number(returnRate.toFixed(1)),
      avgDeliveryHours,
      installmentShare,
      healthScore: health.score,
      healthParts: health.parts,
    })
  }

  return stores.sort((a, b) => b.totalGmv - a.totalGmv)
}
