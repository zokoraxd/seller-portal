// A small RFC-4180 CSV/TSV reader and a CSV writer.
// Written by hand because splitting on commas breaks as soon as a store name
// or a price like "25,000" contains one.

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  let best = ','
  let bestCount = 0
  for (const d of [',', '\t', ';']) {
    // count delimiters outside quotes
    let inQuotes = false
    let count = 0
    for (const ch of firstLine) {
      if (ch === '"') inQuotes = !inQuotes
      else if (ch === d && !inQuotes) count++
    }
    if (count > bestCount) {
      best = d
      bestCount = count
    }
  }
  return best
}

function splitRecords(text, delimiter) {
  const records = []
  let field = ''
  let record = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      record.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      record.push(field)
      records.push(record)
      field = ''
      record = []
    } else {
      field += ch
    }
  }
  if (field !== '' || record.length > 0) {
    record.push(field)
    records.push(record)
  }
  return records
}

/** Parse CSV/TSV text into an array of {header: value} objects. */
export function parseDelimited(text) {
  const clean = String(text ?? '').replace(/^﻿/, '')
  if (!clean.trim()) return []

  const records = splitRecords(clean, detectDelimiter(clean)).filter((r) => r.some((c) => c.trim() !== ''))
  if (records.length < 2) return []

  const headers = records[0].map((h) => h.trim())
  return records.slice(1).map((cols) => {
    const obj = {}
    headers.forEach((h, i) => {
      if (h && !FORBIDDEN_KEYS.has(h)) obj[h] = (cols[i] ?? '').trim()
    })
    return obj
  })
}

// Excel treats cells starting with = + @ (or - followed by a letter) as formulas.
function neutralizeFormula(value) {
  return typeof value === 'string' && /^[=+@]|^-(?!\d)/.test(value) ? `'${value}` : value
}

/** Serialise rows to CSV with a UTF-8 BOM so Excel opens Arabic correctly. */
export function toCsv(rows, headers = Object.keys(rows[0] ?? {})) {
  const quote = (v) => `"${String(neutralizeFormula(v) ?? '').replace(/"/g, '""')}"`
  const lines = [headers.map(quote).join(','), ...rows.map((r) => headers.map((h) => quote(r[h])).join(','))]
  return `﻿${lines.join('\n')}`
}
