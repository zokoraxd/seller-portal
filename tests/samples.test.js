import { describe, expect, it } from 'vitest'
import { analyzeHeaders } from '../src/core/headers'
import { applyFix, commitRows, validateRows } from '../src/core/ledger'
import { messyRows, templateRows } from '../src/core/samples'

describe('sample files', () => {
  it('the clean template validates with no problems', () => {
    const { rows, summary } = validateRows(templateRows())
    expect(summary).toMatchObject({ total: 3, ready: 3, needsFix: 0, errors: 0 })
    expect(rows.flatMap((r) => r.issues)).toEqual([])
  })

  it('the messy sample exercises every kind of issue', () => {
    const { rows, summary } = validateRows(messyRows())
    expect(summary).toEqual({ total: 8, ready: 4, needsFix: 2, errors: 2, warnings: 2, duplicates: 1 })
    expect(analyzeHeaders(messyRows()).missingRequired).toEqual([])
    // the messy numbers are read correctly
    expect(rows[0].values).toMatchObject({ units_sold: 45, buy_cost_iqd: 145000, sell_price_iqd: 210000, order_date: '2026-11-04', category: 'الأجهزة المنزلية' })
    expect(rows[1].values).toMatchObject({ order_date: '2026-11-12', category: 'الإلكترونيات', sell_price_iqd: 120000 })
  })

  it('after the user fixes the two choices, six rows commit (duplicate skipped, errors excluded)', () => {
    let { rows } = validateRows(messyRows())
    rows = rows.map((r) => applyFix(applyFix(r, 'category', 'الإلكترونيات'), 'status', 'delivered'))
    expect(commitRows(rows)).toHaveLength(5)
    expect(commitRows(rows, { skipDuplicates: false })).toHaveLength(6)
  })
})
