import { describe, expect, it } from 'vitest'
import { DEFAULT_LEDGER } from '../src/core/demo'
import { CYCLE_LABEL, cycleBreakdown, getCycleFromDate, radarInsights } from '../src/core/radar'
import { aggregateStores } from '../src/core/stores'

describe('getCycleFromDate', () => {
  it.each([
    ['2026-11-01', 'salary_days'],
    ['2026-11-10', 'salary_days'],
    ['2026-11-11', 'mid_month'],
    ['2026-11-30', 'mid_month'],
    ['', 'salary_days'],
    ['garbage', 'salary_days'],
  ])('%j -> %s', (date, cycle) => {
    expect(getCycleFromDate(date)).toBe(cycle)
    expect(CYCLE_LABEL[cycle]).toBeTruthy()
  })
})

describe('cycleBreakdown', () => {
  const gmv = (t) => t.units_sold * t.sell_price_iqd

  it.each(['salary_days', 'mid_month'])('%s: segment totals add up to the cycle total, returns excluded', (cycle) => {
    const expected = DEFAULT_LEDGER.filter((t) => t.status !== 'returned' && getCycleFromDate(t.order_date) === cycle).reduce((s, t) => s + gmv(t), 0)
    const b = cycleBreakdown(DEFAULT_LEDGER, cycle)
    expect(b.total).toBe(expected)
    expect(b.segTotals).toHaveLength(3)
    expect(b.bySegmentCategory.flat().reduce((a, c) => a + c, 0)).toBe(expected)
  })

  it('the two cycles together cover all delivered sales', () => {
    const all = DEFAULT_LEDGER.filter((t) => t.status !== 'returned').reduce((s, t) => s + gmv(t), 0)
    expect(cycleBreakdown(DEFAULT_LEDGER, 'salary_days').total + cycleBreakdown(DEFAULT_LEDGER, 'mid_month').total).toBe(all)
  })
})

describe('radarInsights', () => {
  it('returns three recommendations naming real stores from the data', () => {
    const stores = aggregateStores(DEFAULT_LEDGER)
    const insights = radarInsights(cycleBreakdown(DEFAULT_LEDGER, 'salary_days'), stores)
    expect(insights).toHaveLength(3)
    expect(insights[1].body).toContain(stores[0].name)
    expect(insights[2].body).toContain('أزياء دجلة الحديثة') // lowest health score in the demo data
  })

  it('does not crash with no data', () => {
    expect(radarInsights(cycleBreakdown([], 'salary_days'), [])).toHaveLength(3)
  })
})
