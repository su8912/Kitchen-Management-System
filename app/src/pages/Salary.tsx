import { useEffect, useState } from 'react'
import { Info, RefreshCw } from 'lucide-react'
import { useStore } from '@/mock/store'
import { formatMoney, monthName } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NumberInput } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Field, PageHeader } from '@/components/common'
import { useLang } from '@/lib/language-context'

const YEARS = [new Date().getFullYear() - 1, new Date().getFullYear()]
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

/**
 * Attendance-based salary.
 *
 * Formula: net = daysPresent × perDaySalary
 * Defaults: daysPresent from attendance data, perDaySalary = monthlySalary ÷ daysInMonth
 * Both columns are editable — the formula is transparent and overridable.
 */
export function Salary() {
  const { t } = useLang()
  const { staff, salaryTransactions, saveSalary, attendanceSummary, fetchAttendance } = useStore()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [daysPresent, setDaysPresent] = useState<Record<number, string>>({})
  const [perDay, setPerDay] = useState<Record<number, string>>({})
  const [salaries, setSalaries] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState(false)

  const active = staff.filter((s) => s.isActive)
  const totalDays = daysInMonth(year, month)

  // Load attendance for the selected month (for auto-fill)
  useEffect(() => {
    fetchAttendance(year, month).catch(() => {})
  }, [year, month, fetchAttendance])

  // Populate rows from saved data OR defaults
  useEffect(() => {
    const dp: Record<number, string> = {}
    const pd: Record<number, string> = {}
    const sa: Record<number, string> = {}

    for (const st of active) {
      const row = salaryTransactions.find(
        (r) => r.staffId === st.id && r.year === year && r.month === month,
      )
      sa[st.id] = String(row?.monthlySalary ?? st.monthlySalary)

      if (row) {
        dp[st.id] = String(row.daysPresent)
        pd[st.id] = String(row.perDaySalary)
      } else {
        // Default: attendance effective days, per-day = monthlySalary ÷ daysInMonth
        const summary = attendanceSummary(st.id, year, month)
        const effDays = summary.effectiveDays > 0 ? summary.effectiveDays : totalDays
        dp[st.id] = String(effDays)
        pd[st.id] = (st.monthlySalary / totalDays).toFixed(2)
      }
    }
    setDaysPresent(dp)
    setPerDay(pd)
    setSalaries(sa)
    setSaved(false)
  }, [year, month, salaryTransactions.length, staff.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function fillFromAttendance() {
    const dp: Record<number, string> = {}
    for (const st of active) {
      const summary = attendanceSummary(st.id, year, month)
      dp[st.id] = String(summary.effectiveDays > 0 ? summary.effectiveDays : totalDays)
    }
    setDaysPresent(dp)
    setSaved(false)
  }

  const net = (id: number) =>
    (Number(daysPresent[id]) || 0) * (Number(perDay[id]) || 0)

  const totals = active.reduce(
    (acc, st) => ({
      salary: acc.salary + (Number(salaries[st.id]) || 0),
      net: acc.net + net(st.id),
    }),
    { salary: 0, net: 0 },
  )

  function save() {
    saveSalary(
      active.map((st) => ({
        staffId: st.id,
        year,
        month,
        monthlySalary: Number(salaries[st.id]) || 0,
        daysPresent: Number(daysPresent[st.id]) || 0,
        perDaySalary: Number(perDay[st.id]) || 0,
        paidOn: null,
        remarks: null,
      })),
    )
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const alreadyPaid = salaryTransactions.some((r) => r.year === year && r.month === month)

  return (
    <>
      <PageHeader
        titleG="પગાર"
        titleE="Salary"
        titleH="वेतन"
        description={t('salary.description')}
      />

      {saved && (
        <div className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-300">
          Salary saved for {monthName(month)} {year}.
        </div>
      )}

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <Field label="Year" labelG="વર્ષ" className="w-28">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Month" labelG="માસ" className="w-36">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={String(m)}>{monthName(m)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Button variant="outline" className="mb-0.5 gap-2" onClick={fillFromAttendance}>
            <RefreshCw className="h-4 w-4" />
            Fill from Attendance
          </Button>
        </CardContent>
      </Card>

      {alreadyPaid && (
        <p className="mb-4 flex items-start gap-2 rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
          This month already has salary rows — figures are the saved snapshot. Saving again overwrites them.
        </p>
      )}

      <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5" />
        <span>
          Days Present and Per-Day Rate are editable. Net = Days × Rate.
          <strong className="ml-1">Total days this month: {totalDays}</strong>
        </span>
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead className="text-right">Monthly Rate</TableHead>
              <TableHead className="text-right">Days Present</TableHead>
              <TableHead className="text-right">Per Day (₹)</TableHead>
              <TableHead className="text-right font-semibold text-primary">Net Payable</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.map((st) => (
              <TableRow key={st.id}>
                <TableCell className="whitespace-nowrap font-medium" lang="gu">{st.name}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground" lang="gu">{st.designation}</TableCell>

                {/* Monthly Salary snapshot */}
                <TableCell className="text-right">
                  <NumberInput
                    className="ml-auto h-9 w-32 text-right"
                    value={salaries[st.id] ?? ''}
                    onChange={(e) => setSalaries((s) => ({ ...s, [st.id]: e.target.value }))}
                  />
                </TableCell>

                {/* Days Present */}
                <TableCell className="text-right">
                  <NumberInput
                    className="ml-auto h-9 w-24 text-right"
                    value={daysPresent[st.id] ?? ''}
                    max={totalDays}
                    step={0.5}
                    onChange={(e) => setDaysPresent((d) => ({ ...d, [st.id]: e.target.value }))}
                  />
                </TableCell>

                {/* Per Day */}
                <TableCell className="text-right">
                  <NumberInput
                    className="ml-auto h-9 w-28 text-right"
                    value={perDay[st.id] ?? ''}
                    step={0.01}
                    onChange={(e) => setPerDay((p) => ({ ...p, [st.id]: e.target.value }))}
                  />
                </TableCell>

                {/* Net */}
                <TableCell className="num whitespace-nowrap text-right font-bold text-primary">
                  {formatMoney(net(st.id))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell className="num text-right">{formatMoney(totals.salary)}</TableCell>
              <TableCell colSpan={2} />
              <TableCell className="num text-right font-bold">{formatMoney(totals.net)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button className="w-full sm:ml-auto sm:w-auto" size="lg" onClick={save}>
          Save {monthName(month)} {year}
        </Button>
      </div>
    </>
  )
}
