import { Router } from 'express';
import { all, get, run, now, shiftDays, shapeResource } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, badRequest, conflict, notFound } from '../middleware/error.js';
import { str, oneOf } from '../middleware/validate.js';
import { enrichLoan, getLoan, listLoans, payFine, renewLoan, issueLoan, syncOverdue } from '../services/loans.js';

const router = Router();
router.use(requireAuth);

router.get('/overview', asyncHandler(async (req, res) => {
  const id = req.user.id;
  const loans = listLoans('WHERE l.user_id = ?', [id]);
  const active = loans.filter((l) => !l.returned_at);
  const nowMs = Date.now();
  const dueSoon = active.filter((l) => {
    const due = new Date(`${String(l.due_at).replace(' ', 'T')}Z`).getTime();
    return due >= nowMs && due - nowMs <= 7 * 86400000;
  });
  const overdue = active.filter((l) => new Date(`${String(l.due_at).replace(' ', 'T')}Z`).getTime() < nowMs);
  const fines = loans.reduce((sum, l) => sum + Math.max(0, Number(l.fine_amount || 0) - Number(l.fine_waived || 0)), 0);
  const reservations = all('SELECT r.*, rs.title, rs.cover_url, rs.format FROM reservations r JOIN resources rs ON rs.id = r.resource_id WHERE r.user_id = ? ORDER BY r.reserved_at DESC', [id]);
  res.json({
    stats: {
      active_borrows: active.length,
      due_soon: dueSoon.length,
      overdue: overdue.length,
      reservations: reservations.filter((r) => r.status === 'pending' || r.status === 'approved').length,
      bookmarks: Number(get('SELECT COUNT(*) AS n FROM bookmarks WHERE user_id = ?', [id])?.n || 0),
      pending_fines: Number(fines.toFixed(2)),
    },
    digital_shelf: active.filter((l) => l.format !== 'physical').map(enrichLoan),
    recent_loans: loans.slice(0, 5).map(enrichLoan),
  });
}));

router.get('/loans', asyncHandler(async (req, res) => {
  syncOverdue();
  const status = oneOf(req.query.status, ['active', 'returned', 'overdue', 'all'], 'Status') || 'all';
  let where = 'WHERE l.user_id = ?';
  if (status !== 'all') where += status === 'active' ? " AND l.status IN ('active','overdue')" : ' AND l.status = ?';
  const params = status === 'returned' || status === 'overdue' ? [req.user.id, status] : [req.user.id];
  res.json({ items: listLoans(where, params).map(enrichLoan) });
}));

router.post('/loans', asyncHandler(async (req, res) => {
  const resourceId = req.body.resource_id || req.body.resourceId;
  if (!resourceId) throw badRequest('Select a resource to borrow.');
  res.status(201).json({ item: issueLoan({ userId: req.user.id, resourceId, actorId: req.user.id }) });
}));

router.post('/loans/:id/renew', asyncHandler(async (req, res) => {
  res.json({ item: renewLoan(req.params.id, req.user.id, req.user.id) });
}));

router.post('/loans/:id/pay', asyncHandler(async (req, res) => {
  res.json({ item: payFine(req.params.id, req.user.id, oneOf(req.body.method, ['online', 'cash'], 'Method') || 'online') });
}));

router.get('/bookmarks', asyncHandler(async (req, res) => {
  const rows = all('SELECT rs.* FROM bookmarks b JOIN resources rs ON rs.id = b.resource_id WHERE b.user_id = ? ORDER BY b.created_at DESC', [req.user.id]);
  res.json({ items: rows.map(shapeResource) });
}));

router.post('/bookmarks/:resourceId', asyncHandler(async (req, res) => {
  const resource = get('SELECT id FROM resources WHERE id = ?', [req.params.resourceId]);
  if (!resource) throw notFound('Resource not found.');
  const existing = get('SELECT id FROM bookmarks WHERE user_id = ? AND resource_id = ?', [req.user.id, resource.id]);
  if (existing) {
    run('DELETE FROM bookmarks WHERE id = ?', [existing.id]);
    return res.json({ bookmarked: false });
  }
  run('INSERT INTO bookmarks (user_id, resource_id, created_at) VALUES (?,?,?)', [req.user.id, resource.id, now()]);
  res.status(201).json({ bookmarked: true });
}));

router.get('/reservations', asyncHandler(async (req, res) => {
  const rows = all(`SELECT r.*, rs.title, rs.subtitle, rs.cover_url, rs.format, rs.authors,
    rs.available_copies FROM reservations r JOIN resources rs ON rs.id = r.resource_id
    WHERE r.user_id = ? ORDER BY r.reserved_at DESC`, [req.user.id]);
  res.json({ items: rows.map((r) => ({ ...r, resource: shapeResource(r) })) });
}));

router.post('/reservations', asyncHandler(async (req, res) => {
  const resourceId = req.body.resource_id || req.body.resourceId;
  const resource = get('SELECT * FROM resources WHERE id = ?', [resourceId]);
  if (!resource) throw notFound('Resource not found.');
  if (resource.format !== 'physical') throw badRequest('Digital resources are available to read immediately; no reservation needed.');
  const duplicate = get("SELECT id FROM reservations WHERE user_id = ? AND resource_id = ? AND status IN ('pending','approved')", [req.user.id, resourceId]);
  if (duplicate) throw conflict('You already have an active reservation for this item.');
  const activeLoan = get("SELECT id FROM loans WHERE user_id = ? AND resource_id = ? AND status IN ('active','overdue')", [req.user.id, resourceId]);
  if (activeLoan) throw conflict('This item is already on your loan list.');
  const result = run('INSERT INTO reservations (user_id, resource_id, reserved_at, status) VALUES (?,?,?,\'pending\')',
    [req.user.id, resourceId, now()]);
  res.status(201).json({ item: get('SELECT * FROM reservations WHERE id = ?', [Number(result.insertId)]) });
}));

router.delete('/reservations/:id', asyncHandler(async (req, res) => {
  const row = get('SELECT * FROM reservations WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!row) throw notFound('Reservation not found.');
  run("UPDATE reservations SET status = 'cancelled' WHERE id = ?", [row.id]);
  res.json({ ok: true });
}));

router.get('/requests', asyncHandler(async (req, res) => {
  res.json({ items: all('SELECT * FROM resource_requests WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]) });
}));

router.post('/requests', asyncHandler(async (req, res) => {
  const title = str(req.body.title, 'Title', { required: true, max: 255 });
  const author = str(req.body.author, 'Author', { max: 160 });
  const note = str(req.body.note, 'Note', { max: 2000 });
  const result = run('INSERT INTO resource_requests (user_id, title, author, note, status, created_at) VALUES (?,?,?,?,\'pending\',?)',
    [req.user.id, title, author, note, now()]);
  res.status(201).json({ item: get('SELECT * FROM resource_requests WHERE id = ?', [Number(result.insertId)]) });
}));

router.get('/digital-shelf', asyncHandler(async (req, res) => {
  const rows = all(`SELECT l.*, rs.title, rs.cover_url, rs.file_url, rs.file_type, rs.format FROM loans l
    JOIN resources rs ON rs.id = l.resource_id WHERE l.user_id = ? AND l.returned_at IS NULL
    AND rs.format <> 'physical' ORDER BY l.digital_expires_at ASC`, [req.user.id]);
  res.json({ items: rows.map(enrichLoan) });
}));

router.post('/loans/:id/borrow-digital', asyncHandler(async (req, res) => {
  const resourceId = req.params.id;
  const resource = get('SELECT * FROM resources WHERE id = ?', [resourceId]);
  if (!resource || resource.format === 'physical') throw notFound('Digital resource not found.');
  res.json({ item: issueLoan({ userId: req.user.id, resourceId, actorId: req.user.id, digitalDays: 14 }) });
}));

export default router;
