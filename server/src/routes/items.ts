import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

const ItemSchema = z.object({
  nameE: z.string().min(1),
  nameG: z.string().min(1),
  nameH: z.string().min(1),
  unit: z.enum(['KG', 'LITRE', 'COUNT', 'CYLINDER_COUNT', 'METER_READING']),
  itemCategoryId: z.number().int().positive(),
  minimumQty: z.number().nullable().optional(),
  openingStock: z.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
})

/** GET /api/items — list all items (optionally filtered by categoryId) */
router.get('/', requireAuth, async (req, res) => {
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined

  const items = await prisma.item.findMany({
    where: categoryId ? { itemCategoryId: categoryId } : undefined,
    orderBy: [{ itemCategoryId: 'asc' }, { nameE: 'asc' }],
  })

  res.json(items.map(serializeItem))
})

/** POST /api/items — admin only */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parse = ItemSchema.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() })
    return
  }

  const item = await prisma.item.create({ data: parse.data })
  res.status(201).json(serializeItem(item))
})

/** PATCH /api/items/:id — admin only */
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const parse = ItemSchema.partial().safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() })
    return
  }

  try {
    const item = await prisma.item.update({ where: { id }, data: parse.data })
    res.json(serializeItem(item))
  } catch {
    res.status(404).json({ error: 'Item not found' })
  }
})

function serializeItem(item: { id: number; nameE: string; nameG: string; nameH: string; unit: string; itemCategoryId: number; minimumQty: unknown; openingStock: unknown; isActive: boolean }) {
  return {
    ...item,
    minimumQty: item.minimumQty !== null ? Number(item.minimumQty) : null,
    openingStock: Number(item.openingStock),
  }
}

/** DELETE /api/items/:id — admin only, hard delete */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  try {
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { itemId: id } }),
      prisma.item.delete({ where: { id } })
    ])
    res.status(204).end()
  } catch {
    res.status(404).json({ error: 'Item not found' })
  }
})

export default router
