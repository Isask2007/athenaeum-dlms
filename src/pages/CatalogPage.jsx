import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../lib/api.js';
import { ActiveFilters, FilterPanel, ResourceGrid, SearchBar, ToolbarButtons } from '../components/catalog/index.jsx';
import { Button, Modal, Select } from '../components/ui/index.jsx';

const EMPTY = { search: '', format: '', category: '', language: '', year: '', availability: '', sort: 'relevance', page: 1 };

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({ ...EMPTY, ...Object.fromEntries(params.entries()) }));
  const [view, setView] = useState(() => localStorage.getItem('dlms_catalog_view') || 'grid');
  const [mobileFilters, setMobileFilters] = useState(false);

  useEffect(() => {
    const next = { ...EMPTY, ...Object.fromEntries(params.entries()) };
    setFilters((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
  }, [params]);

  const queryString = useMemo(() => {
    const search = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value && !(key === 'sort' && value === 'relevance') && !(key === 'page' && value == 1)) search.set(key, value); });
    return search.toString();
  }, [filters]);

  const update = (next) => {
    setFilters(next);
    setParams(next, { replace: true });
  };
  const clear = () => { setFilters(EMPTY); setParams({}, { replace: true }); };
  const changeView = (next) => { setView(next); localStorage.setItem('dlms_catalog_view', next); };

  const { data, loading, error } = useApi(`/catalog?${queryString || 'limit=12'}&limit=12`);
  const { data: facets } = useApi('/catalog/facets');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-600">Library catalog</p>
        <h1 className="mt-1.5 font-display text-3xl font-bold text-ink-900 dark:text-white sm:text-4xl">Discover the collection</h1>
        <p className="mt-1.5 text-sm text-ink-500">Search and filter across books, e-books, papers and media.</p>
      </div>

      <SearchBar initial={filters.search} className="mb-5" />

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-paper-300 bg-white p-5 shadow-soft dark:border-ink-800 dark:bg-ink-900">
            <FilterPanel facets={facets} filters={filters} onChange={update} onClear={clear} />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p className="mr-auto text-sm text-ink-500">
              {loading ? 'Searching…' : <><span className="font-bold text-ink-900 dark:text-white">{data?.total || 0}</span> result{(data?.total || 0) === 1 ? '' : 's'}</>}
            </p>
            <Select value={filters.sort || 'relevance'} onChange={(e) => update({ ...filters, sort: e.target.value, page: 1 })} className="h-9 w-auto text-xs">
              <option value="relevance">Most relevant</option>
              <option value="popular">Most viewed</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title A–Z</option>
              <option value="added">Recently added</option>
            </Select>
            <ToolbarButtons view={view} setView={changeView} onFilter={() => setMobileFilters(true)} />
          </div>

          <ActiveFilters filters={filters} onChange={update} />

          {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-500/10 dark:text-rose-300">{error.message}</div>
            : <ResourceGrid items={data?.items} view={view} loading={loading} skeletonCount={6} />}

          {data && data.pages > 1 && <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={filters.page <= 1} onClick={() => update({ ...filters, page: Number(filters.page) - 1 })}>Previous</Button>
            {Array.from({ length: Math.min(6, data.pages) }, (_, i) => {
              const start = Math.max(1, Math.min(Number(filters.page) - 2, data.pages - 5));
              const page = start + i;
              return <button key={page} onClick={() => update({ ...filters, page })}
                className={`h-8 w-8 rounded-lg text-xs font-bold ${Number(filters.page) === page ? 'bg-ink-900 text-white dark:bg-gold-500 dark:text-ink-950' : 'border border-paper-300 text-ink-600 dark:border-ink-700 dark:text-ink-300'}`}>{page}</button>;
            })}
            <Button variant="outline" size="sm" disabled={Number(filters.page) >= data.pages} onClick={() => update({ ...filters, page: Number(filters.page) + 1 })}>Next</Button>
          </div>}
        </div>
      </div>

      <Modal open={mobileFilters} onClose={() => setMobileFilters(false)} title="" size="sm">
        <div className="-mt-2">
          <FilterPanel facets={facets} filters={filters} onChange={update} onClear={clear} mobile resultCount={data?.total || 0} onClose={() => setMobileFilters(false)} />
        </div>
      </Modal>
    </div>
  );
}
