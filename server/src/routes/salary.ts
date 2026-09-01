import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

const SalaryRowSchema = z.object({
  staffId: z.number().int().positive(),
  year: z.number().int().min(2000),
  month: z.number().int().min(1).max(12),
  monthlySalary: z.number().positive(), // snapshot
  daysPresent: z.number().min(0),
  perDaySalary: z.number().min(0),
  paidOn: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
})

const SaveSalarySchema = z.object({
  rows: z.array(SalaryRowSchema),
})

/**
 * GET /api/salary?year=&month=
 * Returns all salary transactions for a given month.
 */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const year = Number(req.query.year)
  const month = Number(req.query.month)
  if (!year || !month) { res.status(400).json({ error: 'year and month required' }); return }

  const rows = await prisma.salaryTransaction.findMany({
    where: { year, month },
    include: { staff: { select: { name: true, designation: true } } },
    orderBy: { staffId: 'asc' },
  })

  res.json(rows.map(serializeSalary))
})

/**
 * GET /api/salary/range?fromYear=&fromMonth=&toYear=&toMonth= — for reports
 */
router.get('/range', requireAuth, requireAdmin, async (req, res) => {
  const { fromYear, fromMonth, toYear, toMonth } = req.query
  if (!fromYear || !fromMonth || !toYear || !toMonth) {
    res.status(400).json({ error: 'fromYear, fromMonth, toYear, toMonth required' }); return
  }

  const rows = await prisma.salaryTransaction.findMany({
    where: {
      OR: [
        { year: { gt: Number(fromYear) }, AND: { year: { lt: Number(toYear) } } },
        { year: Number(fromYear), month: { gte: Number(fromMonth) } },
        { year: Number(toYear), month: { lte: Number(toMonth) } },
      ],
    },
    include: { staff: { select: { name: true, designation: true } } },
    orderBy: [{ year: 'asc' }, { month: 'asc' }, { staffId: 'asc' }],
  })

  res.json(rows.map(serializeSalary))
})

/**
 * POST /api/salary — upsert salary rows for a month (admin only)
 */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parse = SaveSalarySchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }

  const results = await Promise.all(
    parse.data.rows.map((row) =>
      prisma.salaryTransaction.upsert({
        where: { staffId_year_month: { staffId: row.staffId, year: row.year, month: row.month } },
        update: {
          monthlySalary: row.monthlySalary,
          daysPresent: row.daysPresent,
          perDaySalary: row.perDaySalary,
          paidOn: row.paidOn ? new Date(row.paidOn) : null,
          remarks: row.remarks ?? null,
        },
        create: {
          staffId: row.staffId, year: row.year, month: row.month,
          monthlySalary: row.monthlySalary,
          daysPresent: row.daysPresent,
          perDaySalary: row.perDaySalary,
          paidOn: row.paidOn ? new Date(row.paidOn) : null,
          remarks: row.remarks ?? null,
        },
        include: { staff: { select: { name: true, designation: true } } },
      }),
    ),
  )

  res.json(results.map(serializeSalary))
})

function serializeSalary(s: {
  id: number; staffId: number; year: number; month: number;
  monthlySalary: unknown; daysPresent: unknown; perDaySalary: unknown;
  paidOn: Date | null; remarks: string | null;
  staff?: { name: string; designation: string };
}) {
  return {
    id: s.id, staffId: s.staffId, year: s.year, month: s.month,
    monthlySalary: Number(s.monthlySalary),
    daysPresent: Number(s.daysPresent),
    perDaySalary: Number(s.perDaySalary),
    paidOn: s.paidOn ? s.paidOn.toISOString().slice(0, 10) : null,
    remarks: s.remarks,
    staff: s.staff,
  }
}

export default router
