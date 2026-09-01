import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

const CountRowSchema = z.object({
  bhojanshalaId: z.number().int().positive(),
  mealTime: z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
  count: z.number().int().min(0),
  remarks: z.string().nullable().optional(),
})

const SaveCountsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rows: z.array(CountRowSchema),
})

/**
 * GET /api/counts?date=YYYY-MM-DD
 * DATA_ENTRY: scoped to their assigned bhojanshalas
 * ADMIN: all bhojanshalas
 */
router.get('/', requireAuth, async (req, res) => {
  const user = req.user!
  const date = String(req.query.date || '')
  if (!date) { res.status(400).json({ error: 'date query param required' }); return }

  const dateObj = new Date(date + 'T00:00:00.000Z')

  let bhojanshalaIds: number[] | undefined
  if (user.role === 'DATA_ENTRY') {
    const scopes = await prisma.userBhojanshala.findMany({
      where: { userId: user.id }, select: { bhojanshalaId: true },
    })
    bhojanshalaIds = scopes.map((s) => s.bhojanshalaId)
  }

  const counts = await prisma.bhojanshalaCount.findMany({
    where: {
      date: dateObj,
      ...(bhojanshalaIds ? { bhojanshalaId: { in: bhojanshalaIds } } : {}),
    },
    orderBy: [{ bhojanshalaId: 'asc' }, { mealTime: 'asc' }],
  })

  res.json(counts.map(serializeCount))
})

/**
 * GET /api/counts/range?from=YYYY-MM-DD&to=YYYY-MM-DD — for reports
 */
router.get('/range', requireAuth, async (req, res) => {
  const { from, to } = req.query
  if (!from || !to) { res.status(400).json({ error: 'from and to required' }); return }

  const counts = await prisma.bhojanshalaCount.findMany({
    where: {
      date: {
        gte: new Date(String(from) + 'T00:00:00.000Z'),
        lte: new Date(String(to) + 'T23:59:59.999Z'),
      },
    },
    include: { bhojanshala: { select: { nameE: true, nameG: true } } },
    orderBy: [{ date: 'asc' }, { bhojanshalaId: 'asc' }, { mealTime: 'asc' }],
  })

  res.json(counts.map(serializeCount))
})

/**
 * POST /api/counts — upsert counts for a date
 * DATA_ENTRY: restricted to their bhojanshalas
 */
router.post('/', requireAuth, async (req, res) => {
  const user = req.user!
  const parse = SaveCountsSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }

  const { date, rows } = parse.data
  const dateObj = new Date(date + 'T00:00:00.000Z')

  // DATA_ENTRY scope check
  if (user.role === 'DATA_ENTRY') {
    const scopes = await prisma.userBhojanshala.findMany({
      where: { userId: user.id }, select: { bhojanshalaId: true },
    })
    const allowed = new Set(scopes.map((s) => s.bhojanshalaId))
    for (const row of rows) {
      if (!allowed.has(row.bhojanshalaId)) {
        res.status(403).json({ error: `Bhojanshala ${row.bhojanshalaId} not in your scope` })
        return
      }
    }
  }

  const results = await Promise.all(
    rows.map((row) =>
      prisma.bhojanshalaCount.upsert({
        where: {
          date_bhojanshalaId_mealTime: {
            date: dateObj,
            bhojanshalaId: row.bhojanshalaId,
            mealTime: row.mealTime,
          },
        },
        update: { count: row.count, remarks: row.remarks ?? null },
        create: {
          date: dateObj,
          bhojanshalaId: row.bhojanshalaId,
          mealTime: row.mealTime,
          count: row.count,
          remarks: row.remarks ?? null,
          createdById: user.id,
        },
      }),
    ),
  )

  res.json(results.map(serializeCount))
})

function serializeCount(c: { id: number; date: Date; bhojanshalaId: number; mealTime: string; count: number; remarks: string | null; [k: string]: unknown }) {
  return { ...c, date: (c.date as Date).toISOString().slice(0, 10) }
}

export default router
