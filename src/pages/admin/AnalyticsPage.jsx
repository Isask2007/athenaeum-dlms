import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, BookOpen, CircleDollarSign, ClipboardList, Eye, LibraryBig, Users } from 'lucide-react';
import { useApi } from '../../lib/api.js';
import { money } from '../../lib/format.js';
import { AreaChart, BarChart, DonutChart } from '../../components/charts/index.jsx';
import { Badge, Card, Skeleton, StatCard } from '../../components/ui/index.jsx';

export default function AnalyticsPage() {
  const overview = useApi('/analytics/overview');
  const popular = useApi('/analytics/popular');
  const viewed = useApi('/analytics/viewed');
  const categories = useApi('/analytics/categories');
  const fines = useApi('/analytics/fine-collection');
  const volume = useApi('/analytics/loan-volume');
  const stats = overview.data || {};

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total items" value={stats.total_items ?? '—'} icon={LibraryBig} loading={overview.loading} hint={`${stats.digital_items ?? 0} digital · ${stats.physical_items ?? 0} physical`} />
        <StatCard label="Active members" value={stats.active_users ?? '—'} icon={Users} tone="emerald" loading={overview.loading} hint={`${stats.pending_users ?? 0} awaiting approval`} />
        <StatCard label="Active loans" value={stats.active_loans ?? '—'} icon={BookOpen} tone="violet" loading={overview.loading} hint={`${stats.new_loans_this_week ?? 0} issued this week`} />
        <StatCard label="Overdue" value={stats.overdue_loans ?? '—'} icon={AlertTriangle} tone="rose" loading={overview.loading} hint="Requires attention" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">Fine collection</h2><p className="text-xs text-ink-500">Collected over the last 8 weeks</p></div>
            <Badge tone="emerald">{money(stats.collected_fines ?? 0)} total</Badge>
          </div>
          {fines.loading ? <Skeleton className="h-52 w-full" /> : <BarChart data={fines.data?.items || []} color="#c99b3f" valueLabel="units" />}
        </Card>
        <Card className="p-5 sm:p-6">
          <div className="mb-4"><h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">Collection by subject</h2><p className="text-xs text-ink-500">How the catalog is distributed</p></div>
          {categories.loading ? <Skeleton className="h-52 w-full" /> : <DonutChart data={categories.data?.items || []} />}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.35fr]">
        <Card className="p-5 sm:p-6">
          <div className="mb-4"><h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">Loan volume</h2><p className="text-xs text-ink-500">Checkouts over the last 6 months</p></div>
          {volume.loading ? <Skeleton className="h-52 w-full" /> : <AreaChart data={volume.data?.items || []} />}
        </Card>
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">Most borrowed</h2><p className="text-xs text-ink-500">Reader favourites in the collection</p></div>
            <Link to="/admin/catalog" className="inline-flex items-center gap-1 text-xs font-bold text-gold-600">Manage <ArrowUpRight size={13} /></Link></div>
          {popular.loading ? <Skeleton className="h-52 w-full" /> : <div className="space-y-3">
            {(popular.data?.items || []).map((item, index) => <div key={item.id} className="flex items-center gap-3">
              <span className="w-5 text-center font-display text-sm font-bold text-ink-400">{index + 1}</span>
              <img src={item.cover_url} alt="" className="h-11 w-8 rounded object-cover" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{item.title}</p><p className="truncate text-[11px] text-ink-500">{item.category}</p></div>
              <Badge tone="navy">{item.borrows} loans</Badge>
            </div>)}
          </div>}
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard label="Pending reservations" value={stats.pending_reservations ?? '—'} icon={ClipboardList} tone="amber" hint="Awaiting staff approval" />
        <StatCard label="Fines outstanding" value={money(stats.outstanding_fines ?? 0)} icon={CircleDollarSign} tone="rose" hint="Across all member loans" />
        <Card className="p-4 sm:p-5">
          <div className="flex items-start gap-3"><div className="rounded-xl bg-ink-900/5 p-2.5 text-ink-700 dark:bg-gold-500/10 dark:text-gold-400"><Eye size={18} /></div>
            <div><p className="text-xs font-bold uppercase tracking-wide text-ink-500">Most viewed</p>
              <p className="mt-1 truncate text-sm font-bold text-ink-900 dark:text-white">{viewed.data?.items?.[0]?.title || '—'}</p>
              <p className="text-xs text-ink-500">{viewed.data?.items?.[0]?.views || 0} page views</p></div></div>
        </Card>
      </div>
    </div>
  );
}
