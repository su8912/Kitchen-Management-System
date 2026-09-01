export type Cell = string | number | null

export interface ReportPayload {
  /** File/sheet name, e.g. "Stock Report" */
  title: string
  /** Shown under the title — the range these numbers cover. */
  subtitle: string
  columns: string[]
  rows: Cell[][]
  /** Rendered bold at the bottom, as a totals row. */
  footer?: Cell[]
  /** Right-align these column indices (the numeric ones). */
  numericCols?: number[]
}

/**
 * Excel export.
 *
 * Client-side here because the prototype has no backend. The real build does
 * this server-side (same library) — a long date range would otherwise be
 * generated on a phone.
 */
export async function exportExcel(report: ReportPayload) {
  // Loaded on demand — exceljs is ~900 kB and would otherwise triple the
  // bundle for every user who never clicks Export.
  const { Workbook } = await import('exceljs')

  const wb = new Workbook()
  wb.created = new Date()
  const ws = wb.addWorksheet(report.title.slice(0, 31))

  const width = report.columns.length

  // Title block — a printed sheet with no date range on it is worthless.
  const titleRow = ws.addRow([report.title])
  titleRow.font = { bold: true, size: 14 }
  ws.mergeCells(1, 1, 1, width)

  const subRow = ws.addRow([report.subtitle])
  subRow.font = { size: 10, color: { argb: 'FF6B7280' } }
  ws.mergeCells(2, 1, 2, width)

  const stampRow = ws.addRow([`Generated ${new Date().toLocaleString('en-IN')}`])
  stampRow.font = { size: 9, color: { argb: 'FF9CA3AF' } }
  ws.mergeCells(3, 1, 3, width)

  ws.addRow([])

  const header = ws.addRow(report.columns)
  header.font = { bold: true }
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F1EE' } }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFD8D2CA' } } }
  })

  for (const r of report.rows) {
    ws.addRow(r.map((c) => (c === null ? '' : c)))
  }

  if (report.footer) {
    const f = ws.addRow(report.footer.map((c) => (c === null ? '' : c)))
    f.font = { bold: true }
    f.eachCell((cell) => {
      cell.border = { top: { style: 'thin', color: { argb: 'FFD8D2CA' } } }
    })
  }

  // Column widths from content — Gujanshala names are long.
  report.columns.forEach((col, i) => {
    const cells = [col, ...report.rows.map((r) => String(r[i] ?? ''))]
    const max = Math.max(...cells.map((c) => c.length))
    ws.getColumn(i + 1).width = Math.min(Math.max(max + 4, 12), 40)
    if (report.numericCols?.includes(i)) {
      ws.getColumn(i + 1).alignment = { horizontal: 'right' }
    }
  })

  const buf = await wb.xlsx.writeBuffer()
  download(
    new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${slug(report.title)}-${slug(report.subtitle)}.xlsx`,
  )
}

/**
 * PDF export — via the browser's own print-to-PDF.
 *
 * Deliberate: Chrome already has the Gujarati font loaded, so ગુજરાતી renders
 * correctly. A JS PDF library would need Noto Sans Gujarati embedded by hand,
 * and without it every Gujarati name comes out as blank boxes. The real
 * server-side build must embed that font explicitly.
 */
export function exportPDF() {
  window.print()
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}
