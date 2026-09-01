import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { Download, FileSpreadsheet, Info } from 'lucide-react'
import { useStore } from '@/mock/store'
import { MEAL_LABEL, MEAL_TIMES, UNIT_LABEL } from '@/lib/types'
import { exportExcel, exportPDF, type ReportPayload } from '@/lib/export'
import { addDays, cn, formatDate, formatMoney, formatQty, todayISO } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState, Field, PageHeader, Stat } from '@/components/common'
import { useLang } from '@/lib/language-context'

interface Range {
  from: string
  to: string
}

/**
 * Each tab publishes the exact rows it is showing, so an export is what's on
 * screen — never a second, separately-computed version that can drift from it.
 */
const ExportCtx = createContext<(p: ReportPayload) => void>(() => {})

function useRegisterExport(payload: ReportPayload) {
  const register = useContext(ExportCtx)
  useEffect(() => register(payload), [register, payload])
}

export function Reports() {
  const [range, setRange] = useState<Range>({ from: addDays(todayISO(), -6), to: todayISO() })
  const [payload, setPayload] = useState<ReportPayload | null>(null)
  const [busy, setBusy] = useState(false)

  /**
   * Compare by CONTENT, not reference. A tab's payload is rebuilt on every
   * render (its inputs are freshly-derived arrays), so storing it unconditionally
   * would re-render this component, rebuild the payload, and loop forever.
   */
  const register = useCallback((next: ReportPayload) => {
    setPayload((prev) =>
      prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
    )
  }, [])

  const rangeLabel = `${formatDate(range.from)} – ${formatDate(range.to)}`

  async function excel() {
    if (!payload) return
    setBusy(true)
    try {
      await exportExcel(payload)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ExportCtx.Provider value={register}>
      <div className="no-print">
        <PageHeader
          titleG="રિપોર્ટ"
          titleE="Reports"
          titleH="रिपोर्ट"
          description="Admin only"
          actions={
            <>
              <Button variant="outline" size="sm" onClick={exportPDF} disabled={!payload}>
                <Download className="h-3.5 w-3.5" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={excel} disabled={!payload || busy}>
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {busy ? 'Exporting…' : 'Excel'}
              </Button>
            </>
          }
        />

        <Card className="mb-4">
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:max-w-md">
            <Field label="From" labelG="થી">
              <Input
                type="date"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
            </Field>
            <Field label="To" labelG="સુધી">
              <Input
                type="date"
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      {/* Print-only title block — a filed sheet with no range on it is worthless. */}
      <div className="hidden print:mb-4 print:block">
        <h1 className="text-lg font-semibold">
          {payload?.title ?? 'Report'} · રસોડા વિભાગ
        </h1>
        <p className="text-sm text-muted-foreground">{payload?.subtitle ?? rangeLabel}</p>
        <p className="text-xs text-muted-foreground">
          Generated {new Date().toLocaleString('en-IN')}
        </p>
      </div>

      <TabsPrimitive.Root defaultValue="stock">
        <TabsPrimitive.List className="no-print mb-4 inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {[
            ['stock', 'Stock'],
            ['bhojanshala', 'Bhojanshala'],
            ['seva', 'Rasoi Seva'],
            ['kharch', 'Kharch'],
          ].map(([v, label]) => (
            <TabsPrimitive.Trigger
              key={v}
              value={v}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors',
                'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
              )}
            >
              {label}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>

        <TabsPrimitive.Content value="stock"><StockReport range={range} /></TabsPrimitive.Content>
        <TabsPrimitive.Content value="bhojanshala"><BhojanshalaReport range={range} /></TabsPrimitive.Content>
        <TabsPrimitive.Content value="seva"><SevaReport range={range} /></TabsPrimitive.Content>
        <TabsPrimitive.Content value="kharch"><KharchReport range={range} /></TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </ExportCtx.Provider>
  )
}

/** Wraps the explanatory notes — useful on screen, noise in a PDF. */
function ScreenOnly({ children }: { children: ReactNode }) {
  return <div className="no-print">{children}</div>
}

// ── A. Stock ──────────────────────────────────────────────────────────────

/**
 * "Opening" here means opening AS AT the range start — item.openingStock plus
 * everything that moved BEFORE the range. Treat it as the item's original
 * opening balance and every range but the first reports nonsense.
 */
function StockReport({ range }: { range: Range }) {
  const { categories, items, isStockTracked, stockFor } = useStore()
  const { pickName, pickLabel } = useLang()

  const tracked = categories.filter((c) => isStockTracked(c.id))

  // One flat sheet — category as a column, so it sorts and filters in Excel.
  const payload = useMemo<ReportPayload>(() => {
    const rows = tracked.flatMap((cat) =>
      items
        .filter((i) => i.itemCategoryId === cat.id && i.isActive)
        .map((i) => {
          const s = stockFor(i.id, range)
          const low = i.minimumQty !== null && s.available < i.minimumQty
          return [
            pickName(cat),
            `${pickName(i)} (${i.nameE})`,
            pickLabel(UNIT_LABEL[i.unit]),
            s.opening,
            s.purchased,
            s.consumed,
            s.available,
            i.minimumQty,
            low ? 'LOW' : '',
          ]
        }),
    )
    return {
      title: 'Stock Report',
      subtitle: `${formatDate(range.from)} – ${formatDate(range.to)}`,
      columns: [
        'Category', 'Item', 'Unit',
        'Opening', 'Purchased', 'Consumption', 'Available', 'Min Qty', 'Flag',
      ],
      rows,
      numericCols: [3, 4, 5, 6, 7],
    }
  }, [tracked, items, range, stockFor])

  useRegisterExport(payload)

  return (
    <>
      <ScreenOnly>
        <p className="mb-3 flex items-start gap-2 rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>
            Only stock-tracked categories appear — a category has a balance only if it
            permits consumption. <strong>Opening</strong> is the balance as at{' '}
            {formatDate(range.from)}, not the item's original opening stock, so each row
            reconciles left to right.
          </span>
        </p>
      </ScreenOnly>

      <div className="space-y-5">
        {tracked.map((cat) => {
          const rows = items.filter((i) => i.itemCategoryId === cat.id && i.isActive)
          const totals = rows.reduce(
            (acc, i) => {
              const s = stockFor(i.id, range)
              return {
                opening: acc.opening + s.opening,
                purchased: acc.purchased + s.purchased,
                consumed: acc.consumed + s.consumed,
                available: acc.available + s.available,
              }
            },
            { opening: 0, purchased: 0, consumed: 0, available: 0 },
          )

          return (
            <div key={cat.id}>
              <h2 className="mb-2 text-sm font-semibold">
                <span>{pickName(cat)}</span>
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Purchased</TableHead>
                    <TableHead className="text-right">Consumption</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((i) => {
                    const s = stockFor(i.id, range)
                    const low = i.minimumQty !== null && s.available < i.minimumQty
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="whitespace-nowrap">
                          <span className="font-medium">{pickName(i)}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {i.nameE} · {pickLabel(UNIT_LABEL[i.unit])}
                          </span>
                        </TableCell>
                        <TableCell className="num text-right">{formatQty(s.opening)}</TableCell>
                        <TableCell className="num text-right text-emerald-600 dark:text-emerald-400">
                          +{formatQty(s.purchased)}
                        </TableCell>
                        <TableCell className="num text-right text-muted-foreground">
                          −{formatQty(s.consumed)}
                        </TableCell>
                        <TableCell className="num text-right font-semibold">
                          <span className={low ? 'text-amber-600 dark:text-amber-400' : ''}>
                            {formatQty(s.available)}
                          </span>
                          {low && <Badge variant="warn" className="ml-1.5">low</Badge>}
                        </TableCell>
                        <TableCell className="num text-right text-muted-foreground">
                          {i.minimumQty ?? '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>Subtotal</TableCell>
                    <TableCell className="num text-right">{formatQty(totals.opening)}</TableCell>
                    <TableCell className="num text-right">+{formatQty(totals.purchased)}</TableCell>
                    <TableCell className="num text-right">−{formatQty(totals.consumed)}</TableCell>
                    <TableCell className="num text-right">{formatQty(totals.available)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── B. Bhojanshala ────────────────────────────────────────────────────────

function BhojanshalaReport({ range }: { range: Range }) {
  const { bhojanshalaCounts, bhojanshalaById } = useStore()
  const { pickName, pickLabel } = useLang()

  const rows = useMemo(() => {
    const inRange = bhojanshalaCounts.filter(
      (c) => c.date >= range.from && c.date <= range.to,
    )
    const map = new Map<string, { date: string; bhojanshalaId: number; counts: Record<string, number> }>()
    for (const c of inRange) {
      const key = `${c.date}:${c.bhojanshalaId}`
      if (!map.has(key)) {
        map.set(key, { date: c.date, bhojanshalaId: c.bhojanshalaId, counts: {} })
      }
      map.get(key)!.counts[c.mealTime] = c.count
    }
    return [...map.values()].sort(
      (a, b) => b.date.localeCompare(a.date) || a.bhojanshalaId - b.bhojanshalaId,
    )
  }, [bhojanshalaCounts, range])

  const totals = rows.reduce(
    (acc, r) => {
      for (const m of MEAL_TIMES) acc[m] += r.counts[m] ?? 0
      return acc
    },
    { MORNING: 0, AFTERNOON: 0, EVENING: 0 } as Record<string, number>,
  )
  const grand = MEAL_TIMES.reduce((n, m) => n + totals[m], 0)

  const payload = useMemo<ReportPayload>(
    () => ({
      title: 'Bhojanshala Report',
      subtitle: `${formatDate(range.from)} – ${formatDate(range.to)}`,
      columns: ['Date', 'Bhojanshala', 'Morning', 'Afternoon', 'Evening', 'Total'],
      rows: rows.map((r) => [
        formatDate(r.date),
        bhojanshalaById(r.bhojanshalaId) ? pickName(bhojanshalaById(r.bhojanshalaId)!) : '',
        r.counts.MORNING ?? null,
        r.counts.AFTERNOON ?? null,
        r.counts.EVENING ?? null,
        MEAL_TIMES.reduce((n, m) => n + (r.counts[m] ?? 0), 0),
      ]),
      footer: ['Total', '', totals.MORNING, totals.AFTERNOON, totals.EVENING, grand],
      numericCols: [2, 3, 4, 5],
    }),
    [rows, range, totals, grand, bhojanshalaById],
  )

  useRegisterExport(payload)

  if (rows.length === 0) return <EmptyState title="No counts in this range" />

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Bhojanshala</TableHead>
          {MEAL_TIMES.map((m) => (
            <TableHead key={m} className="text-right">
              <span>{pickLabel(MEAL_LABEL[m])}</span>
            </TableHead>
          ))}
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const rowTotal = MEAL_TIMES.reduce((n, m) => n + (r.counts[m] ?? 0), 0)
          return (
            <TableRow key={`${r.date}:${r.bhojanshalaId}`}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDate(r.date)}
              </TableCell>
              <TableCell className="whitespace-nowrap font-medium">
                {bhojanshalaById(r.bhojanshalaId) ? pickName(bhojanshalaById(r.bhojanshalaId)!) : ''}
              </TableCell>
              {MEAL_TIMES.map((m) => (
                <TableCell key={m} className="num text-right">
                  {r.counts[m] ?? '—'}
                </TableCell>
              ))}
              <TableCell className="num text-right font-semibold">{rowTotal}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Total</TableCell>
          {MEAL_TIMES.map((m) => (
            <TableCell key={m} className="num text-right">{totals[m]}</TableCell>
          ))}
          <TableCell className="num text-right">{grand}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )
}

// ── C. Rasoi Seva — sponsored vs actually served ──────────────────────────

function SevaReport({ range }: { range: Range }) {
  const { rasoiSevas, bhojanshalaById, countFor } = useStore()
  const { pickName, pickLabel } = useLang()

  const rows = rasoiSevas
    .filter((s) => s.date >= range.from && s.date <= range.to)
    .flatMap((s) =>
      s.slots.map((sl) => ({
        date: s.date,
        donor: s.donorName,
        amount: s.amount,
        bhojanshalaId: sl.bhojanshalaId,
        mealTime: sl.mealTime,
        sponsored: sl.personCount,
        served: countFor(s.date, sl.bhojanshalaId, sl.mealTime),
      })),
    )
    .sort((a, b) => b.date.localeCompare(a.date))

  const totalSponsored = rows.reduce((n, r) => n + r.sponsored, 0)
  const totalDonation = rasoiSevas
    .filter((s) => s.date >= range.from && s.date <= range.to)
    .reduce((n, s) => n + (s.amount ?? 0), 0)

  const payload = useMemo<ReportPayload>(
    () => ({
      title: 'Rasoi Seva Report',
      subtitle: `${formatDate(range.from)} – ${formatDate(range.to)}`,
      columns: [
        'Date', 'Donor', 'Bhojanshala', 'Meal',
        'Sponsored', 'Served', 'Diff', 'Donation',
      ],
      rows: rows.map((r) => [
        formatDate(r.date),
        r.donor,
        bhojanshalaById(r.bhojanshalaId) ? pickName(bhojanshalaById(r.bhojanshalaId)!) : '',
        pickLabel(MEAL_LABEL[r.mealTime]),
        r.sponsored,
        r.served,
        r.served === null ? null : r.served - r.sponsored,
        r.amount,
      ]),
      footer: ['Total', '', '', '', totalSponsored, null, null, totalDonation],
      numericCols: [4, 5, 6, 7],
    }),
    [rows, range, totalSponsored, totalDonation, bhojanshalaById],
  )

  useRegisterExport(payload)

  if (rows.length === 0) return <EmptyState title="No seva in this range" />

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Sponsored persons" value={String(totalSponsored)} />
        <Stat label="Donations" value={formatMoney(totalDonation)} tone="good" />
        <Stat label="Slots" value={String(rows.length)} />
      </div>

      <ScreenOnly>
        <p className="mb-3 flex items-start gap-2 rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Sponsored</strong> is booked in advance; <strong>served</strong> is
            what actually happened. The gap is what the kitchen over- or under-catered by.
          </span>
        </p>
      </ScreenOnly>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Donor</TableHead>
            <TableHead>Bhojanshala</TableHead>
            <TableHead>Meal</TableHead>
            <TableHead className="text-right">Sponsored</TableHead>
            <TableHead className="text-right">Served</TableHead>
            <TableHead className="text-right">Diff</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => {
            const diff = r.served === null ? null : r.served - r.sponsored
            return (
              <TableRow key={i}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDate(r.date)}
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium">
                  {r.donor}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {bhojanshalaById(r.bhojanshalaId) ? pickName(bhojanshalaById(r.bhojanshalaId)!) : ''}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {pickLabel(MEAL_LABEL[r.mealTime])}
                </TableCell>
                <TableCell className="num text-right">{r.sponsored}</TableCell>
                <TableCell className="num text-right">{r.served ?? '—'}</TableCell>
                <TableCell
                  className={cn(
                    'num text-right font-medium',
                    diff !== null && diff < 0 && 'text-amber-600 dark:text-amber-400',
                    diff !== null && diff > 0 && 'text-emerald-600 dark:text-emerald-400',
                  )}
                >
                  {diff === null ? '—' : diff > 0 ? `+${diff}` : diff}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>Total</TableCell>
            <TableCell className="num text-right">{totalSponsored}</TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        </TableFooter>
      </Table>
    </>
  )
}

// ── D. Kharch ─────────────────────────────────────────────────────────────

/**
 * Expense = Σ purchase_amount, grouped by category. Salary is excluded.
 * seva_amount is INCOME — it does not reduce the expense.
 */
function KharchReport({ range }: { range: Range }) {
  const { transactions, categories, itemById, rasoiSevas, bhojanshalaCounts } = useStore()
  const { pickName } = useLang()

  const inRange = transactions.filter((t) => {
    const d = t.datetime.slice(0, 10)
    return d >= range.from && d <= range.to && t.transactionType === 'PURCHASE'
  })

  const byCat = categories
    .map((c) => {
      const rows = inRange.filter((t) => itemById(t.itemId)?.itemCategoryId === c.id)
      return {
        category: c,
        amount: rows.reduce((n, t) => n + (t.purchaseAmount ?? 0), 0),
        seva: rows.reduce((n, t) => n + (t.sevaAmount ?? 0), 0),
        pending: rows.filter((t) => t.purchaseAmount === null).length,
      }
    })
    .filter((r) => r.amount > 0 || r.pending > 0)

  const kharch = byCat.reduce((n, r) => n + r.amount, 0)
  const txnSeva = byCat.reduce((n, r) => n + r.seva, 0)
  const mealSeva = rasoiSevas
    .filter((s) => s.date >= range.from && s.date <= range.to)
    .reduce((n, s) => n + (s.amount ?? 0), 0)
  const donations = txnSeva + mealSeva
  const pending = byCat.reduce((n, r) => n + r.pending, 0)

  /**
   * માથાદીઠ ખર્ચ — per-person kharch.
   *
   *   total kharch ÷ total persons fed
   *
   * where "persons fed" is every bhojanshala count, every meal, across the
   * range. Guard the divide: an empty range would otherwise read ₹Infinity.
   */
  const totalPersons = bhojanshalaCounts
    .filter((c) => c.date >= range.from && c.date <= range.to)
    .reduce((n, c) => n + c.count, 0)

  const perPerson = totalPersons > 0 ? kharch / totalPersons : null

  const payload = useMemo<ReportPayload>(
    () => ({
      title: 'Kharch Report',
      subtitle:
        `${formatDate(range.from)} – ${formatDate(range.to)}` +
        (perPerson === null
          ? ''
          : ` · Per person ₹${(Math.round(perPerson * 100) / 100).toFixed(2)} ` +
            `(₹${kharch.toLocaleString('en-IN')} ÷ ${totalPersons.toLocaleString('en-IN')} persons)`),
      columns: ['Category', 'Expense', 'Seva (income)', 'Unpriced'],
      rows: byCat.map((r) => [
        `${pickName(r.category)} (${r.category.nameE})`,
        r.amount,
        r.seva || null,
        r.pending || null,
      ]),
      footer: ['Grand total', kharch, txnSeva, pending || null],
      numericCols: [1, 2, 3],
    }),
    [byCat, range, kharch, txnSeva, pending, perPerson, totalPersons],
  )

  useRegisterExport(payload)

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Kharch (expense)" value={formatMoney(kharch)} sub="Salary excluded" />
        <Stat
          label="Per person (માથાદીઠ)"
          value={perPerson === null ? '—' : formatMoney(Math.round(perPerson * 100) / 100)}
          sub={
            perPerson === null
              ? 'No bhojanshala counts in range'
              : `${formatMoney(kharch)} ÷ ${totalPersons.toLocaleString('en-IN')} persons`
          }
        />
        <Stat
          label="Donations"
          value={formatMoney(donations)}
          sub="Seva on purchases + meal seva"
          tone="good"
        />
        <Stat
          label="Balance"
          value={formatMoney(donations - kharch)}
          sub="Donations − kharch"
          tone={donations - kharch >= 0 ? 'good' : 'warn'}
        />
      </div>

      <ScreenOnly>
        <p className="mb-3 flex items-start gap-2 rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Per person (માથાદીઠ ખર્ચ)</strong> = total kharch ÷ every bhojanshala
            count across all meals in the range ({totalPersons.toLocaleString('en-IN')} persons).
            It divides by persons <em>served</em>, not persons sponsored.
          </span>
        </p>
      </ScreenOnly>

      {pending > 0 && (
        <p className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          <strong>{pending}</strong> purchase{pending === 1 ? '' : 's'} in this range have no
          amount yet, so both the kharch total and the per-person figure below understate
          the real cost. Price them under Pending Amounts.
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Expense</TableHead>
            <TableHead className="text-right">Seva (income)</TableHead>
            <TableHead className="text-right">Unpriced</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {byCat.map((r) => (
            <TableRow key={r.category.id}>
              <TableCell className="whitespace-nowrap">
                <span className="font-medium">{pickName(r.category)}</span>
                <span className="ml-2 text-xs text-muted-foreground">{r.category.nameE}</span>
              </TableCell>
              <TableCell className="num text-right font-medium">
                {formatMoney(r.amount)}
              </TableCell>
              <TableCell className="num text-right text-emerald-600 dark:text-emerald-400">
                {r.seva > 0 ? formatMoney(r.seva) : '—'}
              </TableCell>
              <TableCell className="num text-right">
                {r.pending > 0 ? <Badge variant="warn">{r.pending}</Badge> : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Grand total</TableCell>
            <TableCell className="num text-right">{formatMoney(kharch)}</TableCell>
            <TableCell className="num text-right">{formatMoney(txnSeva)}</TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </>
  )
}
