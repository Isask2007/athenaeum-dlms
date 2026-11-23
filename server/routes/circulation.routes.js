import { Router } from 'express';
import { all, get, run, now, shiftDays, shapeResource } from '../db/index.js';
import { requireAuth, staffOnly } from '../middleware/auth.js';
import { asyncHandler, badRequest, notFound } from '../middleware/error.js';
import { int, oneOf } from '../middleware/validate.js';
import { enrichLoan, getLoan, issueLoan, renewLoan, returnLoan, syncOverdue, waiveFine, FINE_PER_DAY } from '../services/loans.js';
import { logAction } from '../services/audit.js';

const router = Router();
router.use(requireAuth, staffOnly);

router.get('/members', asyncHandler(async (_req, res) => {
  const rows = all("SELECT id, name, email, member_id, department, role FROM users WHERE status = 'active' AND role <> 'admin' ORDER BY name LIMIT 300");
  res.json({ items: rows });
}));

router.get('/loans', asyncHandler(async (req, res) => {
  syncOverdue();
  const status = oneOf(req.query.status, ['all', 'active', 'overdue', 'returned'], 'Status') || 'all';
  const where = status === 'all' ? '' : status === 'active'
    ? "WHERE l.status IN ('active','overdue')" : 'WHERE l.status = ?';
  const params = status === 'active' ? [] : status === 'all' ? [] : [status];
  const rows = all(`SELECT l.*, r.title, r.subtitle, r.authors, r.cover_url, r.format, r.category,
    r.shelf_location, r.available_copies, u.name AS user_name, u.email AS user_email
    FROM loans l JOIN resources r ON r.id = l.resource_id JOIN users u ON u.id = l.user_id
    ${where} ORDER BY l.issued_at DESC LIMIT 200`, params);
  res.json({ items: rows.map(enrichLoan), fine_per_day: FINE_PER_DAY });
}));

router.post('/loans', asyncHandler(async (req, res) => {
  const userId = int(req.body.user_id, 'Member', { min: 1, fallback: 0 });
  const resourceId = int(req.body.resource_id, 'Resource', { min: 1, fallback: 0 });
  if (!userId || !resourceId) throw badRequest('Select a member and a resource.');
  const days = int(req.body.days, 'Loan period', { min: 1, max: 90, fallback: 14 });
  res.status(201).json({ item: issueLoan({ userId, resourceId, actorId: req.user.id, days }) });
}));

router.post('/loans/:id/return', asyncHandler(async (req, res) => {
  res.json({ item: returnLoan(req.params.id, req.user.id) });
}));

router.post('/loans/:id/renew', asyncHandler(async (req, res) => {
  res.json({ item: renewLoan(req.params.id, null, req.user.id) });
}));

router.post('/loans/:id/waive', asyncHandler(async (req, res) => {
  res.json({ item: waiveFine(req.params.id, req.user.id) });
}));

router.post('/loans/:id/extend', asyncHandler(async (req, res) => {
  const loan = getLoan(req.params.id);
  if (!loan) throw notFound('Loan not found.');
  const days = int(req.body.days, 'Days', { min: 1, max: 365, fallback: 7 });
  const base = loan.digital_expires_at
    ? new Date(`${String(loan.digital_expires_at).replace(' ', 'T')}Z`)
    : new Date(`${String(loan.due_at).replace(' ', 'T')}Z`);
  const next = shiftDays(days, base);
  if (loan.digital_expires_at) run('UPDATE loans SET digital_expires_at = ? WHERE id = ?', [next, loan.id]);
  run('UPDATE loans SET due_at = ? WHERE id = ?', [next, loan.id]);
  logAction(req.user.id, 'loan.extended', 'loan', loan.id, { days, title: loan.title });
  res.json({ item: enrichLoan(getLoan(loan.id)) });
}));

router.get('/reservations', asyncHandler(async (_req, res) => {
  const rows = all(`SELECT r.*, rs.title, rs.cover_url, rs.format, rs.available_copies,
    u.name AS user_name, u.email AS user_email
    FROM reservations r JOIN resources rs ON rs.id = r.resource_id JOIN users u ON u.id = r.user_id
    ORDER BY CASE r.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, r.reserved_at DESC`);
  res.json({ items: rows.map((r) => ({ ...r, resource: shapeResource(r) })) });
}));

router.post('/reservations/:id/approve', asyncHandler(async (req, res) => {
  const row = get('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
  if (!row) throw notFound('Reservation not found.');
  run("UPDATE reservations SET status = 'approved', approved_by = ?, approved_at = ?, expires_at = ? WHERE id = ?",
    [req.user.id, now(), shiftDays(7), row.id]);
  logAction(req.user.id, 'reservation.approved', 'reservation', row.id, {});
  res.json({ item: get('SELECT * FROM reservations WHERE id = ?', [row.id]) });
}));

router.post('/reservations/:id/fulfill', asyncHandler(async (req, res) => {
  const row = get('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
  if (!row) throw notFound('Reservation not found.');
  if (row.status === 'cancelled') throw badRequest('This reservation was cancelled.');
  const loan = issueLoan({ userId: row.user_id, resourceId: row.resource_id, actorId: req.user.id });
  run("UPDATE reservations SET status = 'fulfilled' WHERE id = ?", [row.id]);
  logAction(req.user.id, 'reservation.fulfilled', 'reservation', row.id, {});
  res.status(201).json({ item: loan });
}));

router.post('/reservations/:id/cancel', asyncHandler(async (req, res) => {
  const row = get('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
  if (!row) throw notFound('Reservation not found.');
  run("UPDATE reservations SET status = 'cancelled' WHERE id = ?", [row.id]);
  logAction(req.user.id, 'reservation.cancelled', 'reservation', row.id, {});
  res.json({ ok: true });
}));

router.get('/fines', asyncHandler(async (_req, res) => {
  const rows = all(`SELECT l.id, l.fine_amount, l.fine_waived, l.due_at, l.returned_at,
    r.title, u.name AS user_name, u.email AS user_email
    FROM loans l JOIN resources r ON r.id = l.resource_id JOIN users u ON u.id = l.user_id
    WHERE l.fine_amount > 0 ORDER BY l.returned_at DESC`);
  res.json({
    items: rows.map((row) => ({
      ...row,
      fine_due: Number((row.fine_amount - row.fine_waived).toFixed(2)),
    })),
    collected: Number(get('SELECT COALESCE(SUM(amount), 0) AS n FROM fine_payments')?.n || 0),
  });
}));

export default router;
