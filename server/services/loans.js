import { all, get, run, shiftDays, now, shapeResource } from '../db/index.js';
import { badRequest, conflict, notFound } from '../middleware/error.js';
import { overdueDays } from '../utils/dates.js';
import { logAction } from './audit.js';

export const FINE_PER_DAY = 1.5;
export const LOAN_DAYS = 14;

export const enrichLoan = (row) => {
  if (!row) return null;
  return {
    ...row,
    resource: shapeResource({
      id: row.resource_id,
      title: row.title,
      subtitle: row.subtitle || '',
      authors: row.authors || '[]',
      cover_url: row.cover_url || '',
      format: row.format,
      category: row.category || '',
      shelf_location: row.shelf_location || '',
      pages_json: '[]',
      tags: '[]',
      available_copies: row.available_copies ?? 0,
    }),
    days_left: row.returned_at ? null : Math.ceil((new Date(`${row.due_at.replace(' ', 'T')}Z`) - Date.now()) / 86400000),
    overdue_by: row.returned_at ? 0 : overdueDays(row.due_at),
    fine_due: Math.max(0, Number(row.fine_amount || 0) - Number(row.fine_waived || 0)),
  };
};

const LOAN_SELECT = `SELECT l.*, r.title, r.subtitle, r.authors, r.cover_url, r.format, r.category,
  r.shelf_location, r.available_copies, u.name AS user_name, u.email AS user_email
  FROM loans l JOIN resources r ON r.id = l.resource_id JOIN users u ON u.id = l.user_id`;

export const getLoan = (id) => get(`${LOAN_SELECT} WHERE l.id = ?`, [id]);
export const listLoans = (where = '', params = []) => all(`${LOAN_SELECT} ${where} ORDER BY l.issued_at DESC`, params);

export function syncOverdue() {
  run("UPDATE loans SET status = 'overdue' WHERE status = 'active' AND due_at < ?", [now()]);
}

export function issueLoan({ userId, resourceId, actorId, days = LOAN_DAYS, digitalDays = 14 }) {
  const user = get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) throw notFound('Member not found.');
  if (user.status !== 'active') throw badRequest('Only active members can borrow.');
  const resource = get('SELECT * FROM resources WHERE id = ?', [resourceId]);
  if (!resource) throw notFound('Resource not found.');

  const active = get("SELECT id FROM loans WHERE user_id = ? AND resource_id = ? AND status IN ('active','overdue')", [userId, resourceId]);
  if (active) throw conflict('You already have this item on loan.');

  const isPhysical = resource.format === 'physical';
  if (isPhysical && resource.available_copies <= 0) throw conflict('No physical copies are available right now. Reserve it instead.');

  const issuedAt = now();
  const dueAt = shiftDays(days);
  const result = run(
    `INSERT INTO loans (user_id, resource_id, issued_at, due_at, status, digital_expires_at)
     VALUES (?,?,?,?,'active',?)`,
    [userId, resourceId, issuedAt, dueAt, isPhysical ? null : shiftDays(digitalDays)],
  );
  run('UPDATE resources SET borrows = borrows + 1, available_copies = ? WHERE id = ?', [
    isPhysical ? resource.available_copies - 1 : resource.available_copies, resourceId,
  ]);
  logAction(actorId || userId, 'loan.issued', 'loan', Number(result.insertId), {
    title: resource.title, member: user.name, format: resource.format,
  });
  return enrichLoan(getLoan(Number(result.insertId)));
}

export function returnLoan(loanId, actorId) {
  const loan = getLoan(loanId);
  if (!loan) throw notFound('Loan not found.');
  if (loan.returned_at) throw conflict('This item has already been returned.');
  const late = overdueDays(loan.due_at);
  const fine = Number((late * FINE_PER_DAY).toFixed(2));
  run(
    "UPDATE loans SET returned_at = ?, status = 'returned', fine_amount = ? WHERE id = ?",
    [now(), loanId, fine],
  );
  const resource = get('SELECT format, available_copies, total_copies FROM resources WHERE id = ?', [loan.resource_id]);
  if (resource?.format === 'physical') {
    run('UPDATE resources SET available_copies = MIN(total_copies, available_copies + 1) WHERE id = ?', [loan.resource_id]);
  }
  logAction(actorId, 'loan.returned', 'loan', loanId, { title: loan.title, fine });
  return enrichLoan(getLoan(loanId));
}

export function renewLoan(loanId, userId, actorId) {
  const loan = getLoan(loanId);
  if (!loan) throw notFound('Loan not found.');
  if (userId && Number(loan.user_id) !== Number(userId)) throw conflict('This loan belongs to another member.');
  if (loan.returned_at) throw conflict('Returned loans cannot be renewed.');
  if (loan.format !== 'physical') throw badRequest('Digital licenses cannot be renewed; they expire automatically.');
  if (loan.renewed_count >= 2) throw badRequest('This loan has reached the maximum of two renewals.');
  const queued = get("SELECT id FROM reservations WHERE resource_id = ? AND status IN ('pending','approved')", [loan.resource_id]);
  if (queued) throw conflict('A reservation is queued for this item. Return it to give the next reader a turn.');
  run('UPDATE loans SET due_at = ?, renewed_count = renewed_count + 1, status = ? WHERE id = ?', [
    shiftDays(LOAN_DAYS, new Date(`${loan.due_at.replace(' ', 'T')}Z`)), 'active', loanId,
  ]);
  logAction(actorId || userId, 'loan.renewed', 'loan', loanId, { title: loan.title });
  return enrichLoan(getLoan(loanId));
}

export function waiveFine(loanId, actorId) {
  const loan = getLoan(loanId);
  if (!loan) throw notFound('Loan not found.');
  const fine = Math.max(0, Number(loan.fine_amount || 0) - Number(loan.fine_waived || 0));
  if (!fine) throw badRequest('There is no outstanding fine on this loan.');
  run('UPDATE loans SET fine_waived = fine_amount WHERE id = ?', [loanId]);
  logAction(actorId, 'fine.waived', 'loan', loanId, { amount: fine, title: loan.title });
  return enrichLoan(getLoan(loanId));
}

export function payFine(loanId, userId, method = 'online') {
  const loan = getLoan(loanId);
  if (!loan) throw notFound('Loan not found.');
  const due = Math.max(0, Number(loan.fine_amount || 0) - Number(loan.fine_waived || 0));
  if (!due) throw badRequest('There is no outstanding fine on this loan.');
  run('UPDATE loans SET fine_waived = fine_amount WHERE id = ?', [loanId]);
  run('INSERT INTO fine_payments (user_id, loan_id, amount, paid_at, method) VALUES (?,?,?,?,?)', [
    userId, loanId, due, now(), method,
  ]);
  return enrichLoan(getLoan(loanId));
}
