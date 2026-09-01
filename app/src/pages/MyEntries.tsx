import { useMemo, useState } from 'react'
import { Lock, Pencil } from 'lucide-react'
import { useStore } from '@/mock/store'
import { TXN_LABEL, UNIT_LABEL } from '@/lib/types'
import { formatDate, formatDateTime, formatQty, isToday } from '@/lib/utils'
import { useLang } from '@/lib/language-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NumberInput } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState, Field, PageHeader } from '@/components/common'

/**
 * A data-entry user sees only their own rows — and may edit one only on the day
 * they made it. After that it locks: the admin prices rows from bills, and a
 * quantity must not shift under an amount already reconciled against a bill.
 */
export function MyEntries() {
  const { currentUser, transactions, itemById, categoryById, updateTransaction, deleteTransaction } = useStore()
  const { t, pickName, pickLabel } = useLang()
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [qty, setQty] = useState('')

  const mine = useMemo(
    () =>
      transactions
        .filter((t) => t.createdById === currentUser.id)
        .sort((a, b) => b.datetime.localeCompare(a.datetime)),
    [transactions, currentUser.id],
  )

  // Group by date — the department thinks day by day.
  const byDate = useMemo(() => {
    const map = new Map<string, typeof mine>()
    for (const t of mine) {
      const d = t.datetime.slice(0, 10)
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(t)
    }
    return [...map.entries()]
  }, [mine])

  const editing = mine.find((t) => t.id === editId)

  function openEdit(id: number, currentQty: number) {
    setEditId(id)
    setQty(String(currentQty))
  }

  async function saveEdit() {
    if (editId === null) return
    try {
      await updateTransaction(editId, { qty: Number(qty) })
      setEditId(null)
    } catch (err: any) {
      alert(err.message || 'Failed to update transaction')
    }
  }

  async function saveDelete() {
    if (deleteId === null) return
    try {
      await deleteTransaction(deleteId)
      setDeleteId(null)
    } catch (err: any) {
      alert(err.message || 'Failed to delete transaction')
    }
  }

  return (
    <>
      <PageHeader
        titleG="મારી એન્ટ્રી"
        titleE="My Entries"
        titleH="मेरी प्रविष्टियाँ"
        description={`${mine.length} entries by ${currentUser.name}`}
      />

      <p className="mb-4 flex items-start gap-2 rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
        <Lock className="mt-px h-3.5 w-3.5 shrink-0" />
        You can edit an entry only on the day you made it. Older entries are locked —
        ask an admin to change them.
      </p>

      {byDate.length === 0 ? (
        <EmptyState
          title="No entries yet"
          description="Entries you record will appear here, newest first."
        />
      ) : (
        <div className="space-y-5">
          {byDate.map(([date, rows]) => (
            <div key={date}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-semibold">{formatDate(date)}</h2>
                {isToday(date) && <Badge variant="success">Today · editable</Badge>}
              </div>

              <div className="space-y-2">
                {rows.map((txn) => {
                  const item = itemById(txn.itemId)
                  const cat = item ? categoryById(item.itemCategoryId) : undefined
                  const editable = isToday(txn.datetime)

                  return (
                    <Card key={txn.id}>
                      <CardContent className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">
                              {item ? pickName(item) : '—'}
                            </span>
                            <Badge
                              variant={txn.transactionType === 'PURCHASE' ? 'default' : 'muted'}
                            >
                              {pickLabel(TXN_LABEL[txn.transactionType])}
                            </Badge>
                            {cat && (
                              <span className="text-xs text-muted-foreground">
                                {pickName(cat)}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            <span className="num font-medium text-foreground">
                              {formatQty(txn.qty)}
                            </span>{' '}
                            {item && pickLabel(UNIT_LABEL[item.unit])}
                            {txn.supplier && (
                              <>
                                {' · '}
                                {txn.supplier}
                              </>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDateTime(txn.datetime)}
                          </p>
                        </div>

                        {editable ? (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(txn.id, Number(txn.qty))}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              {t('common.edit')}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteId(txn.id)}
                            >
                              {t('common.delete')}
                            </Button>
                          </div>
                        ) : (
                          <Lock className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editId !== null} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.edit')} {t('field.qty')}</DialogTitle>
          </DialogHeader>
          {editing && (
            <>
              <p className="text-sm text-muted-foreground">
                {itemById(editing.itemId) ? pickName(itemById(editing.itemId)!) : '—'}
              </p>
              <Field label="Quantity" labelG="જથ્થો" labelH="मात्रा">
                <NumberInput value={qty} onChange={(e) => setQty(e.target.value)} />
              </Field>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveEdit}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.delete')}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this entry? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={saveDelete}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
