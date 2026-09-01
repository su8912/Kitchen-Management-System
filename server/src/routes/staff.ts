import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

const StaffSchema = z.object({
  name: z.string().min(1),
  designation: z.string().min(1),
  monthlySalary: z.number().positive(),
  remarks: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true),
})

/** GET /api/staff */
router.get('/', requireAuth, async (_req, res) => {
  const staff = await prisma.staff.findMany({ orderBy: { name: 'asc' } })
  res.json(staff.map(s => ({ ...s, monthlySalary: Number(s.monthlySalary) })))
})

/** POST /api/staff — admin only */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parse = StaffSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const s = await prisma.staff.create({ data: parse.data })
  res.status(201).json({ ...s, monthlySalary: Number(s.monthlySalary) })
})

/** PATCH /api/staff/:id — admin only */
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const parse = StaffSchema.partial().safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  try {
    const s = await prisma.staff.update({ where: { id }, data: parse.data })
    res.json({ ...s, monthlySalary: Number(s.monthlySalary) })
  } catch { res.status(404).json({ error: 'Staff not found' }) }
})

/** DELETE /api/staff/:id — admin only, hard delete
 * Salary history for this staff member is also deleted (it belongs to the person).
 * Other transactional data (e.g. transactions entered by a user) is NOT touched.
 */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  try {
    // Delete in a transaction: salary records first, then staff
    await prisma.$transaction([
      prisma.salaryTransaction.deleteMany({ where: { staffId: id } }),
      prisma.staff.delete({ where: { id } }),
    ])
    res.status(204).end()
  } catch {
    res.status(404).json({ error: 'Staff not found' })
  }
})

export default router
