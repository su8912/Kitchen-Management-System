import { useEffect, useMemo, useState } from 'react'
import { Info, Lock } from 'lucide-react'
import { useStore } from '@/mock/store'
import {
  FIELD_LABEL,
  TXN_LABEL,
  UNIT_LABEL,
  type FormField,
  type TransactionType,
} from '@/lib/types'
import { useLang } from '@/lib/language-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, NumberInput } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState, Field, PageHeader } from '@/components/common'
import { SearchableSelect } from '@/components/ui/searchable-select'

/**
 * ONE form for every category. What it renders is configuration, not code:
 *
 *   effective_fields(user, category, type)
 *     = category_form_config.fields − (DATA_ENTRY ? ADMIN_ONLY_FIELDS : ∅)
 *
 * A data-entry user never sees the money inputs — the admin prices the row later
 * from the bill. Adding a category needs no change to this file.
 */
export function TransactionEntry() {
  const {
    currentUser,
    items,
    visibleCategories,
    typesForCategory,
    effectiveFields,
    addTransaction,
    categoryById,
  } = useStore()
  const { t, pickName, pickLabel } = useLang()

  const cats = visibleCategories()
  const [categoryId, setCategoryId] = useState<number | null>(cats[0]?.id ?? null)
  const [type, setType] = useState<TransactionType>('PURCHASE')
  const [itemId, setItemId] = useState<number | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<string | null>(null)

  const isDataEntry = currentUser.role === 'DATA_ENTRY'

  const types = categoryId ? typesForCategory(categoryId) : []
  const fields: FormField[] =
    categoryId && currentUser
      ? effectiveFields(categoryId, type, currentUser)
      : []

  const categoryItems = useMemo(
    () => items.filter((i) => i.itemCategoryId === categoryId && i.isActive),
    [items, categoryId],
  )

  // Keep the type valid when the category changes — a purchase-only category
  // must not stay on CONSUMPTION.
  useEffect(() => {
    if (types.length > 0 && !types.includes(type)) setType(types[0])
    setItemId(null)
    setValues({})
  }, [categoryId]) // eslint-disable-line react-hooks/exhaustive-deps

  const item = categoryItems.find((i) => i.id === itemId)
  const category = categoryId ? categoryById(categoryId) : undefined

  const has = (f: FormField) => fields.includes(f)
  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }))
  const num = (k: string) => (values[k] ? Number(values[k]) : null)

  const canSave = itemId !== null && values.qty !== undefined && values.qty !== ''

  function save() {
    if (!itemId || !canSave) return
    addTransaction({
      datetime: new Date().toISOString(),
      transactionType: type,
      itemId,
      qty: Number(values.qty),
      purchaseAmount: has('PURCHASE_AMOUNT') ? num('purchaseAmount') : null,
      sevaAmount: has('SEVA_AMOUNT') ? num('sevaAmount') : null,
      supplier: has('SUPPLIER') ? values.supplier || null : null,
      remarks: values.remarks || null,
      createdById: currentUser.id,
    })
    setSaved(`${item ? pickName(item) : ''} · ${values.qty} ${item ? pickLabel(UNIT_LABEL[item.unit]) : ''}`)
    setItemId(null)
    setValues({})
    setTimeout(() => setSaved(null), 3500)
  }

  if (cats.length === 0) {
    return (
      <>
        <PageHeader titleG="એન્ટ્રી" titleE="Transaction Entry" titleH="प्रविष्टि" />
        <EmptyState
          title="No categories assigned"
          description={`${currentUser.name} has no item category in their scope. An admin can assign one under User Management.`}
        />
      </>
    )
  }

  return (
    <>
      <PageHeader titleG="એન્ટ્રી" titleE="Transaction Entry" titleH="प्रविष्टि" />

      {saved && (
        <div className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-300">
          Saved — {saved}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New entry</CardTitle>
          </CardHeader>

          {/* Single column — this form is filled standing up, on a phone. */}
          <CardContent className="space-y-4">
            <Field label="Category" labelG="શ્રેણી" labelH="श्रेणी">
              <Select
                value={categoryId ? String(categoryId) : ''}
                onValueChange={(v) => setCategoryId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {pickName(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Only the types this category permits. Purchase-only categories
                show a single option — there is nothing to choose. */}
            <Field
              label="Type"
              labelG="પ્રકાર"
              labelH="प्रकार"
              hint={
                types.length === 1
                  ? `${category ? pickName(category) : ''} permits ${pickLabel(TXN_LABEL[types[0]])} only.`
                  : undefined
              }
            >
              <div className="grid grid-cols-2 gap-2">
                {(['PURCHASE', 'CONSUMPTION'] as const).map((t) => {
                  const allowed = types.includes(t)
                  const active = type === t
                  return (
                    <button
                      key={t}
                      disabled={!allowed}
                      onClick={() => setType(t)}
                      className={[
                        'rounded-md border px-3 py-2.5 text-center transition-colors',
                        !allowed && 'cursor-not-allowed opacity-35',
                        active && allowed
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'bg-card hover:bg-accent',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <span className="block text-sm font-medium">
                        {pickLabel(TXN_LABEL[t])}
                      </span>
                    </button>
                  )
                })}
              </div>
            </Field>

            <Field label="Item" labelG="વસ્તુ" labelH="वस्तु">
              <SearchableSelect
                options={categoryItems.map((i) => ({ value: String(i.id), labelG: i.nameG, labelH: i.nameH, labelE: i.nameE }))}
                value={itemId ? String(itemId) : ''}
                onChange={(v) => setItemId(v ? Number(v) : null)}
                placeholder="Search item…"
                allLabel={undefined}
              />
            </Field>

            {/* ── Everything below is rendered from the config ── */}

            {has('QTY') && (
              <Field
                label={FIELD_LABEL.QTY.e}
                labelG={FIELD_LABEL.QTY.g}
                labelH={FIELD_LABEL.QTY.h}
              >
                <div className="flex items-center gap-2">
                  <NumberInput
                    className="flex-1"
                    value={values.qty ?? ''}
                    onChange={(e) => set('qty', e.target.value)}
                    placeholder="0"
                  />
                  {item && (
                    <span className="shrink-0 rounded-md bg-muted px-2.5 py-2 text-sm font-medium text-muted-foreground">
                      {pickLabel(UNIT_LABEL[item.unit])}
                    </span>
                  )}
                </div>
              </Field>
            )}

            {has('PURCHASE_AMOUNT') && (
              <Field label={FIELD_LABEL.PURCHASE_AMOUNT.e} labelG={FIELD_LABEL.PURCHASE_AMOUNT.g} labelH={FIELD_LABEL.PURCHASE_AMOUNT.h}>
                <NumberInput
                  value={values.purchaseAmount ?? ''}
                  onChange={(e) => set('purchaseAmount', e.target.value)}
                  placeholder="₹0"
                />
              </Field>
            )}

            {has('SEVA_AMOUNT') && (
              <Field
                label={FIELD_LABEL.SEVA_AMOUNT.e}
                labelG={FIELD_LABEL.SEVA_AMOUNT.g}
                labelH={FIELD_LABEL.SEVA_AMOUNT.h}
                hint="Donation covering this purchase. Income — it does not reduce the expense."
              >
                <NumberInput
                  value={values.sevaAmount ?? ''}
                  onChange={(e) => set('sevaAmount', e.target.value)}
                  placeholder="₹0"
                />
              </Field>
            )}

            {has('SUPPLIER') && (
              <Field label={FIELD_LABEL.SUPPLIER.e} labelG={FIELD_LABEL.SUPPLIER.g} labelH={FIELD_LABEL.SUPPLIER.h}>
                <Input
                  value={values.supplier ?? ''}
                  onChange={(e) => set('supplier', e.target.value)}
                  placeholder="—"
                />
              </Field>
            )}

            {has('REMARKS') && (
              <Field label={FIELD_LABEL.REMARKS.e} labelG={FIELD_LABEL.REMARKS.g} labelH={FIELD_LABEL.REMARKS.h}>
                <Input
                  value={values.remarks ?? ''}
                  onChange={(e) => set('remarks', e.target.value)}
                  placeholder="—"
                />
              </Field>
            )}

            {isDataEntry && type === 'PURCHASE' && (
              <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
                <Lock className="mt-px h-3.5 w-3.5 shrink-0" />
                Amounts are entered by the admin from the bill. Record the quantity;
                the row will appear in their Pending Amounts list.
              </p>
            )}

            {isDataEntry && (
              <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                <Lock className="h-3.5 w-3.5 text-primary" />
                <span className="text-primary font-medium">Today only</span>
                <span className="text-muted-foreground">— date is set automatically</span>
              </div>
            )}

            {/* Sticky save — reachable with a thumb. */}
            <div className="sticky bottom-0 -mx-4 border-t bg-card px-4 pb-1 pt-3 sm:-mx-6 sm:px-6">
              <Button className="w-full" size="lg" disabled={!canSave} onClick={save}>
                {t('common.save')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Explains WHY the form looks the way it does. */}
        <Card className="h-fit border-dashed bg-muted/30 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4" />
              Form config
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <p className="text-muted-foreground">
              This form is rendered from{' '}
              <code className="rounded bg-muted px-1 py-0.5">category_form_config</code>, not
              hard-coded. Change the config and the form changes.
            </p>
            <div>
              <p className="mb-1 font-medium">
                {category ? pickName(category) : ''} · {pickLabel(TXN_LABEL[type])}
              </p>
              <div className="flex flex-wrap gap-1">
                {fields.map((f) => (
                  <code
                    key={f}
                    className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary"
                  >
                    {f}
                  </code>
                ))}
              </div>
            </div>
            {currentUser.role === 'DATA_ENTRY' && (
              <p className="text-muted-foreground">
                <code className="rounded bg-muted px-1 py-0.5">PURCHASE_AMOUNT</code> and{' '}
                <code className="rounded bg-muted px-1 py-0.5">SEVA_AMOUNT</code> are filtered
                out for your role.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
