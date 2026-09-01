import { useState } from 'react'
import { CheckCircle2, Info } from 'lucide-react'
import { useStore } from '@/mock/store'
import { UNIT_LABEL } from '@/lib/types'
import { formatDate, formatQty } from '@/lib/utils'
import { useLang } from '@/lib/language-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NumberInput } from '@/components/ui/input'
import { EmptyState, PageHeader } from '@/components/common'

/**
 * The admin's worklist: purchases a data-entry user recorded but nobody has
 * priced yet.
 *
 * DERIVED, not a stored status flag — a row qualifies iff its category's form
 * collects PURCHASE_AMOUNT and the amount is still null. So it can never go
 * stale, and there's no "pending" boolean to forget to clear.
 */
export function PendingAmounts() {
  const { pendingAmounts, itemById, categoryById, userById, updateTransaction } = useStore()
  const { t, pickName, pickLabel } = useLang()
  const [drafts, setDrafts] = useState<Record<number, string>>({})

  const rows = pendingAmounts()

  function save(id: number) {
    const v = drafts[id]
    if (!v) return
    updateTransaction(id, { purchaseAmount: Number(v) })
    setDrafts((d) => {
      const next = { ...d }
      delete next[id]
      return next
    })
  }

  return (
    <>
      <PageHeader
        titleG="બાકી રકમ"
        titleE="Pending Amounts"
        titleH="बाकी राशि"
        description={t('pending.description')}
        actions={
          rows.length > 0 ? (
            <Badge variant="warn" className="text-sm">
              {rows.length} {t('common.pending')}
            </Badge>
          ) : undefined
        }
      />

      <p className="mb-4 flex items-start gap-2 rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" />
        {t('pending.info')}
      </p>

      {rows.length === 0 ? (
        <EmptyState
          title={t('pending.nothing')}
          description={t('pending.allDone')}
          action={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        />
      ) : (
        <div className="space-y-2">
          {rows.map((txn) => {
            const item = itemById(txn.itemId)!
            const cat = categoryById(item.itemCategoryId)!
            return (
              <Card key={txn.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {pickName(item)}
                      </span>
                      <Badge variant="secondary">
                        {pickName(cat)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="num font-medium text-foreground">
                        {formatQty(txn.qty)}
                      </span>{' '}
                      {pickLabel(UNIT_LABEL[item.unit])}
                      {txn.supplier && (
                        <>
                          {' · '}
                          {txn.supplier}
                        </>
                      )}
                      {' · '}
                      {formatDate(txn.datetime.slice(0, 10))}
                      {' · '}{t('common.by')}{' '}
                      {userById(txn.createdById)?.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <NumberInput
                      className="w-32"
                      placeholder="₹ amount"
                      value={drafts[txn.id] ?? ''}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [txn.id]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && save(txn.id)}
                    />
                    <Button disabled={!drafts[txn.id]} onClick={() => save(txn.id)}>
                      {t('common.save')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
