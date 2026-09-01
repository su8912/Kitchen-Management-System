import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { stockFor } from '../lib/stock'
import { FormField } from '@prisma/client'

const router = Router()

// All report routes are admin-only
router.use(requireAuth, requireAdmin)

function dateRange(req: Request, _res: Response) {
  return { from: String(req.query.from || ''), to: String(req.query.to || '') }
}

/**
 * GET /api/reports/stock?from=&to=
 * Item-wise stock balances for stock-tracked categories (those with CONSUMPTION config).
 */
router.get('/stock', async (req, res) => {
  const { from, to } = req.query as { from: string; to: string }
  if (!from || !to) { res.status(400).json({ error: 'from and to required' }); return }

  // Find stock-tracked categories (those that have a CONSUMPTION form config)
  const consumptionConfigs = await prisma.categoryFormConfig.findMany({
    where: { transactionType: 'CONSUMPTION' },
    select: { itemCategoryId: true },
  })
  const trackedCategoryIds = consumptionConfigs.map((c) => c.itemCategoryId)

  const items = await prisma.item.findMany({
    where: { itemCategoryId: { in: trackedCategoryIds }, isActive: true },
    include: { itemCategory: { select: { id: true, nameE: true, nameG: true } } },
    orderBy: [{ itemCategoryId: 'asc' }, { nameE: 'asc' }],
  })

  const rows = await Promise.all(
    items.map(async (item) => {
      const stock = await stockFor(item.id, { from, to })
      return {
        itemId: item.id,
        nameE: item.nameE,
        nameG: item.nameG,
        nameH: item.nameH,
        unit: item.unit,
        categoryId: item.itemCategoryId,
        categoryNameE: item.itemCategory.nameE,
        categoryNameG: item.itemCategory.nameG,
        minimumQty: item.minimumQty !== null ? Number(item.minimumQty) : null,
        ...stock,
        belowMinimum: item.minimumQty !== null ? stock.available < Number(item.minimumQty) : false,
      }
    }),
  )

  res.json(rows)
})

/**
 * GET /api/reports/bhojanshala?from=&to=
 * Headcount report — date × bhojanshala × meal pivot
 */
router.get('/bhojanshala', async (req, res) => {
  const { from, to } = req.query as { from: string; to: string }
  if (!from || !to) { res.status(400).json({ error: 'from and to required' }); return }

  const counts = await prisma.bhojanshalaCount.findMany({
    where: {
      date: {
        gte: new Date(from + 'T00:00:00.000Z'),
        lte: new Date(to + 'T23:59:59.999Z'),
      },
    },
    include: { bhojanshala: { select: { nameE: true, nameG: true } } },
    orderBy: [{ date: 'asc' }, { bhojanshalaId: 'asc' }],
  })

  res.json(counts.map((c) => ({
    id: c.id,
    date: c.date.toISOString().slice(0, 10),
    bhojanshalaId: c.bhojanshalaId,
    bhojanshalaNameE: c.bhojanshala.nameE,
    bhojanshalaNameG: c.bhojanshala.nameG,
    mealTime: c.mealTime,
    count: c.count,
    remarks: c.remarks,
  })))
})

/**
 * GET /api/reports/rasoi-seva?from=&to=
 * Rasoi seva report + sponsored vs served comparison
 */
router.get('/rasoi-seva', async (req, res) => {
  const { from, to } = req.query as { from: string; to: string }
  if (!from || !to) { res.status(400).json({ error: 'from and to required' }); return }

  const sevas = await prisma.rasoiSeva.findMany({
    where: {
      date: {
        gte: new Date(from + 'T00:00:00.000Z'),
        lte: new Date(to + 'T23:59:59.999Z'),
      },
    },
    include: {
      slots: {
        include: { bhojanshala: { select: { nameE: true, nameG: true } } },
      },
    },
    orderBy: [{ date: 'asc' }, { id: 'asc' }],
  })

  const counts = await prisma.bhojanshalaCount.findMany({
    where: {
      date: {
        gte: new Date(from + 'T00:00:00.000Z'),
        lte: new Date(to + 'T23:59:59.999Z'),
      },
    },
  })

  const countMap = new Map<string, number>()
  for (const c of counts) {
    countMap.set(`${c.date.toISOString().slice(0, 10)}_${c.bhojanshalaId}_${c.mealTime}`, c.count)
  }

  res.json({
    sevas: sevas.map((s) => ({
      id: s.id,
      date: s.date.toISOString().slice(0, 10),
      donorName: s.donorName,
      amount: s.amount !== null ? Number(s.amount) : null,
      remarks: s.remarks,
      slots: s.slots.map((sl) => {
        const key = `${s.date.toISOString().slice(0, 10)}_${sl.bhojanshalaId}_${sl.mealTime}`
        return {
          bhojanshalaId: sl.bhojanshalaId,
          bhojanshalaNameE: sl.bhojanshala.nameE,
          bhojanshalaNameG: sl.bhojanshala.nameG,
          mealTime: sl.mealTime,
          personCount: sl.personCount,         // sponsored
          servedCount: countMap.get(key) ?? null, // actually served
        }
      }),
    })),
  })
})

/**
 * GET /api/reports/salary?fromYear=&fromMonth=&toYear=&toMonth=
 */
router.get('/salary', async (req, res) => {
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

  res.json(rows.map((r) => ({
    id: r.id, staffId: r.staffId, year: r.year, month: r.month,
    staffName: r.staff.name, designation: r.staff.designation,
    monthlySalary: Number(r.monthlySalary),
    daysPresent: Number(r.daysPresent),
    perDaySalary: Number(r.perDaySalary),
    netPayable: Number(r.daysPresent) * Number(r.perDaySalary),
    paidOn: r.paidOn ? r.paidOn.toISOString().slice(0, 10) : null,
    remarks: r.remarks,
  })))
})

/**
 * GET /api/reports/kharch?from=&to=
 * Kharch (expenses) + donations + balance
 *
 *   Kharch    = Σ purchase_amount grouped by category
 *   Donations = Σ rasoi_seva.amount + Σ transaction.seva_amount
 *   Balance   = donations − kharch
 */
router.get('/kharch', async (req, res) => {
  const { from, to } = req.query as { from: string; to: string }
  if (!from || !to) { res.status(400).json({ error: 'from and to required' }); return }

  const fromDate = new Date(from + 'T00:00:00.000Z')
  const toDate = new Date(to + 'T23:59:59.999Z')

  // Transactions with purchase amounts, grouped by category
  const transactions = await prisma.transaction.findMany({
    where: {
      transactionType: 'PURCHASE',
      purchaseAmount: { not: null },
      datetime: { gte: fromDate, lte: toDate },
    },
    include: {
      item: {
        include: { itemCategory: { select: { id: true, nameE: true, nameG: true } } },
      },
    },
  })

  // Group by category
  const byCategory = new Map<number, { nameE: string; nameG: string; total: number }>()
  let totalSevaFromTransactions = 0

  for (const t of transactions) {
    const catId = t.item.itemCategoryId
    const cat = t.item.itemCategory
    const existing = byCategory.get(catId) ?? { nameE: cat.nameE, nameG: cat.nameG, total: 0 }
    existing.total += Number(t.purchaseAmount)
    byCategory.set(catId, existing)
    totalSevaFromTransactions += t.sevaAmount !== null ? Number(t.sevaAmount) : 0
  }

  const kharchByCategory = Array.from(byCategory.entries()).map(([id, v]) => ({
    categoryId: id, nameE: v.nameE, nameG: v.nameG, total: v.total,
  }))
  const totalKharch = kharchByCategory.reduce((n, c) => n + c.total, 0)

  // Rasoi seva donations
  const sevaAgg = await prisma.rasoiSeva.aggregate({
    where: { date: { gte: fromDate, lte: toDate }, amount: { not: null } },
    _sum: { amount: true },
  })
  const totalSevaFromMeals = Number(sevaAgg._sum.amount ?? 0)

  const totalDonations = totalSevaFromMeals + totalSevaFromTransactions
  const balance = totalDonations - totalKharch

  res.json({
    kharchByCategory,
    totalKharch,
    totalSevaFromMeals,
    totalSevaFromTransactions,
    totalDonations,
    balance,
  })
})

export default router
