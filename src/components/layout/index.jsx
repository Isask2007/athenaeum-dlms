import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Bookmark, ChevronDown, Compass, LayoutDashboard, LibraryBig, LogIn, LogOut, Menu, Moon, Search, Settings2, Sun, X, ShieldCheck, Users, ClipboardList, BarChart3 } from 'lucide-react';
import { useAuth } from '../../lib/auth.jsx';
import { useTheme } from '../../lib/theme.jsx';
import { initials } from '../../lib/format.js';
import { cn } from '../ui/index.jsx';

export function Logo({ light = false, compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', light ? 'bg-gold-500 text-ink-950' : 'bg-ink-900 text-gold-400 dark:bg-gold-500 dark:text-ink-950')}>
        <LibraryBig size={20} strokeWidth={2.2} />
      </span>
      {!compact && <span className="leading-tight">
        <span className={cn('block font-display text-[17px] font-bold tracking-tight', light ? 'text-white' : 'text-ink-900 dark:text-white')}>Athenaeum</span>
        <span className={cn('block text-[9px] font-bold uppercase tracking-[0.22em]', light ? 'text-gold-400' : 'text-gold-600')}>Digital Library</span>
      </span>}
    </Link>
  );
}

export function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button onClick={toggle} aria-label="Toggle dark mode"
      className="rounded-lg p-2 text-ink-600 transition-colors hover:bg-paper-200 dark:text-ink-300 dark:hover:bg-ink-800">
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function UserChip() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-paper-200 dark:hover:bg-ink-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-gold-400 dark:bg-gold-500 dark:text-ink-950">{initials(user.name)}</span>
        <span className="hidden text-xs font-semibold text-ink-800 sm:block dark:text-ink-100">{user.name.split(' ')[0]}</span>
        <ChevronDown size={13} className="text-ink-500" />
      </button>
      {open && <>
        <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Close menu" />
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-paper-300 bg-white p-1.5 shadow-lift dark:border-ink-700 dark:bg-ink-900">
          <div className="border-b border-paper-200 px-3 py-2 dark:border-ink-800">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-[11px] text-ink-500">{user.email}</p>
          </div>
          <Link to="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-paper-100 dark:hover:bg-ink-800"><LayoutDashboard size={15} /> My dashboard</Link>
          {(user.role === 'admin' || user.role === 'librarian') && <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-paper-100 dark:hover:bg-ink-800"><Settings2 size={15} /> Staff console</Link>}
          <button onClick={() => { logout(); navigate('/'); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"><LogOut size={15} /> Sign out</button>
        </div>
      </>}
    </div>
  );
}

const publicNav = [
  { to: '/', label: 'Home' },
  { to: '/catalog', label: 'Catalog' },
  { to: '/catalog?availability=digital', label: 'Digital Library' },
  { to: '/about', label: 'About' },
];

export function PublicLayout() {
  const { user } = useAuth();
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-paper-100 dark:bg-ink-950">
      <header className="sticky top-0 z-40 border-b border-paper-200 bg-paper-50/90 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-950/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            {publicNav.map((item) => (
              <NavLink key={item.label} to={item.to} end={item.to === '/'}
                className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  (isActive || (item.to.includes('?') && location.search.includes('digital'))) ? 'bg-ink-900/5 text-ink-900 dark:bg-white/10 dark:text-white' : 'text-ink-500 hover:text-ink-900 dark:hover:text-white')}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Link to="/catalog" className="rounded-lg p-2 text-ink-500 hover:bg-paper-200 dark:hover:bg-ink-800" aria-label="Search catalog"><Search size={18} /></Link>
            <ThemeToggle />
            {user ? <UserChip /> : <>
              <Link to="/login" className="hidden px-3 py-2 text-sm font-semibold text-ink-700 hover:text-ink-950 dark:text-ink-200 sm:block">Sign in</Link>
              <Link to="/login?mode=register" className="hidden sm:block"><button className="h-9 rounded-lg bg-ink-900 px-4 text-xs font-bold text-white dark:bg-gold-500 dark:text-ink-950">Get a card</button></Link>
            </>}
            <button onClick={() => setMenu((v) => !v)} className="rounded-lg p-2 lg:hidden" aria-label="Toggle menu">{menu ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {menu && <nav className="border-t border-paper-200 bg-white px-4 py-3 dark:border-ink-800 dark:bg-ink-900 lg:hidden">
          {publicNav.map((item) => <NavLink key={item.label} to={item.to} onClick={() => setMenu(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 dark:text-ink-200">{item.label}</NavLink>)}
          {!user && <Link to="/login" onClick={() => setMenu(false)} className="mt-2 flex items-center gap-2 border-t border-paper-200 px-3 py-3 text-sm font-semibold dark:border-ink-800"><LogIn size={16} /> Sign in / Register</Link>}
        </nav>}
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-paper-300 bg-white dark:border-ink-800 dark:bg-ink-900">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-500">A calm place for serious study. Explore physical collections, open research and digital resources — all in one card catalog.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-800 dark:text-ink-200">Explore</p>
            <div className="mt-3 space-y-2 text-sm text-ink-500"><Link to="/catalog" className="block hover:text-ink-900">Full catalog</Link><Link to="/catalog?availability=digital" className="block hover:text-ink-900">Digital resources</Link><Link to="/dashboard" className="block hover:text-ink-900">Member dashboard</Link></div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-800 dark:text-ink-200">Help</p>
            <div className="mt-3 space-y-2 text-sm text-ink-500"><Link to="/about" className="block hover:text-ink-900">About the library</Link><Link to="/login" className="block hover:text-ink-900">Library card</Link><a href="/api/health" className="block hover:text-ink-900">System status</a></div>
          </div>
        </div>
        <div className="border-t border-paper-200 py-5 text-center text-xs text-ink-400 dark:border-ink-800">© {new Date().getFullYear()} Athenaeum Digital Library · Crafted for readers and researchers.</div>
      </footer>
    </div>
  );
}

const dashboardNav = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard?tab=loans', label: 'My loans', icon: BookOpen },
  { to: '/dashboard?tab=saved', label: 'Saved items', icon: Bookmark },
  { to: '/catalog', label: 'Explore catalog', icon: Compass },
];
const adminNav = [
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/catalog', label: 'Catalog management', icon: LibraryBig },
  { to: '/admin/circulation', label: 'Circulation desk', icon: ClipboardList },
  { to: '/admin/requests', label: 'Purchase requests', icon: BookOpen },
  { to: '/admin/users', label: 'User management', icon: Users, adminOnly: true },
  { to: '/admin/audit', label: 'Audit log', icon: ShieldCheck, adminOnly: true },
];

export function DashboardLayout() {
  const { user, isStaff, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const links = [...dashboardNav, ...(isStaff ? [{ to: '/admin', label: 'Staff console', icon: Settings2 }] : [])];
  return (
    <div className="min-h-screen bg-paper-100 dark:bg-ink-950 lg:flex">
      {drawer && <button className="fixed inset-0 z-40 bg-ink-950/50 lg:hidden" onClick={() => setDrawer(false)} aria-label="Close navigation" />}
      <aside className={cn('fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-paper-300 bg-white transition-transform dark:border-ink-800 dark:bg-ink-900 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0', drawer ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-16 items-center justify-between px-5"><Logo /><button onClick={() => setDrawer(false)} className="lg:hidden"><X size={18} /></button></div>
        <div className="px-4 py-4">
          <div className="rounded-xl bg-ink-900 p-3 text-white dark:bg-ink-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gold-400">Signed in as</p>
            <p className="mt-1 truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-[11px] text-ink-300">{user?.department}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {links.map((item) => <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setDrawer(false)}
            className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-ink-900 text-white dark:bg-gold-500 dark:text-ink-950' : 'text-ink-600 hover:bg-paper-200 dark:text-ink-300 dark:hover:bg-ink-800')}>
            <item.icon size={17} />{item.label}
          </NavLink>)}
        </nav>
        <div className="border-t border-paper-200 p-3 dark:border-ink-800">
          <button onClick={() => { logout(); navigate('/'); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"><LogOut size={17} />Sign out</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-paper-200 bg-paper-50/90 px-4 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90 sm:px-6">
          <button onClick={() => setDrawer(true)} className="rounded-lg p-2 hover:bg-paper-200 dark:hover:bg-ink-800 lg:hidden"><Menu size={20} /></button>
          <div className="text-sm text-ink-500"><span className="font-semibold text-ink-900 dark:text-white">Library account</span><span className="hidden sm:inline"> / {isStaff ? 'Staff workspace' : 'Member workspace'}</span></div>
          <div className="ml-auto flex items-center gap-1"><ThemeToggle /><UserChip /></div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6"><Outlet /></main>
      </div>
    </div>
  );
}
