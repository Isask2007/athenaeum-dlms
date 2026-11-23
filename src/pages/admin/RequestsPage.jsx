import React from 'react';
import { Check, X } from 'lucide-react';
import { api, useApi } from '../../lib/api.js';
import { useToast } from '../../lib/toast.jsx';
import { formatDate } from '../../lib/format.js';
import { Badge, Button, Card, EmptyState, Skeleton } from '../../components/ui/index.jsx';

export default function RequestsPage() {
  const { toast } = useToast();
  const requests = useApi('/admin/requests');
  const update = async (id, status) => {
    try { await api.patch(`/admin/requests/${id}`, { status }); toast(`Request ${status}`); requests.refetch(); }
    catch (error) { toast(error.message, 'error'); }
  };
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-paper-200 p-4 dark:border-ink-800"><h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">Purchase & resource requests</h2><p className="text-xs text-ink-500">Review suggestions submitted by your members.</p></div>
      {requests.loading ? <div className="p-4"><Skeleton className="h-48 w-full" /></div>
        : !requests.data?.items?.length ? <div className="p-6"><EmptyState title="No requests yet" description="Member suggestions will appear here." /></div>
          : <div className="divide-y divide-paper-200 dark:divide-ink-800">
            {requests.data.items.map((row) => <div key={row.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-ink-900 dark:text-white">{row.title}</h3><Badge tone={row.status === 'approved' ? 'emerald' : row.status === 'declined' ? 'rose' : 'amber'}>{row.status}</Badge></div>
                <p className="text-xs text-ink-500">{row.author || 'Author unknown'} · {row.user_name} · {formatDate(row.created_at)}</p>
                {row.note && <p className="mt-1.5 text-sm text-ink-600 dark:text-ink-300">{row.note}</p>}</div>
              <div className="flex gap-2"><Button size="sm" variant="outline" icon={Check} onClick={() => update(row.id, 'approved')}>Approve</Button>
                <Button size="sm" variant="ghost" icon={X} className="text-rose-600" onClick={() => update(row.id, 'declined')}>Decline</Button></div>
            </div>)}
          </div>}
    </Card>
  );
}
