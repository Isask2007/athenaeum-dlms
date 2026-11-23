import bcrypt from 'bcryptjs';
import { all, get, json, now, run, shiftDays, transaction } from './index.js';
import { resources, demoAccounts } from './seed-data.js';
import { initDb } from './index.js';

const insert = (table, data) => {
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  return run(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`, keys.map((k) => data[k]));
};

const iso = (days) => shiftDays(days);

export async function seed() {
  await initDb();
  const existing = get('SELECT COUNT(*) AS n FROM users');
  if (existing.n > 0) {
    console.log(`Seed skipped — ${existing.n} users already present.`);
    return;
  }

  await transaction(async (q) => {
    const qrun = q.run;

    const users = [];
    for (const account of demoAccounts) {
      const password_hash = await bcrypt.hash(account.password, 10);
      const result = await qrun(
        'INSERT INTO users (name, email, password_hash, role, status, department, member_id, created_at) VALUES (?,?,?,?,?,?,?,?)',
        [account.name, account.email, password_hash, account.role, account.status, account.department, account.member_id, shiftDays(-120)],
      );
      users.push({ ...account, id: Number(result.insertId) });
    }
    const user = (email) => users.find((u) => u.email === email).id;

    const items = [];
    for (const item of resources) {
      const result = await qrun(
        `INSERT INTO resources (title, subtitle, authors, isbn, issn, publisher, publication_year, edition,
          language, format, category, department, description, abstract, shelf_location, total_copies,
          available_copies, file_url, file_type, license_info, page_count, pages_json, cover_url, tags,
          views, borrows, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [item.title, item.subtitle, json(item.authors), item.isbn, item.issn, item.publisher, item.year,
          item.edition, item.language, item.format, item.category, item.department, item.description,
          item.abstract, item.shelf, item.total_copies, item.available_copies, item.file_url, item.file_type,
          item.license_info, item.page_count, json(item.pages_json), item.cover_url, json(item.tags),
          item.views, item.borrows, shiftDays(-200), now()],
      );
      items.push({ ...item, id: Number(result.insertId) });
    }
    const res = (title) => items.find((r) => r.title === title).id;

    const loans = [
      { user: 'member@athenaeum.edu', title: 'Foundations of Machine Learning', issued: -6, due: 8, digital: 9, status: 'active' },
      { user: 'member@athenaeum.edu', title: 'The Architecture of Distributed Systems', issued: -9, due: 5, status: 'active' },
      { user: 'member@athenaeum.edu', title: 'Data Structures and Algorithms in Practice', issued: -13, due: 1, status: 'active' },
      { user: 'member@athenaeum.edu', title: 'The Structure of Scientific Revolutions', issued: -40, due: -12, returned: -4, status: 'returned', fine: 6 },
      { user: 'taylor.chen@athenaeum.edu', title: 'Quantum Mechanics: A Modern Introduction', issued: -35, due: -3, status: 'overdue' },
      { user: 'alex.okafor@athenaeum.edu', title: 'Economic Theory for Public Policy', issued: -2, due: 12, status: 'active' },
      { user: 'morgan.patel@athenaeum.edu', title: 'Designing Accessible Interfaces', issued: -4, due: 10, digital: 6, status: 'active' },
      { user: 'riley.brooks@athenaeum.edu', title: 'Statistical Inference for Researchers', issued: -11, due: 3, digital: 3, status: 'active' },
      { user: 'jamie.silva@athenaeum.edu', title: 'Renewable Energy Systems', issued: -20, due: -6, status: 'overdue' },
      { user: 'taylor.chen@athenaeum.edu', title: 'Urban Planning and Sustainable Cities', issued: -60, due: -30, returned: -28, status: 'returned', fine: 0 },
      { user: 'alex.okafor@athenaeum.edu', title: 'Biomedical Ethics in Clinical Practice', issued: -25, due: -10, returned: -9, status: 'returned', fine: 3 },
    ];
    for (const loan of loans) {
      const resource = items.find((r) => r.title === loan.title);
      await qrun(
        `INSERT INTO loans (user_id, resource_id, issued_at, due_at, returned_at, status, fine_amount, fine_waived, digital_expires_at, renewed_count)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [user(loan.user), res(loan.title), iso(loan.issued), iso(loan.due),
          loan.returned ? iso(loan.returned) : null, loan.status, loan.fine || 0, 0,
          loan.digital ? iso(loan.digital) : null, loan.due > 0 && loan.issued < -8 ? 1 : 0],
      );
      if (loan.status !== 'returned' && resource.format === 'physical') {
        await qrun('UPDATE resources SET available_copies = MAX(0, available_copies - 1) WHERE id = ?', [resource.id]);
      }
    }

    const reservations = [
      ['member@athenaeum.edu', 'Quantum Mechanics: A Modern Introduction', 'pending'],
      ['member@athenaeum.edu', 'Urban Planning and Sustainable Cities', 'approved'],
      ['taylor.chen@athenaeum.edu', 'The Architecture of Distributed Systems', 'pending'],
      ['alex.okafor@athenaeum.edu', 'Renewable Energy Systems', 'approved'],
      ['riley.brooks@athenaeum.edu', 'The Art of Academic Writing', 'pending'],
    ];
    for (const [email, title, status] of reservations) {
      await qrun(
        'INSERT INTO reservations (user_id, resource_id, reserved_at, status, approved_by, approved_at, expires_at) VALUES (?,?,?,?,?,?,?)',
        [user(email), res(title), iso(-3), status, status === 'approved' ? user('librarian@athenaeum.edu') : null,
          status === 'approved' ? iso(-2) : null, status === 'approved' ? iso(5) : null],
      );
    }

    for (const title of ['Foundations of Machine Learning', 'Climate Change and Global Policy', 'Designing Accessible Interfaces', 'The Art of Academic Writing']) {
      await qrun('INSERT INTO bookmarks (user_id, resource_id, created_at) VALUES (?,?,?)', [user('member@athenaeum.edu'), res(title), iso(-5)]);
    }

    await qrun(
      'INSERT INTO resource_requests (user_id, title, author, note, status, created_at) VALUES (?,?,?,?,?,?)',
      [user('member@athenaeum.edu'), 'A History of Artificial Intelligence', 'Nils Nilsson',
        'Would be very useful for the AI seminar next semester.', 'pending', iso(-2)],
    );

    await qrun(
      'INSERT INTO fine_payments (user_id, loan_id, amount, paid_at, method) VALUES (?,?,?,?,?)',
      [user('alex.okafor@athenaeum.edu'), 11, 3, iso(-9), 'online'],
    );

    const logs = [
      ['admin@athenaeum.edu', 'user.approved', 'user', 7, { name: 'Casey Nguyen' }, -10],
      ['librarian@athenaeum.edu', 'loan.issued', 'loan', 1, { title: 'Foundations of Machine Learning' }, -6],
      ['librarian@athenaeum.edu', 'reservation.approved', 'reservation', 2, { title: 'Urban Planning and Sustainable Cities' }, -2],
      ['admin@athenaeum.edu', 'user.suspended', 'user', 10, { name: 'Drew Kim' }, -1],
    ];
    for (const [email, action, targetType, targetId, detail, days] of logs) {
      await qrun(
        'INSERT INTO audit_logs (actor_id, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,?)',
        [user(email), action, targetType, targetId, json(detail), iso(days)],
      );
    }
  });

  console.log(`Seeded ${demoAccounts.length} users and ${resources.length} resources.`);
  console.log('Demo logins: admin@athenaeum.edu / Admin@1234 · librarian@athenaeum.edu / Librarian@1234 · member@athenaeum.edu / Member@1234');
}

if (process.argv[1] && /seed\.js$/.test(process.argv[1])) {
  seed().catch((error) => { console.error('Seed failed:', error); process.exitCode = 1; });
}
