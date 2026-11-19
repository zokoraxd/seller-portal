// Number formatting helpers. Latin digits are used on purpose (ar-IQ-u-nu-latn)
// so tables stay aligned and numbers match what Excel exports.
const numFmt = new Intl.NumberFormat('ar-IQ-u-nu-latn')
const decFmt = new Intl.NumberFormat('ar-IQ-u-nu-latn', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export const formatNumber = (v) => numFmt.format(v)
export const formatDecimal = (v) => decFmt.format(v)

export function formatIQD(v) {
  return `${numFmt.format(Math.round(v))} د.ع`
}

export function formatCompactIQD(v) {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}${decFmt.format(abs / 1_000_000_000)} مليار د.ع`
  if (abs >= 1_000_000) return `${sign}${decFmt.format(abs / 1_000_000)} مليون د.ع`
  if (abs >= 1_000) return `${sign}${numFmt.format(Math.round(abs / 1_000))} ألف د.ع`
  return `${sign}${numFmt.format(Math.round(abs))} د.ع`
}

/** Millions of IQD with 2 decimals, used as chart values. */
export const toMillions = (v) => Number((v / 1_000_000).toFixed(2))
