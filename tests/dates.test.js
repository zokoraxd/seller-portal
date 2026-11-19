import { describe, expect, it } from 'vitest'
import { parseDate } from '../src/core/dates'

// Excel's serial number for a calendar day (what a real .xlsx date cell contains).
const serialOf = (y, m, d) => Date.UTC(y, m - 1, d) / 86_400_000 + 25569

describe('parseDate', () => {
  it.each([
    ['2026-11-05', '2026-11-05'],
    ['2026/11/5', '2026-11-05'],
    ['2026-11-05T10:00:00Z', '2026-11-05'],
    ['05/11/2026', '2026-11-05'], // day first, as written in Iraq
    ['5-11-2026', '2026-11-05'],
    ['٠٥/١١/٢٠٢٦', '2026-11-05'],
    ['٢٠٢٦-١١-٠٥', '2026-11-05'],
  ])('reads %j as %j', (input, expected) => {
    expect(parseDate(input)).toBe(expected)
  })

  it('reads Excel serial numbers (the bug that silently dated every row 2026-11-05)', () => {
    expect(parseDate(serialOf(2026, 11, 5))).toBe('2026-11-05')
    expect(parseDate(serialOf(2026, 11, 5) + 0.75)).toBe('2026-11-05') // time of day ignored
    expect(parseDate(String(serialOf(2026, 1, 31)))).toBe('2026-01-31')
  })

  it('reads Date objects using local calendar day', () => {
    expect(parseDate(new Date(2026, 10, 5))).toBe('2026-11-05')
  })

  it.each([['2026-13-01'], ['31/02/2026'], ['abc'], [''], [null], [undefined], [12], [99999999], [new Date('x')]])(
    'rejects %j',
    (input) => {
      expect(parseDate(input)).toBeNull()
    },
  )
})
