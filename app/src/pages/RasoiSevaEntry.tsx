import { useState } from 'react'
import { Eye } from 'lucide-react'
import { useStore } from '@/mock/store'
import { MEAL_LABEL, MEAL_TIMES, type MealTime, type RasoiSevaSlot } from '@/lib/types'
import { formatDate, formatMoney, todayISO } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, NumberInput } from '@/components/ui/input'
import { EmptyState, Field, PageHeader } from '@/components/common'
import { useLang } from '@/lib/language-context'

/**
 * Admin books seva. A data-entry user only READS it — today, for their own
 * bhojanshalas — so the kitchen knows who is sponsoring and for how many,
 * without being able to alter a donor's booking.
 */
export function RasoiSevaEntry() {
  const { currentUser } = useStore()
  return currentUser.role === 'ADMIN' ? <SevaEditor /> : <SevaReadOnly />
}

// ── Data entry: read-only, today, their bhojanshalas ──────────────────────

function SevaReadOnly() {
  const { visibleBhojanshalas, sevaFor } = useStore()
  const { t, pickName } = useLang()
  const date = todayISO()
  const halls = visibleBhojanshalas()

  if (halls.length === 0) {
    return (
      <>
        <PageHeader titleG="રસોઈ સેવા" titleE="Rasoi Seva" />
        <EmptyState title="No bhojanshala assigned" />
      </>
    )
  }

  const anySeva = halls.some((b) =>
    MEAL_TIMES.some((m) => sevaFor(date, b.id, m).personCount > 0),
  )

  return (
    <>
      <PageHeader titleG="રસોઈ સેવા" titleE="Rasoi Seva" titleH="रसोई सेवा" description={formatDate(date)} />

      <p className="mb-4 flex items-start gap-2 rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
        <Eye className="mt-px h-3.5 w-3.5 shrink-0" />
        {t('seva.readOnlyInfo')}
      </p>

      {!anySeva ? (
        <EmptyState
          title="No seva booked today"
          description="Nothing is sponsored for your bhojanshala today."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {halls.map((b) => <BhojanshalaSevaCard key={b.id} date={date} bhojanshala={b} />)}
        </div>
      )}
    </>
  )
}

/**
 * Per bhojanshala: each meal broken down **by parivar**, with the meal's total
 * across all parivars — several families may sponsor the same meal, and the
 * kitchen cooks against the combined number, not any one family's.
 */
function BhojanshalaSevaCard({
  date,
  bhojanshala,
}: {
  date: string
  bhojanshala: { id: number; nameG: string; nameE: string }
}) {
  const { sevaFor } = useStore()
  const { t, pickName, pickLabel } = useLang()

  const meals = MEAL_TIMES.map((m) => ({ meal: m, ...sevaFor(date, bhojanshala.id, m) }))
  const dayTotal = meals.reduce((n, m) => n + m.personCount, 0)

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <CardTitle className="text-base">
          {pickName(bhojanshala)}
        </CardTitle>
        <div className="shrink-0 text-right">
          <p className="num text-xl font-semibold text-primary">{dayTotal}</p>
          <p className="text-[11px] text-muted-foreground">day total</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {meals.map(({ meal, personCount, byDonor }) => (
          <div key={meal}>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {pickLabel(MEAL_LABEL[meal])}
            </p>

            {byDonor.length === 0 ? (
              <p className="text-sm text-muted-foreground">No seva.</p>
            ) : (
              <div className="rounded-md border">
                {byDonor.map((d) => (
                  <div
                    key={d.donor}
                    className="flex items-baseline justify-between gap-3 border-b px-3 py-1.5 last:border-b-0"
                  >
                    <span className="truncate text-sm">
                      {d.donor}
                    </span>
                    <span className="num shrink-0 text-sm font-medium">
                      {d.personCount}
                    </span>
                  </div>
                ))}

                {/* Total across every parivar for this meal — what to cook for. */}
                <div className="flex items-baseline justify-between gap-3 bg-muted/60 px-3 py-1.5">
                  <span className="text-sm font-semibold">
                    <span>{t('today.total')}</span>
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      Total{byDonor.length > 1 ? ` · ${byDonor.length} parivar` : ''}
                    </span>
                  </span>
                  <span className="num shrink-0 text-sm font-semibold text-primary">
                    {personCount}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ── Admin: booking form ───────────────────────────────────────────────────

/**
 * The count lives on the SLOT, not the header — a donor may sponsor 300 at
 * one bhojanshala's morning and 200 at another's afternoon.
 */
function SevaEditor() {
  const { visibleBhojanshalas, addRasoiSeva, rasoiSevas, bhojanshalaById } = useStore()
  const { t, pickName, pickLabel } = useLang()
  const halls = visibleBhojanshalas()

  const [date, setDate] = useState(todayISO())
  const [donorName, setDonorName] = useState('')
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const key = (b: number, m: MealTime) => `${b}:${m}`

  const slots: RasoiSevaSlot[] = []
  for (const b of halls) {
    for (const m of MEAL_TIMES) {
      const v = counts[key(b.id, m)]
      if (v && Number(v) > 0) {
        slots.push({ bhojanshalaId: b.id, mealTime: m, personCount: Number(v) })
      }
    }
  }

  const totalPersons = slots.reduce((n, s) => n + s.personCount, 0)
  const canSave = donorName.trim() !== '' && slots.length > 0

  function save() {
    if (!canSave) return
    addRasoiSeva({
      date,
      donorName: donorName.trim(),
      amount: amount ? Number(amount) : null,
      remarks: remarks || null,
      slots,
    })
    setDonorName('')
    setAmount('')
    setRemarks('')
    setCounts({})
    setSaved(true)
    setTimeout(() => setSaved(false), 3500)
  }

  const recent = rasoiSevas.slice(0, 5)

  if (halls.length === 0) {
    return (
      <>
        <PageHeader titleG="રસોઈ સેવા" titleE="Rasoi Seva" titleH="रसोई सेवा" />
        <EmptyState title="No bhojanshala assigned" />
      </>
    )
  }

  return (
    <>
      <PageHeader
        titleG="રસોઈ સેવા"
        titleE="Rasoi Seva"
        titleH="रसोई सेवा"
        description={t('seva.description')}
      />

      {saved && (
        <div className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-300">
          Seva saved.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Seva details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Date" labelG="તારીખ" labelH="तारीख">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Donor Name" labelG="દાતાનું નામ" labelH="दाता का नाम">
                <Input
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="પટેલ પરિવાર"
                />
              </Field>
              <Field
                label="Donation Amount"
                labelG="દાન રકમ"
                labelH="दान राशि"
                hint="Optional — reported as income, not against the expense."
              >
                <NumberInput
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="₹0"
                />
              </Field>
              <Field label="Remarks" labelG="નોંધ" labelH="टिप्पणी">
                <Input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="—"
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Slots
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  Enter a count for each bhojanshala &amp; meal being sponsored
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {halls.map((b) => (
                <div key={b.id} className="rounded-lg border p-3">
                  <p className="mb-3 font-medium">
                    {pickName(b)}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {MEAL_TIMES.map((m) => (
                      <div key={m}>
                        <label className="mb-1 block text-xs text-muted-foreground">
                          {pickLabel(MEAL_LABEL[m])}
                        </label>
                        <NumberInput
                          value={counts[key(b.id, m)] ?? ''}
                          onChange={(e) =>
                            setCounts((c) => ({ ...c, [key(b.id, m)]: e.target.value }))
                          }
                          placeholder="—"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {slots.length} slot{slots.length === 1 ? '' : 's'} ·{' '}
                <span className="num font-semibold text-foreground">{totalPersons}</span> persons
              </p>
              <Button className="ml-auto" size="lg" disabled={!canSave} onClick={save}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>

        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent seva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.map((s) => (
              <div key={s.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">
                    {s.donorName}
                  </p>
                  <Badge variant="secondary">{formatMoney(s.amount)}</Badge>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">{formatDate(s.date)}</p>
                <div className="space-y-1">
                  {s.slots.map((sl, i) => (
                    <p key={i} className="text-xs">
                      <span>{bhojanshalaById(sl.bhojanshalaId) ? pickName(bhojanshalaById(sl.bhojanshalaId)!) : ''}</span>
                      {' · '}
                      <span>{pickLabel(MEAL_LABEL[sl.mealTime])}</span>
                      {' · '}
                      <span className="num font-medium">{sl.personCount}</span>
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
