import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

const SaveMenuSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealTime: z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
  bhojanshalaId: z.number().int().positive(),
  dishIds: z.array(z.number().int().positive()),
  remarks: z.string().nullable().optional(),
})

const CopyMenuSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bhojanshalaId: z.number().int().positive(),
})

/**
 * GET /api/menus?date=YYYY-MM-DD
 * DATA_ENTRY: scoped to their bhojanshalas, today only
 * ADMIN: all bhojanshalas, any date
 */
router.get('/', requireAuth, async (req, res) => {
  const user = req.user!
  const date = String(req.query.date || '')
  const bhojanshalaId = req.query.bhojanshalaId ? Number(req.query.bhojanshalaId) : undefined

  // DATA_ENTRY can only see today
  if (user.role === 'DATA_ENTRY') {
    const today = new Date().toISOString().slice(0, 10)
    if (date && date !== today) {
      res.status(403).json({ error: 'Data-entry users can only view today\'s menus' })
      return
    }
  }

  let bhojanshalaIds: number[] | undefined
  if (user.role === 'DATA_ENTRY') {
    const scopes = await prisma.userBhojanshala.findMany({
      where: { userId: user.id }, select: { bhojanshalaId: true },
    })
    bhojanshalaIds = scopes.map((s) => s.bhojanshalaId)
  }

  const dateObj = date ? new Date(date + 'T00:00:00.000Z') : undefined

  const menus = await prisma.menu.findMany({
    where: {
      ...(dateObj ? { date: dateObj } : {}),
      ...(bhojanshalaId ? { bhojanshalaId } : {}),
      ...(bhojanshalaIds ? { bhojanshalaId: { in: bhojanshalaIds } } : {}),
    },
    include: { dishes: { select: { dishId: true } } },
    orderBy: [{ date: 'asc' }, { bhojanshalaId: 'asc' }, { mealTime: 'asc' }],
  })

  res.json(menus.map(serializeMenu))
})

/**
 * POST /api/menus — admin only, upsert by (date, mealTime, bhojanshalaId)
 */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const user = req.user!
  const parse = SaveMenuSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }

  const { date, mealTime, bhojanshalaId, dishIds, remarks } = parse.data
  const dateObj = new Date(date + 'T00:00:00.000Z')

  const existing = await prisma.menu.findUnique({
    where: { date_mealTime_bhojanshalaId: { date: dateObj, mealTime, bhojanshalaId } },
  })

  let menu
  if (existing) {
    // Replace dishes
    await prisma.menuDish.deleteMany({ where: { menuId: existing.id } })
    menu = await prisma.menu.update({
      where: { id: existing.id },
      data: {
        remarks: remarks ?? null,
        dishes: { create: dishIds.map((dishId) => ({ dishId })) },
      },
      include: { dishes: { select: { dishId: true } } },
    })
  } else {
    menu = await prisma.menu.create({
      data: {
        date: dateObj, mealTime, bhojanshalaId, remarks: remarks ?? null,
        createdById: user.id,
        dishes: { create: dishIds.map((dishId) => ({ dishId })) },
      },
      include: { dishes: { select: { dishId: true } } },
    })
  }

  res.status(existing ? 200 : 201).json(serializeMenu(menu))
})

/**
 * POST /api/menus/copy — copy all meals from one day to another (admin only)
 */
router.post('/copy', requireAuth, requireAdmin, async (req, res) => {
  const user = req.user!
  const parse = CopyMenuSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }

  const { fromDate, toDate, bhojanshalaId } = parse.data
  const fromDateObj = new Date(fromDate + 'T00:00:00.000Z')
  const toDateObj = new Date(toDate + 'T00:00:00.000Z')

  const sourceMenus = await prisma.menu.findMany({
    where: { date: fromDateObj, bhojanshalaId },
    include: { dishes: { select: { dishId: true } } },
  })

  const results = []
  for (const src of sourceMenus) {
    const existing = await prisma.menu.findUnique({
      where: { date_mealTime_bhojanshalaId: { date: toDateObj, mealTime: src.mealTime, bhojanshalaId } },
    })
    if (existing) {
      await prisma.menuDish.deleteMany({ where: { menuId: existing.id } })
      const m = await prisma.menu.update({
        where: { id: existing.id },
        data: { dishes: { create: src.dishes.map((d) => ({ dishId: d.dishId })) } },
        include: { dishes: { select: { dishId: true } } },
      })
      results.push(serializeMenu(m))
    } else {
      const m = await prisma.menu.create({
        data: {
          date: toDateObj, mealTime: src.mealTime, bhojanshalaId, remarks: src.remarks,
          createdById: user.id,
          dishes: { create: src.dishes.map((d) => ({ dishId: d.dishId })) },
        },
        include: { dishes: { select: { dishId: true } } },
      })
      results.push(serializeMenu(m))
    }
  }

  res.json(results)
})

function serializeMenu(m: { id: number; date: Date; mealTime: string; bhojanshalaId: number; remarks: string | null; dishes: { dishId: number }[] }) {
  return {
    id: m.id,
    date: (m.date as Date).toISOString().slice(0, 10),
    mealTime: m.mealTime,
    bhojanshalaId: m.bhojanshalaId,
    remarks: m.remarks,
    dishIds: m.dishes.map((d) => d.dishId),
  }
}

export default router
