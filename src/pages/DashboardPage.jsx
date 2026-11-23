import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookMarked, BookOpen, CalendarClock, Clock3, CreditCard, ExternalLink, LibraryBig, Plus, RefreshCw, RotateCcw, Search, Trash2, Wallet } from 'lucide-react';
import { api, useApi } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../lib/toast.jsx';
import { formatDate, money, relativeDue } from '../lib/format.js';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Skeleton, StatCard, Tabs, Textarea } from '../components/ui/index.jsx';

const TABS = [
  { id: 'loans', label: 'My loans & digital shelf' },
  { id: 'saved', label: 'Saved items' },
  { id: 'reservations', label: 'Reservations' },
  { id: 'requests', label: 'Requests' },
];

function LoanCard({ loan, onRefresh }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const due = relativeDue(loan.due_at);
  const fine = loan.fine_due;

  const act = async (path, message) => {
    setBusy(true);
    try { await api.post(path); toast(message); onRefresh(); }
    catch (error) { toast(error.message, 'error'); }
    finally { setBusy(false); }
  };

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <img src={loan.resource?.cover_url} alt="" className="h-24 w-16 shrink-0 self-center rounded-lg object-cover shadow-md sm:self-start" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={loan.format === 'physical' ? 'navy' : 'violet'}>{loan.format === 'physical' ? 'Physical' : 'Digital'}</Badge>
          {loan.status === 'overdue' && <Badge tone="rose" dot>Overdue</Badge>}
          {fine > 0 && <Badge tone="amber">{money(fine)} fine</Badge>}
        </div>
        <h3 className="mt-2 font-display text-lg font-bold text-ink-900 dark:text-white">{loan.resource?.title}</h3>
        <p className="text-xs text-ink-500">{Array.isArray(loan.resource?.authors) && loan.resource.authors.length ? loan.resource.authors.join(', ') : 'Unknown author'}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1"><CalendarClock size={13} /> Due {formatDate(loan.due_at)}</span>
          <span className="inline-flex items-center gap-1"><Clock3 size={13} /> Borrowed {formatDate(loan.issued_at)}</span>
          {loan.digital_expires_at && <span className="inline-flex items-center gap-1"><RefreshCw size={13} /> License until {formatDate(loan.digital_expires_at)}</span>}
          {loan.renewed_count > 0 && <span>Renewed {loan.renewed_count}×</span>}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Badge tone={due.tone}>{due.label}</Badge>
        {loan.format !== 'physical' && <Link to={`/reader/${loan.resource_id}`}><Button size="sm" icon={ExternalLink}>Read</Button></Link>}
        {loan.format === 'physical' && !loan.returned_at && <Button size="sm" variant="outline" icon={RotateCcw} loading={busy} onClick={() => act(`/member/loans/${loan.id}/renew`, 'Loan renewed by 14 days')}>Renew</Button>}
        {fine > 0 && <Button size="sm" variant="gold" icon={Wallet} loading={busy} onClick={() => act(`/member/loans/${loan.id}/pay`, 'Fine paid — thank you')}>Pay {money(fine)}</Button>}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'loans';
  const overview = useApi('/member/overview');
  const loans = useApi('/member/loans', [tab]);
  const bookmarks = useApi('/member/bookmarks', [tab]);
  const reservations = useApi('/member/reservations', [tab]);
  const requests = useApi('/member/requests', [tab]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ title: '', author: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const refreshAll = () => { overview.refetch(); loans.refetch(); bookmarks.refetch(); reservations.refetch(); };

  useEffect(() => {
    if (params.get('tab') && !TABS.some((t) => t.id === params.get('tab'))) setParams({ tab: 'loans' }, { replace: true });
  }, [params]);

  const submitRequest = async (event) => {
    event.preventDefault(); setSubmitting(true);
    try {
      await api.post('/member/requests', requestForm);
      toast('Request submitted', 'The library team will review it shortly.');
      setRequestOpen(false); setRequestForm({ title: '', author: '', note: '' }); requests.refetch();
    } catch (error) { toast(error.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const cancelReservation = async (id) => {
    try { await api.delete(`/member/reservations/${id}`); toast('Reservation cancelled'); reservations.refetch(); }
    catch (error) { toast(error.message, 'error'); }
  };

  const removeBookmark = async (id) => {
    try { await api.post(`/member/bookmarks/${id}`); toast('Removed from saved items'); bookmarks.refetch(); }
    catch (error) { toast(error.message, 'error'); }
  };

  const stats = overview.data?.stats || {};

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-600">Member workspace</p>
          <h1 className="mt-1.5 font-display text-3xl font-bold text-ink-900 dark:text-white">Good day, {user?.name?.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-ink-500">Here's what's happening with your library account.</p>
        </div>
        <Link to="/catalog"><Button icon={Search}>Find a resource</Button></Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active borrows" value={stats.active_borrows ?? 0} icon={BookOpen} loading={overview.loading} hint="Physical and digital" />
        <StatCard label="Due soon" value={stats.due_soon ?? 0} icon={CalendarClock} tone="amber" loading={overview.loading} hint="Within the next 7 days" />
        <StatCard label="Reservations" value={stats.reservations ?? 0} icon={BookMarked} tone="emerald" loading={overview.loading} hint="Pending and approved" />
        <StatCard label="Pending fines" value={money(stats.pending_fines ?? 0)} icon={CreditCard} tone="rose" loading={overview.loading} hint="Pay online any time" />
      </div>

      {overview.data?.digital_shelf?.length > 0 && <Card className="mt-5 border-gold-500/30 bg-gradient-to-r from-gold-500/5 to-transparent p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-xl bg-gold-500/15 p-3 text-gold-600"><LibraryBig size={20} /></div>
          <div className="mr-auto"><p className="text-sm font-bold text-ink-900 dark:text-white">Your digital shelf is ready</p><p className="text-xs text-ink-500">{overview.data.digital_shelf.length} e-book{overview.data.digital_shelf.length === 1 ? '' : 's'} available to read right now.</p></div>
          <Link to={`/reader/${overview.data.digital_shelf[0].resource_id}`}><Button size="sm" icon={ExternalLink}>Continue reading</Button></Link>
        </div>
      </Card>}

      <div className="mt-8">
        <Tabs tabs={TABS.map((t) => ({ ...t }))} value={tab} onChange={(id) => setParams({ tab: id })} />
      </div>

      <div className="mt-6">
        {tab === 'loans' && (loans.loading ? <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
          : loans.data?.items?.length ? <div className="space-y-3">{loans.data.items.map((loan) => <LoanCard key={loan.id} loan={loan} onRefresh={() => { loans.refetch(); overview.refetch(); }} />)}</div>
            : <EmptyState icon={BookOpen} title="No loans yet" description="Browse the catalog and borrow your first resource." action={<Link to="/catalog"><Button>Explore catalog</Button></Link>} />)}

        {tab === 'saved' && (bookmarks.loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 w-full" />)}</div>
          : bookmarks.data?.items?.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {bookmarks.data.items.map((item) => <Card key={item.id} className="flex items-center gap-4 p-4">
              <img src={item.cover_url} alt="" className="h-24 w-16 rounded-lg object-cover" />
              <div className="min-w-0 flex-1"><h3 className="truncate font-display font-bold text-ink-900 dark:text-white">{item.title}</h3><p className="truncate text-xs text-ink-500">{item.authors.join(', ')}</p>
                <div className="mt-2 flex gap-2"><Link to={`/item/${item.id}`}><Button size="sm" variant="outline">Details</Button></Link><Button size="sm" variant="ghost" icon={Trash2} onClick={() => removeBookmark(item.id)} /></div>
              </div>
            </Card>)}
          </div> : <EmptyState icon={BookMarked} title="Nothing saved yet" description="Use the bookmark icon on any catalog item to keep it here." action={<Link to="/catalog"><Button>Browse catalog</Button></Link>} />)}

        {tab === 'reservations' && (reservations.loading ? <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          : reservations.data?.items?.length ? <div className="space-y-3">{reservations.data.items.map((row) => (
            <Card key={row.id} className="flex flex-wrap items-center gap-4 p-4">
              <img src={row.cover_url} alt="" className="h-20 w-14 rounded-lg object-cover" />
              <div className="min-w-0 flex-1"><h3 className="font-display font-bold text-ink-900 dark:text-white">{row.title}</h3><p className="text-xs text-ink-500">Reserved {formatDate(row.reserved_at)}{row.expires_at ? ` · holds until ${formatDate(row.expires_at)}` : ''}</p></div>
              <Badge tone={row.status === 'approved' ? 'emerald' : row.status === 'cancelled' ? 'slate' : 'amber'} dot>{row.status}</Badge>
              {['pending', 'approved'].includes(row.status) && <Button size="sm" variant="outline" onClick={() => cancelReservation(row.id)}>Cancel</Button>}
            </Card>
          ))}</div> : <EmptyState icon={Clock3} title="No reservations" description="If a book is on loan, join the waitlist to be notified when it's back." />)}

        {tab === 'requests' && <div>
          <div className="mb-4 flex justify-end"><Button icon={Plus} onClick={() => setRequestOpen(true)}>Request a book</Button></div>
          {requests.loading ? <Skeleton className="h-32 w-full" /> : requests.data?.items?.length ? <div className="space-y-3">
            {requests.data.items.map((row) => <Card key={row.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1"><h3 className="font-bold text-ink-900 dark:text-white">{row.title}</h3><p className="text-xs text-ink-500">{row.author || 'Author unknown'} · requested {formatDate(row.created_at)}</p>
                {row.note && <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{row.note}</p>}</div>
              <Badge tone={row.status === 'approved' ? 'emerald' : row.status === 'declined' ? 'rose' : 'amber'}>{row.status}</Badge>
            </Card>)}
          </div> : <EmptyState icon={LibraryBig} title="No requests yet" description="Can't find something? Tell us what you need and we'll consider adding it." />}
        </div>}
      </div>

      <Modal open={requestOpen} onClose={() => setRequestOpen(false)} title="Request a resource" description="Suggest a book, paper or media item for the library." size="sm"
        footer={<><Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button><Button onClick={submitRequest} loading={submitting}>Submit request</Button></>}>
        <form onSubmit={submitRequest} className="space-y-4">
          <Field label="Title" error=""><Input value={requestForm.title} onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })} placeholder="What are you looking for?" required /></Field>
          <Field label="Author / Editor"><Input value={requestForm.author} onChange={(e) => setRequestForm({ ...requestForm, author: e.target.value })} placeholder="Optional" /></Field>
          <Field label="Why do you need it?"><Textarea value={requestForm.note} onChange={(e) => setRequestForm({ ...requestForm, note: e.target.value })} placeholder="Course, project or research context…" /></Field>
        </form>
      </Modal>
    </div>
  );
}
