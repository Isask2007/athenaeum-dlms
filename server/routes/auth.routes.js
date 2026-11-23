import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { get, run, now } from '../db/index.js';
import { signToken, publicUser, requireAuth } from '../middleware/auth.js';
import { asyncHandler, badRequest, conflict, unauthorized } from '../middleware/error.js';
import { email, oneOf, password, str } from '../middleware/validate.js';

const router = Router();

router.post('/register', asyncHandler(async (req, res) => {
  const name = str(req.body.name, 'Name', { required: true, max: 120 });
  const mail = email(req.body.email);
  const pass = password(req.body.password);
  const role = oneOf(req.body.role, ['member', 'librarian', 'admin'], 'role') || 'member';
  if (get('SELECT id FROM users WHERE email = ?', [mail])) throw conflict('An account with this email already exists.');
  const prefix = { member: 'STU', librarian: 'LIB', admin: 'ADM' }[role];
  const result = run(
    'INSERT INTO users (name, email, password_hash, role, status, department, member_id, created_at) VALUES (?,?,?,?,?,?,?,?)',
    [name, mail, await bcrypt.hash(pass, 10), role, 'active',
      str(req.body.department, 'Department', { max: 120 }) || 'General Studies', `${prefix}-${Date.now().toString().slice(-6)}`, now()],
  );
  const user = get('SELECT * FROM users WHERE id = ?', [Number(result.insertId)]);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const mail = email(req.body.email);
  const pass = str(req.body.password, 'Password', { required: true });
  const user = get('SELECT * FROM users WHERE email = ?', [mail]);
  if (!user || !(await bcrypt.compare(pass, user.password_hash))) throw unauthorized('Invalid email or password.');
  if (user.status === 'suspended') throw unauthorized('This account has been suspended. Contact the library administration.');
  if (user.status === 'pending') throw unauthorized('Your account is awaiting administrator approval.');
  res.json({ token: signToken(user), user: publicUser(user) });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
router.post('/logout', (_req, res) => res.json({ ok: true }));

export default router;
