import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'

export interface AuthUser {
  id: string
  email: string
  brandId: string | null
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }

  const token = authHeader.slice(7)
  const secret = process.env.JWT_SECRET
  if (!secret) {
    res.status(500).json({ success: false, error: 'Server configuration error' })
    return
  }

  try {
    const raw = jwt.verify(token, secret, { algorithms: ['HS256'] })
    if (typeof raw !== 'object' || !raw || typeof (raw as Record<string, unknown>).id !== 'string' || typeof (raw as Record<string, unknown>).email !== 'string') {
      res.status(401).json({ success: false, error: 'Malformed token' })
      return
    }
    const p = raw as Record<string, unknown>
    const userId = p.id as string
    const email = p.email as string

    const brandId = p.brandId as string | null
    if (brandId) {
      // Verify brand exists
      prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } })
        .then(brand => {
          req.user = { id: userId, email, brandId: brand?.id ?? null }
          next()
        })
        .catch(() => {
          res.status(401).json({ success: false, error: 'Brand not found' })
        })
    } else {
      // Fallback for tokens without brandId — find user's brand
      prisma.brand.findFirst({ where: { users: { some: { id: userId } } }, select: { id: true } })
        .then(brand => {
          req.user = { id: userId, email, brandId: brand?.id ?? null }
          next()
        })
        .catch(() => {
          res.status(401).json({ success: false, error: 'Brand not found' })
        })
    }
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}
