import { toWesternDigits } from './arabic'

export const HEADER_ALIASES = {
  store_name: ['store_name', 'store', 'shop', 'merchant', 'اسم المتجر', 'المتجر', 'التاجر', 'اسم التاجر'],
  category: ['category', 'niche', 'sector', 'القطاع', 'التصنيف', 'الفئة'],
  city: ['city', 'governorate', 'المحافظة', 'المدينة'],
  order_date: ['order_date', 'date', 'تاريخ الطلب', 'التاريخ', 'تاريخ البيع'],
  units_sold: ['units_sold', 'units', 'qty', 'quantity', 'orders', 'الكمية', 'العدد', 'الطلبات'],
  buy_cost_iqd: ['buy_cost_iqd', 'buy_cost', 'cost', 'wholesale_cost', 'كلفة الشراء', 'سعر الشراء', 'التكلفة', 'الكلفة'],
  sell_price_iqd: ['sell_price_iqd', 'sell_price', 'price', 'سعر البيع', 'السعر'],
  status: ['status', 'order_status', 'حالة الطلب', 'الحالة'],
  delivery_hours: ['delivery_hours', 'delivery', 'مدة التوصيل', 'سرعة التوصيل', 'ساعات التوصيل'],
  customer_segment: ['customer_segment', 'segment', 'شريحة المشتري', 'الشريحة'],
  payment_method: ['payment_method', 'payment', 'طريقة الدفع', 'الدفع'],
}

export const REQUIRED_FIELDS = ['store_name', 'order_date', 'units_sold', 'buy_cost_iqd', 'sell_price_iqd']

/** Make "Store Name", "store_name" and "اسم  المتجر" comparable. */
export function normalizeHeader(raw) {
  return toWesternDigits(raw)
    .toLowerCase()
    .replace(/[ً-ٟـ]/g, '') // diacritics + tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[\s_\-.]+/g, '')
}

const LOOKUP = new Map()
for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
  for (const alias of aliases) LOOKUP.set(normalizeHeader(alias), canonical)
}

export function canonicalHeader(raw) {
  return LOOKUP.get(normalizeHeader(raw)) ?? null
}

/** Rename a raw row's keys to canonical field names. Unknown columns are dropped. */
export function mapRow(raw) {
  const out = {}
  for (const [key, value] of Object.entries(raw ?? {})) {
    const canonical = canonicalHeader(key)
    if (canonical && !(canonical in out)) out[canonical] = value
  }
  return out
}

/** Describe how the uploaded columns were understood, for the review screen. */
export function analyzeHeaders(rawRows, { forcedStore = false } = {}) {
  const keys = [...new Set(rawRows.flatMap((r) => Object.keys(r ?? {})))]
  const mapped = []
  const unmapped = []
  for (const raw of keys) {
    const canonical = canonicalHeader(raw)
    if (canonical) mapped.push({ raw, canonical })
    else unmapped.push(raw)
  }
  const found = new Set(mapped.map((m) => m.canonical))
  const missingRequired = REQUIRED_FIELDS.filter((f) => !found.has(f) && !(forcedStore && f === 'store_name'))
  return { mapped, unmapped, missingRequired }
}
