import { useMemo, useState } from 'react'
import { useStore } from '@/mock/store'
import { TXN_LABEL, UNIT_LABEL, type TransactionType } from '@/lib/types'
import { formatDate, formatMoney, formatQty } from '@/lib/utils'
import { useLang } from '@/lib/language-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NumberInput } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState, PageHeader, SampleDataNotice } from '@/components/common'
import { SearchableSelect } from '@/components/ui/searchable-select'

/**
 * The admin's datewise view of everything — and where amounts get priced from
 * the bill. The amount cell is editable inline; nothing else is.
 */
export function AllTransactions() {
  const {
    transactions,
    categories,
    itemById,
    categoryById,
    userById,
    updateTransaction,
    isStockTracked,
  } = useStore()
  const { t, pickName, pickLabel } = useLang()

  const [catFilter, setCatFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [itemSearch, setItemSearch] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [draft, setDraft] = useState('')

  const rows = useMemo(() => {
    const q = itemSearch.toLowerCase()
    return transactions
      .filter((t) => {
        const item = itemById(t.itemId)
        if (!item) return false
        if (catFilter !== 'all' && item.itemCategoryId !== Number(catFilter)) return false
        if (typeFilter !== 'all' && t.transactionType !== typeFilter) return false
        if (q && !item.nameG.toLowerCase().includes(q) && !item.nameE.toLowerCase().includes(q) && !item.nameH.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => b.datetime.localeCompare(a.datetime))
  }, [transactions, catFilter, typeFilter, itemSearch, itemById])

  function startEdit(id: number, current: number | null) {
    setEditing(id)
    setDraft(current === null ? '' : String(current))
  }

  function commit(id: number) {
    updateTransaction(id, { purchaseAmount: draft === '' ? null : Number(draft) })
    setEditing(null)
  }

  return (
    <>
      <PageHeader
        titleG="બધી એન્ટ્રી"
        titleE="All Transactions"
        titleH="सभी प्रविष्टियाँ"
        description={t('allTxn.description')}
      />
      <SampleDataNotice className="mb-4" />

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <SearchableSelect
            options={categories.map((c) => ({ value: String(c.id), labelG: c.nameG, labelH: c.nameH, labelE: c.nameE }))}
            value={catFilter === 'all' ? '' : catFilter}
            onChange={(v) => setCatFilter(v || 'all')}
            allLabel={t('allTxn.allCategories')}
          />

          <div className="relative">
            <input
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder={t('allTxn.searchItem')}
              className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {itemSearch && (
              <button
                onClick={() => setItemSearch('')}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >×</button>
            )}
          </div>

          <SearchableSelect
            options={[
              { value: 'PURCHASE', labelG: 'ખરીદી', labelH: 'खरीद', labelE: 'Purchase' },
              { value: 'CONSUMPTION', labelG: 'વપરાશ', labelH: 'खपत', labelE: 'Consumption' },
            ]}
            value={typeFilter === 'all' ? '' : typeFilter}
            onChange={(v) => setTypeFilter(v || 'all')}
            allLabel={t('allTxn.allTypes')}
          />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title={t('allTxn.noMatch')} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.date')}</TableHead>
              <TableHead>{t('common.item')}</TableHead>
              <TableHead>{t('common.category')}</TableHead>
              <TableHead>{t('common.type')}</TableHead>
              <TableHead className="text-right">{t('field.qty')}</TableHead>
              <TableHead className="text-right">{t('common.amount')}</TableHead>
              <TableHead className="text-right">{t('allTxn.seva')}</TableHead>
              <TableHead>{t('field.supplier')}</TableHead>
              <TableHead>{t('common.by')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t_row) => {
              const item = itemById(t_row.itemId)!
              const cat = categoryById(item.itemCategoryId)!
              const isPurchase = t_row.transactionType === 'PURCHASE'
              // A consumption row has no money — don't offer to price it.
              const pricable = isPurchase && cat.id !== 6

              return (
                <TableRow key={t_row.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(t_row.datetime.slice(0, 10))}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium">
                    {pickName(item)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {pickName(cat)}
                    {isStockTracked(cat.id) && (
                      <Badge variant="muted" className="ml-1.5">
                        {t('common.stock')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isPurchase ? 'default' : 'muted'}>
                      {pickLabel(TXN_LABEL[t_row.transactionType as TransactionType])}
                    </Badge>
                  </TableCell>
                  <TableCell className="num whitespace-nowrap text-right">
                    {formatQty(t_row.qty)}{' '}
                    <span className="text-xs text-muted-foreground">
                      {pickLabel(UNIT_LABEL[item.unit])}
                    </span>
                  </TableCell>

                  {/* Inline pricing — the core admin action. */}
                  <TableCell className="text-right">
                    {!pricable ? (
                      <span className="text-muted-foreground">—</span>
                    ) : editing === t_row.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <NumberInput
                          autoFocus
                          className="h-9 w-28"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commit(t_row.id)
                            if (e.key === 'Escape') setEditing(null)
                          }}
                        />
                        <Button size="sm" onClick={() => commit(t_row.id)}>
                          {t('common.save')}
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(t_row.id, t_row.purchaseAmount)}
                        className={[
                          'num rounded px-2 py-1 hover:bg-accent',
                          t_row.purchaseAmount === null
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'font-medium',
                        ].join(' ')}
                      >
                        {t_row.purchaseAmount === null ? t('common.addAmount') : formatMoney(t_row.purchaseAmount)}
                      </button>
                    )}
                  </TableCell>

                  <TableCell className="num whitespace-nowrap text-right text-muted-foreground">
                    {formatMoney(t_row.sevaAmount)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {t_row.supplier ?? '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {userById(t_row.createdById)?.name ?? '—'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </>
  )
}
