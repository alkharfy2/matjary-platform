/**
 * تحويل مصفوفة كائنات إلى CSV string
 *
 * - يدعم الحروف العربية (UTF-8 BOM)
 * - يهرب الفواصل والأسطر الجديدة داخل القيم
 * - يُنتج CSV متوافق مع Excel مباشرة
 */

type CsvColumn<T> = {
  header: string
  accessor: (row: T) => string | number | null | undefined
}

export function generateCsv<T>(
  data: T[],
  columns: CsvColumn<T>[],
): string {
  // UTF-8 BOM — مطلوب لعرض العربي صح في Excel
  const BOM = '\uFEFF'

  // Header row
  const headerRow = columns.map(col => escapeCsvValue(col.header)).join(',')

  // Data rows
  const dataRows = data.map(row =>
    columns.map(col => {
      const value = col.accessor(row)
      return escapeCsvValue(value != null ? String(value) : '')
    }).join(',')
  )

  return BOM + [headerRow, ...dataRows].join('\r\n')
}

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
