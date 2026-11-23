import React, { useState } from 'react';
import { Search, UserCheck, UserX } from 'lucide-react';
import { api, useApi } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useToast } from '../../lib/toast.jsx';
import { formatDate, initials } from '../../lib/format.js';
import { Badge, Button, Card, EmptyState, Input, Select, Skeleton } from '../../components/ui/index.jsx';

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const users = useApi(`/admin/users?search=${encodeURIComponent(query)}&role=${role}`, [query, role], { enabled: isAdmin });

  if (!isAdmin) return <EmptyState title="Administrator access required" description="Only administrators can manage users and view audit records." />;

  const update = async (id, patch, message) => {
    try { await api.patch(`/admin/users/${id}`, patch); toast(message); users.refetch(); }
    catch (error) { toast(error.message, 'error'); }
  };

  return (
    <div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-paper-200 p-4 dark:border-ink-800">
          <div className="relative min-w-56 flex-1"><Search size={16} className="absolute left-3 top-3 text-ink-400" />
            <Input className="pl-9" placeholder="Search name, email or member ID…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setQuery(search); }} /></div>
          <Button variant="outline" onClick={() => setQuery(search)}>Search</Button>
          <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-auto text-xs">
            <option value="">All roles</option><option value="admin">Admin</option><option value="librarian">Librarian</option><option value="member">Member</option>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-paper-50 text-[11px] uppercase tracking-wider text-ink-500 dark:bg-ink-950"><tr>
              <th className="px-4 py-3">Member</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-paper-200 dark:divide-ink-800">
              {users.loading ? <tr><td colSpan={6} className="p-4"><Skeleton className="h-64 w-full" /></td></tr>
                : users.data?.items?.map((user) => <tr key={user.id} className="hover:bg-paper-50 dark:hover:bg-ink-950">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-gold-400 dark:bg-gold-500 dark:text-ink-950">{initials(user.name)}</span>
                    <div><p className="font-semibold text-ink-900 dark:text-white">{user.name}</p><p className="text-xs text-ink-500">{user.email} · {user.member_id}</p></div></div></td>
                  <td className="px-4 py-3"><Select value={user.role} onChange={(e) => update(user.id, { role: e.target.value }, 'Role updated')} className="h-8 w-auto text-xs">
                    <option value="member">Member</option><option value="librarian">Librarian</option><option value="admin">Admin</option>
                  </Select></td>
                  <td className="px-4 py-3"><Badge tone={user.status === 'active' ? 'emerald' : user.status === 'pending' ? 'amber' : 'rose'} dot>{user.status}</Badge></td>
                  <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{user.department}</td>
                  <td className="px-4 py-3 text-xs text-ink-500">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1">
                    {user.status === 'pending' && <Button size="sm" variant="outline" icon={UserCheck} onClick={() => update(user.id, { status: 'active' }, 'Member approved')}>Approve</Button>}
                    {user.status === 'suspended' && <Button size="sm" variant="outline" icon={UserCheck} onClick={() => update(user.id, { status: 'active' }, 'Member reinstated')}>Reinstate</Button>}
                    {user.status === 'active' && <Button size="sm" variant="ghost" icon={UserX} className="text-rose-600" onClick={() => update(user.id, { status: 'suspended' }, 'Member suspended')}>Suspend</Button>}
                  </div></td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
