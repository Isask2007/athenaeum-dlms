import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, BookOpen, ClipboardList, LibraryBig, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../../lib/auth.jsx';
import { Badge, cn } from '../../components/ui/index.jsx';

const links = [
  { to: '/admin/analytics', label: 'Analytics overview', icon: BarChart3 },
  { to: '/admin/catalog', label: 'Catalog management', icon: LibraryBig },
  { to: '/admin/circulation', label: 'Circulation desk', icon: ClipboardList },
  { to: '/admin/requests', label: 'Purchase requests', icon: BookOpen },
  { to: '/admin/users', label: 'User management', icon: Users, adminOnly: true },
  { to: '/admin/audit', label: 'Audit log', icon: ShieldCheck, adminOnly: true },
];

export default function AdminPage() {
  const { isAdmin } = useAuth();
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-600">Library operations</p>
          <h1 className="mt-1.5 font-display text-3xl font-bold text-ink-900 dark:text-white">Staff console</h1>
          <p className="mt-1 text-sm text-ink-500">Manage the collection, circulation and your community.</p>
        </div>
        <Badge tone="navy" dot>{isAdmin ? 'Administrator' : 'Librarian'} access</Badge>
      </div>
      <div className="mb-6 flex gap-1.5 overflow-x-auto border-b border-paper-300 pb-px dark:border-ink-800">
        {links.filter((link) => !link.adminOnly || isAdmin).map((link) => (
          <NavLink key={link.to} to={link.to}
            className={({ isActive }) => cn('flex items-center gap-2 whitespace-nowrap rounded-t-lg px-3.5 py-2.5 text-sm font-semibold transition-colors',
              isActive ? 'bg-ink-900 text-white dark:bg-gold-500 dark:text-ink-950' : 'text-ink-500 hover:bg-paper-200 hover:text-ink-900 dark:hover:bg-ink-800')}>
            <link.icon size={15} />{link.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
