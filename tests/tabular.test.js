import { describe, expect, it } from 'vitest'
import { parseDelimited, toCsv } from '../src/core/tabular'

describe('parseDelimited', () => {
  it('parses a simple CSV and strips a BOM', () => {
    expect(parseDelimited('﻿a,b\n1,2\n3,4')).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ])
  })

  it('keeps commas inside quoted fields (the old parser split them)', () => {
    const rows = parseDelimited('store,price\n"معرض النور, فرع الكرادة","25,000"')
    expect(rows).toEqual([{ store: 'معرض النور, فرع الكرادة', price: '25,000' }])
  })

  it('handles escaped quotes and line breaks inside quotes', () => {
    const rows = parseDelimited('a,b\n"say ""hi""","line1\nline2"')
    expect(rows).toEqual([{ a: 'say "hi"', b: 'line1\nline2' }])
  })

  it('detects tab and semicolon delimiters and CRLF line endings', () => {
    expect(parseDelimited('a\tb\r\n1\t2')).toEqual([{ a: '1', b: '2' }])
    expect(parseDelimited('a;b\n1;2')).toEqual([{ a: '1', b: '2' }])
  })

  it('skips blank lines and returns [] without data rows', () => {
    expect(parseDelimited('a,b\n\n1,2\n,\n')).toEqual([{ a: '1', b: '2' }])
    expect(parseDelimited('a,b')).toEqual([])
    expect(parseDelimited('')).toEqual([])
    expect(parseDelimited(null)).toEqual([])
  })

  it('ignores dangerous header names instead of polluting objects', () => {
    const rows = parseDelimited('__proto__,constructor,ok\nx,y,z')
    expect(rows).toEqual([{ ok: 'z' }])
    expect({}.x).toBeUndefined()
  })
})

describe('toCsv', () => {
  it('round-trips awkward values (export then import gives the same data)', () => {
    const rows = [
      { store_name: 'معرض النور, فرع الكرادة', note: 'say "hi"', price: '25,000' },
      { store_name: 'سطرين', note: 'line1\nline2', price: '٢٥٠٠٠' },
    ]
    expect(parseDelimited(toCsv(rows))).toEqual(rows)
  })

  it('starts with a BOM so Excel reads Arabic correctly', () => {
    expect(toCsv([{ a: 'ب' }]).startsWith('﻿')).toBe(true)
  })

  it('neutralises spreadsheet formulas in text cells', () => {
    expect(toCsv([{ a: '=1+1' }])).toContain(`"'=1+1"`)
    expect(toCsv([{ a: '-5' }])).toContain('"-5"') // plain negative numbers are left alone
  })
})
