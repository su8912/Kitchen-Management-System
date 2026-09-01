import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

const AttendanceRowSchema = z.object({
  staffId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'HOLIDAY']),
  remarks: z.string().nullable().optional(),
})

const SaveAttendanceSchema = z.object({
  rows: z.array(AttendanceRowSchema),
})

/** GET /api/attendance?year=&month= — all staff attendance for the month */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const year = Number(req.query.year)
  const month = Number(req.query.month)
  if (!year || !month) { res.status(400).json({ error: 'year and month required' }); return }

  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0, 23, 59, 59) // last day of month

  const rows = await prisma.staffAttendance.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: [{ staffId: 'asc' }, { date: 'asc' }],
  })

  res.json(rows.map(serializeAttendance))
})

/**
 * GET /api/attendance/summary?year=&month=
 * Returns { staffId, present, halfDay, absent, total } per staff member.
 * Used by salary page to auto-fill "days present".
 */
router.get('/summary', requireAuth, requireAdmin, async (req, res) => {
  const year = Number(req.query.year)
  const month = Number(req.query.month)
  if (!year || !month) { res.status(400).json({ error: 'year and month required' }); return }

  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0, 23, 59, 59)

  const rows = await prisma.staffAttendance.findMany({
    where: { date: { gte: from, lte: to } },
    select: { staffId: true, status: true },
  })

  // Group by staffId
  const byStaff: Record<number, { present: number; halfDay: number; absent: number; holiday: number }> = {}
  for (const row of rows) {
    if (!byStaff[row.staffId]) byStaff[row.staffId] = { present: 0, halfDay: 0, absent: 0, holiday: 0 }
    if (row.status === 'PRESENT') byStaff[row.staffId].present++
    else if (row.status === 'HALF_DAY') byStaff[row.staffId].halfDay++
    else if (row.status === 'ABSENT') byStaff[row.staffId].absent++
    else if (row.status === 'HOLIDAY') byStaff[row.staffId].holiday++
  }

  const summary = Object.entries(byStaff).map(([staffId, counts]) => ({
    staffId: Number(staffId),
    present: counts.present,
    halfDay: counts.halfDay,
    absent: counts.absent,
    holiday: counts.holiday,
    // effective days = present + half_day×0.5
    effectiveDays: counts.present + counts.halfDay * 0.5,
  }))

  res.json(summary)
})

/** POST /api/attendance — upsert attendance rows (admin only) */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parse = SaveAttendanceSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }

  const results = await Promise.all(
    parse.data.rows.map((row) => {
      const date = new Date(row.date)
      return prisma.staffAttendance.upsert({
        where: { staffId_date: { staffId: row.staffId, date } },
        update: { status: row.status, remarks: row.remarks ?? null },
        create: { staffId: row.staffId, date, status: row.status, remarks: row.remarks ?? null },
      })
    }),
  )

  res.json(results.map(serializeAttendance))
})

function serializeAttendance(a: {
  id: number; staffId: number; date: Date; status: string; remarks: string | null
}) {
  return {
    id: a.id,
    staffId: a.staffId,
    date: a.date.toISOString().slice(0, 10),
    status: a.status,
    remarks: a.remarks,
  }
}

export default router
