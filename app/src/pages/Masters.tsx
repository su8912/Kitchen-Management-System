import { useState } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { Plus, Trash2, PowerOff, Power, Pencil } from 'lucide-react'
import { useStore } from '@/mock/store'
import { UNIT_LABEL, type Unit, type TransactionType, type FormField } from '@/lib/types'
import { cn, formatMoney, formatQty } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, NumberInput } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, PageHeader } from '@/components/common'
import { TriLangNameInput } from '@/components/ui/trilang-name-input'
import { useLang } from '@/lib/language-context'

const UNITS: Unit[] = ['KG', 'LITRE', 'COUNT', 'CYLINDER_COUNT', 'METER_READING']

const tabCls = ({ active }: { active: boolean }) =>
  cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    active ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
  )

export function Masters() {
  return (
    <>
      <PageHeader titleG="માસ્ટર" titleE="Masters" titleH="मास्टर" />
      <TabsPrimitive.Root defaultValue="items">
        <TabsPrimitive.List className="mb-4 inline-flex gap-1 rounded-lg bg-muted p-1">
          {[
            ['items', 'Items'],
            ['categories', 'Categories'],
            ['bhojanshalas', 'Bhojanshalas'],
            ['dishes', 'Dishes'],
            ['staff', 'Staff'],
          ].map(([v, label]) => (
            <TabsPrimitive.Trigger
              key={v}
              value={v}
              className={cn(tabCls({ active: false }), 'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm')}
            >
              {label}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>
        <TabsPrimitive.Content value="items"><ItemsTab /></TabsPrimitive.Content>
        <TabsPrimitive.Content value="categories"><CategoriesTab /></TabsPrimitive.Content>
        <TabsPrimitive.Content value="bhojanshalas"><BhojanshalasTab /></TabsPrimitive.Content>
        <TabsPrimitive.Content value="dishes"><DishesTab /></TabsPrimitive.Content>
        <TabsPrimitive.Content value="staff"><StaffTab /></TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </>
  )
}

// Shared row action buttons: Deactivate/Reactivate + Delete
function ActionButtons({ isActive, onDeactivate, onReactivate, onDelete }: {
  isActive: boolean
  onDeactivate: () => void
  onReactivate: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-0.5">
      {isActive ? (
        <button
          onClick={onDeactivate}
          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/30"
          title="Deactivate (hide from entry forms)"
        >
          <PowerOff className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={onReactivate}
          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30"
          title="Reactivate"
        >
          <Power className="h-4 w-4" />
        </button>
      )}
      <button
        onClick={onDelete}
        className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        title="Delete permanently from database"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

// Deactivate confirmation dialog (reversible)
function DeactivateDialog({ open, label, onCancel, onConfirm }: {
  open: boolean; label: string; onCancel: () => void; onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Deactivate {label}?</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          This {label} will be hidden from entry forms. All existing records are kept intact.
          You can <strong>reactivate</strong> it any time.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            className="bg-amber-500 hover:bg-amber-600 text-white"
            disabled={busy}
            onClick={async () => { setBusy(true); await onConfirm(); setBusy(false) }}
          >
            Deactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Permanent delete confirmation dialog — shows server error if blocked
function DeleteDialog({ open, label, warning, onCancel, onConfirm }: {
  open: boolean; label: string; warning?: string; onCancel: () => void; onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onCancel(); setError(null) } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Permanently delete {label}?</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong className="text-foreground">This cannot be undone.</strong> The record will be removed from the database entirely.</p>
          {warning && <p>{warning}</p>}
        </div>
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { onCancel(); setError(null) }}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true); setError(null)
              try { await onConfirm() }
              catch (e: unknown) { setError(e instanceof Error ? e.message : 'Delete failed') }
              finally { setBusy(false) }
            }}
          >
            Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Items Tab
function ItemsTab() {
  const { items, categories, categoryById, isStockTracked, addItem, stockFor, deactivateItem, reactivateItem, hardDeleteItem } = useStore()
  const { pickLabel } = useLang()
  const [open, setOpen] = useState(false)
  const [deactivateId, setDeactivateId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [f, setF] = useState({ nameE: '', nameG: '', nameH: '', unit: 'KG' as Unit, itemCategoryId: '1', minimumQty: '', openingStock: '' })

  function save() {
    if (!f.nameE || !f.nameG || !f.nameH) return
    addItem({ nameE: f.nameE, nameG: f.nameG, nameH: f.nameH, unit: f.unit, itemCategoryId: Number(f.itemCategoryId), minimumQty: f.minimumQty ? Number(f.minimumQty) : null, openingStock: Number(f.openingStock) || 0, isActive: true })
    setF({ nameE: '', nameG: '', nameH: '', unit: 'KG', itemCategoryId: '1', minimumQty: '', openingStock: '' })
    setOpen(false)
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" />Add item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add item</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TriLangNameInput
                  value={{ nameE: f.nameE, nameG: f.nameG, nameH: f.nameH }}
                  onChange={(v) => setF({ ...f, ...v })}
                />
              </div>
              <Field label="Unit">
                <Select value={f.unit} onValueChange={(v) => setF({ ...f, unit: v as Unit })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map((u) => (<SelectItem key={u} value={u}>{pickLabel(UNIT_LABEL[u])}</SelectItem>))}</SelectContent>
                </Select>
              </Field>
              <Field label="Category">
                <Select value={f.itemCategoryId} onValueChange={(v) => setF({ ...f, itemCategoryId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((c) => (<SelectItem key={c.id} value={String(c.id)}><span lang="gu">{c.nameG}</span> ({c.nameE})</SelectItem>))}</SelectContent>
                </Select>
              </Field>
              <Field label="Opening Stock"><NumberInput value={f.openingStock} onChange={(e) => setF({ ...f, openingStock: e.target.value })} placeholder="0" /></Field>
              <Field label="Minimum Qty" hint="Only for stock-tracked categories." className="sm:col-span-2">
                <NumberInput value={f.minimumQty} onChange={(e) => setF({ ...f, minimumQty: e.target.value })} placeholder="—" />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Add item</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead className="text-right">Min Qty</TableHead>
            <TableHead className="text-right">In Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((i) => {
            const cat = categoryById(i.itemCategoryId)
            const tracked = cat ? isStockTracked(cat.id) : false
            const s = stockFor(i.id)
            const low = tracked && i.minimumQty !== null && s.available < i.minimumQty
            return (
              <TableRow key={i.id} className={!i.isActive ? 'opacity-60' : ''}>
                <TableCell className="whitespace-nowrap">
                  <span className="font-medium" lang="gu">{i.nameG}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{i.nameE}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span lang="gu">{cat ? cat.nameG : 'Missing Category'}</span>
                  {tracked && <Badge variant="muted" className="ml-1.5">stock</Badge>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{pickLabel(UNIT_LABEL[i.unit])}</TableCell>
                <TableCell className="num text-right text-muted-foreground">{i.minimumQty ?? '—'}</TableCell>
                <TableCell className="num text-right">
                  {tracked ? (
                    <span className={low ? 'font-semibold text-amber-600 dark:text-amber-400' : ''}>
                      {formatQty(s.available)}
                      {low && <Badge variant="warn" className="ml-1.5">low</Badge>}
                    </span>
                  ) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell><Badge variant={i.isActive ? 'success' : 'muted'}>{i.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell>
                  <ActionButtons isActive={i.isActive}
                    onDeactivate={() => setDeactivateId(i.id)}
                    onReactivate={() => reactivateItem(i.id)}
                    onDelete={() => setDeleteId(i.id)} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <DeactivateDialog open={deactivateId !== null} label="item" onCancel={() => setDeactivateId(null)}
        onConfirm={async () => { if (deactivateId !== null) { await deactivateItem(deactivateId); setDeactivateId(null) } }} />
      <DeleteDialog
        open={deleteId !== null}
        label="item"
        warning="If this item has purchase or consumption records, the server will block deletion — deactivate it instead to preserve your transaction history."
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => { if (deleteId !== null) { await hardDeleteItem(deleteId); setDeleteId(null) } }}
      />
    </>
  )
}

// Categories — with Add and Delete
function CategoriesTab() {
  const { categories, formConfigs, typesForCategory, isStockTracked, effectiveFields, currentUser, addCategory, updateCategory, hardDeleteCategory } = useStore()
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editId, setEditId] = useState<number | null>(null)

  // Form state for new category
  const [nameE, setNameE] = useState('')
  const [nameG, setNameG] = useState('')
  const [nameH, setNameH] = useState('')
  // Whether each transaction type is enabled
  const [hasPurchase, setHasPurchase] = useState(true)
  const [hasConsumption, setHasConsumption] = useState(false)
  // Extra fields for PURCHASE (QTY is always included automatically on backend)
  const EXTRA_FIELDS: { key: 'PURCHASE_AMOUNT' | 'SEVA_AMOUNT' | 'SUPPLIER' | 'REMARKS'; label: string }[] = [
    { key: 'PURCHASE_AMOUNT', label: 'Purchase Amount' },
    { key: 'SEVA_AMOUNT', label: 'Seva Amount' },
    { key: 'SUPPLIER', label: 'Supplier' },
    { key: 'REMARKS', label: 'Remarks' },
  ]
  const [purchaseFields, setPurchaseFields] = useState<Set<string>>(new Set(['QTY']))
  const [consumptionFields, setConsumptionFields] = useState<Set<string>>(new Set(['QTY']))
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function resetForm() {
    setNameE(''); setNameG(''); setNameH('')
    setHasPurchase(true); setHasConsumption(false)
    setPurchaseFields(new Set(['QTY'])); setConsumptionFields(new Set(['QTY']))
    setFormError(null)
  }

  function toggleField(set: Set<string>, setFn: (s: Set<string>) => void, key: string) {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setFn(next)
  }

  async function save() {
    if (!nameE.trim() || !nameG.trim() || !nameH.trim()) { setFormError('All three name fields are required.'); return }
    if (!hasPurchase && !hasConsumption) { setFormError('Select at least one transaction type.'); return }
    setBusy(true); setFormError(null)
    try {
      const configs: { transactionType: TransactionType; fields: FormField[] }[] = []
      if (hasPurchase) configs.push({ transactionType: 'PURCHASE', fields: Array.from(purchaseFields) as FormField[] })
      if (hasConsumption) configs.push({ transactionType: 'CONSUMPTION', fields: Array.from(consumptionFields) as FormField[] })
      if (editId !== null) {
        await updateCategory(editId, { nameE: nameE.trim(), nameG: nameG.trim(), nameH: nameH.trim(), formConfigs: configs })
        setEditId(null)
      } else {
        await addCategory({ nameE: nameE.trim(), nameG: nameG.trim(), nameH: nameH.trim(), formConfigs: configs })
        resetForm(); setOpen(false)
      }
      resetForm()
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : editId !== null ? 'Failed to update category' : 'Failed to create category')
    } finally { setBusy(false) }
  }

  function openEdit(id: number) {
    const cat = categories.find((c) => c.id === id)
    if (!cat) return
    setNameE(cat.nameE); setNameG(cat.nameG); setNameH(cat.nameH)
    const catConfigs = formConfigs.filter((fc) => fc.itemCategoryId === id)
    const purchaseCfg = catConfigs.find((fc) => fc.transactionType === 'PURCHASE')
    const consumptionCfg = catConfigs.find((fc) => fc.transactionType === 'CONSUMPTION')
    setHasPurchase(!!purchaseCfg); setHasConsumption(!!consumptionCfg)
    setPurchaseFields(new Set(purchaseCfg?.fields ?? ['QTY']))
    setConsumptionFields(new Set(consumptionCfg?.fields ?? ['QTY']))
    setFormError(null)
    setEditId(id)
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Categories define which transaction types are available and which fields appear in the entry form.
        </p>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" />Add category</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add category</DialogTitle></DialogHeader>

            {formError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{formError}</div>
            )}

            <TriLangNameInput
              value={{ nameE, nameG, nameH }}
              onChange={(v) => { setNameE(v.nameE); setNameG(v.nameG); setNameH(v.nameH) }}
            />

            <div className="space-y-4 pt-1">
              <p className="text-sm font-medium">Transaction types & fields</p>

              {/* PURCHASE */}
              <div className={cn('rounded-lg border p-3 transition-opacity', !hasPurchase && 'opacity-50')}>
                <label className="flex cursor-pointer items-center gap-2 font-medium text-sm mb-3">
                  <input type="checkbox" checked={hasPurchase} onChange={(e) => setHasPurchase(e.target.checked)} className="rounded" />
                  <Badge variant="default">PURCHASE</Badge>
                </label>
                {hasPurchase && (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-not-allowed">
                      <input type="checkbox" checked disabled className="rounded" />
                      QTY (always)
                    </label>
                    {EXTRA_FIELDS.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox"
                          checked={purchaseFields.has(key)}
                          onChange={() => toggleField(purchaseFields, setPurchaseFields, key)}
                          className="rounded" />
                        {label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* CONSUMPTION */}
              <div className={cn('rounded-lg border p-3 transition-opacity', !hasConsumption && 'opacity-50')}>
                <label className="flex cursor-pointer items-center gap-2 font-medium text-sm mb-3">
                  <input type="checkbox" checked={hasConsumption} onChange={(e) => setHasConsumption(e.target.checked)} className="rounded" />
                  <Badge variant="success">CONSUMPTION</Badge>
                  <span className="text-xs text-muted-foreground ml-1">(enables stock tracking)</span>
                </label>
                {hasConsumption && (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-not-allowed">
                      <input type="checkbox" checked disabled className="rounded" />
                      QTY (always)
                    </label>
                    {EXTRA_FIELDS.filter(f => f.key === 'REMARKS').map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox"
                          checked={consumptionFields.has(key)}
                          onChange={() => toggleField(consumptionFields, setConsumptionFields, key)}
                          className="rounded" />
                        {label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpen(false); resetForm() }}>Cancel</Button>
              <Button onClick={save} disabled={busy}>Add category</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={editId !== null} onOpenChange={(o) => { if (!o) { setEditId(null); resetForm() } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit category</DialogTitle></DialogHeader>

          {formError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{formError}</div>
          )}

          <TriLangNameInput
            value={{ nameE, nameG, nameH }}
            onChange={(v) => { setNameE(v.nameE); setNameG(v.nameG); setNameH(v.nameH) }}
          />

          <div className="space-y-4 pt-1">
            <p className="text-sm font-medium">Transaction types &amp; fields</p>

            <div className={cn('rounded-lg border p-3 transition-opacity', !hasPurchase && 'opacity-50')}>
              <label className="flex cursor-pointer items-center gap-2 font-medium text-sm mb-3">
                <input type="checkbox" checked={hasPurchase} onChange={(e) => setHasPurchase(e.target.checked)} className="rounded" />
                <Badge variant="default">PURCHASE</Badge>
              </label>
              {hasPurchase && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-not-allowed">
                    <input type="checkbox" checked disabled className="rounded" />
                    QTY (always)
                  </label>
                  {EXTRA_FIELDS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox"
                        checked={purchaseFields.has(key)}
                        onChange={() => toggleField(purchaseFields, setPurchaseFields, key)}
                        className="rounded" />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className={cn('rounded-lg border p-3 transition-opacity', !hasConsumption && 'opacity-50')}>
              <label className="flex cursor-pointer items-center gap-2 font-medium text-sm mb-3">
                <input type="checkbox" checked={hasConsumption} onChange={(e) => setHasConsumption(e.target.checked)} className="rounded" />
                <Badge variant="success">CONSUMPTION</Badge>
                <span className="text-xs text-muted-foreground ml-1">(enables stock tracking)</span>
              </label>
              {hasConsumption && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-not-allowed">
                    <input type="checkbox" checked disabled className="rounded" />
                    QTY (always)
                  </label>
                  {EXTRA_FIELDS.filter(f => f.key === 'REMARKS').map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox"
                        checked={consumptionFields.has(key)}
                        onChange={() => toggleField(consumptionFields, setConsumptionFields, key)}
                        className="rounded" />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditId(null); resetForm() }}>Cancel</Button>
            <Button onClick={save} disabled={busy}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Transaction types</TableHead>
            <TableHead>Purchase form fields</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((c) => {
            const types = typesForCategory(c.id)
            const fields = effectiveFields(c.id, 'PURCHASE', currentUser)
            return (
              <TableRow key={c.id}>
                <TableCell className="whitespace-nowrap">
                  <span className="font-medium" lang="gu">{c.nameG}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{c.nameE}</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {types.map((t) => (<Badge key={t} variant={t === 'CONSUMPTION' ? 'success' : 'default'}>{t}</Badge>))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {fields.map((fld) => (<code key={fld} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{fld}</code>))}
                  </div>
                </TableCell>
                <TableCell>
                  {isStockTracked(c.id) ? <Badge variant="success">Tracked</Badge> : <span className="text-sm text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => openEdit(c.id)}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      title="Edit category"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(c.id)}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Delete category permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <DeleteDialog
        open={deleteId !== null}
        label="category"
        warning="If this category has items, the server will block deletion — delete or move all items from this category first."
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => { if (deleteId !== null) { await hardDeleteCategory(deleteId); setDeleteId(null) } }}
      />
    </>
  )
}

// Generic name master (Bhojanshalas, Dishes)
function NameMaster({ rows, onAdd, onDeactivate, onReactivate, onHardDelete, label, deleteWarning }: {
  rows: { id: number; nameE: string; nameG: string; nameH: string; isActive: boolean }[]
  onAdd: (v: { nameE: string; nameG: string; nameH: string; isActive: boolean }) => void
  onDeactivate: (id: number) => Promise<void>
  onReactivate: (id: number) => Promise<void>
  onHardDelete: (id: number) => Promise<void>
  label: string
  deleteWarning?: string
}) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ nameE: '', nameG: '', nameH: '' })
  const [deactivateId, setDeactivateId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  function save() {
    if (!f.nameE || !f.nameG || !f.nameH) return
    onAdd({ ...f, isActive: true })
    setF({ nameE: '', nameG: '', nameH: '' })
    setOpen(false)
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Add {label}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add {label}</DialogTitle></DialogHeader>
            <TriLangNameInput
              value={f}
              onChange={(v) => setF(v)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ગુજરાતી</TableHead>
            <TableHead>English</TableHead>
            <TableHead>हिन्दी</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} className={!r.isActive ? 'opacity-60' : ''}>
              <TableCell className="font-medium" lang="gu">{r.nameG}</TableCell>
              <TableCell>{r.nameE}</TableCell>
              <TableCell lang="hi">{r.nameH}</TableCell>
              <TableCell><Badge variant={r.isActive ? 'success' : 'muted'}>{r.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
              <TableCell>
                <ActionButtons isActive={r.isActive}
                  onDeactivate={() => setDeactivateId(r.id)}
                  onReactivate={() => onReactivate(r.id)}
                  onDelete={() => setDeleteId(r.id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <DeactivateDialog open={deactivateId !== null} label={label} onCancel={() => setDeactivateId(null)}
        onConfirm={async () => { if (deactivateId !== null) { await onDeactivate(deactivateId); setDeactivateId(null) } }} />
      <DeleteDialog open={deleteId !== null} label={label} warning={deleteWarning} onCancel={() => setDeleteId(null)}
        onConfirm={async () => { if (deleteId !== null) { await onHardDelete(deleteId); setDeleteId(null) } }} />
    </>
  )
}

function BhojanshalasTab() {
  const { bhojanshalas, addBhojanshala, deactivateBhojanshala, reactivateBhojanshala, hardDeleteBhojanshala } = useStore()
  return (
    <NameMaster
      rows={bhojanshalas} onAdd={addBhojanshala}
      onDeactivate={deactivateBhojanshala} onReactivate={reactivateBhojanshala} onHardDelete={hardDeleteBhojanshala}
      label="bhojanshala"
      deleteWarning="If this bhojanshala has meal count or seva records, the server will block deletion — deactivate it instead."
    />
  )
}

function DishesTab() {
  const { dishes, addDish, deactivateDish, reactivateDish, hardDeleteDish } = useStore()
  return (
    <NameMaster
      rows={dishes} onAdd={addDish}
      onDeactivate={deactivateDish} onReactivate={reactivateDish} onHardDelete={hardDeleteDish}
      label="dish"
    />
  )
}

// Staff Tab — delete removes salary history too (salary belongs to the person)
function StaffTab() {
  const { staff, addStaff, deactivateStaff, reactivateStaff, hardDeleteStaff } = useStore()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', designation: '', monthlySalary: '' })
  const [deactivateId, setDeactivateId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  function save() {
    if (!f.name) return
    addStaff({ name: f.name, designation: f.designation, monthlySalary: Number(f.monthlySalary) || 0, remarks: null, isActive: true })
    setF({ name: '', designation: '', monthlySalary: '' })
    setOpen(false)
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Add staff</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add staff</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <Field label="Name" labelG="નામ"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
              <Field label="Designation" labelG="હોદ્દો"><Input value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} /></Field>
              <Field label="Monthly Salary" labelG="માસિક પગાર" hint="Pre-fills a new month's payroll.">
                <NumberInput value={f.monthlySalary} onChange={(e) => setF({ ...f, monthlySalary: e.target.value })} />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Add staff</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead className="text-right">Monthly Salary</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((s) => (
            <TableRow key={s.id} className={!s.isActive ? 'opacity-60' : ''}>
              <TableCell className="whitespace-nowrap font-medium" lang="gu">{s.name}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground" lang="gu">{s.designation}</TableCell>
              <TableCell className="num text-right">{formatMoney(s.monthlySalary)}</TableCell>
              <TableCell><Badge variant={s.isActive ? 'success' : 'muted'}>{s.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
              <TableCell>
                <ActionButtons isActive={s.isActive}
                  onDeactivate={() => setDeactivateId(s.id)}
                  onReactivate={() => reactivateStaff(s.id)}
                  onDelete={() => setDeleteId(s.id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <DeactivateDialog open={deactivateId !== null} label="staff member" onCancel={() => setDeactivateId(null)}
        onConfirm={async () => { if (deactivateId !== null) { await deactivateStaff(deactivateId); setDeactivateId(null) } }} />
      <DeleteDialog
        open={deleteId !== null}
        label="staff member"
        warning="Their salary payment records will also be deleted. All purchase/consumption transactions they entered are NOT affected."
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => { if (deleteId !== null) { await hardDeleteStaff(deleteId); setDeleteId(null) } }}
      />
    </>
  )
}
