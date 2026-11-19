import { describe, expect, it } from 'vitest'
import { MAX_ROWS, applyFix, commitRows, markDuplicates, summarize, validateRows } from '../src/core/ledger'

const good = {
  store_name: 'معرض النور',
  category: 'الأجهزة المنزلية',
  city: 'بغداد',
  order_date: '2026-11-04',
  units_sold: 45,
  buy_cost_iqd: 145000,
  sell_price_iqd: 210000,
  status: 'مكتمل',
  delivery_hours: 18,
  customer_segment: 'المتقاعدون',
  payment_method: 'تقسيط',
}

const one = (patch = {}, opts) => validateRows([{ ...good, ...patch }], opts).rows[0]
const codes = (row) => row.issues.map((i) => i.code)

describe('validateRows: clean rows', () => {
  it('accepts a complete row with no issues', () => {
    const r = one()
    expect(r.blocked).toBe(false)
    expect(r.issues).toEqual([])
    expect(r.values).toMatchObject({ units_sold: 45, status: 'delivered', category: 'الأجهزة المنزلية' })
  })

  it('understands Arabic digits, magnitude words and Excel serial dates', () => {
    const r = one({
      units_sold: '٤٥',
      buy_cost_iqd: '145 الف',
      sell_price_iqd: '٢١٠٬٠٠٠',
      order_date: Date.UTC(2026, 10, 4) / 86_400_000 + 25569,
    })
    expect(r.blocked).toBe(false)
    expect(r.values).toMatchObject({ units_sold: 45, buy_cost_iqd: 145000, sell_price_iqd: 210000, order_date: '2026-11-04' })
  })

  it('reads Arabic or English column headers', () => {
    const r = validateRows([{ 'اسم المتجر': 'أ', الكمية: 2, 'كلفة الشراء': 10, 'سعر البيع': 20, التاريخ: '05/11/2026', القطاع: 'أزياء', الشريحة: 'موظف' }]).rows[0]
    expect(r.values).toMatchObject({ store_name: 'أ', units_sold: 2, order_date: '2026-11-05', category: 'الأزياء', customer_segment: 'الموظفون' })
  })
})

describe('validateRows: no more silent guessing (regressions of the original prototype)', () => {
  it('flags an unknown category instead of filing it under Electronics', () => {
    const r = one({ category: 'سيارات' })
    expect(r.blocked).toBe(true)
    expect(r.values.category).toBeNull()
    expect(r.issues[0]).toMatchObject({ field: 'category', severity: 'fix', code: 'unknown_category' })
  })

  it('flags a blank category and an unknown segment', () => {
    expect(codes(one({ category: '' }))).toContain('unknown_category')
    expect(codes(one({ customer_segment: 'طلاب' }))).toContain('unknown_segment')
  })

  it('does not treat an unknown status as delivered, but a blank one is flagged and defaulted', () => {
    const unknown = one({ status: 'قيد التوصيل' })
    expect(unknown.blocked).toBe(true)
    expect(unknown.values.status).toBeNull()
    const blank = one({ status: '' })
    expect(blank.blocked).toBe(false)
    expect(blank.values.status).toBe('delivered')
    expect(codes(blank)).toContain('default_status')
  })

  it('rejects a missing or invalid date instead of dating it 2026-11-05', () => {
    for (const order_date of ['', 'غدا', '2026-13-40']) {
      const r = one({ order_date })
      expect(r.blocked).toBe(true)
      expect(r.values.order_date).toBeNull()
      expect(codes(r)).toContain('bad_date')
    }
  })

  it('recognises returned-status synonyms', () => {
    for (const status of ['مرتجع', 'ملغي', 'returned', 'إرجاع']) expect(one({ status }).values.status).toBe('returned')
  })
})

describe('validateRows: errors and warnings', () => {
  it.each([
    [{ units_sold: 0 }, 'bad_units'],
    [{ units_sold: 'abc' }, 'bad_units'],
    [{ sell_price_iqd: '' }, 'bad_sell'],
    [{ buy_cost_iqd: -1 }, 'bad_buy'],
    [{ store_name: '  ' }, 'missing_store'],
  ])('blocks %j with %s', (patch, code) => {
    const r = one(patch)
    expect(r.blocked).toBe(true)
    expect(codes(r)).toContain(code)
    expect(r.issues.find((i) => i.code === code).severity).toBe('error')
  })

  it('warns, without blocking, when selling below cost', () => {
    const r = one({ sell_price_iqd: 100000 })
    expect(r.blocked).toBe(false)
    expect(codes(r)).toContain('negative_margin')
  })

  it('warns about defaults it had to apply', () => {
    const r = one({ delivery_hours: '', city: '', payment_method: '' })
    expect(r.blocked).toBe(false)
    expect(r.values).toMatchObject({ delivery_hours: 24, city: 'غير محدد', payment_method: 'غير محدد' })
    expect(codes(r)).toEqual(expect.arrayContaining(['default_delivery', 'missing_city', 'missing_payment']))
  })

  it('locks the store to the signed-in merchant', () => {
    const r = one({ store_name: 'متجر آخر' }, { forcedStore: 'معرض النور' })
    expect(r.values.store_name).toBe('معرض النور')
    expect(validateRows([{ ...good, store_name: '' }], { forcedStore: 'معرض النور' }).rows[0].blocked).toBe(false)
  })

  it('keeps hostile store names as plain text (escaping is the template job)', () => {
    const name = '<img src=x onerror=alert(1)>'
    expect(one({ store_name: name }).values.store_name).toBe(name)
  })

  it('refuses oversized files', () => {
    expect(() => validateRows(new Array(MAX_ROWS + 1).fill(good))).toThrow()
  })
})

describe('applyFix', () => {
  it('resolves a fix issue with one of the allowed options and unblocks the row', () => {
    const r = one({ category: 'سيارات' })
    const fixed = applyFix(r, 'category', 'الأزياء')
    expect(fixed.values.category).toBe('الأزياء')
    expect(fixed.blocked).toBe(false)
    expect(r.blocked).toBe(true) // original untouched
  })

  it('ignores values that are not offered and fields with no fix pending', () => {
    const r = one({ category: 'سيارات' })
    expect(applyFix(r, 'category', 'غير موجود')).toBe(r)
    expect(applyFix(r, 'city', 'x')).toBe(r)
  })

  it('keeps the row blocked while another fix is pending', () => {
    const r = one({ category: 'سيارات', customer_segment: 'طلاب' })
    expect(applyFix(r, 'category', 'الأزياء').blocked).toBe(true)
  })
})

describe('duplicates and commit', () => {
  it('flags the second identical row in a batch and rows already in the ledger', () => {
    const { rows } = validateRows([good, good])
    expect(codes(rows[0])).not.toContain('duplicate')
    expect(codes(rows[1])).toContain('duplicate')

    const existing = commitRows(validateRows([good]).rows)
    expect(codes(validateRows([good], { existing }).rows[0])).toContain('duplicate')
  })

  it('commits only usable rows, skipping duplicates unless told otherwise, with unique ids', () => {
    const { rows } = validateRows([good, good, { ...good, category: 'سيارات' }, { ...good, units_sold: 0 }, { ...good, units_sold: 7 }])
    const committed = commitRows(rows)
    expect(committed).toHaveLength(2)
    expect(commitRows(rows, { skipDuplicates: false })).toHaveLength(3)
    expect(new Set(committed.map((r) => r.id)).size).toBe(2)
    expect(committed[0]).toMatchObject({ store_name: 'معرض النور', status: 'delivered' })
    expect(committed[0]).not.toHaveProperty('issues')
  })

  it('summarises a batch', () => {
    const { summary } = validateRows([good, good, { ...good, category: 'سيارات' }, { ...good, units_sold: 0 }, { ...good, delivery_hours: '', units_sold: 9 }])
    // warnings = usable rows carrying a warning: the duplicate row and the defaulted-delivery row
    expect(summary).toEqual({ total: 5, ready: 3, needsFix: 1, errors: 1, warnings: 2, duplicates: 1 })
    expect(summarize([])).toMatchObject({ total: 0, ready: 0 })
  })
})

describe('markDuplicates after a fix', () => {
  it('flags a row that only became usable (and identical to another) once the user fixed it', () => {
    const { rows } = validateRows([good, { ...good, category: 'سيارات' }])
    expect(codes(rows[1])).not.toContain('duplicate') // blocked rows are not duplicate-checked yet
    const fixed = markDuplicates(rows.map((r) => applyFix(r, 'category', 'الأجهزة المنزلية')))
    expect(codes(fixed[0])).not.toContain('duplicate')
    expect(codes(fixed[1])).toContain('duplicate')
  })

  it('is stable when run twice and clears the flag if the twin is gone', () => {
    const { rows } = validateRows([good, good])
    const again = markDuplicates(markDuplicates(rows))
    expect(codes(again[1]).filter((c) => c === 'duplicate')).toHaveLength(1)
    expect(codes(markDuplicates([rows[1]])[0])).not.toContain('duplicate')
  })
})
