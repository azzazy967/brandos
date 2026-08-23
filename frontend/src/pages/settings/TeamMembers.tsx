import { useState, useEffect, useCallback } from 'react'
import { Users, UserPlus, Shield, Pencil, Trash2 } from 'lucide-react'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { useAuthStore } from '@/stores/auth-store'
import { isOwner } from '@/lib/permissions'
import { formatDate } from '@/lib/utils'

interface TeamMember {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
]

/* ── Avatar helpers (module-level to avoid re-creation each render) ── */
const AVATAR_COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-pink-600',
]
const hashColor = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
const getInitials = (name: string | null, email: string) => {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
  }
  return email[0].toUpperCase()
}

export default function TeamMembers() {
  const { user: currentUser } = useAuthStore()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [showRoleEdit, setShowRoleEdit] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'editor', password: '' })
  const [newRole, setNewRole] = useState('')

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<TeamMember[]>('/users')
      setMembers(data ?? [])
    } catch { toast.error('Failed to load team members') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteForm.email || !inviteForm.name || !inviteForm.password) {
      toast.error('All fields are required'); return
    }
    setSubmitting(true)
    try {
      await api.post('/users/invite', inviteForm)
      toast.success('Team member invited')
      setShowInvite(false)
      setInviteForm({ email: '', name: '', role: 'editor', password: '' })
      fetchMembers()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to invite') }
    finally { setSubmitting(false) }
  }

  const openRoleEdit = (member: TeamMember) => {
    setEditingMember(member)
    setNewRole(member.role)
    setShowRoleEdit(true)
  }

  const handleRoleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return
    setSubmitting(true)
    try {
      await api.put(`/users/${editingMember.id}/role`, { role: newRole })
      toast.success('Role updated')
      setShowRoleEdit(false)
      fetchMembers()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to update role') }
    finally { setSubmitting(false) }
  }

  const handleRemove = async (member: TeamMember) => {
    if (!confirm(`Remove ${member.name ?? member.email} from the team?`)) return
    try {
      await api.del(`/users/${member.id}`)
      toast.success('Team member removed')
      fetchMembers()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to remove') }
  }

  const canActOn = (member: TeamMember): boolean => {
    if (member.role === 'owner') return false
    if (member.id === currentUser?.id) return false
    if (!isOwner(currentUser?.role) && member.role === 'admin') return false
    return true
  }

  const columns: ColumnDef<TeamMember>[] = [
    {
      key: 'name', header: 'Member',
      render: m => (
        <div className="flex items-center gap-3">
          <div className={`${hashColor(m.email)} w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>
            {getInitials(m.name, m.email)}
          </div>
          <div>
            <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{m.name ?? '—'}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{m.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role', header: 'Role',
      render: m => <StatusBadge status={m.role} />,
    },
    {
      key: 'createdAt', header: 'Joined',
      render: m => <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(m.createdAt)}</span>,
    },
    {
      key: 'actions', header: '', sortable: false,
      render: m => {
        if (!canActOn(m)) return null
        return (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <button onClick={() => openRoleEdit(m)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={() => handleRemove(m)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Team Members</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage who has access to your brand</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="gap-2">
          <UserPlus size={16} />
          Invite Member
        </Button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield size={20} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-semibold mb-1">Role Permissions</p>
            <ul className="space-y-0.5 text-blue-700 dark:text-blue-400">
              <li><strong>Owner</strong> — Full access, manages team & billing</li>
              <li><strong>Admin</strong> — Full access, manages team (can't remove owner)</li>
              <li><strong>Editor</strong> — Create & edit data, no user management or settings</li>
              <li><strong>Viewer</strong> — Read-only access to all modules</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Member count summary */}
      {members.length > 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {members.length} member{members.length !== 1 ? 's' : ''}
          {(() => {
            const counts: Record<string, number> = {}
            members.forEach(m => { counts[m.role] = (counts[m.role] ?? 0) + 1 })
            const parts = Object.entries(counts).map(([role, n]) => `${n} ${role}${n !== 1 ? 's' : ''}`)
            return parts.length ? ` (${parts.join(', ')})` : ''
          })()}
        </p>
      )}

      <DataTable
        data={members}
        columns={columns}
        loading={loading}
        emptyTitle="No team members"
        emptyDescription="Invite your first team member to start collaborating."
      />

      {/* Invite Modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite Team Member">
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Full Name"
            value={inviteForm.name}
            onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Sarah Ahmed"
            required
          />
          <Input
            label="Email"
            type="email"
            value={inviteForm.email}
            onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
            placeholder="e.g. sarah@brand.com"
            required
          />
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={inviteForm.role}
            onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
          />
          <Input
            label="Temporary Password"
            type="password"
            value={inviteForm.password}
            onChange={e => setInviteForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Min 8 characters"
            required
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowInvite(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={submitting} className="flex-1">Invite</Button>
          </div>
        </form>
      </Modal>

      {/* Change Role Modal */}
      <Modal open={showRoleEdit} onClose={() => setShowRoleEdit(false)} title="Change Role">
        <form onSubmit={handleRoleUpdate} className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Changing role for <strong>{editingMember?.name ?? editingMember?.email}</strong>
          </p>
          <Select
            label="New Role"
            options={ROLE_OPTIONS}
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowRoleEdit(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={submitting} className="flex-1">Update Role</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
