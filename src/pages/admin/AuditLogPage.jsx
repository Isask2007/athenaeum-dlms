import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useApi } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { formatDate } from '../../lib/format.js';
import { Badge, Card, EmptyState, Skeleton } from '../../components/ui/index.jsx';

export default function AuditLogPage() {
  const { isAdmin } = useAuth();
  const logs = useApi('/admin/audit-logs', [], { enabled: isAdmin });
  if (!isAdmin) return <EmptyState icon={ShieldCheck} title="Administrator access required" description="Audit records are restricted to administrators." />;
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-paper-200 p-4 dark:border-ink-800"><h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">Audit log</h2><p className="text-xs text-ink-500">An immutable record of staff and account changes.</p></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-paper-50 text-[11px] uppercase tracking-wider text-ink-500 dark:bg-ink-950"><tr><th className="px-4 py-3">Action</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">When</th><th className="px-4 py-3">Details</th></tr></thead>
          <tbody className="divide-y divide-paper-200 dark:divide-ink-800">
            {logs.loading ? <tr><td colSpan={5} className="p-4"><Skeleton className="h-64 w-full" /></td></tr>
              : logs.data?.items?.map((log) => <tr key={log.id} className="hover:bg-paper-50 dark:hover:bg-ink-950">
                <td className="px-4 py-3"><Badge tone="navy">{log.action}</Badge></td>
                <td className="px-4 py-3 text-ink-700 dark:text-ink-200">{log.actor_name || 'System'}<p className="text-xs text-ink-500">{log.actor_email}</p></td>
                <td className="px-4 py-3 text-xs text-ink-500">{log.target_type} #{log.target_id || '—'}</td>
                <td className="px-4 py-3 text-xs text-ink-500">{formatDate(log.created_at)}</td>
                <td className="px-4 py-3"><code className="text-[11px] text-ink-500">{JSON.stringify(log.detail || {})}</code></td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
