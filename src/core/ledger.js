import { parseAmount, toWesternDigits } from './arabic'
import { parseDate } from './dates'
import { mapRow } from './headers'

export const CATEGORIES = ['الأجهزة المنزلية', 'الإلكترونيات', 'العطور والتجميل', 'الأزياء']
export const SEGMENTS = ['المتقاعدون', 'الموظفون', 'الشباب والعمال']
export const STATUSES = ['delivered', 'returned']
export const STATUS_LABEL = { delivered: 'مكتمل', returned: 'مرتجع' }

export const MAX_ROWS = 20_000

// ---------------------------------------------------------------------------
// Matching free text to the fixed vocabularies. Return null when unsure:
// the review screen asks the user instead of silently guessing.
// ---------------------------------------------------------------------------

const clean = (v) => toWesternDigits(v).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
const squash = (v) => clean(v).toLowerCase().replace(/[أإآ]/g, 'ا')

export function matchCategory(raw) {
  const s = squash(raw)
  if (!s) return null
  const exact = CATEGORIES.find((c) => squash(c) === s)
  if (exact) return exact
  if (/اجهزه|اجهزة|منزل|appliance|home/.test(s)) return 'الأجهزة المنزلية'
  if (/الكترون|موبايل|هاتف|electronic|mobile|phone/.test(s)) return 'الإلكترونيات'
  if (/عطور|عطر|تجميل|perfume|beauty|cosmetic/.test(s)) return 'العطور والتجميل'
  if (/ازياء|ملابس|fashion|cloth/.test(s)) return 'الأزياء'
  return null
}

export function matchSegment(raw) {
  const s = squash(raw)
  if (!s) return null
  const exact = SEGMENTS.find((c) => squash(c) === s)
  if (exact) return exact
  if (/متقاعد|retire/.test(s)) return 'المتقاعدون'
  if (/موظف|employee|staff/.test(s)) return 'الموظفون'
  if (/شباب|عمال|youth|worker/.test(s)) return 'الشباب والعمال'
  return null
}

/** @returns {{value: 'delivered'|'returned'|null, defaulted: boolean}} */
export function matchStatus(raw) {
  const s = squash(raw)
  if (!s) return { value: 'delivered', defaulted: true }
  if (/مرتجع|ملغي|ارجاع|return|cancel|refund/.test(s)) return { value: 'returned', defaulted: false }
  if (/مكتمل|تم|مسلم|delivered|complete|done/.test(s)) return { value: 'delivered', defaulted: false }
  return { value: null, defaulted: false }
}

// ---------------------------------------------------------------------------
// Row validation
// ---------------------------------------------------------------------------

const issue = (field, severity, code, message, options) => ({ field, severity, code, message, ...(options ? { options } : {}) })
// severity: 'error' = row cannot be used, 'fix' = user must choose a value, 'warn' = row is usable but suspicious

export const dupKey = (v) => [v.store_name, v.order_date, v.units_sold, v.buy_cost_iqd, v.sell_price_iqd, v.status].join('|')

const isBlocking = (issues) => issues.some((i) => i.severity === 'error' || i.severity === 'fix')

function buildRow(raw, rowNum, forcedStore) {
  const m = mapRow(raw)
  const issues = []

  const store_name = forcedStore ?? clean(m.store_name)
  if (!store_name) issues.push(issue('store_name', 'error', 'missing_store', 'اسم المتجر مفقود'))

  let units_sold = parseAmount(m.units_sold)
  if (units_sold === null || units_sold <= 0) {
    issues.push(issue('units_sold', 'error', 'bad_units', 'الكمية يجب أن تكون رقماً أكبر من 0'))
    units_sold = null
  } else if (!Number.isInteger(units_sold)) {
    units_sold = Math.round(units_sold)
    issues.push(issue('units_sold', 'warn', 'rounded_units', 'تم تقريب الكمية إلى رقم صحيح'))
  }

  let sell_price_iqd = parseAmount(m.sell_price_iqd)
  if (sell_price_iqd === null || sell_price_iqd <= 0) {
    issues.push(issue('sell_price_iqd', 'error', 'bad_sell', 'سعر البيع غير صالح'))
    sell_price_iqd = null
  } else sell_price_iqd = Math.round(sell_price_iqd)

  let buy_cost_iqd = parseAmount(m.buy_cost_iqd)
  if (buy_cost_iqd === null || buy_cost_iqd < 0) {
    issues.push(issue('buy_cost_iqd', 'error', 'bad_buy', 'كلفة الشراء غير صالحة'))
    buy_cost_iqd = null
  } else buy_cost_iqd = Math.round(buy_cost_iqd)

  if (sell_price_iqd !== null && buy_cost_iqd !== null && sell_price_iqd < buy_cost_iqd) {
    issues.push(issue('sell_price_iqd', 'warn', 'negative_margin', 'سعر البيع أقل من كلفة الشراء (هامش سالب)'))
  }

  const order_date = parseDate(m.order_date)
  if (!order_date) issues.push(issue('order_date', 'error', 'bad_date', 'تاريخ الطلب مفقود أو غير مفهوم'))

  const category = matchCategory(m.category)
  if (!category) {
    const shown = clean(m.category)
    issues.push(issue('category', 'fix', 'unknown_category', shown ? `قطاع غير معروف: "${shown}"` : 'القطاع مفقود', CATEGORIES))
  }

  const segment = matchSegment(m.customer_segment)
  if (!segment) {
    const shown = clean(m.customer_segment)
    issues.push(issue('customer_segment', 'fix', 'unknown_segment', shown ? `شريحة غير معروفة: "${shown}"` : 'الشريحة مفقودة', SEGMENTS))
  }

  const status = matchStatus(m.status)
  if (status.value === null) {
    issues.push(issue('status', 'fix', 'unknown_status', `حالة غير معروفة: "${clean(m.status)}"`, STATUSES))
  } else if (status.defaulted) {
    issues.push(issue('status', 'warn', 'default_status', 'الحالة غير محددة — اعتُبر الطلب مكتملاً'))
  }

  let delivery_hours = parseAmount(m.delivery_hours)
  if (delivery_hours === null || delivery_hours <= 0) {
    delivery_hours = 24
    issues.push(issue('delivery_hours', 'warn', 'default_delivery', 'مدة التوصيل مفقودة — استُخدم 24 ساعة'))
  } else delivery_hours = Math.round(delivery_hours)

  const city = clean(m.city) || 'غير محدد'
  if (city === 'غير محدد') issues.push(issue('city', 'warn', 'missing_city', 'المحافظة مفقودة'))

  const payment_method = clean(m.payment_method) || 'غير محدد'
  if (payment_method === 'غير محدد') issues.push(issue('payment_method', 'warn', 'missing_payment', 'طريقة الدفع مفقودة'))

  const values = {
    store_name,
    category,
    city,
    order_date,
    units_sold,
    buy_cost_iqd,
    sell_price_iqd,
    status: status.value,
    delivery_hours,
    customer_segment: segment,
    payment_method,
  }

  return { rowNum, values, issues, blocked: isBlocking(issues) }
}

const DUP_ISSUE = issue('store_name', 'warn', 'duplicate', 'سجل مكرر محتمل (نفس المتجر والتاريخ والكمية والسعر)')

/**
 * Flag rows that repeat an earlier usable row (or a row already in the ledger).
 * Run again after the user fixes a row, so a row that was blocked is checked once it becomes usable.
 * Returns new row objects; the input is not modified.
 */
export function markDuplicates(rows, existing = []) {
  const seen = new Set(existing.map(dupKey))
  return rows.map((row) => {
    const without = row.issues.filter((i) => i.code !== 'duplicate')
    if (row.blocked) return without.length === row.issues.length ? row : { ...row, issues: without }
    const key = dupKey(row.values)
    const isDup = seen.has(key)
    seen.add(key)
    return { ...row, issues: isDup ? [...without, DUP_ISSUE] : without }
  })
}

/**
 * Validate and normalise raw uploaded rows. Pure function, no UI or global state.
 * @param {object[]} rawRows
 * @param {{forcedStore?: string|null, existing?: object[]}} options
 *   forcedStore: a merchant can only upload for their own store.
 *   existing: rows already in the ledger, used to spot duplicates.
 */
export function validateRows(rawRows, { forcedStore = null, existing = [] } = {}) {
  if (rawRows.length > MAX_ROWS) throw new Error(`الملف كبير جداً: الحد الأقصى ${MAX_ROWS} صف`)
  const built = rawRows.map((raw, i) => buildRow(raw, i + 2, forcedStore)) // +2: header is row 1
  const rows = markDuplicates(built, existing)
  return { rows, summary: summarize(rows) }
}

export function summarize(rows) {
  const has = (code) => rows.filter((r) => r.issues.some((i) => i.code === code)).length
  return {
    total: rows.length,
    ready: rows.filter((r) => !r.blocked).length,
    needsFix: rows.filter((r) => r.issues.some((i) => i.severity === 'fix')).length,
    errors: rows.filter((r) => r.issues.some((i) => i.severity === 'error')).length,
    warnings: rows.filter((r) => !r.blocked && r.issues.some((i) => i.severity === 'warn')).length,
    duplicates: has('duplicate'),
  }
}

/** Return a copy of a staged row with one 'fix' issue resolved by the user's choice. */
export function applyFix(row, field, value) {
  const target = row.issues.find((i) => i.field === field && i.severity === 'fix')
  if (!target || !target.options.includes(value)) return row
  const issues = row.issues.filter((i) => i !== target)
  return { ...row, values: { ...row.values, [field]: value }, issues, blocked: isBlocking(issues) }
}

let idCounter = 0

/** Turn reviewed rows into ledger records. Blocked rows (and optionally duplicates) are skipped. */
export function commitRows(rows, { skipDuplicates = true, idPrefix = 'tx-imp' } = {}) {
  const stamp = Date.now()
  return rows
    .filter((r) => !r.blocked)
    .filter((r) => !(skipDuplicates && r.issues.some((i) => i.code === 'duplicate')))
    .map((r) => ({ id: `${idPrefix}-${stamp}-${idCounter++}`, ...r.values }))
}
