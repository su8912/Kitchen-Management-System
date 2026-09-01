import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, signToken } from '../middleware/auth'

const router = Router()

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

/** POST /api/auth/login — verify credentials, set JWT cookie */
router.post('/login', async (req, res) => {
  const parse = LoginSchema.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ error: 'Username and password required' })
    return
  }

  const { username, password } = parse.data

  try {
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const token = signToken(user.id)

  // httpOnly cookie — JS cannot read it, protecting against XSS
  // sameSite 'none' is required when frontend and backend are on different domains
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  }

  res.cookie('token', token, cookieOpts)

  res.json(publicUser(user))
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Database connection failed' })
  }
})

/** POST /api/auth/logout — clear the cookie */
router.post('/logout', (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  })
  res.json({ ok: true })
})

/** GET /api/auth/me — return current user (or 401) */
router.get('/me', requireAuth, async (req, res) => {
  const user = req.user!
  // Include scope arrays
  const [categories, bhojanshalas] = await Promise.all([
    prisma.userCategory.findMany({ where: { userId: user.id }, select: { itemCategoryId: true } }),
    prisma.userBhojanshala.findMany({ where: { userId: user.id }, select: { bhojanshalaId: true } }),
  ])
  res.json({
    ...publicUser(user),
    categoryIds: categories.map((c) => c.itemCategoryId),
    bhojanshalaIds: bhojanshalas.map((b) => b.bhojanshalaId),
  })
})

function publicUser(user: { id: number; name: string; username: string; role: string; isActive: boolean }) {
  return { id: user.id, name: user.name, username: user.username, role: user.role, isActive: user.isActive }
}

export default router
