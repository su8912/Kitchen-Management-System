import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

const DishSchema = z.object({
  nameE: z.string().min(1),
  nameG: z.string().min(1),
  nameH: z.string().min(1),
  isActive: z.boolean().optional().default(true),
})

/** GET /api/dishes — all authenticated users (data-entry needs to see dishes for Today's Meal) */
router.get('/', requireAuth, async (_req, res) => {
  const dishes = await prisma.dish.findMany({ orderBy: { nameE: 'asc' } })
  res.json(dishes)
})

/** POST /api/dishes — admin only */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parse = DishSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const dish = await prisma.dish.create({ data: parse.data })
  res.status(201).json(dish)
})

/** PATCH /api/dishes/:id — admin only */
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const parse = DishSchema.partial().safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  try {
    const dish = await prisma.dish.update({ where: { id }, data: parse.data })
    res.json(dish)
  } catch { res.status(404).json({ error: 'Dish not found' }) }
})

/** DELETE /api/dishes/:id — admin only, hard delete */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  try {
    await prisma.$transaction([
      prisma.menuDish.deleteMany({ where: { dishId: id } }),
      prisma.dish.delete({ where: { id } })
    ])
    res.status(204).end()
  } catch {
    res.status(404).json({ error: 'Dish not found' })
  }
})

export default router
