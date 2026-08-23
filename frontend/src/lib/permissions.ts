import type { Role } from '@/stores/auth-store'

const ROLE_LEVELS: Record<Role, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
}

export function hasMinRole(userRole: Role | undefined, minRole: Role): boolean {
  if (!userRole) return false
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[minRole]
}

export function canManageUsers(role: Role | undefined): boolean {
  return hasMinRole(role, 'admin')
}

export function canEditData(role: Role | undefined): boolean {
  return hasMinRole(role, 'editor')
}

export function canChangeSettings(role: Role | undefined): boolean {
  return hasMinRole(role, 'admin')
}

export function isOwner(role: Role | undefined): boolean {
  return role === 'owner'
}
