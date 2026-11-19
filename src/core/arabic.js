// Parsing of messy Iraqi price/quantity text.
// Handles Arabic-Indic digits (٢٥٠٠٠), Persian digits (۲۵۰۰۰), Arabic separators
// (٬ ٫ ،), currency words (د.ع / دينار / IQD) and magnitude words (25 الف, 1.5 مليون).

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩'
const PERSIAN = '۰۱۲۳۴۵۶۷۸۹'

export function toWesternDigits(input) {
  return String(input ?? '').replace(/[٠-٩۰-۹]/g, (ch) => {
    const i = ARABIC_INDIC.indexOf(ch)
    return String(i !== -1 ? i : PERSIAN.indexOf(ch))
  })
}

const UNITS = [
  [/^(?:الف|ألف|الاف|آلاف|ألاف|k)$/, 1_000],
  [/^(?:مليون|ملايين|million|m)$/, 1_000_000],
]

/**
 * Turn a cell value into a number, or null if it cannot be read safely.
 * Never guesses: "25 دولار" or "abc" return null so the row can be flagged.
 */
export function parseAmount(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (raw === null || raw === undefined) return null

  let s = toWesternDigits(raw).trim().toLowerCase()
  if (!s) return null

  s = s
    .replace(/ـ/g, '') // tatweel
    .replace(/د\s*\.?\s*ع\.?/g, '')
    .replace(/دينار|عراقي|iqd/g, '')
    .replace(/\bid\b/g, '')
    .replace(/٫/g, '.')
    .replace(/[٬،]/g, ',')
    .trim()

  const m = s.match(/^(-?[\d,]*\.?\d+)\s*(\S*)$/)
  if (!m) return null
  const [, numPart, unit] = m

  let numStr
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(numPart)) {
    numStr = numPart.replace(/,/g, '') // 25,000 -> thousands separator
  } else if (/^-?\d+,\d{1,2}$/.test(numPart)) {
    numStr = numPart.replace(',', '.') // 1,5 -> decimal comma
  } else if (numPart.includes(',')) {
    return null // "1,2,3" is ambiguous
  } else {
    numStr = numPart
  }

  let multiplier = 1
  if (unit) {
    const hit = UNITS.find(([re]) => re.test(unit))
    if (!hit) return null
    multiplier = hit[1]
  }

  const value = Number(numStr) * multiplier
  return Number.isFinite(value) ? Math.round(value * 1e6) / 1e6 : null
}
