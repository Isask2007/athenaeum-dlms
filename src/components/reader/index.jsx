import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, Copy, Download, FileText, Minus, Plus, Quote } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useToast } from '../../lib/toast.jsx';
import { Button, Modal, cn } from '../ui/index.jsx';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const STYLES = [{ id: 'apa', label: 'APA 7th' }, { id: 'mla', label: 'MLA 9th' }, { id: 'ieee', label: 'IEEE' }];

function CitationDialog({ item, open, onClose }) {
  const [style, setStyle] = useState('apa');
  const [citation, setCitation] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get(`/catalog/${item.id}/citation`, { params: { style } })
      .then((data) => setCitation(data.citation))
      .catch((error) => toast(error.message, 'error'))
      .finally(() => setLoading(false));
  }, [open, style, item.id]);
  return (
    <Modal open={open} onClose={onClose} title="Generate citation" description="One-click references in three common academic styles." size="sm"
      footer={<Button icon={Copy} onClick={async () => { await navigator.clipboard.writeText(citation); toast('Citation copied to clipboard'); }}>Copy citation</Button>}>
      <div className="mb-4 flex gap-2">
        {STYLES.map((s) => <button key={s.id} onClick={() => setStyle(s.id)}
          className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', style === s.id ? 'bg-ink-900 text-white dark:bg-gold-500 dark:text-ink-950' : 'bg-paper-200 text-ink-600 dark:bg-ink-800 dark:text-ink-300')}>{s.label}</button>)}
      </div>
      <div className="min-h-28 rounded-xl border border-paper-300 bg-paper-50 p-4 font-display text-sm leading-relaxed text-ink-800 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100">
        {loading ? 'Generating…' : citation}
      </div>
      <p className="mt-3 text-[11px] text-ink-400">Always verify citations against the source's own guidance before submission.</p>
    </Modal>
  );
}

export function DigitalReader({ item }) {
  const { toast } = useToast();
  const isPdf = Boolean(item.file_url && /\.pdf($|\?)/i.test(item.file_url));
  const pages = item.pages || [];
  const bookmarkKey = `dlms_reader_bookmark_${item.id}`;
  const [bookmark, setBookmark] = useState(() => Number(localStorage.getItem(bookmarkKey) || 1));
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.25);
  const [numPages, setNumPages] = useState(isPdf ? 0 : pages.length);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [loading, setLoading] = useState(isPdf);
  const [textMode, setTextMode] = useState(!isPdf);
  const [citeOpen, setCiteOpen] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isPdf) return;
    let cancelled = false;
    pdfjsLib.getDocument(item.file_url).promise
      .then((doc) => { if (!cancelled) { setPdfDoc(doc); setNumPages(doc.numPages); setLoading(false); } })
      .catch(() => {
        if (cancelled) return;
        setTextMode(true); setLoading(false);
        toast('Previewing the text version of this resource.', 'info');
      });
    return () => { cancelled = true; };
  }, [isPdf, item.file_url]);

  const renderPdfPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || pageNum > pdfDoc.numPages) return;
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewport.width * dpr;
    canvas.height = viewport.height * dpr;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    context.scale(dpr, dpr);
    await page.render({ canvasContext: context, viewport }).promise;
  }, [pdfDoc, pageNum, scale]);

  useEffect(() => { if (!textMode && pdfDoc) renderPdfPage(); }, [renderPdfPage, textMode, pdfDoc]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') setPageNum((n) => Math.min(numPages, n + 1));
      if (e.key === 'ArrowLeft') setPageNum((n) => Math.max(1, n - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [numPages]);

  const jump = (page) => setPageNum(Math.max(1, Math.min(numPages || 1, Number(page) || 1)));
  const toggleBookmark = () => {
    const next = bookmark === pageNum ? 0 : pageNum;
    setBookmark(next);
    localStorage.setItem(bookmarkKey, String(next));
    toast(next ? `Bookmarked page ${next}` : 'Bookmark removed');
  };
  const currentPage = pages[pageNum - 1];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-ink-100 dark:bg-ink-950">
      <div className="sticky top-16 z-30 flex flex-wrap items-center gap-2 border-b border-paper-300 bg-white px-3 py-2.5 dark:border-ink-800 dark:bg-ink-900 sm:px-5">
        <Link to={`/item/${item.id}`} className="mr-1 rounded-lg p-2 text-ink-600 hover:bg-paper-100 dark:text-ink-300 dark:hover:bg-ink-800" aria-label="Back to item"><ArrowLeft size={18} /></Link>
        <div className="mr-auto min-w-0">
          <p className="truncate text-sm font-bold text-ink-900 dark:text-white">{item.title}</p>
          <p className="hidden text-[11px] text-ink-500 sm:block">{item.authors.join(', ')} · {textMode ? 'Text edition' : 'PDF viewer'}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-paper-300 px-1 py-1 dark:border-ink-700">
          <button onClick={() => jump(pageNum - 1)} className="rounded p-1.5 hover:bg-paper-100 disabled:opacity-40 dark:hover:bg-ink-800" disabled={pageNum <= 1} aria-label="Previous page"><ChevronLeft size={16} /></button>
          <span className="flex items-center gap-1 text-xs font-semibold">
            <input value={pageNum} onChange={(e) => jump(e.target.value)} className="w-9 bg-transparent text-center outline-none" aria-label="Page number" />
            <span className="text-ink-400">/ {numPages || 1}</span>
          </span>
          <button onClick={() => jump(pageNum + 1)} className="rounded p-1.5 hover:bg-paper-100 disabled:opacity-40 dark:hover:bg-ink-800" disabled={pageNum >= numPages} aria-label="Next page"><ChevronRight size={16} /></button>
        </div>
        {!textMode && <>
          <button onClick={() => setScale((s) => Math.max(0.6, +(s - 0.2).toFixed(2)))} className="rounded-lg p-2 text-ink-600 hover:bg-paper-100 dark:text-ink-300 dark:hover:bg-ink-800" aria-label="Zoom out"><Minus size={16} /></button>
          <span className="w-11 text-center text-xs font-semibold text-ink-600 dark:text-ink-300">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.min(2.6, +(s + 0.2).toFixed(2)))} className="rounded-lg p-2 text-ink-600 hover:bg-paper-100 dark:text-ink-300 dark:hover:bg-ink-800" aria-label="Zoom in"><Plus size={16} /></button>
        </>}
        <button onClick={toggleBookmark} className={cn('rounded-lg p-2 hover:bg-paper-100 dark:hover:bg-ink-800', bookmark ? 'text-gold-600' : 'text-ink-600 dark:text-ink-300')} title="Bookmark this page"><Bookmark size={17} fill={bookmark ? 'currentColor' : 'none'} /></button>
        <Button variant="outline" size="sm" icon={Quote} onClick={() => setCiteOpen(true)}>Cite</Button>
        {item.file_url && <a href={item.file_url} download className="rounded-lg p-2 text-ink-600 hover:bg-paper-100 dark:text-ink-300 dark:hover:bg-ink-800" title="Download"><Download size={17} /></a>}
      </div>

      <div className="h-1 w-full bg-paper-200 dark:bg-ink-800"><div className="h-full bg-gold-500 transition-all" style={{ width: `${numPages ? (pageNum / numPages) * 100 : 0}%` }} /></div>

      <div className="flex flex-1 justify-center overflow-auto px-3 py-6 sm:px-6">
        {loading ? <div className="my-20 text-sm text-ink-500">Loading document…</div> : textMode ? (
          <article className="reader-text w-full max-w-2xl rounded-2xl border border-paper-300 bg-white p-7 shadow-soft dark:border-ink-800 dark:bg-ink-900 sm:p-12">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-600">Page {pageNum} of {numPages}</p>
            <h2 className="font-display text-3xl font-bold text-ink-900 dark:text-white">{currentPage?.heading || item.title}</h2>
            {(currentPage?.paragraphs || []).map((paragraph, i) => <p key={i} className="text-ink-700 dark:text-ink-200">{paragraph}</p>)}
            {!currentPage && <p className="text-ink-500">This edition does not include page {pageNum}.</p>}
            <div className="mt-10 flex justify-between border-t border-paper-200 pt-5 dark:border-ink-800">
              <Button variant="outline" size="sm" disabled={pageNum === 1} onClick={() => jump(pageNum - 1)} icon={ChevronLeft}>Previous</Button>
              <Button variant="outline" size="sm" disabled={pageNum === numPages} onClick={() => jump(pageNum + 1)} iconRight={ChevronRight}>Next</Button>
            </div>
          </article>
        ) : (
          <div className="w-full max-w-fit">
            <canvas ref={canvasRef} className="mx-auto rounded-lg bg-white shadow-lift" />
            <p className="mt-4 text-center text-xs text-ink-500"><FileText size={12} className="mr-1 inline" />Rendered in-browser with PDF.js · use ← → keys to navigate</p>
          </div>
        )}
      </div>
      {bookmark > 0 && <div className="border-t border-paper-300 bg-white px-4 py-2 text-center text-xs text-ink-500 dark:border-ink-800 dark:bg-ink-900">
        <Bookmark size={12} className="mr-1 inline text-gold-600" />Your bookmark: page {bookmark} · <button onClick={() => jump(bookmark)} className="font-semibold text-ink-800 underline dark:text-white">jump to page</button>
      </div>}
      <CitationDialog item={item} open={citeOpen} onClose={() => setCiteOpen(false)} />
    </div>
  );
}
