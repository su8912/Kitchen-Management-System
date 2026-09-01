import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

const UserCreateSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(3).max(32).regex(/^[a-z0-9_]+$/),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'DATA_ENTRY']),
  isActive: z.boolean().optional().default(true),
  categoryIds: z.array(z.number().int().positive()).optional().default([]),
  bhojanshalaIds: z.array(z.number().int().positive()).optional().default([]),
})

const UserPatchSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(3).max(32).regex(/^[a-z0-9_]+$/).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'DATA_ENTRY']).optional(),
  isActive: z.boolean().optional(),
  categoryIds: z.array(z.number().int().positive()).optional(),
  bhojanshalaIds: z.array(z.number().int().positive()).optional(),
})

/** GET /api/users — admin only */
router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    include: {
      categories: { select: { itemCategoryId: true } },
      bhojanshalas: { select: { bhojanshalaId: true } },
    },
    orderBy: { id: 'asc' },
  })
  res.json(users.map(publicUser))
})

/** POST /api/users — admin only, create user */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parse = UserCreateSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }

  const { name, username, password, role, isActive, categoryIds, bhojanshalaIds } = parse.data

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) { res.status(409).json({ error: 'Username already taken' }); return }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      name, username, passwordHash, role, isActive,
      categories: { create: categoryIds.map((id) => ({ itemCategoryId: id })) },
      bhojanshalas: { create: bhojanshalaIds.map((id) => ({ bhojanshalaId: id })) },
    },
    include: {
      categories: { select: { itemCategoryId: true } },
      bhojanshalas: { select: { bhojanshalaId: true } },
    },
  })

  res.status(201).json(publicUser(user))
})

/** PATCH /api/users/:id — admin only */
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const requestingUser = req.user!
  const id = Number(req.params.id)

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) { res.status(404).json({ error: 'User not found' }); return }

  const parse = UserPatchSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }

  const { password, categoryIds, bhojanshalaIds, isActive, role, ...rest } = parse.data

  // Safety: admin cannot deactivate or demote themselves
  if (id === requestingUser.id) {
    if (isActive === false) { res.status(400).json({ error: 'Cannot deactivate yourself' }); return }
    if (role === 'DATA_ENTRY') { res.status(400).json({ error: 'Cannot demote yourself' }); return }
  }

  // Safety: cannot remove the last active admin
  if ((isActive === false || role === 'DATA_ENTRY') && target.role === 'ADMIN') {
    const activeAdminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } })
    if (activeAdminCount <= 1) {
      res.status(400).json({ error: 'Cannot deactivate or demote the last active admin' }); return
    }
  }

  const updateData: Record<string, unknown> = { ...rest }
  if (isActive !== undefined) updateData.isActive = isActive
  if (role !== undefined) updateData.role = role
  if (password) updateData.passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...updateData,
      ...(categoryIds !== undefined ? {
        categories: {
          deleteMany: {},
          create: categoryIds.map((cid) => ({ itemCategoryId: cid })),
        },
      } : {}),
      ...(bhojanshalaIds !== undefined ? {
        bhojanshalas: {
          deleteMany: {},
          create: bhojanshalaIds.map((bid) => ({ bhojanshalaId: bid })),
        },
      } : {}),
    },
    include: {
      categories: { select: { itemCategoryId: true } },
      bhojanshalas: { select: { bhojanshalaId: true } },
    },
  })

  res.json(publicUser(user))
})

/** DELETE /api/users/:id — admin only, permanent delete
 * All data entered by this user (transactions, counts, menus, sevas) is KEPT.
 * Only the user record and their access-scope rows are removed.
 * The createdById fields on their records are set to null first.
 */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const requestingUser = req.user!
  const id = Number(req.params.id)

  // Cannot delete yourself
  if (id === requestingUser.id) {
    res.status(400).json({ error: 'You cannot delete your own account.' })
    return
  }

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) { res.status(404).json({ error: 'User not found' }); return }

  // Cannot delete the last active admin
  if (target.role === 'ADMIN' && target.isActive) {
    const activeAdminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } })
    if (activeAdminCount <= 1) {
      res.status(400).json({ error: 'Cannot delete the last active admin.' })
      return
    }
  }

  // Nullify FK references so their data stays intact, then delete the user
  await prisma.$transaction([
    // Transactions they created or last-edited
    prisma.transaction.updateMany({ where: { createdById: id }, data: { createdById: null } }),
    prisma.transaction.updateMany({ where: { updatedById: id }, data: { updatedById: null } }),
    // Bhojanshala counts they recorded
    prisma.bhojanshalaCount.updateMany({ where: { createdById: id }, data: { createdById: null } }),
    // Menus they created
    prisma.menu.updateMany({ where: { createdById: id }, data: { createdById: null } }),
    // Rasoi sevas they created
    prisma.rasoiSeva.updateMany({ where: { createdById: id }, data: { createdById: null } }),
    // Access scope rows (cascade would handle these but being explicit)
    prisma.userCategory.deleteMany({ where: { userId: id } }),
    prisma.userBhojanshala.deleteMany({ where: { userId: id } }),
    // Finally delete the user
    prisma.user.delete({ where: { id } }),
  ])

  res.status(204).end()
})

function publicUser(u: {
  id: number; name: string; username: string; role: string; isActive: boolean;
  categories: { itemCategoryId: number }[];
  bhojanshalas: { bhojanshalaId: number }[];
}) {
  return {
    id: u.id, name: u.name, username: u.username, role: u.role, isActive: u.isActive,
    categoryIds: u.categories.map((c) => c.itemCategoryId),
    bhojanshalaIds: u.bhojanshalas.map((b) => b.bhojanshalaId),
  }
}

export default router
