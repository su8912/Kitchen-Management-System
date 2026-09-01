import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { User } from '@prisma/client'

// Augment Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

interface JwtPayload {
  userId: number
}

/**
 * Requires a valid JWT cookie. Attaches req.user.
 * Returns 401 if missing / invalid, 403 if user is inactive.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token as string | undefined
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  let payload: JwtPayload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user || !user.isActive) {
    res.status(401).json({ error: 'User not found or inactive' })
    return
  }

  req.user = user
  next()
}

/**
 * Must be chained after requireAuth.
 * Returns 403 if the authenticated user is not ADMIN.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }
  next()
}

/** Create a signed JWT for a user. */
export function signToken(userId: number): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' })
}
