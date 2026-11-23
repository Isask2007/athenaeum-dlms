import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, Check, Clock, Copy, Download, ExternalLink, MapPin, Quote, ShieldCheck, UserRound } from 'lucide-react';
import { api, useApi } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../lib/toast.jsx';
import { availability, formatDate, FORMAT_LABELS } from '../lib/format.js';
import { AvailabilityBadge, FormatBadge, ResourceGrid } from '../components/catalog/index.jsx';
import { Badge, Button, Card, EmptyState, Field, Modal, Skeleton, Textarea } from '../components/ui/index.jsx';

function CitationModal({ item, open, onClose }) {
  const [style, setStyle] = useState('apa');
  const [citation, setCitation] = useState('');
  const { toast } = useToast();
  useEffect(() => {
    if (open) api.get(`/catalog/${item.id}/citation`, { params: { style } }).then((d) => setCitation(d.citation));
  }, [open, style, item.id]);
  return (
    <Modal open={open} onClose={onClose} title="Cite this resource" size="sm"
      footer={<Button icon={Copy} onClick={async () => { await navigator.clipboard.writeText(citation); toast('Citation copied'); }}>Copy</Button>}>
      <div className="mb-4 flex gap-2">
        {[['apa', 'APA 7th'], ['mla', 'MLA 9th'], ['ieee', 'IEEE']].map(([id, label]) => (
          <button key={id} onClick={() => setStyle(id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${style === id ? 'bg-ink-900 text-white dark:bg-gold-500 dark:text-ink-950' : 'bg-paper-200 text-ink-600 dark:bg-ink-800'}`}>{label}</button>
        ))}
      </div>
      <div className="rounded-xl border border-paper-300 bg-paper-50 p-4 font-display text-sm leading-relaxed dark:border-ink-700 dark:bg-ink-950">{citation || 'Generating…'}</div>
    </Modal>
  );
}

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { data, loading, error } = useApi(`/catalog/${id}`);
  const { data: bookmarkData } = useApi('/member/bookmarks', [], { enabled: isAuthenticated });
  const [bookmarked, setBookmarked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [citeOpen, setCiteOpen] = useState(false);
  useEffect(() => {
    if (bookmarkData?.items) setBookmarked(bookmarkData.items.some((item) => String(item.id) === String(id)));
  }, [bookmarkData, id]);

  const item = data?.item;
  const digital = item?.format !== 'physical';
  const available = digital || item?.available_copies > 0;

  const toggleBookmark = async () => {
    if (!isAuthenticated) { toast('Sign in to save resources.', 'info'); return navigate('/login'); }
    try {
      const result = await api.post(`/member/bookmarks/${id}`);
      setBookmarked(result.bookmarked);
      toast(result.bookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks');
    } catch (err) { toast(err.message, 'error'); }
  };

  const act = async () => {
    if (digital) return navigate(`/reader/${id}`);
    if (!isAuthenticated) { toast('Sign in to borrow from the library.', 'info'); return navigate('/login'); }
    setBusy(true);
    try {
      if (available) {
        await api.post('/member/loans', { resource_id: Number(id) });
        toast('Borrowed successfully', 'Find it in your dashboard · due in 14 days');
      } else {
        await api.post('/member/reservations', { resource_id: Number(id) });
        toast('Reservation placed', 'We will notify you when a copy is ready.');
      }
      navigate('/dashboard');
    } catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><div className="grid gap-8 lg:grid-cols-[300px_1fr]"><Skeleton className="aspect-[3/4] w-full" /><div className="space-y-4"><Skeleton className="h-5 w-40" /><Skeleton className="h-10 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-28 w-full" /></div></div></div>;
  if (error || !item) return <div className="mx-auto max-w-3xl px-4 py-16"><EmptyState title="Resource unavailable" description={error?.message || 'This item is no longer in the catalog.'} action={<Link to="/catalog"><Button>Back to catalog</Button></Link>} /></div>;

  const metadata = [
    [FORMAT_LABELS[item.format], item.format],
    ['Published', `${item.publisher || '—'} · ${item.publication_year}`],
    ['Edition', item.edition],
    ['Language', item.language],
    ['Category', item.category],
    ['Department', item.department],
    [item.isbn ? 'ISBN' : 'ISSN', item.isbn || item.issn || '—'],
    ['Added to catalog', formatDate(item.created_at)],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link to="/catalog" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900 dark:hover:text-white"><ArrowLeft size={15} /> Back to catalog</Link>
      <div className="grid gap-8 lg:grid-cols-[290px_1fr]">
        <div>
          <div className="overflow-hidden rounded-2xl border border-paper-300 bg-white shadow-lift dark:border-ink-800 dark:bg-ink-900">
            <img src={item.cover_url} alt={`${item.title} cover`} className="aspect-[3/4] w-full object-cover" />
          </div>
          <Card className="mt-4 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-500">Availability</p>
            <AvailabilityBadge item={item} />
            <div className="mt-4 space-y-2">
              <Button className="w-full" onClick={act} loading={busy}>
                {digital ? 'Read online' : available ? 'Borrow this book' : 'Join the waitlist'}
              </Button>
              <Button variant="outline" className="w-full" icon={bookmarked ? Check : Bookmark} onClick={toggleBookmark}>{bookmarked ? 'Saved' : 'Save for later'}</Button>
              <Button variant="ghost" className="w-full" icon={Quote} onClick={() => setCiteOpen(true)}>Generate citation</Button>
            </div>
          </Card>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2"><FormatBadge format={item.format} /><Badge tone="slate">{item.category}</Badge>{digital && <Badge tone="emerald" dot>Instant access</Badge>}</div>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-ink-900 dark:text-white sm:text-4xl">{item.title}</h1>
          {item.subtitle && <p className="mt-1 font-display text-lg italic text-ink-500">{item.subtitle}</p>}
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300"><UserRound size={15} className="text-ink-400" />{item.authors.join(', ')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.tags.map((tag) => <Link key={tag} to={`/catalog?search=${encodeURIComponent(tag)}`} className="rounded-full bg-ink-900/5 px-2.5 py-1 text-[11px] font-semibold text-ink-600 hover:bg-ink-900/10 dark:bg-white/10 dark:text-ink-300">#{tag}</Link>)}
          </div>

          <Card className="mt-7 p-5 sm:p-6">
            <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">About this resource</h2>
            <p className="mt-3 text-sm leading-7 text-ink-600 dark:text-ink-300">{item.description || item.abstract}</p>
            {item.abstract && item.abstract !== item.description && <>
              <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-ink-500">Abstract</h3>
              <p className="mt-2 text-sm leading-7 text-ink-600 dark:text-ink-300">{item.abstract}</p>
            </>}
          </Card>

          <Card className="mt-4 p-5 sm:p-6">
            <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">Catalog details</h2>
            <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {metadata.map(([label, value]) => <div key={label} className="border-b border-paper-200 pb-3 dark:border-ink-800">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">{label}</p>
                <p className="mt-1 text-sm font-medium text-ink-800 dark:text-ink-100">{value}</p>
              </div>)}
            </div>
            {!digital && item.shelf_location && <div className="mt-5 flex items-start gap-3 rounded-xl bg-paper-100 p-3.5 dark:bg-ink-950">
              <MapPin size={17} className="mt-0.5 text-gold-600" />
              <div><p className="text-xs font-bold text-ink-800 dark:text-ink-100">Shelf location</p><p className="font-mono text-sm text-ink-600 dark:text-ink-300">{item.shelf_location}</p></div>
            </div>}
            {digital && <div className="mt-5 flex items-start gap-3 rounded-xl bg-emerald-50 p-3.5 dark:bg-emerald-500/10">
              <ShieldCheck size={17} className="mt-0.5 text-emerald-600" />
              <div><p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">License & access</p><p className="text-sm text-emerald-700 dark:text-emerald-300/80">{item.license_info || 'Available to authenticated readers.'}</p></div>
            </div>}
          </Card>

          {digital && <Card className="mt-4 flex flex-wrap items-center gap-4 p-5">
            <div className="rounded-xl bg-ink-900/5 p-3 text-ink-800 dark:bg-gold-500/10 dark:text-gold-400"><Clock size={20} /></div>
            <div className="mr-auto"><p className="text-sm font-bold text-ink-900 dark:text-white">Read it now</p><p className="text-xs text-ink-500">{item.page_count || 8} pages · bookmark and cite as you read</p></div>
            <Button icon={ExternalLink} onClick={() => navigate(`/reader/${id}`)}>Open reader</Button>
            {item.file_url && <a href={item.file_url} download className="rounded-lg p-2 text-ink-500 hover:bg-paper-100" title="Download"><Download size={18} /></a>}
          </Card>}
        </div>
      </div>

      {data?.related?.length > 0 && <section className="mt-14">
        <h2 className="mb-5 font-display text-2xl font-bold text-ink-900 dark:text-white">More in {item.category}</h2>
        <ResourceGrid items={data.related} skeletonCount={4} />
      </section>}

      <CitationModal item={item} open={citeOpen} onClose={() => setCiteOpen(false)} />
    </div>
  );
}
