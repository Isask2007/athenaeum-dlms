import React, { useState } from 'react';
import { Check, ClipboardCheck, Clock3, CornerUpLeft, Plus, RotateCcw, Wallet } from 'lucide-react';
import { api, useApi } from '../../lib/api.js';
import { useToast } from '../../lib/toast.jsx';
import { formatDate, money, relativeDue } from '../../lib/format.js';
import { Badge, Button, Card, Field, Input, Modal, Select, Skeleton, Tabs } from '../../components/ui/index.jsx';

const TABS = [{ id: 'loans', label: 'Loans' }, { id: 'reservations', label: 'Reservations' }, { id: 'fines', label: 'Fines' }];

export default function CirculationPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState('loans');
  const [issueOpen, setIssueOpen] = useState(false);
  const [issue, setIssue] = useState({ user_id: '', resource_id: '', days: '14' });
  const [saving, setSaving] = useState(false);
  const loans = useApi('/circulation/loans', [tab]);
  const reservations = useApi('/circulation/reservations', [tab]);
  const fines = useApi('/circulation/fines', [tab]);
  const members = useApi('/circulation/members', [], { enabled: issueOpen });
  const catalog = useApi('/catalog?limit=60', [], { enabled: issueOpen });

  const action = async (path, message, refetch) => {
    try { await api.post(path); toast(message); refetch(); }
    catch (error) { toast(error.message, 'error'); }
  };
  const submitIssue = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      await api.post('/circulation/loans', { user_id: Number(issue.user_id), resource_id: Number(issue.resource_id), days: Number(issue.days) });
      toast('Loan issued at the circulation desk'); setIssueOpen(false); loans.refetch();
    } catch (error) { toast(error.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">Issue and return items, approve reservations and manage overdue fines.</p>
        <Button icon={Plus} onClick={() => setIssueOpen(true)}>Issue a loan</Button>
      </div>
      <Tabs tabs={TABS.map((t) => ({ ...t }))} value={tab} onChange={setTab} />

      <div className="mt-6">
        {tab === 'loans' && (loans.loading ? <Skeleton className="h-72 w-full" /> : <Card className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-paper-50 text-[11px] uppercase tracking-wider text-ink-500 dark:bg-ink-950"><tr>
              <th className="px-4 py-3">Resource</th><th className="px-4 py-3">Member</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-paper-200 dark:divide-ink-800">
              {(loans.data?.items || []).map((loan) => {
                const due = relativeDue(loan.due_at);
                return <tr key={loan.id} className="hover:bg-paper-50 dark:hover:bg-ink-950">
                  <td className="px-4 py-3"><p className="font-semibold text-ink-900 dark:text-white">{loan.title}</p><p className="text-xs capitalize text-ink-500">{loan.format}</p></td>
                  <td className="px-4 py-3"><p className="text-ink-800 dark:text-ink-100">{loan.user_name}</p><p className="text-xs text-ink-500">{loan.user_email}</p></td>
                  <td className="px-4 py-3"><p className="text-xs text-ink-700 dark:text-ink-200">{formatDate(loan.due_at)}</p><Badge tone={due.tone}>{loan.returned_at ? 'Returned' : due.label}</Badge></td>
                  <td className="px-4 py-3"><Badge tone={loan.status === 'overdue' ? 'rose' : loan.returned_at ? 'slate' : 'emerald'} dot>{loan.status}</Badge>{loan.fine_due > 0 && <p className="mt-1 text-xs font-semibold text-rose-600">{money(loan.fine_due)} fine</p>}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1">
                    {!loan.returned_at && <><Button size="sm" variant="outline" icon={CornerUpLeft} onClick={() => action(`/circulation/loans/${loan.id}/return`, 'Item returned', loans.refetch)}>Return</Button>
                      <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => action(`/circulation/loans/${loan.id}/renew`, 'Loan renewed', loans.refetch)} /><Button size="sm" variant="ghost" icon={Clock3} title="Extend 7 days" onClick={() => action(`/circulation/loans/${loan.id}/extend`, 'Deadline extended by 7 days', loans.refetch)} /></>}
                    {loan.fine_due > 0 && <Button size="sm" variant="ghost" icon={Wallet} className="text-gold-600" title="Waive fine" onClick={() => action(`/circulation/loans/${loan.id}/waive`, 'Fine waived', loans.refetch)} />}
                  </div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </Card>)}

        {tab === 'reservations' && (reservations.loading ? <Skeleton className="h-72 w-full" /> : <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-paper-50 text-[11px] uppercase tracking-wider text-ink-500 dark:bg-ink-950"><tr>
              <th className="px-4 py-3">Resource</th><th className="px-4 py-3">Member</th><th className="px-4 py-3">Reserved</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-paper-200 dark:divide-ink-800">
              {(reservations.data?.items || []).map((row) => <tr key={row.id} className="hover:bg-paper-50 dark:hover:bg-ink-950">
                <td className="px-4 py-3 font-semibold text-ink-900 dark:text-white">{row.title}</td>
                <td className="px-4 py-3"><p>{row.user_name}</p><p className="text-xs text-ink-500">{row.user_email}</p></td>
                <td className="px-4 py-3 text-xs text-ink-500">{formatDate(row.reserved_at)}</td>
                <td className="px-4 py-3"><Badge tone={row.status === 'approved' ? 'emerald' : row.status === 'pending' ? 'amber' : 'slate'} dot>{row.status}</Badge></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1">
                  {row.status === 'pending' && <Button size="sm" variant="outline" icon={Check} onClick={() => action(`/circulation/reservations/${row.id}/approve`, 'Reservation approved', reservations.refetch)}>Approve</Button>}
                  {row.status === 'approved' && <Button size="sm" icon={ClipboardCheck} onClick={() => action(`/circulation/reservations/${row.id}/fulfill`, 'Reservation fulfilled and loan created', () => { reservations.refetch(); loans.refetch(); })}>Fulfill</Button>}
                  {['pending', 'approved'].includes(row.status) && <Button size="sm" variant="ghost" onClick={() => action(`/circulation/reservations/${row.id}/cancel`, 'Reservation cancelled', reservations.refetch)}>Cancel</Button>}
                </div></td>
              </tr>)}
            </tbody>
          </table>
        </Card>)}

        {tab === 'fines' && (fines.loading ? <Skeleton className="h-72 w-full" /> : <Card className="overflow-x-auto">
          <div className="flex items-center justify-between border-b border-paper-200 p-4 dark:border-ink-800"><p className="text-sm font-semibold text-ink-900 dark:text-white">Outstanding & settled fines</p><Badge tone="emerald">{money(fines.data?.collected || 0)} collected</Badge></div>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-paper-50 text-[11px] uppercase tracking-wider text-ink-500 dark:bg-ink-950"><tr><th className="px-4 py-3">Resource</th><th className="px-4 py-3">Member</th><th className="px-4 py-3">Fine</th><th className="px-4 py-3">Returned</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-paper-200 dark:divide-ink-800">
              {(fines.data?.items || []).map((row) => <tr key={row.id}>
                <td className="px-4 py-3 font-semibold">{row.title}</td><td className="px-4 py-3">{row.user_name}</td>
                <td className="px-4 py-3"><span className="font-bold text-rose-600">{money(row.fine_due)}</span><span className="text-xs text-ink-400"> / {money(row.fine_amount)}</span></td>
                <td className="px-4 py-3 text-xs text-ink-500">{formatDate(row.returned_at)}</td>
                <td className="px-4 py-3 text-right">{row.fine_due > 0 && <Button size="sm" variant="outline" onClick={() => action(`/circulation/loans/${row.id}/waive`, 'Fine waived', fines.refetch)}>Waive</Button>}</td>
              </tr>)}
            </tbody>
          </table>
        </Card>)}
      </div>

      <Modal open={issueOpen} onClose={() => setIssueOpen(false)} title="Issue a loan" description="Check out a physical copy or open a digital license for a member." size="sm"
        footer={<><Button variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button><Button onClick={submitIssue} loading={saving}>Issue loan</Button></>}>
        <form onSubmit={submitIssue} className="space-y-4">
          <Field label="Member"><Select value={issue.user_id} onChange={(e) => setIssue({ ...issue, user_id: e.target.value })} required>
            <option value="">Select a member…</option>
            {(members.data?.items || []).map((member) => <option key={member.id} value={member.id}>{member.name} · {member.member_id || member.email}</option>)}
          </Select></Field>
          <Field label="Resource"><Select value={issue.resource_id} onChange={(e) => setIssue({ ...issue, resource_id: e.target.value })} required>
            <option value="">Select a resource…</option>
            {(catalog.data?.items || []).map((item) => <option key={item.id} value={item.id}>{item.title} · {item.format === 'physical' ? `${item.available_copies} available` : 'digital'}</option>)}
          </Select></Field>
          <Field label="Loan period (days)"><Input type="number" min="1" max="90" value={issue.days} onChange={(e) => setIssue({ ...issue, days: e.target.value })} /></Field>
        </form>
      </Modal>
    </div>
  );
}
