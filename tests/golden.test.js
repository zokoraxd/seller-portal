// Characterization tests.
// tests/golden.json was produced by running the ORIGINAL single-file prototype's
// aggregation and deal logic on its own demo data. These tests prove the refactor into
// pure modules did not change a single number.
import { describe, expect, it } from 'vitest'
import { DEFAULT_CALC, calcFromStore, evaluateDeal, optimizeSplit } from '../src/core/deal'
import { DEFAULT_LEDGER } from '../src/core/demo'
import { aggregateStores } from '../src/core/stores'
import golden from './golden.json'

describe('store aggregation matches the original prototype', () => {
  const stores = aggregateStores(DEFAULT_LEDGER)

  it('returns the same stores in the same (sales-descending) order', () => {
    expect(stores.map((s) => s.name)).toEqual(golden.stores.map((s) => s.name))
  })

  it.each(golden.stores.map((g) => [g.name, g]))('%s: every KPI is identical', (name, g) => {
    const s = stores.find((x) => x.name === name)
    for (const key of [
      'category',
      'city',
      'deliveredUnits',
      'returnedUnits',
      'totalGmv',
      'totalBuyCost',
      'totalGrossProfit',
      'totalUnitsAll',
      'txCount',
      'aov',
      'marginPct',
      'returnRate',
      'avgDeliveryHours',
      'healthScore',
    ]) {
      expect(s[key], key).toBe(g[key])
    }
    // renamed from bnpl* to installment* when the third-party brand was removed
    expect(s.installmentUnits).toBe(g.bnplUnits)
    expect(s.installmentShare).toBe(g.bnplShare)
  })

  it('explains each score: the parts add up to the score (before clamping)', () => {
    for (const s of stores) {
      const sum = Object.values(s.healthParts).reduce((a, b) => a + b, 0)
      expect(Math.round(Math.max(15, Math.min(100, sum)))).toBe(s.healthScore)
    }
  })
})

describe('deal evaluation matches the original prototype', () => {
  it.each(golden.deals.map((d, i) => [i, d]))('scenario %i', (_i, { calc, result }) => {
    const r = evaluateDeal({ ...DEFAULT_CALC, ...calc })
    for (const [key, expected] of Object.entries(result)) {
      if (typeof expected === 'number') expect(r[key], key).toBeCloseTo(expected, 6)
      else expect(r[key], key).toBe(expected)
    }
  })

  it.each(golden.deals.map((d, i) => [i, d.calc, golden.optimized[i]]))('auto-balance scenario %i picks the same share', (_i, calc, share) => {
    expect(optimizeSplit({ ...DEFAULT_CALC, ...calc }).share).toBe(share)
  })
})

describe('calculator pre-fill', () => {
  it('copies a store’s real numbers, with the same lower bounds as the original', () => {
    const store = aggregateStores(DEFAULT_LEDGER)[0]
    const c = calcFromStore(store, DEFAULT_CALC)
    expect(c).toMatchObject({ storeName: store.name, orders: store.deliveredUnits, aov: store.aov, marginPct: store.marginPct })
    expect(calcFromStore({ name: 'x', deliveredUnits: 1, aov: 5, marginPct: 1 }, DEFAULT_CALC)).toMatchObject({ orders: 10, aov: 10000, marginPct: 10 })
  })
})
