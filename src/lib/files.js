import { parseDelimited, toCsv } from '@/core/tabular'

export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const ACCEPTED = '.xlsx,.xls,.csv,.tsv,.json'

const readAs = (file, method) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('تعذّرت قراءة الملف'))
    reader[method](file)
  })

/**
 * Read an uploaded file into an array of plain row objects.
 * Throws an Error with an Arabic message the UI can show directly.
 */
export async function readRowsFromFile(file) {
  if (file.size > MAX_FILE_BYTES) throw new Error('حجم الملف يتجاوز 5 ميغابايت')
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'csv' || ext === 'tsv') {
    return parseDelimited(await readAs(file, 'readAsText'))
  }

  if (ext === 'json') {
    let parsed
    try {
      parsed = JSON.parse(await readAs(file, 'readAsText'))
    } catch {
      throw new Error('ملف JSON غير صالح')
    }
    const list = Array.isArray(parsed) ? parsed : [parsed]
    if (!list.every((r) => r !== null && typeof r === 'object' && !Array.isArray(r))) {
      throw new Error('يجب أن يحتوي ملف JSON على قائمة من السجلات')
    }
    return list
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await import('xlsx') // loaded only when an Excel file is actually opened
    let workbook
    try {
      workbook = XLSX.read(new Uint8Array(await readAs(file, 'readAsArrayBuffer')), { type: 'array' })
    } catch {
      throw new Error('ملف Excel غير صالح أو تالف')
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) throw new Error('ملف Excel لا يحتوي على أوراق')
    // Date cells come back as serial numbers; core/dates.js converts them.
    return XLSX.utils.sheet_to_json(sheet, { defval: '' })
  }

  throw new Error('الصيغ المدعومة: .xlsx و .xls و .csv و .json')
}

function save(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCsv(rows, filename) {
  save(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' }), filename)
}

export async function downloadXlsx(rows, filename, sheetName = 'Sales_Data') {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName)
  XLSX.writeFile(wb, filename)
}
