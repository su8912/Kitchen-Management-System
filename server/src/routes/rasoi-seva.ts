import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

const SlotSchema = z.object({
  bhojanshalaId: z.number().int().positive(),
  mealTime: z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
  personCount: z.number().int().min(0),
})

const RasoiSevaSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  donorName: z.string().min(1),
  amount: z.number().nullable().optional(),
  remarks: z.string().nullable().optional(),
  slots: z.array(SlotSchema).min(1),
})

/**
 * GET /api/rasoi-seva?date=YYYY-MM-DD
 * DATA_ENTRY: scoped to their bhojanshalas, today only
 * ADMIN: all, any date
 */
router.get('/', requireAuth, async (req, res) => {
  const user = req.user!
  const date = String(req.query.date || '')

  if (user.role === 'DATA_ENTRY') {
    const today = new Date().toISOString().slice(0, 10)
    if (date && date !== today) {
      res.status(403).json({ error: 'Data-entry users can only view today\'s seva' }); return
    }
  }

  let allowedBhojanshalaIds: number[] | undefined
  if (user.role === 'DATA_ENTRY') {
    const scopes = await prisma.userBhojanshala.findMany({
      where: { userId: user.id }, select: { bhojanshalaId: true },
    })
    allowedBhojanshalaIds = scopes.map((s) => s.bhojanshalaId)
  }

  const dateFilter = date ? { date: new Date(date + 'T00:00:00.000Z') } : {}

  const sevas = await prisma.rasoiSeva.findMany({
    where: dateFilter,
    include: {
      slots: {
        where: allowedBhojanshalaIds
          ? { bhojanshalaId: { in: allowedBhojanshalaIds } }
          : undefined,
      },
    },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
  })

  res.json(sevas.map(serializeSeva))
})

/** GET /api/rasoi-seva/range?from=&to= — for reports */
router.get('/range', requireAuth, requireAdmin, async (req, res) => {
  const { from, to } = req.query
  if (!from || !to) { res.status(400).json({ error: 'from and to required' }); return }

  const sevas = await prisma.rasoiSeva.findMany({
    where: {
      date: {
        gte: new Date(String(from) + 'T00:00:00.000Z'),
        lte: new Date(String(to) + 'T23:59:59.999Z'),
      },
    },
    include: { slots: true },
    orderBy: [{ date: 'asc' }, { id: 'asc' }],
  })

  res.json(sevas.map(serializeSeva))
})

/** POST /api/rasoi-seva — admin only */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const user = req.user!
  const parse = RasoiSevaSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }

  const { date, donorName, amount, remarks, slots } = parse.data

  const seva = await prisma.rasoiSeva.create({
    data: {
      date: new Date(date + 'T00:00:00.000Z'),
      donorName,
      amount: amount ?? null,
      remarks: remarks ?? null,
      createdById: user.id,
      slots: { create: slots },
    },
    include: { slots: true },
  })

  res.status(201).json(serializeSeva(seva))
})

function serializeSeva(s: {
  id: number; date: Date; donorName: string;
  amount: unknown; remarks: string | null;
  slots: { id?: number; bhojanshalaId: number; mealTime: string; personCount: number }[]
}) {
  return {
    id: s.id,
    date: (s.date as Date).toISOString().slice(0, 10),
    donorName: s.donorName,
    amount: s.amount !== null ? Number(s.amount) : null,
    remarks: s.remarks,
    slots: s.slots.map((sl) => ({
      bhojanshalaId: sl.bhojanshalaId,
      mealTime: sl.mealTime,
      personCount: sl.personCount,
    })),
  }
}

export default router
