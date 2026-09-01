import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

const BhojanshalaSchema = z.object({
  nameE: z.string().min(1),
  nameG: z.string().min(1),
  nameH: z.string().min(1),
  isActive: z.boolean().optional().default(true),
})

/** GET /api/bhojanshalas */
router.get('/', requireAuth, async (_req, res) => {
  const bhojanshalas = await prisma.bhojanshala.findMany({ orderBy: { id: 'asc' } })
  res.json(bhojanshalas)
})

/** POST /api/bhojanshalas — admin only */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parse = BhojanshalaSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const bh = await prisma.bhojanshala.create({ data: parse.data })
  res.status(201).json(bh)
})

/** PATCH /api/bhojanshalas/:id — admin only */
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const parse = BhojanshalaSchema.partial().safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  try {
    const bh = await prisma.bhojanshala.update({ where: { id }, data: parse.data })
    res.json(bh)
  } catch { res.status(404).json({ error: 'Bhojanshala not found' }) }
})

/** DELETE /api/bhojanshalas/:id — admin only, hard delete */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  try {
    await prisma.$transaction([
      prisma.bhojanshalaCount.deleteMany({ where: { bhojanshalaId: id } }),
      prisma.menu.deleteMany({ where: { bhojanshalaId: id } }),
      prisma.rasoiSevaSlot.deleteMany({ where: { bhojanshalaId: id } }),
      prisma.userBhojanshala.deleteMany({ where: { bhojanshalaId: id } }),
      prisma.bhojanshala.delete({ where: { id } })
    ])
    res.status(204).end()
  } catch {
    res.status(404).json({ error: 'Bhojanshala not found' })
  }
})

export default router
