import { describe, expect, it } from 'vitest'
import { DEFAULT_LEDGER } from '../src/core/demo'
import { MAX_DELIVERY_HOURS, MAX_IQD, MAX_UNITS, validateRows } from '../src/core/ledger'
import { ledgerFromDb, ledgerToDb, messageFromDb, messageToDb, offerFromDb, offerToDb, taskFromDb, taskToDb } from '../src/data/remote'
import { makeSeed } from '../src/stores/app'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('database mappers', () => {
  it('ledger: never sends an id or owner (the database sets them) and round-trips every field', () => {
    const row = { id: 'tx-1', ...DEFAULT_LEDGER[0] }
    const db = ledgerToDb(row)
    expect(db).not.toHaveProperty('id')
    expect(db).not.toHaveProperty('owner_id')
    const back = ledgerFromDb({ id: 'abc', ...db })
    expect(back).toEqual({ ...row, id: 'abc' })
  })

  it('ledger: reads numeric columns that arrive as strings or numbers', () => {
    const back = ledgerFromDb({ ...ledgerToDb(DEFAULT_LEDGER[0]), id: 'x', units_sold: '45', buy_cost_iqd: '152000', sell_price_iqd: 215000, delivery_hours: '20' })
    expect(back.units_sold).toBe(45)
    expect(back.buy_cost_iqd).toBe(152000)
    expect(typeof back.sell_price_iqd).toBe('number')
  })

  it('offers round-trip (numeric columns come back as strings from Postgres)', () => {
    const offer = {
      id: 'o1', storeName: 'متجر', totalDiscountPct: 14, merchantSharePct: 45, platformSharePct: 55, fundingSource: 'bnpl',
      multiplier: 1.9, projectedExtraUnits: 291, projectedMerchantProfitDelta: 1995864, note: 'ملاحظة', status: 'pending',
    }
    const db = offerToDb(offer)
    expect(db.merchant_share_pct + db.platform_share_pct).toBe(100)
    const back = offerFromDb({ ...db, total_discount_pct: '14.00', merchant_share_pct: '45.00', platform_share_pct: '55.00', multiplier: '1.90', created_at: '2026-11-19T10:00:00Z' })
    expect(back).toMatchObject({ ...offer, createdAt: '2026-11-19T10:00:00Z' })
  })

  it('messages: body <-> text, time is derived from created_at, createdAt is only sent when known', () => {
    const msg = { id: 'm1', storeName: 'متجر', sender: 'admin', text: 'مرحباً', readByMerchant: false, readByAdmin: true }
    expect(messageToDb(msg)).not.toHaveProperty('created_at')
    const db = { ...messageToDb({ ...msg, createdAt: '2026-11-19T10:05:00Z' }), created_at: '2026-11-19T10:05:00Z' }
    const back = messageFromDb(db)
    expect(back).toMatchObject({ id: 'm1', text: 'مرحباً', sender: 'admin', readByAdmin: true, createdAt: '2026-11-19T10:05:00Z' })
    expect(back.time).toBeTruthy()
  })

  it('tasks round-trip', () => {
    const task = { id: 't1', title: 'متابعة', storeName: 'متجر', priority: 'urgent', done: true }
    expect(taskFromDb(taskToDb(task))).toEqual(task)
  })
})

describe('makeSeed (the demo workspace written to a new visitor’s database)', () => {
  const seed = makeSeed()

  it('gives every offer, message and task a UUID, because the database id column is a uuid', () => {
    for (const item of [...seed.offers, ...seed.messages, ...seed.tasks]) expect(item.id).toMatch(UUID)
    expect(new Set([...seed.ledger, ...seed.offers, ...seed.messages, ...seed.tasks].map((x) => x.id)).size).toBe(
      seed.ledger.length + seed.offers.length + seed.messages.length + seed.tasks.length,
    )
  })

  it('is a fresh copy each time and does not mutate the demo constants', () => {
    expect(makeSeed().ledger[0].id).not.toBe(seed.ledger[0].id)
    expect(DEFAULT_LEDGER[0].id).toBe('tx-1')
  })

  it('messages carry ordered timestamps and offers satisfy the 100% share constraint', () => {
    expect(seed.messages.every((m) => !Number.isNaN(Date.parse(m.createdAt)))).toBe(true)
    for (const o of seed.offers) expect(o.merchantSharePct + o.platformSharePct).toBe(100)
  })

  it('every value fits the database check constraints', () => {
    const categories = ['الأجهزة المنزلية', 'الإلكترونيات', 'العطور والتجميل', 'الأزياء']
    const segments = ['المتقاعدون', 'الموظفون', 'الشباب والعمال']
    for (const r of seed.ledger) {
      expect(categories).toContain(r.category)
      expect(segments).toContain(r.customer_segment)
      expect(['delivered', 'returned']).toContain(r.status)
      expect(r.units_sold).toBeGreaterThanOrEqual(1)
      expect(r.units_sold).toBeLessThanOrEqual(MAX_UNITS)
      expect(r.sell_price_iqd).toBeLessThanOrEqual(MAX_IQD)
      expect(r.order_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe('value limits match the database', () => {
  const row = { store_name: 'م', category: 'الأزياء', order_date: '2026-11-01', units_sold: 1, buy_cost_iqd: 1, sell_price_iqd: 2, status: 'delivered', customer_segment: 'موظف' }
  const one = (patch) => validateRows([{ ...row, ...patch }]).rows[0]

  it('rejects quantities and prices the database would refuse', () => {
    expect(one({ units_sold: MAX_UNITS + 1 }).issues.map((i) => i.code)).toContain('bad_units')
    expect(one({ units_sold: MAX_UNITS }).blocked).toBe(false)
    expect(one({ sell_price_iqd: MAX_IQD + 1 }).issues.map((i) => i.code)).toContain('bad_sell')
    expect(one({ buy_cost_iqd: MAX_IQD + 1 }).issues.map((i) => i.code)).toContain('bad_buy')
  })

  it('treats an absurd delivery time like a missing one (defaults to 24 with a warning)', () => {
    const r = one({ delivery_hours: MAX_DELIVERY_HOURS + 1 })
    expect(r.values.delivery_hours).toBe(24)
    expect(r.issues.map((i) => i.code)).toContain('default_delivery')
  })
})
