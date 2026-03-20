import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

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
    const raw = jwt.verify(token, secret)
    if (typeof raw !== 'object' || !raw || typeof (raw as Record<string, unknown>).id !== 'string' || typeof (raw as Record<string, unknown>).email !== 'string') {
      res.status(401).json({ success: false, error: 'Malformed token' })
      return
    }
    const p = raw as Record<string, unknown>
    req.user = { id: p.id as string, email: p.email as string, brandId: (p.brandId as string) ?? null }
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}
