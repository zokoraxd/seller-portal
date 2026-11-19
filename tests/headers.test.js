import { describe, expect, it } from 'vitest'
import { analyzeHeaders, canonicalHeader, mapRow } from '../src/core/headers'

describe('canonicalHeader', () => {
  it.each([
    ['store_name', 'store_name'],
    ['Store Name', 'store_name'],
    ['اسم  المتجر', 'store_name'],
    ['إسم المتجر', 'store_name'], // different alef spelling
    ['سعر البيع', 'sell_price_iqd'],
    ['Price', 'sell_price_iqd'],
    ['كلفة الشراء', 'buy_cost_iqd'],
    ['الكمية', 'units_sold'],
    ['تاريخ الطلب', 'order_date'],
    ['طريقة الدفع', 'payment_method'],
  ])('maps %j to %j', (raw, expected) => {
    expect(canonicalHeader(raw)).toBe(expected)
  })

  it('returns null for unknown columns', () => {
    expect(canonicalHeader('ملاحظات')).toBeNull()
  })
})

describe('mapRow', () => {
  it('renames known keys, drops unknown ones and keeps the first duplicate', () => {
    expect(mapRow({ 'اسم المتجر': 'أ', السعر: 5, price: 9, ملاحظات: 'x' })).toEqual({ store_name: 'أ', sell_price_iqd: 5 })
  })
})

describe('analyzeHeaders', () => {
  const rows = [{ 'اسم المتجر': 'أ', الكمية: 1, ملاحظات: 'x' }]

  it('reports mapped, unmapped and missing required columns', () => {
    const r = analyzeHeaders(rows)
    expect(r.mapped.map((m) => m.canonical)).toEqual(['store_name', 'units_sold'])
    expect(r.unmapped).toEqual(['ملاحظات'])
    expect(r.missingRequired).toEqual(['order_date', 'buy_cost_iqd', 'sell_price_iqd'])
  })

  it('does not require a store column when the merchant is fixed', () => {
    const r = analyzeHeaders([{ الكمية: 1 }], { forcedStore: true })
    expect(r.missingRequired).not.toContain('store_name')
  })
})
