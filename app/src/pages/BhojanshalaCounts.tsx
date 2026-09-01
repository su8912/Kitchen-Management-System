import { useEffect, useState } from 'react'
import { useStore } from '@/mock/store'
import { MEAL_LABEL, MEAL_TIMES, type MealTime } from '@/lib/types'
import { todayISO } from '@/lib/utils'
import { useLang } from '@/lib/language-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, NumberInput } from '@/components/ui/input'
import { EmptyState, Field, PageHeader } from '@/components/common'

type Draft = Record<string, string> // `${bhojanshalaId}:${meal}` → count

/**
 * Fill a whole day in one save.
 *
 * Desktop: a grid — bhojanshalas × 3 meal columns.
 * Mobile:  one CARD per bhojanshala, three stacked inputs. The grid does not
 *          survive a 5" screen, so it changes shape rather than being squeezed.
 */
export function BhojanshalaCounts() {
  const { visibleBhojanshalas, countFor, saveBhojanshalaCounts } = useStore()
  const { t, pickName, pickLabel } = useLang()
  const [date, setDate] = useState(todayISO())
  const [draft, setDraft] = useState<Draft>({})
  const [saved, setSaved] = useState(false)

  const halls = visibleBhojanshalas()

  // Reload the day's existing counts whenever the date changes.
  useEffect(() => {
    const next: Draft = {}
    for (const b of halls) {
      for (const m of MEAL_TIMES) {
        const c = countFor(date, b.id, m)
        next[`${b.id}:${m}`] = c === null ? '' : String(c)
      }
    }
    setDraft(next)
    setSaved(false)
  }, [date, halls.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (b: number, m: MealTime, v: string) =>
    setDraft((d) => ({ ...d, [`${b}:${m}`]: v }))

  function save() {
    const rows = []
    for (const b of halls) {
      for (const m of MEAL_TIMES) {
        const v = draft[`${b.id}:${m}`]
        if (v !== undefined && v !== '') {
          rows.push({ bhojanshalaId: b.id, mealTime: m, count: Number(v) })
        }
      }
    }
    saveBhojanshalaCounts(date, rows)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const dayTotal = Object.values(draft).reduce((n, v) => n + (Number(v) || 0), 0)

  if (halls.length === 0) {
    return (
      <>
        <PageHeader titleG="ભોજનશાળા સંખ્યા" titleE="Bhojanshala Count" titleH="भोजनशाला संख्या" />
        <EmptyState
          title={t('today.noBhojanshala')}
          description="An admin can assign one under User Management."
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        titleG="ભોજનશાળા સંખ્યા"
        titleE="Bhojanshala Count"
        titleH="भोजनशाला संख्या"
        description={t('counts.description')}
      />

      {saved && (
        <div className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-300">
          Counts saved for this day.
        </div>
      )}

      <Card className="mb-4">
        <CardContent className="p-4">
          <Field label="Date" labelG="તારીખ" labelH="तारीख" className="max-w-xs">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      {/* ── Desktop: grid ── */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Bhojanshala
                    </th>
                    {MEAL_TIMES.map((m) => (
                      <th
                        key={m}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {pickLabel(MEAL_LABEL[m])}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('today.total')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {halls.map((b) => {
                    const rowTotal = MEAL_TIMES.reduce(
                      (n, m) => n + (Number(draft[`${b.id}:${m}`]) || 0),
                      0,
                    )
                    return (
                      <tr key={b.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          {pickName(b)}
                        </td>
                        {MEAL_TIMES.map((m) => (
                          <td key={m} className="px-4 py-2">
                            <NumberInput
                              className="w-28"
                              value={draft[`${b.id}:${m}`] ?? ''}
                              onChange={(e) => set(b.id, m, e.target.value)}
                              placeholder="—"
                            />
                          </td>
                        ))}
                        <td className="num px-4 py-3 text-right font-semibold">
                          {rowTotal || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="border-t bg-muted/80">
                  <tr>
                    <td className="px-4 py-3 font-semibold">{t('today.total')}</td>
                    {MEAL_TIMES.map((m) => {
                      const total = halls.reduce(
                        (n, b) => n + (Number(draft[`${b.id}:${m}`]) || 0),
                        0,
                      )
                      return (
                        <td key={m} className="num px-4 py-3 font-semibold">
                          {total || '—'}
                        </td>
                      )
                    })}
                    <td className="num px-4 py-3 text-right font-semibold">
                      {dayTotal || '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Mobile: one card per bhojanshala ── */}
      <div className="space-y-3 md:hidden">
        {halls.map((b) => (
          <Card key={b.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {pickName(b)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {MEAL_TIMES.map((m) => (
                <div key={m} className="flex items-center gap-3">
                  <label className="w-28 shrink-0 text-sm">
                    {pickLabel(MEAL_LABEL[m])}
                  </label>
                  <NumberInput
                    value={draft[`${b.id}:${m}`] ?? ''}
                    onChange={(e) => set(b.id, m, e.target.value)}
                    placeholder="—"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {t('today.total')}: <span className="num font-semibold text-foreground">{dayTotal}</span>
          </p>
          <Button className="ml-auto" size="lg" onClick={save}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </>
  )
}
