import React, { useEffect } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

export const cn = (...parts) => parts.filter(Boolean).join(' ');

const buttonVariants = {
  primary: 'bg-ink-900 text-white hover:bg-ink-800 dark:bg-gold-500 dark:text-ink-950 dark:hover:bg-gold-400 shadow-soft',
  secondary: 'bg-paper-200 text-ink-900 hover:bg-paper-300 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700',
  outline: 'border border-paper-300 bg-white text-ink-800 hover:border-ink-300 hover:bg-paper-50 dark:border-ink-700 dark:bg-transparent dark:text-ink-100 dark:hover:bg-ink-800',
  ghost: 'text-ink-600 hover:bg-paper-200 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  gold: 'bg-gold-500 text-ink-950 hover:bg-gold-400',
};
const buttonSizes = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-sm' };

export function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, iconRight: Right, className, children, disabled, ...props }) {
  return (
    <button
      className={cn('inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-500 disabled:cursor-not-allowed disabled:opacity-55',
        buttonVariants[variant], buttonSizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon ? <Icon size={16} /> : null}
      {children}
      {Right && <Right size={16} />}
    </button>
  );
}

const badgeTones = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25',
  gold: 'bg-gold-500/10 text-gold-600 ring-gold-500/30 dark:text-gold-400',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/25',
  navy: 'bg-ink-900/5 text-ink-800 ring-ink-900/15 dark:bg-white/10 dark:text-ink-100 dark:ring-white/15',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-white/5 dark:text-ink-300 dark:ring-white/10',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/25',
};

export function Badge({ tone = 'slate', dot = false, className, children }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap', badgeTones[tone] || badgeTones.slate, className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Card({ className, children, ...props }) {
  return <div className={cn('rounded-2xl border border-paper-300 bg-white shadow-soft dark:border-ink-800 dark:bg-ink-900', className)} {...props}>{children}</div>;
}

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="mb-1.5 block text-xs font-semibold text-ink-700 dark:text-ink-200">{label}</span>}
      {children}
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : hint ? <span className="mt-1 block text-xs text-ink-400">{hint}</span> : null}
    </label>
  );
}

const controlClass = 'w-full rounded-lg border border-paper-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-ink-500 focus:outline-none focus:ring-2 focus:ring-ink-900/10 dark:border-ink-700 dark:bg-ink-950 dark:text-white dark:focus:border-gold-500';

export function Input({ className, ...props }) {
  return <input className={cn(controlClass, 'h-10', className)} {...props} />;
}
export function Textarea({ className, ...props }) {
  return <textarea className={cn(controlClass, 'min-h-24 py-2.5', className)} {...props} />;
}
export function Select({ className, children, ...props }) {
  return <select className={cn(controlClass, 'h-10 cursor-pointer pr-8', className)} {...props}>{children}</select>;
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={cn('max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-ink-900 sm:rounded-2xl', widths[size])} role="dialog" aria-modal="true">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-paper-200 bg-white px-5 py-4 dark:border-ink-800 dark:bg-ink-900">
          <div>
            <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-500 hover:bg-paper-100 dark:hover:bg-ink-800" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && <div className="sticky bottom-0 flex justify-end gap-2 border-t border-paper-200 bg-white px-5 py-4 dark:border-ink-800 dark:bg-ink-900">{footer}</div>}
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-paper-300 dark:border-ink-800', className)}>
      {tabs.map((tab) => (
        <button key={tab.id} onClick={() => onChange(tab.id)}
          className={cn('relative whitespace-nowrap px-3.5 py-3 text-sm font-semibold transition-colors',
            value === tab.id ? 'text-ink-900 dark:text-gold-400' : 'text-ink-500 hover:text-ink-800 dark:hover:text-ink-200')}>
          {tab.label}
          {tab.count !== undefined && <span className="ml-1.5 rounded-full bg-paper-200 px-1.5 py-0.5 text-[10px] dark:bg-ink-800">{tab.count}</span>}
          {value === tab.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink-900 dark:bg-gold-400" />}
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton rounded-lg text-ink-500', className)} />;
}

export function EmptyState({ icon: Icon = AlertTriangle, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-paper-300 px-6 py-14 text-center dark:border-ink-700">
      <div className="mb-3 rounded-xl bg-paper-200 p-3 text-ink-500 dark:bg-ink-800"><Icon size={24} /></div>
      <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'navy', hint, loading }) {
  const tones = {
    navy: 'bg-ink-900/5 text-ink-800 dark:bg-ink-800 dark:text-gold-400',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
    violet: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">{label}</p>
          {loading ? <Skeleton className="mt-3 h-8 w-16" /> : <p className="mt-1.5 font-display text-3xl font-bold text-ink-900 dark:text-white">{value}</p>}
          {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
        </div>
        {Icon && <div className={cn('rounded-xl p-2.5', tones[tone])}><Icon size={19} /></div>}
      </div>
    </Card>
  );
}

export function ProgressBar({ value = 0, tone = 'bg-ink-800' }) {
  return <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-200 dark:bg-ink-800"><div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function Spinner({ label = 'Loading…' }) {
  return <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-500"><Loader2 size={18} className="animate-spin" />{label}</div>;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Delete', loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>}>
      <div className="flex gap-3">
        <div className="rounded-full bg-rose-50 p-2 text-rose-600 dark:bg-rose-500/10"><AlertTriangle size={18} /></div>
        <p className="text-sm text-ink-600 dark:text-ink-300">{description}</p>
      </div>
    </Modal>
  );
}
