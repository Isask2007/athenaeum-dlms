import React, { useState } from 'react';
import { Edit3, Plus, Search, Trash2, Upload } from 'lucide-react';
import { api, useApi } from '../../lib/api.js';
import { useToast } from '../../lib/toast.jsx';
import { FORMAT_LABELS, formatDate } from '../../lib/format.js';
import { AvailabilityBadge, FormatBadge } from '../../components/catalog/index.jsx';
import { Badge, Button, Card, ConfirmDialog, Field, Input, Modal, Select, Skeleton, Textarea } from '../../components/ui/index.jsx';

const blank = {
  title: '', subtitle: '', authors: '', isbn: '', issn: '', publisher: '', publication_year: '2024',
  edition: '1st ed.', language: 'English', format: 'physical', category: 'Computer Science',
  department: 'General Studies', description: '', abstract: '', shelf_location: '', total_copies: '1',
  available_copies: '1', license_info: '', page_count: '', content: '', tags: '',
};

export default function CatalogManagementPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState({ cover: null, file: null });
  const catalog = useApi(`/catalog?limit=60&search=${encodeURIComponent(query)}&sort=added`, [query]);
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const openAdd = () => { setEditing('new'); setForm(blank); setFiles({ cover: null, file: null }); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title, subtitle: item.subtitle || '', authors: item.authors.join(', '), isbn: item.isbn || '',
      issn: item.issn || '', publisher: item.publisher || '', publication_year: String(item.publication_year),
      edition: item.edition || '', language: item.language, format: item.format, category: item.category,
      department: item.department, description: item.description, abstract: item.abstract,
      shelf_location: item.shelf_location, total_copies: String(item.total_copies),
      available_copies: String(item.available_copies), license_info: item.license_info,
      page_count: String(item.page_count || ''), content: (item.pages || []).map((p) => p.paragraphs.join('\n\n')).join('\n\n'),
      tags: item.tags.join(', '),
    });
    setFiles({ cover: null, file: null });
  };

  const save = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (files.cover) data.append('cover', files.cover);
      if (files.file) data.append('file', files.file);
      if (editing === 'new') await api.post('/catalog', data);
      else await api.put(`/catalog/${editing.id}`, data);
      toast(editing === 'new' ? 'Resource added to the catalog' : 'Catalog entry updated');
      setEditing(null); catalog.refetch();
    } catch (error) { toast(error.message, 'error'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/catalog/${deleting.id}`); toast('Resource deleted'); setDeleting(null); catalog.refetch(); }
    catch (error) { toast(error.message, 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-paper-200 p-4 dark:border-ink-800">
          <div className="relative min-w-56 flex-1">
            <Search size={16} className="absolute left-3 top-3 text-ink-400" />
            <Input className="pl-9" placeholder="Search the catalog…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setQuery(search); }} />
          </div>
          <Button variant="outline" onClick={() => setQuery(search)}>Search</Button>
          <Button icon={Plus} onClick={openAdd}>Add resource</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-paper-50 text-[11px] uppercase tracking-wider text-ink-500 dark:bg-ink-950">
              <tr><th className="px-4 py-3 font-bold">Resource</th><th className="px-4 py-3 font-bold">Format</th><th className="px-4 py-3 font-bold">Category</th><th className="px-4 py-3 font-bold">Availability</th><th className="px-4 py-3 font-bold">Added</th><th className="px-4 py-3 text-right font-bold">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-paper-200 dark:divide-ink-800">
              {catalog.loading ? <tr><td colSpan={6} className="p-4"><Skeleton className="h-64 w-full" /></td></tr>
                : catalog.data?.items?.map((item) => <tr key={item.id} className="hover:bg-paper-50 dark:hover:bg-ink-950">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><img src={item.cover_url} alt="" className="h-12 w-9 rounded object-cover" />
                    <div className="min-w-0"><p className="truncate font-semibold text-ink-900 dark:text-white">{item.title}</p><p className="truncate text-xs text-ink-500">{item.authors.join(', ')} · {item.publication_year}</p></div></div></td>
                  <td className="px-4 py-3"><FormatBadge format={item.format} short /></td>
                  <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{item.category}</td>
                  <td className="px-4 py-3"><AvailabilityBadge item={item} /></td>
                  <td className="px-4 py-3 text-xs text-ink-500">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" icon={Edit3} onClick={() => openEdit(item)} />
                    <Button size="sm" variant="ghost" icon={Trash2} className="text-rose-600" onClick={() => setDeleting(item)} />
                  </div></td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add a resource' : 'Edit resource'} description="Catalog metadata powers search, filters and citations." size="lg"
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save} loading={saving}>{editing === 'new' ? 'Add resource' : 'Save changes'}</Button></>}>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2"><Input value={form.title} onChange={set('title')} required /></Field>
          <Field label="Subtitle"><Input value={form.subtitle} onChange={set('subtitle')} /></Field>
          <Field label="Authors (comma separated)"><Input value={form.authors} onChange={set('authors')} placeholder="Jane Doe, John Smith" /></Field>
          <Field label="Format"><Select value={form.format} onChange={set('format')}>{Object.entries(FORMAT_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</Select></Field>
          <Field label="Category"><Input value={form.category} onChange={set('category')} /></Field>
          <Field label="Publisher"><Input value={form.publisher} onChange={set('publisher')} /></Field>
          <Field label="Publication year"><Input type="number" value={form.publication_year} onChange={set('publication_year')} /></Field>
          <Field label="ISBN"><Input value={form.isbn} onChange={set('isbn')} /></Field>
          <Field label="ISSN"><Input value={form.issn} onChange={set('issn')} /></Field>
          <Field label="Edition"><Input value={form.edition} onChange={set('edition')} /></Field>
          <Field label="Language"><Input value={form.language} onChange={set('language')} /></Field>
          <Field label="Department"><Input value={form.department} onChange={set('department')} /></Field>
          <Field label="Tags (comma separated)" className="sm:col-span-2"><Input value={form.tags} onChange={set('tags')} placeholder="AI, research, algorithms" /></Field>
          <Field label="Description" className="sm:col-span-2"><Textarea value={form.description} onChange={set('description')} /></Field>
          <Field label="Abstract" className="sm:col-span-2"><Textarea value={form.abstract} onChange={set('abstract')} /></Field>
          {form.format === 'physical' ? <>
            <Field label="Shelf location"><Input value={form.shelf_location} onChange={set('shelf_location')} placeholder="QA 76.5 .V37 2022" /></Field>
            <Field label="Total copies"><Input type="number" min="0" value={form.total_copies} onChange={set('total_copies')} /></Field>
            <Field label="Available copies"><Input type="number" min="0" value={form.available_copies} onChange={set('available_copies')} /></Field>
          </> : <>
            <Field label="License information"><Input value={form.license_info} onChange={set('license_info')} placeholder="Campus license · 25 readers" /></Field>
            <Field label="Page count"><Input type="number" min="0" value={form.page_count} onChange={set('page_count')} /></Field>
            <Field label="Reader text (blank lines separate pages)" className="sm:col-span-2"><Textarea className="min-h-32" value={form.content} onChange={set('content')} /></Field>
            <Field label="Digital file (PDF / EPUB)" className="sm:col-span-2"><Input type="file" accept=".pdf,.epub" onChange={(e) => setFiles((f) => ({ ...f, file: e.target.files?.[0] }))} /></Field>
          </>}
          <Field label="Cover image" className="sm:col-span-2"><Input type="file" accept="image/*" onChange={(e) => setFiles((f) => ({ ...f, cover: e.target.files?.[0] }))} /></Field>
          <p className="flex items-center gap-2 text-xs text-ink-400 sm:col-span-2"><Upload size={13} /> Files are stored securely on the library server.</p>
        </form>
      </Modal>

      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} loading={busy}
        title="Delete this resource?" description={`“${deleting?.title || ''}” will be removed from the catalog. Items with active loans cannot be deleted.`} />
    </div>
  );
}
