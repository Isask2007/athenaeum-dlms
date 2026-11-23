import { Router } from 'express';
import { all, get, run, json, now, shapeResource } from '../db/index.js';
import { requireAuth, staffOnly } from '../middleware/auth.js';
import { asyncHandler, badRequest, notFound, conflict } from '../middleware/error.js';
import { str, int, oneOf } from '../middleware/validate.js';
import { uploadCatalogFiles, publicFilePath } from '../middleware/upload.js';
import { generateCitation } from '../services/citations.js';
import { logAction } from '../services/audit.js';

const router = Router();
const FORMATS = ['physical', 'ebook', 'research_paper', 'audio_video'];

const parseList = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (!value) return [];
  return String(value).split(',').map((v) => v.trim()).filter(Boolean);
};

function filtersFromQuery(q) {
  const clauses = [];
  const params = [];
  const term = str(q.search, 'Search', { max: 160 }).toLowerCase();
  if (term) {
    const like = '%' + term + '%';
    clauses.push('(LOWER(title) LIKE ? OR LOWER(authors) LIKE ? OR LOWER(isbn) LIKE ? OR LOWER(issn) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(category) LIKE ? OR LOWER(description) LIKE ? OR LOWER(publisher) LIKE ?)');
    params.push(like, like, like, like, like, like, like, like);
  }
  const format = oneOf(q.format, FORMATS, 'Format');
  if (format) { clauses.push('format = ?'); params.push(format); }
  if (str(q.category, 'Category', { max: 120 })) { clauses.push('category = ?'); params.push(str(q.category, 'Category')); }
  if (str(q.language, 'Language', { max: 60 })) { clauses.push('language = ?'); params.push(str(q.language, 'Language')); }
  const year = int(q.year, 'Year', { min: 1000, max: 2100, fallback: 0 });
  if (year) { clauses.push('publication_year = ?'); params.push(year); }
  const availability = oneOf(q.availability, ['available', 'digital'], 'Availability');
  if (availability === 'available') clauses.push("format = 'physical' AND available_copies > 0");
  if (availability === 'digital') clauses.push("format <> 'physical'");
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

const SORTS = {
  relevance: 'borrows DESC, views DESC, id ASC',
  newest: 'publication_year DESC, id DESC',
  oldest: 'publication_year ASC, id ASC',
  title: 'title ASC',
  popular: 'views DESC, borrows DESC',
  added: 'id DESC',
};

router.get('/', asyncHandler(async (req, res) => {
  const { where, params } = filtersFromQuery(req.query);
  const page = int(req.query.page, 'Page', { min: 1, max: 10000, fallback: 1 });
  const limit = int(req.query.limit, 'Limit', { min: 1, max: 60, fallback: 12 });
  const sort = SORTS[oneOf(req.query.sort, Object.keys(SORTS), 'Sort') || 'relevance'];
  const total = Number(get(`SELECT COUNT(*) AS n FROM resources ${where}`, params)?.n || 0);
  const rows = all(`SELECT * FROM resources ${where} ORDER BY ${sort} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  res.json({
    items: rows.map(shapeResource),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
}));

router.get('/facets', asyncHandler(async (_req, res) => {
  const formats = all('SELECT format AS value, COUNT(*) AS count FROM resources GROUP BY format ORDER BY count DESC');
  const categories = all('SELECT category AS value, COUNT(*) AS count FROM resources GROUP BY category ORDER BY value');
  const languages = all('SELECT language AS value, COUNT(*) AS count FROM resources GROUP BY language ORDER BY value');
  const years = all('SELECT publication_year AS value, COUNT(*) AS count FROM resources GROUP BY publication_year ORDER BY value DESC');
  res.json({ formats, categories, languages, years });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const row = get('SELECT * FROM resources WHERE id = ?', [req.params.id]);
  if (!row) throw notFound('This resource is not in the catalog.');
  run('UPDATE resources SET views = views + 1 WHERE id = ?', [row.id]);
  const related = all('SELECT * FROM resources WHERE category = ? AND id <> ? ORDER BY borrows DESC LIMIT 4', [row.category, row.id]).map(shapeResource);
  res.json({ item: shapeResource({ ...row, views: row.views + 1 }), related });
}));

router.get('/:id/citation', asyncHandler(async (req, res) => {
  const row = get('SELECT * FROM resources WHERE id = ?', [req.params.id]);
  if (!row) throw notFound();
  const item = shapeResource(row);
  const style = oneOf(req.query.style, ['apa', 'mla', 'ieee'], 'Style') || 'apa';
  res.json({ style, citation: generateCitation(item, style) });
}));

function payloadFromRequest(req) {
  const body = req.body || {};
  const files = req.files || {};
  const title = str(body.title, 'Title', { required: true, max: 255 });
  const format = oneOf(body.format, FORMATS, 'Format') || 'physical';
  const totalCopies = int(body.total_copies, 'Total copies', { min: 0, max: 999, fallback: 1 }) || 1;
  const availableInput = body.available_copies;
  const availableCopies = availableInput === undefined
    ? totalCopies
    : int(availableInput, 'Available copies', { min: 0, max: totalCopies, fallback: totalCopies });
  const pagesInput = body.pages_json;
  let pages = [];
  if (Array.isArray(pagesInput)) pages = pagesInput;
  else if (typeof pagesInput === 'string' && pagesInput.trim().startsWith('[')) {
    try { pages = JSON.parse(pagesInput); } catch { pages = []; }
  } else if (str(body.content, 'Content', { max: 100000 })) {
    pages = str(body.content, 'Content', { max: 100000 }).split(/\n\s*\n/).filter(Boolean)
      .map((text, i) => ({ page: i + 1, heading: i === 0 ? 'Introduction' : `Section ${i + 1}`, paragraphs: [text] }));
  }
  return {
    title,
    subtitle: str(body.subtitle, 'Subtitle', { max: 255 }),
    authors: json(parseList(body.authors)),
    isbn: str(body.isbn, 'ISBN', { max: 40 }),
    issn: str(body.issn, 'ISSN', { max: 40 }),
    publisher: str(body.publisher, 'Publisher', { max: 160 }),
    publication_year: int(body.publication_year, 'Publication year', { min: 1000, max: 2100, fallback: new Date().getFullYear() }),
    edition: str(body.edition, 'Edition', { max: 60 }) || '1st ed.',
    language: str(body.language, 'Language', { max: 60 }) || 'English',
    format,
    category: str(body.category, 'Category', { max: 120 }) || 'General',
    department: str(body.department, 'Department', { max: 120 }) || 'General Studies',
    description: str(body.description, 'Description', { max: 10000 }),
    abstract: str(body.abstract, 'Abstract', { max: 10000 }),
    shelf_location: str(body.shelf_location, 'Shelf location', { max: 60 }),
    total_copies: totalCopies,
    available_copies: availableCopies,
    file_url: publicFilePath(files.file?.[0]) || str(body.file_url, 'File URL', { max: 500 }),
    file_type: files.file?.[0] ? (files.file[0].originalname.endsWith('.epub') ? 'epub' : 'pdf') : str(body.file_type, 'File type', { max: 20 }),
    license_info: str(body.license_info, 'License', { max: 255 }),
    page_count: int(body.page_count, 'Page count', { min: 0, max: 20000, fallback: pages.length }) || pages.length,
    pages_json: json(pages),
    cover_url: publicFilePath(files.cover?.[0]) || str(body.cover_url, 'Cover URL', { max: 500 }),
    tags: json(parseList(body.tags)),
  };
}

const insertResource = (data) => {
  const keys = Object.keys(data);
  return run(`INSERT INTO resources (${keys.join(', ')}, created_at, updated_at) VALUES (${keys.map(() => '?').join(', ')}, ?, ?)`,
    [...Object.values(data), now(), now()]);
};

router.post('/', requireAuth, staffOnly, uploadCatalogFiles, asyncHandler(async (req, res) => {
  const data = payloadFromRequest(req);
  const result = insertResource(data);
  logAction(req.user.id, 'resource.created', 'resource', Number(result.insertId), { title: data.title });
  res.status(201).json({ item: shapeResource(get('SELECT * FROM resources WHERE id = ?', [Number(result.insertId)])) });
}));

router.put('/:id', requireAuth, staffOnly, uploadCatalogFiles, asyncHandler(async (req, res) => {
  const existing = get('SELECT * FROM resources WHERE id = ?', [req.params.id]);
  if (!existing) throw notFound();
  const data = payloadFromRequest(req);
  if (data.format === 'physical' && data.available_copies > data.total_copies) throw badRequest('Available copies cannot exceed total copies.');
  const keys = Object.keys(data);
  run(`UPDATE resources SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`,
    [...Object.values(data), now(), req.params.id]);
  logAction(req.user.id, 'resource.updated', 'resource', req.params.id, { title: data.title });
  res.json({ item: shapeResource(get('SELECT * FROM resources WHERE id = ?', [req.params.id])) });
}));

router.delete('/:id', requireAuth, staffOnly, asyncHandler(async (req, res) => {
  const item = get('SELECT * FROM resources WHERE id = ?', [req.params.id]);
  if (!item) throw notFound();
  const active = get("SELECT COUNT(*) AS n FROM loans WHERE resource_id = ? AND status IN ('active','overdue')", [req.params.id]);
  if (active.n > 0) throw conflict('This resource has active loans and cannot be deleted.');
  run('DELETE FROM resources WHERE id = ?', [req.params.id]);
  logAction(req.user.id, 'resource.deleted', 'resource', req.params.id, { title: item.title });
  res.json({ ok: true });
}));

export default router;
