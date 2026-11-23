import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookMarked, BookOpen, GraduationCap, LibraryBig, Quote, ShieldCheck, Sparkles } from 'lucide-react';
import { useApi } from '../lib/api.js';
import { SearchBar, ResourceGrid } from '../components/catalog/index.jsx';
import { Card, Skeleton } from '../components/ui/index.jsx';

const popularSearches = ['Machine learning', 'Climate policy', 'Quantum', 'Academic writing', 'Urban planning'];

export default function HomePage() {
  const { data: featured, loading } = useApi('/catalog?limit=8&sort=popular');
  const { data: facets } = useApi('/catalog/facets');
  const covers = (featured?.items || []).slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(circle at 18% 20%, #2c405e 0, transparent 42%), radial-gradient(circle at 82% 78%, #1d3a4f 0, transparent 38%)' }} />
        <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-8 -top-16 h-72 w-72 rounded-full border border-white/5" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="animate-fade-up">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1.5 text-xs font-semibold text-gold-400">
              <Sparkles size={13} /> Your university library, reimagined
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Knowledge, <span className="text-gold-400">without walls.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-200 sm:text-lg">
              Search books, research papers and digital resources in one place. Borrow in seconds, read online anywhere, and keep your scholarship moving.
            </p>
            <div className="mt-8 max-w-2xl"><SearchBar /></div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-300">
              <span className="font-semibold text-ink-200">Popular:</span>
              {popularSearches.map((term) => <Link key={term} to={`/catalog?search=${encodeURIComponent(term)}`} className="rounded-full border border-white/15 px-2.5 py-1 transition-colors hover:border-gold-400 hover:text-gold-300">{term}</Link>)}
            </div>
          </div>
          <div className="relative hidden h-[380px] lg:block">
            <div className="absolute left-8 top-10 w-44 -rotate-6 rounded-lg shadow-2xl transition-transform duration-500 hover:rotate-0">
              {covers[0] && <img src={covers[0].cover_url} alt="" className="rounded-lg" />}
            </div>
            <div className="absolute left-44 top-0 z-10 w-48 rotate-3 rounded-lg shadow-2xl transition-transform duration-500 hover:rotate-0">
              {covers[1] && <img src={covers[1].cover_url} alt="" className="rounded-lg" />}
            </div>
            <div className="absolute right-0 top-20 w-48 rotate-6 rounded-lg shadow-2xl transition-transform duration-500 hover:rotate-0">
              {covers[2] && <img src={covers[2].cover_url} alt="" className="rounded-lg" />}
            </div>
            <div className="absolute bottom-0 left-24 z-20 flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
              <div className="rounded-lg bg-gold-500 p-2 text-ink-950"><LibraryBig size={18} /></div>
              <div><p className="text-sm font-bold">{featured?.total ?? '18'}+ resources</p><p className="text-[11px] text-ink-300">catalogued and ready</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-paper-300 bg-white dark:border-ink-800 dark:bg-ink-900">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 sm:grid-cols-4 sm:px-6">
          {[
            { value: featured?.total ?? '—', label: 'Catalogued resources' },
            { value: facets?.formats?.find((f) => f.value !== 'physical')?.count ?? '—', label: 'Digital titles' },
            { value: facets?.categories?.length ?? '—', label: 'Subject areas' },
            { value: '24/7', label: 'Online access' },
          ].map((stat) => <div key={stat.label} className="py-6 text-center sm:py-7">
            <p className="font-display text-2xl font-bold text-ink-900 dark:text-white sm:text-3xl">{stat.value}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-500">{stat.label}</p>
          </div>)}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-600">Curated for you</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink-900 dark:text-white">Popular this term</h2>
            <p className="mt-1 text-sm text-ink-500">The titles our readers are borrowing and exploring most.</p>
          </div>
          <Link to="/catalog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-800 hover:text-gold-600 dark:text-ink-200">View full catalog <ArrowRight size={15} /></Link>
        </div>
        <ResourceGrid items={(featured?.items || []).slice(0, 4)} loading={loading} skeletonCount={4} />
      </section>

      {/* Subjects */}
      <section className="bg-white py-14 dark:bg-ink-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-900 dark:text-white">Browse by subject</h2>
          <p className="mt-1 text-sm text-ink-500">Find your next read across the disciplines.</p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            {(facets?.categories || []).slice(0, 12).map((category) => (
              <Link key={category.value} to={`/catalog?category=${encodeURIComponent(category.value)}`}
                className="inline-flex items-center gap-2 rounded-xl border border-paper-300 bg-paper-50 px-4 py-2.5 text-sm font-semibold text-ink-700 transition-all hover:-translate-y-0.5 hover:border-ink-400 hover:shadow-soft dark:border-ink-700 dark:bg-ink-950 dark:text-ink-200">
                {category.value}<span className="text-[11px] text-ink-400">{category.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-600">Made for academic life</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-ink-900 dark:text-white">Everything you need, one library card</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { icon: BookOpen, title: 'Find it fast', text: 'Instant search across titles, authors, ISBN, subjects and tags — with filters that actually help.' },
            { icon: BookMarked, title: 'Borrow or reserve', text: 'Check out physical copies at the desk, renew online, and join the queue when everything is on loan.' },
            { icon: GraduationCap, title: 'Read anywhere', text: 'Open e-books and research papers in the built-in reader, bookmark pages and generate citations.' },
          ].map((feature) => <Card key={feature.title} className="p-6">
            <div className="mb-4 w-fit rounded-xl bg-ink-900/5 p-3 text-ink-800 dark:bg-gold-500/10 dark:text-gold-400"><feature.icon size={22} /></div>
            <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{feature.text}</p>
          </Card>)}
        </div>
      </section>

      {/* Quote / CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-ink-900 px-6 py-12 text-white sm:px-12">
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full border border-white/10" />
          <Quote className="absolute right-10 top-8 text-white/10" size={90} />
          <div className="relative max-w-2xl">
            <p className="font-display text-2xl font-semibold leading-relaxed sm:text-3xl">“A library is not a luxury but one of the necessities of life.”</p>
            <p className="mt-4 text-sm text-ink-300">— Henry Ward Beecher</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/catalog" className="rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-bold text-ink-950 hover:bg-gold-400">Explore the catalog</Link>
              <Link to="/login?mode=register" className="rounded-lg border border-white/25 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Get a library card</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-paper-300 bg-white py-8 dark:border-ink-800 dark:bg-ink-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <span className="inline-flex items-center gap-2"><ShieldCheck size={15} /> Role-based access</span>
          <span className="inline-flex items-center gap-2"><BookOpen size={15} /> Digital reader</span>
          <span className="inline-flex items-center gap-2"><Quote size={15} /> Citation tools</span>
        </div>
      </section>
    </div>
  );
}
