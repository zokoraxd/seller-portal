import { describe, expect, it } from 'vitest'
import { DEFAULT_CALC, evaluateDeal, optimizeSplit } from '../src/core/deal'

describe('evaluateDeal properties', () => {
  it('a campaign with no discount and no uplift changes nothing for either side', () => {
    const r = evaluateDeal({ ...DEFAULT_CALC, totalDiscountPct: 0, multiplier: 1 })
    expect(r.mDelta).toBeCloseTo(0, 6)
    expect(r.pDelta).toBeCloseTo(0, 6)
    expect(r.isWinWin).toBe(false) // zero gain is not a win
  })

  it('giving the merchant a bigger share shifts cost to the merchant', () => {
    const lo = evaluateDeal({ ...DEFAULT_CALC, merchantSharePct: 30 })
    const hi = evaluateDeal({ ...DEFAULT_CALC, merchantSharePct: 70 })
    expect(hi.mDelta).toBeLessThan(lo.mDelta)
    expect(hi.pDelta).toBeGreaterThan(lo.pDelta)
  })

  it('splits the discount per order exactly between the two sides', () => {
    const r = evaluateDeal({ ...DEFAULT_CALC, merchantSharePct: 40 })
    expect(r.platformSharePct).toBe(60)
    expect(r.discPerOrder).toBeCloseTo(207000 * 0.15, 6)
  })
})

describe('installment funding assumption', () => {
  const base = { ...DEFAULT_CALC, totalDiscountPct: 20, merchantSharePct: 40 }

  it('defaults to 0.65 of the platform subsidy', () => {
    expect(DEFAULT_CALC.bnplSubsidyFactor).toBe(0.65)
  })

  it('factor 1 behaves like any other funding source', () => {
    const a = evaluateDeal({ ...base, fundingSource: 'bnpl', bnplSubsidyFactor: 1 })
    const b = evaluateDeal({ ...base, fundingSource: 'delivery' })
    expect(a.pDelta).toBeCloseTo(b.pDelta, 6)
  })

  it('a lower factor makes the platform better off, and is ignored for other sources', () => {
    const cheap = evaluateDeal({ ...base, fundingSource: 'bnpl', bnplSubsidyFactor: 0.3 })
    const dear = evaluateDeal({ ...base, fundingSource: 'bnpl', bnplSubsidyFactor: 0.9 })
    expect(cheap.pDelta).toBeGreaterThan(dear.pDelta)
    const x = evaluateDeal({ ...base, fundingSource: 'commission', bnplSubsidyFactor: 0.1 })
    const y = evaluateDeal({ ...base, fundingSource: 'commission', bnplSubsidyFactor: 0.9 })
    expect(x.pDelta).toBe(y.pDelta)
  })
})

describe('optimizeSplit', () => {
  it('finds a split where both sides gain when one exists', () => {
    const { share, found } = optimizeSplit(DEFAULT_CALC)
    expect(found).toBe(true)
    expect(evaluateDeal({ ...DEFAULT_CALC, merchantSharePct: share }).isWinWin).toBe(true)
    // and no other 5%-step split beats it on the "smaller relative gain" score
    const score = (sh) => {
      const r = evaluateDeal({ ...DEFAULT_CALC, merchantSharePct: sh })
      return r.isWinWin ? Math.min(r.mDelta / r.mBefore, r.pDelta / r.pBefore) : -Infinity
    }
    for (let sh = 10; sh <= 90; sh += 5) expect(score(sh)).toBeLessThanOrEqual(score(share) + 1e-12)
  })

  it('reports found:false when no split can work', () => {
    const hopeless = { ...DEFAULT_CALC, multiplier: 1, totalDiscountPct: 40 }
    expect(optimizeSplit(hopeless).found).toBe(false)
  })
})

describe('demo data consistency', () => {
  it('the seeded offer is a genuine win-win when evaluated by the real engine', async () => {
    const { DEFAULT_OFFERS, DEFAULT_LEDGER } = await import('../src/core/demo')
    const { aggregateStores } = await import('../src/core/stores')
    const { calcFromStore } = await import('../src/core/deal')
    const [offer] = DEFAULT_OFFERS
    const store = aggregateStores(DEFAULT_LEDGER).find((s) => s.name === offer.storeName)
    const r = evaluateDeal(
      calcFromStore(store, {
        ...DEFAULT_CALC,
        totalDiscountPct: offer.totalDiscountPct,
        merchantSharePct: offer.merchantSharePct,
        fundingSource: offer.fundingSource,
        multiplier: offer.multiplier,
      }),
    )
    expect(offer.merchantSharePct + offer.platformSharePct).toBe(100)
    expect(r.isWinWin).toBe(true)
  })
})
