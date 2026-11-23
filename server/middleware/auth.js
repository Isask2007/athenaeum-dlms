import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { get } from '../db/index.js';
import { unauthorized, forbidden, asyncHandler } from './error.js';

export const signToken = (user) => jwt.sign(
  { sub: user.id, role: user.role, name: user.name },
  config.jwtSecret,
  { expiresIn: config.jwtExpires },
);

export const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  department: user.department,
  member_id: user.member_id,
  created_at: user.created_at,
});

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw unauthorized('Please sign in to continue.');
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw unauthorized('Your session has expired. Please sign in again.');
  }
  const user = get('SELECT * FROM users WHERE id = ?', [payload.sub]);
  if (!user) throw unauthorized('Account no longer exists.');
  if (user.status !== 'active') throw forbidden('This account is not active. Contact the library administration.');
  req.user = user;
  next();
});

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden());
  next();
};

export const staffOnly = requireRole('admin', 'librarian');
