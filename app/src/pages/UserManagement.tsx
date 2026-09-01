import { useState } from 'react'
import { Plus, ShieldAlert, Trash2 } from 'lucide-react'
import { useStore } from '@/mock/store'
import type { Role, User } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, PageHeader } from '@/components/common'
import { useLang } from '@/lib/language-context'

type Draft = {
  id?: number
  name: string
  username: string
  password: string
  role: Role
  isActive: boolean
  categoryIds: number[]
  bhojanshalaIds: number[]
}

const EMPTY: Draft = {
  name: '', username: '', password: '', role: 'DATA_ENTRY', isActive: true,
  categoryIds: [], bhojanshalaIds: [],
}

/**
 * Scope is what makes the DATA_ENTRY role useful, so it's edited on the same
 * screen as the user — not buried elsewhere.
 */
export function UserManagement() {
  const { users, categories, bhojanshalas, saveUser, hardDeleteUser, currentUser } = useStore()
  const { pickName } = useLang()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const activeAdmins = users.filter((u) => u.role === 'ADMIN' && u.isActive)

  function edit(u: User) {
    setDraft({ ...u, password: '' })
    setError(null)
    setOpen(true)
  }

  function create() {
    setDraft(EMPTY)
    setError(null)
    setOpen(true)
  }

  function save() {
    // Guardrail: never leave the system without a way back in.
    if (draft.id) {
      const before = users.find((u) => u.id === draft.id)!
      const wasLastAdmin =
        before.role === 'ADMIN' && before.isActive && activeAdmins.length === 1
      const stillAdmin = draft.role === 'ADMIN' && draft.isActive
      if (wasLastAdmin && !stillAdmin) {
        setError(
          'This is the last active admin. Demoting or deactivating them would lock everyone out.',
        )
        return
      }
      if (draft.id === currentUser.id && (draft.role !== 'ADMIN' || !draft.isActive)) {
        setError('You cannot demote or deactivate yourself.')
        return
      }
    }

    if (!draft.name.trim() || !draft.username.trim()) {
      setError('Name and username are required.')
      return
    }

    if (!draft.id && draft.password.trim().length < 6) {
      setError('Password is required and must be at least 6 characters.')
      return
    }

    // Only send password if it was filled in
    const payload = draft.password.trim()
      ? draft
      : (({ password: _p, ...rest }) => rest)(draft)
    saveUser(payload as typeof draft)
    setOpen(false)
  }

  const toggle = (key: 'categoryIds' | 'bhojanshalaIds', id: number) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(id) ? d[key].filter((x) => x !== id) : [...d[key], id],
    }))

  return (
    <>
      <PageHeader
        titleG="યુઝર"
        titleE="User Management"
        titleH="उपयोगकर्ता"
        actions={
          <Button onClick={create}>
            <Plus className="h-4 w-4" />
            Add user
          </Button>
        }
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Categories</TableHead>
            <TableHead>Bhojanshalas</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="whitespace-nowrap font-medium">{u.name}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {u.username}
              </TableCell>
              <TableCell>
                <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>
                  {u.role === 'ADMIN' ? 'Admin' : 'Data Entry'}
                </Badge>
              </TableCell>
              <TableCell>
                {u.role === 'ADMIN' ? (
                  <span className="text-sm text-muted-foreground">All</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {u.categoryIds.map((id) => (
                      <Badge key={id} variant="muted">
                        <span>
                          {categories.find((c) => c.id === id) ? pickName(categories.find((c) => c.id === id)!) : ''}
                        </span>
                      </Badge>
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {u.role === 'ADMIN' ? (
                  <span className="text-sm text-muted-foreground">All</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {u.bhojanshalaIds.map((id) => (
                      <Badge key={id} variant="muted">
                        <span>
                          {bhojanshalas.find((b) => b.id === id) ? pickName(bhojanshalas.find((b) => b.id === id)!) : ''}
                        </span>
                      </Badge>
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={u.isActive ? 'success' : 'muted'}>
                  {u.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="outline" size="sm" onClick={() => edit(u)}>Edit</Button>
                  {u.id !== currentUser.id && (
                    <button
                      onClick={() => { setDeleteId(u.id); setDeleteError(null) }}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Delete user permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Edit user' : 'Add user'}</DialogTitle>
          </DialogHeader>

          {error && (
            <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <ShieldAlert className="mt-px h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <Field label="Username">
              <Input
                value={draft.username}
                onChange={(e) => setDraft({ ...draft, username: e.target.value })}
              />
            </Field>
            <Field label={draft.id ? 'New Password (leave blank to keep)' : 'Password'}>
              <Input
                type="password"
                value={draft.password}
                placeholder={draft.id ? 'Leave blank to keep current' : 'Min. 6 characters'}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              />
            </Field>
            <Field label="Role">
              <Select
                value={draft.role}
                onValueChange={(v) => setDraft({ ...draft, role: v as Role })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="DATA_ENTRY">Data Entry</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={draft.isActive ? '1' : '0'}
                onValueChange={(v) => setDraft({ ...draft, isActive: v === '1' })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Scope only applies to data-entry users — an admin sees everything. */}
          {draft.role === 'DATA_ENTRY' && (
            <>
              <div>
                <p className="mb-2 text-sm font-medium">Item categories they may enter</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {categories.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border p-2.5 hover:bg-accent"
                    >
                      <Checkbox
                        checked={draft.categoryIds.includes(c.id)}
                        onCheckedChange={() => toggle('categoryIds', c.id)}
                      />
                      <span>{pickName(c)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Bhojanshalas they may enter for</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {bhojanshalas.map((b) => (
                    <label
                      key={b.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border p-2.5 hover:bg-accent"
                    >
                      <Checkbox
                        checked={draft.bhojanshalaIds.includes(b.id)}
                        onCheckedChange={() => toggle('bhojanshalaIds', b.id)}
                      />
                      <span>{pickName(b)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{draft.id ? 'Save changes' : 'Create user'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent delete confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => { if (!o) { setDeleteId(null); setDeleteError(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently delete user?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong className="text-foreground">This cannot be undone.</strong> The user account will be removed from the database.</p>
            <p className="flex items-start gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
              ✓ All transactions, meal counts, menus and sevas they entered will <strong>remain intact</strong> — only the account is deleted.
            </p>
          </div>
          {deleteError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <ShieldAlert className="mt-px h-4 w-4 shrink-0" />
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteId(null); setDeleteError(null) }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteBusy}
              onClick={async () => {
                if (deleteId === null) return
                setDeleteBusy(true)
                setDeleteError(null)
                try {
                  await hardDeleteUser(deleteId)
                  setDeleteId(null)
                } catch (e: unknown) {
                  setDeleteError(e instanceof Error ? e.message : 'Delete failed')
                } finally {
                  setDeleteBusy(false)
                }
              }}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
