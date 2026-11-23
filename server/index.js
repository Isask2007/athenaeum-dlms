import app from './app.js';
import { config } from './config.js';
import { db, get, initDb } from './db/index.js';
import { seed } from './db/seed.js';

async function start() {
  await initDb();
  const users = get('SELECT COUNT(*) AS n FROM users');
  if (!users?.n) await seed();
  const server = app.listen(config.port, () => {
    console.log(`\n  Athenaeum API  →  http://localhost:${config.port}`);
    console.log(`  Database       →  ${db().name}`);
    console.log(`  Health check   →  http://localhost:${config.port}/api/health\n`);
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => { console.error('Failed to start server:', error); process.exitCode = 1; });
