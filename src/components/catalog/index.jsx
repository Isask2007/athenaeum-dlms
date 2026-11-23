import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Bookmark, Check, Eye, Filter, Grid2X2, Headphones, LibraryBig, List, Search, SlidersHorizontal, X } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useToast } from '../../lib/toast.jsx';
import { availability, formatDate, FORMAT_LABELS, FORMAT_SHORT } from '../../lib/format.js';
import { Badge, Button, EmptyState, Skeleton, cn } from '../ui/index.jsx';

export function FormatBadge({ format, short = false }) {
  const tones = { physical: 'navy', ebook: 'violet', research_paper: 'emerald', audio_video: 'amber' };
  const Icon = format === 'audio_video' ? Headphones : format === 'research_paper' ? LibraryBig : BookOpen;
  return <Badge tone={tones[format] || 'slate'}><Icon size={12} />{short ? FORMAT_SHORT[format] : FORMAT_LABELS[format]}</Badge>;
}

export function AvailabilityBadge({ item }) {
  const state = availability(item);
  return <Badge tone={state.tone} dot>{state.label}</Badge>;
}

export function SearchBar({ initial = '', compact = false, autoFocus = false, className }) {
  const [value, setValue] = useState(initial);
  const navigate = useNavigate();
  useEffect(() => setValue(initial), [initial]);
  const submit = (event) => {
    event.preventDefault();
    navigate(value.trim() ? `/catalog?search=${encodeURIComponent(value.trim())}` : '/catalog');
  };
  return (
    <form onSubmit={submit} className={cn('flex w-full items-center gap-2 rounded-xl border border-paper-300 bg-white p-1.5 pl-4 shadow-soft focus-within:border-ink-400 dark:border-ink-700 dark:bg-ink-900', compact && 'pl-3 shadow-none', className)}>
      <Search size={compact ? 17 : 20} className="shrink-0 text-ink-400" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus={autoFocus}
        placeholder="Search title, author, ISBN, subject or tag…"
        aria-label="Search the catalog"
        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink-900 outline-none placeholder:text-ink-400 dark:text-white"
      />
      <Button type="submit" size={compact ? 'sm' : 'md'} className="rounded-lg">Search</Button>
    </form>
  );
}

export function ResourceCard({ item, view = 'grid', bookmarked: initialBookmarked = false }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [busy, setBusy] = useState(false);
  const digital = item.format !== 'physical';
  const available = digital || item.available_copies > 0;

  const requireLogin = () => { toast('Please sign in to use this feature.', 'info'); navigate('/login'); return false; };

  const toggleBookmark = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) return requireLogin();
    try {
      const data = await api.post(`/member/bookmarks/${item.id}`);
      setBookmarked(data.bookmarked);
      toast(data.bookmarked ? 'Saved to your bookmarks' : 'Removed from bookmarks');
    } catch (error) { toast(error.message, 'error'); }
  };

  const primaryAction = async (event) => {
    event.preventDefault();
    if (digital) return navigate(`/reader/${item.id}`);
    if (!isAuthenticated) return requireLogin();
    setBusy(true);
    try {
      if (available) {
        await api.post('/member/loans', { resource_id: item.id });
        toast('Borrowed successfully', `Due in 14 days · ${item.title}`);
      } else {
        await api.post('/member/reservations', { resource_id: item.id });
        toast('Reservation placed', 'We will notify you when a copy is ready.');
      }
      navigate('/dashboard');
    } catch (error) { toast(error.message, 'error'); }
    finally { setBusy(false); }
  };

  if (view === 'list') {
    return (
      <Link to={`/item/${item.id}`} className="group flex flex-col gap-4 rounded-xl border border-paper-300 bg-white p-3 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift dark:border-ink-800 dark:bg-ink-900 sm:flex-row">
        <img src={item.cover_url} alt="" className="h-36 w-24 shrink-0 self-center rounded-lg object-cover shadow-md sm:self-start" loading="lazy" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><FormatBadge format={item.format} /><AvailabilityBadge item={item} /></div>
          <h3 className="mt-2 font-display text-lg font-bold text-ink-900 group-hover:text-gold-600 dark:text-white">{item.title}</h3>
          <p className="text-sm text-ink-500">{item.authors.join(', ')}</p>
          <p className="mt-2 line-clamp-2 text-sm text-ink-600 dark:text-ink-300">{item.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-500">
            <span>{item.publication_year}</span><span>·</span><span>{item.category}</span><span>·</span>
            <span className="inline-flex items-center gap-1"><Eye size={12} />{item.views}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
          <Button size="sm" onClick={primaryAction} loading={busy}>{digital ? 'Read online' : available ? 'Borrow' : 'Reserve'}</Button>
          <Button size="sm" variant="outline" onClick={toggleBookmark} icon={bookmarked ? Check : Bookmark}>
            {bookmarked ? 'Saved' : 'Save'}
          </Button>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/item/${item.id}`} className="group flex h-full flex-col overflow-hidden rounded-xl border border-paper-300 bg-white shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-lift dark:border-ink-800 dark:bg-ink-900">
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-100 dark:bg-ink-800">
        <img src={item.cover_url} alt={`${item.title} cover`} loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute left-3 top-3"><FormatBadge format={item.format} short /></div>
        <button onClick={toggleBookmark} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
          className={cn('absolute right-3 top-3 rounded-full bg-white/95 p-2 shadow-md transition-colors dark:bg-ink-900/90', bookmarked ? 'text-gold-600' : 'text-ink-500 hover:text-ink-900')}>
          <Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2"><AvailabilityBadge item={item} /></div>
        <h3 className="line-clamp-2 font-display text-[17px] font-bold leading-snug text-ink-900 group-hover:text-gold-600 dark:text-white">{item.title}</h3>
        <p className="mt-1 line-clamp-1 text-xs text-ink-500">{item.authors.join(', ')}</p>
        <div className="mt-auto pt-4">
          <div className="mb-3 flex items-center justify-between text-[11px] text-ink-500">
            <span>{item.category}</span><span>{item.publication_year}</span>
          </div>
          <Button size="sm" className="w-full" onClick={primaryAction} loading={busy}>
            {digital ? 'Read online' : available ? 'Borrow now' : 'Join waitlist'}
          </Button>
        </div>
      </div>
    </Link>
  );
}

export function ResourceGrid({ items, view = 'grid', loading = false, skeletonCount = 8 }) {
  if (loading) return (
    <div className={cn(view === 'grid' ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'space-y-3')}>
      {Array.from({ length: skeletonCount }, (_, i) => (
        <div key={i} className={cn('rounded-xl border border-paper-300 bg-white p-3 dark:border-ink-800 dark:bg-ink-900', view === 'list' && 'flex gap-4')}>
          <Skeleton className={view === 'grid' ? 'aspect-[4/3] w-full' : 'h-28 w-20'} />
          <div className="flex-1 space-y-2 py-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-8 w-full" /></div>
        </div>
      ))}
    </div>
  );
  if (!items?.length) return <EmptyState icon={LibraryBig} title="No resources found" description="Try a different search term or clear a filter to widen your results." />;
  return (
    <div className={cn(view === 'grid' ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'space-y-3')}>
      {items.map((item) => <ResourceCard key={item.id} item={item} view={view} />)}
    </div>
  );
}

const FILTER_GROUPS = [
  { key: 'format', label: 'Format', options: [{ value: 'physical', label: 'Physical Book' }, { value: 'ebook', label: 'E-Book' }, { value: 'research_paper', label: 'Research Paper' }, { value: 'audio_video', label: 'Audio / Video' }] },
  { key: 'availability', label: 'Availability', options: [{ value: 'available', label: 'Available now' }, { value: 'digital', label: 'Digital access' }] },
];

export function FilterPanel({ facets, filters, onChange, onClear, mobile = false, resultCount, onClose }) {
  const [categorySearch, setCategorySearch] = useState('');
  const categories = (facets?.categories || []).filter((c) => c.value?.toLowerCase().includes(categorySearch.toLowerCase()));
  const set = (key, value) => onChange({ ...filters, [key]: filters[key] === value ? '' : value, page: 1 });
  return (
    <div className={cn('space-y-6', mobile && 'pb-4')}>
      {mobile && <div className="flex items-center justify-between"><h3 className="font-display text-lg font-bold">Filters</h3><button onClick={onClear} className="text-xs font-semibold text-gold-600">Clear all</button></div>}
      {FILTER_GROUPS.map((group) => (
        <div key={group.key}>
          <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">{group.label}</h4>
          <div className="space-y-1.5">
            {group.options.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-sm text-ink-700 hover:text-ink-900 dark:text-ink-200">
                <input type="checkbox" checked={filters[group.key] === option.value} onChange={() => set(group.key, option.value)}
                  className="h-4 w-4 rounded border-paper-300 accent-ink-800" />
                <span className="flex-1">{option.label}</span>
                {group.key === 'format' && <span className="text-[11px] text-ink-400">{facets?.formats?.find((f) => f.value === option.value)?.count || 0}</span>}
              </label>
            ))}
          </div>
        </div>
      ))}
      <div>
        <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">Category / Department</h4>
        <input value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} placeholder="Find a category…"
          className="mb-2 h-8 w-full rounded-lg border border-paper-300 bg-white px-2.5 text-xs outline-none dark:border-ink-700 dark:bg-ink-950" />
        <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
          {categories.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2.5 px-1 text-sm text-ink-700 dark:text-ink-200">
              <input type="checkbox" checked={filters.category === option.value} onChange={() => set('category', option.value)} className="h-4 w-4 accent-ink-800" />
              <span className="flex-1 truncate">{option.value}</span><span className="text-[11px] text-ink-400">{option.count}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">Language</h4>
        <select value={filters.language || ''} onChange={(e) => onChange({ ...filters, language: e.target.value, page: 1 })}
          className="h-9 w-full rounded-lg border border-paper-300 bg-white px-2 text-sm dark:border-ink-700 dark:bg-ink-950">
          <option value="">All languages</option>
          {(facets?.languages || []).map((l) => <option key={l.value} value={l.value}>{l.value} ({l.count})</option>)}
        </select>
      </div>
      <div>
        <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">Publication year</h4>
        <select value={filters.year || ''} onChange={(e) => onChange({ ...filters, year: e.target.value, page: 1 })}
          className="h-9 w-full rounded-lg border border-paper-300 bg-white px-2 text-sm dark:border-ink-700 dark:bg-ink-950">
          <option value="">Any year</option>
          {(facets?.years || []).map((y) => <option key={y.value} value={y.value}>{y.value} ({y.count})</option>)}
        </select>
      </div>
      {mobile && <Button className="w-full" onClick={onClose}>Show {resultCount} results</Button>}
      {!mobile && <button onClick={onClear} className="text-xs font-semibold text-ink-500 underline underline-offset-4 hover:text-ink-900">Clear all filters</button>}
    </div>
  );
}

export function ActiveFilters({ filters, onChange }) {
  const chips = Object.entries(filters).filter(([key, value]) => value && !['page', 'sort', 'view'].includes(key));
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map(([key, value]) => (
        <button key={key} onClick={() => onChange({ ...filters, [key]: '', page: 1 })}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink-900/5 px-3 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-900/10 dark:bg-white/10 dark:text-ink-200">
          {key === 'search' ? `“${value}”` : value}<X size={12} />
        </button>
      ))}
    </div>
  );
}

export function ToolbarButtons({ view, setView, onFilter }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="sm" className="lg:hidden" icon={SlidersHorizontal} onClick={onFilter}>Filters</Button>
      <div className="hidden overflow-hidden rounded-lg border border-paper-300 dark:border-ink-700 sm:flex">
        <button onClick={() => setView('grid')} aria-label="Grid view" className={cn('p-2', view === 'grid' ? 'bg-ink-900 text-white dark:bg-gold-500 dark:text-ink-950' : 'text-ink-500')}><Grid2X2 size={15} /></button>
        <button onClick={() => setView('list')} aria-label="List view" className={cn('p-2', view === 'list' ? 'bg-ink-900 text-white dark:bg-gold-500 dark:text-ink-950' : 'text-ink-500')}><List size={15} /></button>
      </div>
    </div>
  );
}
