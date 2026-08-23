import { Request, Response, NextFunction } from 'express'

const ROLE_LEVELS: Record<string, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
}

export function requireMinRole(minRole: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role
    if (!userRole || (ROLE_LEVELS[userRole] ?? 0) < (ROLE_LEVELS[minRole] ?? 99)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' })
      return
    }
    next()
  }
}
