import { useEffect, useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useStore } from '@/mock/store'
import { type AttendanceStatus } from '@/lib/types'
import { monthName } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/common'
import { useLang } from '@/lib/language-context'

// ── constants ─────────────────────────────────────────────────────────────────

const YEARS = [new Date().getFullYear() - 1, new Date().getFullYear()]
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

type StatusCycle = [AttendanceStatus, AttendanceStatus, AttendanceStatus, AttendanceStatus]
const CYCLE: StatusCycle = ['PRESENT', 'ABSENT', 'HALF_DAY', 'HOLIDAY']

const STATUS_META: Record<AttendanceStatus, { label: string; emoji: string; color: string; bg: string }> = {
  PRESENT: { label: 'Present', emoji: '✅', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  ABSENT: { label: 'Absent', emoji: '❌', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' },
  HALF_DAY: { label: '½ Day', emoji: '🌓', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  HOLIDAY: { label: 'Holiday', emoji: '🎉', color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Attendance() {
  const { staff, attendance, fetchAttendance, saveAttendance } = useStore()
  const { t } = useLang()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  // Local editable grid: key = "staffId:date", value = AttendanceStatus
  const [grid, setGrid] = useState<Record<string, AttendanceStatus>>({})

  const active = staff.filter((s) => s.isActive)
  const numDays = daysInMonth(year, month)
  const days = Array.from({ length: numDays }, (_, i) => i + 1)

  // Load attendance for this month
  useEffect(() => {
    fetchAttendance(year, month).catch(() => { })
  }, [year, month, fetchAttendance])

  // Build local grid from store
  useEffect(() => {
    const g: Record<string, AttendanceStatus> = {}
    for (const a of attendance) {
      g[`${a.staffId}:${a.date}`] = a.status
    }
    setGrid(g)
    setSaved(false)
  }, [attendance])

  function getStatus(staffId: number, day: number): AttendanceStatus {
    return grid[`${staffId}:${toDateStr(year, month, day)}`] ?? 'PRESENT'
  }

  function toggle(staffId: number, day: number) {
    const key = `${staffId}:${toDateStr(year, month, day)}`
    const current = grid[key] ?? 'PRESENT'
    const nextIdx = (CYCLE.indexOf(current) + 1) % CYCLE.length
    setGrid((g) => ({ ...g, [key]: CYCLE[nextIdx] }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    const rows = active.flatMap((st) =>
      days.map((day) => ({
        staffId: st.id,
        date: toDateStr(year, month, day),
        status: getStatus(st.id, day),
        remarks: null,
      }))
    )
    try {
      await saveAttendance(rows)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  // Summary for each staff member
  const summaries = useMemo(() => {
    return active.map((st) => {
      let present = 0, halfDay = 0, absent = 0, holiday = 0
      for (const day of days) {
        const s = getStatus(st.id, day)
        if (s === 'PRESENT') present++
        else if (s === 'HALF_DAY') halfDay++
        else if (s === 'ABSENT') absent++
        else if (s === 'HOLIDAY') holiday++
      }
      return { staffId: st.id, present, halfDay, absent, holiday, effectiveDays: present + halfDay * 0.5 }
    })
  }, [grid, active, year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageHeader titleG="હાજરી" titleE="Attendance" titleH="उपस्थिति" description={t('attendance.description')} />

      {saved && (
        <div className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-300">
          Attendance saved for {monthName(month)} {year}.
        </div>
      )}

      {/* Month picker + legend */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Card className="inline-flex">
          <CardContent className="flex gap-3 p-3 sm:p-3">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={String(m)}>{monthName(m)}</SelectItem>)}</SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>Click cell to cycle:</span>
          {CYCLE.map((s) => (
            <span key={s} className={`rounded-md px-2 py-0.5 font-medium ${STATUS_META[s].bg} ${STATUS_META[s].color}`}>
              {STATUS_META[s].emoji} {STATUS_META[s].label}
            </span>
          ))}
        </div>
      </div>

      {/* Scrollable grid */}
      <div className="relative overflow-auto rounded-xl border bg-card shadow-sm max-h-[65vh]">
        <table className="min-w-max text-sm w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 bg-muted/95 backdrop-blur border-b border-r border-border px-4 py-3 text-left font-semibold text-muted-foreground shadow-[2px_0_8px_-2px_rgba(0,0,0,0.1)]">
                Staff
              </th>
              {days.map((d) => {
                const dow = new Date(year, month - 1, d).getDay()
                const isWeekend = dow === 0 || dow === 6
                return (
                  <th key={d} className={`sticky top-0 z-20 border-b border-r border-border bg-muted/95 backdrop-blur px-2 py-3 text-center font-semibold w-10 ${isWeekend ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {d}
                  </th>
                )
              })}
              <th className="sticky top-0 z-20 border-b border-r border-border bg-muted/95 backdrop-blur px-4 py-3 text-right font-semibold text-emerald-600">Present</th>
              <th className="sticky top-0 z-20 border-b border-r border-border bg-muted/95 backdrop-blur px-4 py-3 text-right font-semibold text-amber-600">½ Day</th>
              <th className="sticky top-0 z-20 border-b border-r border-border bg-muted/95 backdrop-blur px-4 py-3 text-right font-semibold text-red-600">Absent</th>
              <th className="sticky top-0 z-20 border-b border-border bg-muted/95 backdrop-blur px-4 py-3 text-right font-bold text-primary">Eff. Days</th>
            </tr>
          </thead>
          <tbody>
            {active.map((st, stIdx) => {
              const summary = summaries[stIdx]
              return (
                <tr key={st.id} className="group hover:bg-muted/30 transition-colors">
                  <td className="sticky left-0 z-10 bg-card group-hover:bg-muted/50 border-b border-r border-border px-4 py-2 font-medium shadow-[2px_0_8px_-2px_rgba(0,0,0,0.1)] transition-colors" lang="gu">
                    <div className="flex flex-col">
                      <span>{st.name}</span>
                      <span className="text-[11px] text-muted-foreground font-normal" lang="gu">{st.designation}</span>
                    </div>
                  </td>
                  {days.map((day) => {
                    const status = getStatus(st.id, day)
                    const meta = STATUS_META[status]
                    return (
                      <td key={day} className="border-b border-r border-border px-1 py-1 text-center bg-card group-hover:bg-transparent transition-colors">
                        <button
                          type="button"
                          title={meta.label}
                          onClick={() => toggle(st.id, day)}
                          className={`mx-auto flex h-8 w-8 items-center justify-center rounded-md text-base shadow-sm ring-1 ring-inset ring-black/5 transition-all hover:scale-110 active:scale-95 ${meta.bg}`}
                        >
                          {meta.emoji}
                        </button>
                      </td>
                    )
                  })}
                  <td className="border-b border-r border-border px-4 py-2 text-right font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">{summary.present}</td>
                  <td className="border-b border-r border-border px-4 py-2 text-right font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20">{summary.halfDay}</td>
                  <td className="border-b border-r border-border px-4 py-2 text-right font-semibold text-red-700 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20">{summary.absent}</td>
                  <td className="border-b border-border px-4 py-2 text-right font-bold text-primary bg-primary/5">{summary.effectiveDays}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Save button */}
      <div className="sticky bottom-0 -mx-4 mt-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button
          className="w-full sm:ml-auto sm:w-auto"
          size="lg"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : `Save ${monthName(month)} ${year} Attendance`}
        </Button>
      </div>
    </>
  )
}
