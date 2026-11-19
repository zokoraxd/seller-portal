// Co-funded discount ("win-win") calculator.
// Question it answers: if a store and the platform split a discount, do BOTH end up
// with more profit than before the campaign, given the extra orders it brings?

export const DEFAULT_CALC = {
  storeName: 'معرض البغدادي للأجهزة',
  orders: 323,
  aov: 207_000,
  marginPct: 28,
  totalDiscountPct: 15,
  merchantSharePct: 60,
  multiplier: 1.8,
  commissionPct: 12,
  deliveryMargin: 3_000,
  fundingSource: 'bnpl', // 'delivery' | 'commission' | 'bnpl'
  // Assumption, not a measured number: when the discount is funded through installment
  // financing, the platform is assumed to bear only this share of its subsidy.
  bnplSubsidyFactor: 0.65,
}

export const FUNDING_LABEL = {
  delivery: 'هامش التوصيل',
  commission: 'تخفيض العمولة',
  bnpl: 'التقسيط',
}

export function evaluateDeal(c) {
  const platformSharePct = 100 - c.merchantSharePct
  const discPerOrder = c.aov * (c.totalDiscountPct / 100)
  const merchDisc = discPerOrder * (c.merchantSharePct / 100)
  const platSub = discPerOrder * (platformSharePct / 100)
  const factor = c.bnplSubsidyFactor ?? DEFAULT_CALC.bnplSubsidyFactor
  const netPlatSub = c.fundingSource === 'bnpl' ? platSub * factor : platSub

  const comm = c.aov * (c.commissionPct / 100)
  const gross = c.aov * (c.marginPct / 100)

  const mBefore = c.orders * (gross - comm)
  const pBefore = c.orders * (comm + c.deliveryMargin)

  const newOrders = Math.round(c.orders * c.multiplier)
  const extraUnits = newOrders - c.orders

  const mUnitAfter = gross - comm - merchDisc
  const pUnitAfter = comm + c.deliveryMargin - netPlatSub

  const mAfter = newOrders * mUnitAfter
  const pAfter = newOrders * pUnitAfter

  const mDelta = mAfter - mBefore
  const pDelta = pAfter - pBefore

  return {
    platformSharePct,
    discPerOrder,
    newOrders,
    extraUnits,
    mBefore,
    mAfter,
    mDelta,
    pBefore,
    pAfter,
    pDelta,
    isWinWin: mDelta > 0 && pDelta > 0 && mUnitAfter > 0 && pUnitAfter > 0,
  }
}

/**
 * Search merchant shares from 10% to 90% (step 5) for the split that maximises the
 * smaller of the two relative profit gains. Returns the current share if no split works.
 */
export function optimizeSplit(calc) {
  let bestShare = 60
  let bestScore = -Infinity
  for (let share = 10; share <= 90; share += 5) {
    const r = evaluateDeal({ ...calc, merchantSharePct: share })
    if (r.isWinWin) {
      const score = Math.min(r.mDelta / (r.mBefore || 1), r.pDelta / (r.pBefore || 1))
      if (score > bestScore) {
        bestScore = score
        bestShare = share
      }
    }
  }
  return { share: bestShare, found: bestScore > -Infinity }
}

/** Pre-fill the calculator from a store's real numbers. */
export function calcFromStore(store, calc) {
  return {
    ...calc,
    storeName: store.name,
    orders: Math.max(10, store.deliveredUnits),
    aov: Math.max(10_000, store.aov),
    marginPct: Math.max(10, store.marginPct),
  }
}
