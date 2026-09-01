import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HandCoins, Users, UtensilsCrossed } from 'lucide-react'
import { useStore } from '@/mock/store'
import { currentMeal, MEAL_LABEL, MEAL_TIMES, type MealTime } from '@/lib/types'
import { formatDate, todayISO } from '@/lib/utils'
import { useLang } from '@/lib/language-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, PageHeader, SampleDataNotice } from '@/components/common'

/**
 * The screen the kitchen opens at 6am: what am I cooking, and for how many.
 *
 * A pure read over the shared slot key (date × bhojanshala × meal) — the menu,
 * the sponsored count, and the donors all hang off the same triple, so this
 * needs no table of its own.
 */
export function TodaysMeal() {
  const { visibleBhojanshalas, menuFor, sevaFor, countFor, dishById, currentUser } = useStore()
  const { t, pickName, pickLabel } = useLang()
  const [meal, setMeal] = useState<MealTime>(currentMeal())

  const date = todayISO()
  const halls = visibleBhojanshalas()

  return (
    <>
      <PageHeader
        titleG="આજનું ભોજન"
        titleE="Today's Meal"
        titleH="आज का भोजन"
        description={formatDate(date)}
      />
      <SampleDataNotice className="mb-4" />

      {/* Meal switcher — defaults to the current meal by clock time. */}
      <div className="mb-5 grid grid-cols-3 gap-2">
        {MEAL_TIMES.map((m) => {
          const active = m === meal
          return (
            <button
              key={m}
              onClick={() => setMeal(m)}
              className={[
                'rounded-lg border px-3 py-3 text-center transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'bg-card hover:bg-accent',
              ].join(' ')}
            >
              <span className="block text-base font-semibold">
                {pickLabel(MEAL_LABEL[m])}
              </span>
            </button>
          )
        })}
      </div>

      {halls.length === 0 ? (
        <EmptyState
          title={t('today.noBhojanshala')}
          description={`${currentUser.name} has no bhojanshala in their scope. An admin can assign one under User Management.`}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {halls.map((b) => {
            const menu = menuFor(date, b.id, meal)
            const seva = sevaFor(date, b.id, meal)
            const served = countFor(date, b.id, meal)

            return (
              <Card key={b.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {pickName(b)}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4">
                  {/* Count to cook for — Σ sponsored persons for this slot */}
                  <div className="rounded-lg bg-primary/5 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {t('today.cookFor')}
                    </div>
                    <p className="num mt-0.5 text-3xl font-semibold text-primary">
                      {seva.personCount > 0 ? seva.personCount : '—'}
                    </p>
                    {served !== null && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t('today.served')}: <span className="num font-medium">{served}</span>
                        {seva.personCount > 0 && (
                          <span
                            className={
                              served - seva.personCount >= 0
                                ? 'ml-1 text-emerald-600 dark:text-emerald-400'
                                : 'ml-1 text-amber-600 dark:text-amber-400'
                            }
                          >
                            ({served - seva.personCount >= 0 ? '+' : ''}
                            {served - seva.personCount})
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Menu — dishes for this slot */}
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <UtensilsCrossed className="h-3.5 w-3.5" />
                      {t('today.menu')}
                    </div>
                    {menu && menu.dishIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {menu.dishIds.map((id) => {
                          const d = dishById(id)
                          if (!d) return null
                          return (
                            <Badge key={id} variant="secondary" className="text-sm">
                              {pickName(d)}
                            </Badge>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t('today.noMenu')}
                      </p>
                    )}
                  </div>

                  {/* Seva, broken down by parivar — several families may sponsor
                      the same meal, and the kitchen cooks against the total. */}
                  <div className="mt-auto">
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <HandCoins className="h-3.5 w-3.5" />
                      {t('today.sevaBy')}
                    </div>
                    {seva.byDonor.length > 0 ? (
                      <div className="space-y-1">
                        {seva.byDonor.map((d) => (
                          <div
                            key={d.donor}
                            className="flex items-baseline justify-between gap-3"
                          >
                            <span className="truncate text-sm">
                              {d.donor}
                            </span>
                            <span className="num shrink-0 text-sm font-medium">
                              {d.personCount}
                            </span>
                          </div>
                        ))}
                        {seva.byDonor.length > 1 && (
                          <div className="flex items-baseline justify-between gap-3 border-t pt-1">
                            <span className="text-sm font-semibold">
                              {t('today.total')}
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                {seva.byDonor.length} {t('today.parivar')}
                              </span>
                            </span>
                            <span className="num shrink-0 text-sm font-semibold text-primary">
                              {seva.personCount}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('today.noSeva')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Link, not <a href> — a real navigation would reload and wipe the
          in-memory store (including who you're signed in as). */}
      <div className="mt-5 flex flex-wrap gap-3">
        {currentUser.role === 'ADMIN' && (
          <Button variant="default" asChild>
            <Link to="/menu">{t('today.setMenu')}</Link>
          </Button>
        )}
        <Button variant="default" asChild>
          <Link to="/counts">{t('today.enterCounts')}</Link>
        </Button>
      </div>
    </>
  )
}
