import { toWesternDigits } from './arabic'

const pad = (n) => String(n).padStart(2, '0')

function isRealDate(y, m, d) {
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

const iso = (y, m, d) => (isRealDate(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : null)

// Excel stores dates as day counts. 25569 is 1970-01-01. The range below is 1954-2119.
const isExcelSerial = (n) => Number.isFinite(n) && n >= 20000 && n <= 80000

function fromSerial(n) {
  const dt = new Date(Math.floor(n - 25569) * 86_400_000)
  return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

/**
 * Normalise any reasonable date cell to "YYYY-MM-DD", or null.
 * Accepts: Excel serials, Date objects, YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY
 * (Iraqi order, day first) and Arabic-digit versions of all of those.
 */
export function parseDate(raw) {
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : iso(raw.getFullYear(), raw.getMonth() + 1, raw.getDate())
  }
  if (typeof raw === 'number') return isExcelSerial(raw) ? fromSerial(raw) : null
  if (raw === null || raw === undefined) return null

  const s = toWesternDigits(raw).trim()
  if (!s) return null

  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const n = Number(s)
    return isExcelSerial(n) ? fromSerial(n) : null
  }

  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/)
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]))

  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
  if (m) return iso(Number(m[3]), Number(m[2]), Number(m[1]))

  return null
}
