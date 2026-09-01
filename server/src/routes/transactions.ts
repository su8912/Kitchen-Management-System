import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { effectiveFields, isTypePermitted, ADMIN_ONLY_FIELDS } from '../lib/effective-fields'
import { FormField } from '@prisma/client'

const router = Router()

const TransactionCreateSchema = z.object({
  datetime: z.string().datetime({ offset: true }),
  transactionType: z.enum(['PURCHASE', 'CONSUMPTION']),
  itemId: z.number().int().positive(),
  qty: z.number().positive().nonnegative(),
  purchaseAmount: z.number().nonnegative().nullable().optional(),
  sevaAmount: z.number().nonnegative().nullable().optional(),
  supplier: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
})

const TransactionPatchSchema = z.object({
  purchaseAmount: z.number().nonnegative().nullable().optional(),
  sevaAmount: z.number().nonnegative().nullable().optional(),
  supplier: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  qty: z.number().positive().nonnegative().optional(),
  datetime: z.string().datetime({ offset: true }).optional(),
})


/**
 * GET /api/transactions
 * - Admin: all transactions, optionally filtered by date range
 * - Data-entry: only their own, same filters
 * Query params: from, to (ISO date), itemId, categoryId
 */
router.get('/', requireAuth, async (req, res) => {
  const user = req.user!
  const { from, to, itemId, categoryId } = req.query

  const fromDate = from ? new Date(String(from) + 'T00:00:00.000Z') : undefined
  const toDate = to ? new Date(String(to) + 'T23:59:59.999Z') : undefined

  let itemIds: number[] | undefined
  if (categoryId) {
    const catItems = await prisma.item.findMany({
      where: { itemCategoryId: Number(categoryId) },
      select: { id: true },
    })
    itemIds = catItems.map((i) => i.id)
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      ...(user.role === 'DATA_ENTRY' ? { createdById: user.id } : {}),
      ...(fromDate ? { datetime: { gte: fromDate } } : {}),
      ...(toDate ? { datetime: { lte: toDate } } : {}),
      ...(itemId ? { itemId: Number(itemId) } : {}),
      ...(itemIds ? { itemId: { in: itemIds } } : {}),
    },
    include: {
      item: { select: { itemCategoryId: true, nameE: true, nameG: true, unit: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { datetime: 'desc' },
  })

  res.json(transactions.map(serializeTxn))
})

/**
 * GET /api/transactions/pending — admin only
 * Purchases that have PURCHASE_AMOUNT in their category config but the value is still null.
 * Derived, never a stored status flag — so it can never go stale.
 */
router.get('/pending', requireAuth, requireAdmin, async (_req, res) => {
  // Get all purchase-type form configs that include PURCHASE_AMOUNT
  const configs = await prisma.categoryFormConfig.findMany({
    where: { transactionType: 'PURCHASE', fields: { has: FormField.PURCHASE_AMOUNT } },
    select: { itemCategoryId: true },
  })
  const categoryIds = configs.map((c) => c.itemCategoryId)

  // Find items in those categories
  const items = await prisma.item.findMany({
    where: { itemCategoryId: { in: categoryIds } },
    select: { id: true },
  })
  const itemIds = items.map((i) => i.id)

  // Purchases with null purchaseAmount
  const pending = await prisma.transaction.findMany({
    where: {
      transactionType: 'PURCHASE',
      purchaseAmount: null,
      itemId: { in: itemIds },
    },
    include: {
      item: { select: { itemCategoryId: true, nameE: true, nameG: true, unit: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { datetime: 'desc' },
  })

  res.json(pending.map(serializeTxn))
})

/** POST /api/transactions — create a transaction */
router.post('/', requireAuth, async (req, res) => {
  const user = req.user!
  const parse = TransactionCreateSchema.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() })
    return
  }

  const data = parse.data

  // Look up the item to get its category
  const item = await prisma.item.findUnique({ where: { id: data.itemId } })
  if (!item || !item.isActive) {
    res.status(400).json({ error: 'Item not found or inactive' })
    return
  }

  // Validate: DATA_ENTRY users can only enter for their assigned categories
  if (user.role === 'DATA_ENTRY') {
    const scope = await prisma.userCategory.findUnique({
      where: { userId_itemCategoryId: { userId: user.id, itemCategoryId: item.itemCategoryId } },
    })
    if (!scope) {
      res.status(403).json({ error: 'Category not in your scope' })
      return
    }
  }

  // Validate: transaction type must be permitted for this category
  const permitted = await isTypePermitted(item.itemCategoryId, data.transactionType)
  if (!permitted) {
    res.status(400).json({ error: `${data.transactionType} is not permitted for this category` })
    return
  }

  // Validate: only allowed fields per config + role
  const allowed = await effectiveFields(user.role, item.itemCategoryId, data.transactionType)

  // Admin-only fields must be rejected if sent by DATA_ENTRY
  if (user.role === 'DATA_ENTRY') {
    if (data.purchaseAmount != null && ADMIN_ONLY_FIELDS.includes(FormField.PURCHASE_AMOUNT)) {
      res.status(403).json({ error: 'purchase_amount is admin-only' })
      return
    }
    if (data.sevaAmount != null && ADMIN_ONLY_FIELDS.includes(FormField.SEVA_AMOUNT)) {
      res.status(403).json({ error: 'seva_amount is admin-only' })
      return
    }
  }

  // Fields not in config must not be sent
  if (!allowed.includes(FormField.SUPPLIER) && data.supplier != null) {
    res.status(400).json({ error: 'supplier is not in the form config for this category/type' })
    return
  }

  const txn = await prisma.transaction.create({
    data: {
      datetime: new Date(data.datetime),
      transactionType: data.transactionType,
      itemId: data.itemId,
      qty: data.qty,
      purchaseAmount: allowed.includes(FormField.PURCHASE_AMOUNT) ? (data.purchaseAmount ?? null) : null,
      sevaAmount: allowed.includes(FormField.SEVA_AMOUNT) ? (data.sevaAmount ?? null) : null,
      supplier: allowed.includes(FormField.SUPPLIER) ? (data.supplier ?? null) : null,
      remarks: data.remarks ?? null,
      createdById: user.id,
    },
    include: {
      item: { select: { itemCategoryId: true, nameE: true, nameG: true, unit: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  res.status(201).json(serializeTxn(txn))
})

/** PATCH /api/transactions/:id */
router.patch('/:id', requireAuth, async (req, res) => {
  const user = req.user!
  const id = Number(req.params.id)

  const existing = await prisma.transaction.findUnique({
    where: { id },
    include: { item: { select: { itemCategoryId: true } } },
  })
  if (!existing) {
    res.status(404).json({ error: 'Transaction not found' })
    return
  }

  // DATA_ENTRY: can only edit own transactions, same-day only, no amount fields
  if (user.role === 'DATA_ENTRY') {
    if (existing.createdById !== user.id) {
      res.status(403).json({ error: 'Not your transaction' })
      return
    }
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    if (existing.datetime < todayStart) {
      res.status(403).json({ error: 'Transactions can only be edited on the day they were created' })
      return
    }
    if (req.body.purchaseAmount !== undefined || req.body.sevaAmount !== undefined) {
      res.status(403).json({ error: 'Amount fields are admin-only' })
      return
    }
  }

  const parse = TransactionPatchSchema.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() })
    return
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...parse.data,
      ...(parse.data.datetime ? { datetime: new Date(parse.data.datetime) } : {}),
      updatedById: user.id,
    },
    include: {
      item: { select: { itemCategoryId: true, nameE: true, nameG: true, unit: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  res.json(serializeTxn(updated))
})

function serializeTxn(t: {
  id: number; datetime: Date; transactionType: string; itemId: number;
  qty: unknown; purchaseAmount: unknown; sevaAmount: unknown;
  supplier: string | null; remarks: string | null; createdById: number | null;
  createdAt: Date; updatedById?: number | null; updatedAt?: Date;
  item?: { itemCategoryId: number; nameE: string; nameG: string; unit: string } | null;
  createdBy?: { id: number; name: string } | null;
}) {
  return {
    id: t.id,
    datetime: t.datetime.toISOString(),
    transactionType: t.transactionType,
    itemId: t.itemId,
    qty: Number(t.qty),
    purchaseAmount: t.purchaseAmount !== null ? Number(t.purchaseAmount) : null,
    sevaAmount: t.sevaAmount !== null ? Number(t.sevaAmount) : null,
    supplier: t.supplier,
    remarks: t.remarks,
    createdById: t.createdById,
    createdAt: t.createdAt.toISOString(),
    item: t.item,
    createdBy: t.createdBy,
  }
}

/** DELETE /api/transactions/:id */
router.delete('/:id', requireAuth, async (req, res) => {
  const user = req.user!
  const id = Number(req.params.id)

  const existing = await prisma.transaction.findUnique({ where: { id } })
  if (!existing) {
    res.status(404).json({ error: 'Transaction not found' })
    return
  }

  // DATA_ENTRY: can only delete own transactions, same-day only
  if (user.role === 'DATA_ENTRY') {
    if (existing.createdById !== user.id) {
      res.status(403).json({ error: 'Not your transaction' })
      return
    }
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    if (existing.datetime < todayStart) {
      res.status(403).json({ error: 'Transactions can only be deleted on the day they were created' })
      return
    }
  }

  await prisma.transaction.delete({ where: { id } })
  res.status(204).end()
})

export default router
