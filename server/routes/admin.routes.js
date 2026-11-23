import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { all, get, run, now, parseJson } from '../db/index.js';
import { requireAuth, requireRole, publicUser } from '../middleware/auth.js';
import { asyncHandler, badRequest, notFound, conflict } from '../middleware/error.js';
import { email, password, str, oneOf, int } from '../middleware/validate.js';
import { logAction } from '../services/audit.js';
import { overview } from '../services/analytics.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/users', asyncHandler(async (req, res) => {
  const search = `%${str(req.query.search, 'Search', { max: 120 }).toLowerCase()}%`;
  const role = oneOf(req.query.role, ['admin', 'librarian', 'member'], 'Role');
  const status = oneOf(req.query.status, ['active', 'pending', 'suspended'], 'Status');
  const clauses = ['(LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(member_id) LIKE ?)'];
  const params = [search, search, search];
  if (role) { clauses.push('role = ?'); params.push(role); }
  if (status) { clauses.push('status = ?'); params.push(status); }
  const rows = all(`SELECT * FROM users WHERE ${clauses.join(' AND ')} ORDER BY id LIMIT 300`, params);
  res.json({ items: rows.map(publicUser) });
}));

router.post('/users', asyncHandler(async (req, res) => {
  const mail = email(req.body.email);
  if (get('SELECT id FROM users WHERE email = ?', [mail])) throw conflict('That email is already registered.');
  const role = oneOf(req.body.role, ['admin', 'librarian', 'member'], 'Role') || 'member';
  const name = str(req.body.name, 'Name', { required: true, max: 120 });
  const result = run(
    'INSERT INTO users (name, email, password_hash, role, status, department, member_id, created_at) VALUES (?,?,?,?,?,?,?,?)',
    [name, mail, await bcrypt.hash(password(req.body.password || 'Library@1234'), 10), role,
      'active', str(req.body.department, 'Department', { max: 120 }) || 'General Studies',
      str(req.body.member_id, 'Member ID', { max: 40 }) || `USR-${Date.now().toString().slice(-6)}`, now()],
  );
  logAction(req.user.id, 'user.created', 'user', Number(result.insertId), { name, role });
  res.status(201).json({ user: publicUser(get('SELECT * FROM users WHERE id = ?', [Number(result.insertId)])) });
}));

router.patch('/users/:id', asyncHandler(async (req, res) => {
  const user = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) throw notFound('User not found.');
  const status = oneOf(req.body.status, ['active', 'pending', 'suspended'], 'Status');
  const role = oneOf(req.body.role, ['admin', 'librarian', 'member'], 'Role');
  if (!status && !role) throw badRequest('Provide a status or role to update.');
  if (Number(user.id) === Number(req.user.id) && (status === 'suspended' || (role && role !== 'admin'))) {
    throw badRequest('You cannot change your own admin access.');
  }
  run('UPDATE users SET status = ?, role = ? WHERE id = ?', [status || user.status, role || user.role, user.id]);
  logAction(req.user.id, status && status !== user.status ? `user.${status}` : 'user.role_changed', 'user', user.id,
    { name: user.name, from: { status: user.status, role: user.role }, to: { status: status || user.status, role: role || user.role } });
  res.json({ user: publicUser(get('SELECT * FROM users WHERE id = ?', [user.id])) });
}));

router.get('/audit-logs', asyncHandler(async (req, res) => {
  const rows = all(`SELECT a.*, u.name AS actor_name, u.email AS actor_email
    FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.id DESC LIMIT 200`);
  res.json({ items: rows.map((row) => ({ ...row, detail: parseJson(row.detail, {}) })) });
}));

router.get('/requests', asyncHandler(async (_req, res) => {
  const rows = all(`SELECT q.*, u.name AS user_name, u.email AS user_email FROM resource_requests q
    JOIN users u ON u.id = q.user_id ORDER BY q.created_at DESC`);
  res.json({ items: rows });
}));

router.patch('/requests/:id', asyncHandler(async (req, res) => {
  const status = oneOf(req.body.status, ['approved', 'declined', 'pending'], 'Status');
  if (!status) throw badRequest('Choose a status.');
  const row = get('SELECT * FROM resource_requests WHERE id = ?', [req.params.id]);
  if (!row) throw notFound('Request not found.');
  run('UPDATE resource_requests SET status = ? WHERE id = ?', [status, row.id]);
  logAction(req.user.id, `request.${status}`, 'request', row.id, { title: row.title });
  res.json({ item: get('SELECT * FROM resource_requests WHERE id = ?', [row.id]) });
}));

router.get('/summary', (_req, res) => res.json({ ...overview() }));

export default router;
