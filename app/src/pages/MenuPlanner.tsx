import { useEffect, useRef, useState } from 'react'
import { Copy, Eye, X, ChevronDown, Search } from 'lucide-react'
import { useStore } from '@/mock/store'
import { MEAL_LABEL, MEAL_TIMES, type MealTime } from '@/lib/types'
import { addDays, formatDate, todayISO } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState, Field, PageHeader } from '@/components/common'
import { useLang } from '@/lib/language-context'
import { cn } from '@/lib/utils'

/**
 * Admin plans the menu. A data-entry user only READS it — today, for their own
 * bhojanshalas — so the kitchen can see what to cook without being able to
 * change what was planned.
 */
export function MenuPlanner() {
  const { currentUser } = useStore()
  return currentUser.role === 'ADMIN' ? <MenuEditor /> : <MenuReadOnly />
}

// ── Data entry: read-only, today, their bhojanshalas ──────────────────────

function MenuReadOnly() {
  const { visibleBhojanshalas, menuFor, dishById } = useStore()
  const { t, pickName, pickLabel } = useLang()
  const date = todayISO()
  const halls = visibleBhojanshalas()

  if (halls.length === 0) {
    return (
      <>
        <PageHeader titleG="મેનુ" titleE="Menu" titleH="मेनू" />
        <EmptyState title="No bhojanshala assigned" />
      </>
    )
  }

  return (
    <>
      <PageHeader titleG="મેનુ" titleE="Menu" titleH="मेनू" description={formatDate(date)} />

      <p className="mb-4 flex items-start gap-2 rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
        <Eye className="mt-px h-3.5 w-3.5 shrink-0" />
        {t('menu.readOnlyInfo')}
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {halls.map((b) => (
          <Card key={b.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {pickName(b)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {MEAL_TIMES.map((m) => {
                const menu = menuFor(date, b.id, m)
                return (
                  <div key={m}>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {pickLabel(MEAL_LABEL[m])}
                    </p>
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
                      <p className="text-sm text-muted-foreground">Not set.</p>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

// ── Dish dropdown combobox ───────────────────────────────────────────────────

interface DishDropdownProps {
  dishes: { id: number; nameG: string; nameH: string; nameE: string }[]
  selected: number[]
  onAdd: (id: number) => void
}

function DishDropdown({ dishes, selected, onAdd }: DishDropdownProps) {
  const { pickName } = useLang()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const available = dishes.filter((d) => !selected.includes(d.id))
  const filtered = query.trim()
    ? available.filter(
        (d) =>
          d.nameG.toLowerCase().includes(query.toLowerCase()) ||
          d.nameE.toLowerCase().includes(query.toLowerCase()) ||
          (d.nameH && d.nameH.toLowerCase().includes(query.toLowerCase())),
      )
    : available

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  function select(id: number) {
    onAdd(id)
    setQuery('')
    // keep open so user can add multiple quickly
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm',
          'text-muted-foreground transition-colors hover:bg-accent/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <span>
          {available.length === 0
            ? 'All dishes added'
            : `Add dish… (${available.length} available)`}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && available.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-input bg-card shadow-lg animate-in fade-in-0 zoom-in-95">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-input px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dish…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* List */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">No results</li>
            )}
            {filtered.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => select(d.id)}
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-sm hover:bg-accent transition-colors"
                >
                  <span className="font-medium">{pickName(d)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Admin: full planner ───────────────────────────────────────────────────

function MenuEditor() {
  const { visibleBhojanshalas, dishes, menuFor, saveMenu, dishById } = useStore()
  const { t, pickName, pickLabel } = useLang()
  const halls = visibleBhojanshalas()

  const [date, setDate] = useState(todayISO())
  const [meal, setMeal] = useState<MealTime>('AFTERNOON')
  const [bhojanshalaId, setBhojanshalaId] = useState<number | null>(halls[0]?.id ?? null)
  const [selected, setSelected] = useState<number[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!bhojanshalaId) return
    const m = menuFor(date, bhojanshalaId, meal)
    setSelected(m?.dishIds ?? [])
    setSaved(false)
  }, [date, meal, bhojanshalaId]) // eslint-disable-line react-hooks/exhaustive-deps

  function addDish(id: number) {
    setSelected((s) => (s.includes(id) ? s : [...s, id]))
  }

  function removeDish(id: number) {
    setSelected((s) => s.filter((x) => x !== id))
  }

  function copyYesterday() {
    if (!bhojanshalaId) return
    const prev = menuFor(addDays(date, -1), bhojanshalaId, meal)
    if (prev) setSelected(prev.dishIds)
  }

  function save() {
    if (!bhojanshalaId) return
    saveMenu({ date, mealTime: meal, bhojanshalaId, dishIds: selected, remarks: null })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (halls.length === 0) {
    return (
      <>
        <PageHeader titleG="મેનુ" titleE="Menu Planner" titleH="मेनू" />
        <EmptyState title="No bhojanshala assigned" />
      </>
    )
  }

  const activeDishes = dishes.filter((d) => d.isActive)

  return (
    <>
      <PageHeader
        titleG="મેનુ"
        titleE="Menu Planner"
        titleH="मेनू"
        description={t('menu.description')}
      />

      {saved && (
        <div className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-300">
          Menu saved for {formatDate(date)}.
        </div>
      )}

      <Card className="mb-4">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
          <Field label="Date" labelG="તારીખ" labelH="तारीख">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>

          <Field label="Meal" labelG="ટાણું" labelH="समय">
            <Select value={meal} onValueChange={(v) => setMeal(v as MealTime)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TIMES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {pickLabel(MEAL_LABEL[m])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Bhojanshala" labelG="ભોજનશાળા" labelH="भोजनशाला">
            <Select
              value={bhojanshalaId ? String(bhojanshalaId) : ''}
              onValueChange={(v) => setBhojanshalaId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {halls.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {pickName(b)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">
            Dishes
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {selected.length} selected
            </span>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={copyYesterday}>
            <Copy className="h-3.5 w-3.5" />
            Copy yesterday
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ── Selected dishes — chips with × ── */}
          {selected.length > 0 ? (
            <div className="flex flex-wrap gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              {selected.map((id) => {
                const d = dishById(id)
                if (!d) return null
                return (
                  <span
                    key={id}
                    className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-card px-3 py-1 text-sm font-medium text-primary shadow-sm"
                  >
                    <span>{pickName(d)}</span>
                    <button
                      type="button"
                      onClick={() => removeDish(id)}
                      className="ml-0.5 rounded-full p-0.5 text-primary/60 hover:bg-primary/10 hover:text-destructive transition-colors"
                      title={`Remove ${d.nameE}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">
              No dishes selected yet — use the dropdown below to add them
            </div>
          )}

          {/* ── Dropdown to add dishes ── */}
          <DishDropdown
            dishes={activeDishes}
            selected={selected}
            onAdd={addDish}
          />
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 mt-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button className="w-full sm:ml-auto sm:w-auto" size="lg" onClick={save}>
          {t('common.save')}
        </Button>
      </div>
    </>
  )
}
