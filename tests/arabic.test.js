import { describe, expect, it } from 'vitest'
import { parseAmount, toWesternDigits } from '../src/core/arabic'

describe('toWesternDigits', () => {
  it('converts Arabic-Indic and Persian digits', () => {
    expect(toWesternDigits('٢٥٠٠٠ ۱۲۳')).toBe('25000 123')
  })
  it('leaves other text alone and tolerates null', () => {
    expect(toWesternDigits('abc')).toBe('abc')
    expect(toWesternDigits(null)).toBe('')
  })
})

describe('parseAmount', () => {
  it.each([
    [25000, 25000],
    ['25000', 25000],
    ['25,000', 25000],
    ['1,250,000', 1250000],
    ['٢٥٬٠٠٠', 25000],
    ['٢٥٠٠٠', 25000],
    ['25 الف', 25000],
    ['25 ألف', 25000],
    ['25k', 25000],
    ['1.5 مليون', 1500000],
    ['1,5 مليون', 1500000],
    ['١٫٥ مليون', 1500000],
    ['2 مليون', 2000000],
    ['٢٥٠٠٠ د.ع', 25000],
    ['25,000 IQD', 25000],
    ['IQD 25000', 25000],
    ['25000 دينار', 25000],
    ['-5', -5],
    ['0', 0],
  ])('reads %j as %j', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })

  it.each([[''], ['   '], ['abc'], ['25 دولار'], ['1,2,3'], ['12 34'], [null], [undefined], [NaN], [Infinity]])(
    'refuses %j instead of guessing',
    (input) => {
      expect(parseAmount(input)).toBeNull()
    },
  )
})
