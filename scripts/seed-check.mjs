/** Verifies that the database and generated assets are ready to use. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb, all, get } from '../server/db/index.js';
import { resources, demoAccounts } from '../server/db/seed-data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];
let failed = 0;

function check(label, condition, detail) {
  checks.push({ label, ok: Boolean(condition), detail });
  if (!condition) failed++;
}

await initDb();

const count = (table) => Number(get(`SELECT COUNT(*) AS n FROM ${table}`)?.n || 0);
const tables = ['users', 'resources', 'loans', 'reservations', 'bookmarks', 'resource_requests', 'fine_payments', 'audit_logs'];
const counts = Object.fromEntries(tables.map((table) => [table, count(table)]));

for (const table of tables) check(`${table} table exists`, true, `${counts[table]} rows`);
for (const table of ['users', 'resources', 'loans', 'reservations', 'bookmarks', 'resource_requests', 'audit_logs']) {
  check(`${table} table has rows`, counts[table] > 0, `${counts[table]} rows`);
}

check('18 seeded resources', counts.resources === resources.length, `${counts.resources} found`);
check('seeded accounts', counts.users === demoAccounts.length, `${counts.users} found`);

for (const role of ['admin', 'librarian', 'member']) {
  const row = get('SELECT id FROM users WHERE role = ? LIMIT 1', [role]);
  check(`${role} account exists`, Boolean(row), row ? `id ${row.id}` : 'missing');
}

for (const status of ['active', 'pending', 'suspended']) {
  const row = get('SELECT id FROM users WHERE status = ? LIMIT 1', [status]);
  check(`${status} user state present`, Boolean(row), row ? `id ${row.id}` : 'missing');
}

const overdue = get("SELECT id FROM loans WHERE status = 'overdue' LIMIT 1");
check('overdue loan for fine flows', Boolean(overdue), overdue ? `id ${overdue.id}` : 'missing');

const fine = get('SELECT id, fine_amount FROM loans WHERE fine_amount > 0 LIMIT 1');
check('seeded fine amount', Boolean(fine), fine ? `$${fine.fine_amount}` : 'missing');

const reservation = get("SELECT id FROM reservations WHERE status IN ('pending','approved') LIMIT 1");
check('pending/approved reservation', Boolean(reservation), reservation ? `id ${reservation.id}` : 'missing');

for (const item of resources) {
  const cover = path.join(root, 'public', item.cover_url.replace(/^\//, ''));
  check(`cover: ${item.cover_url}`, fs.existsSync(cover));
  if (item.file_url) {
    const file = path.join(root, 'public', item.file_url.replace(/^\//, ''));
    check(`digital file: ${item.file_url}`, fs.existsSync(file) && fs.statSync(file).size > 400);
  }
}

const width = Math.max(...checks.map((c) => c.label.length));
for (const entry of checks) {
  const mark = entry.ok ? '✓' : '✗';
  const detail = entry.detail ? `  ${entry.detail}` : '';
  console.log(`${mark} ${entry.label.padEnd(width)}${detail}`);
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
if (failed) {
  console.error(`\nSeed check failed (${failed} problem${failed === 1 ? '' : 's'}). Run "npm run assets" and "npm run seed".`);
  process.exitCode = 1;
} else {
  console.log('Database and assets are ready. Run "npm start" to launch the app.');
}
