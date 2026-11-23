import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');

// Minimal .env loader (no extra dependency required).
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

const num = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export const config = {
  port: num(process.env.PORT, 4000),
  jwtSecret: process.env.JWT_SECRET || 'dlms-dev-secret-change-in-production',
  jwtExpires: process.env.JWT_EXPIRES || '7d',
  dbDriver: (process.env.DB_DRIVER || 'sqlite').toLowerCase(),
  sqliteFile: path.resolve(ROOT, process.env.SQLITE_FILE || 'server/data/dlms.sqlite'),
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: num(process.env.MYSQL_PORT, 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'dlms',
  },
  maxUploadMb: num(process.env.MAX_UPLOAD_MB, 20),
  storageDir: path.join(ROOT, 'server', 'storage'),
  publicDir: path.join(ROOT, 'public'),
  distDir: path.join(ROOT, 'dist'),
  isProd: process.env.NODE_ENV === 'production',
};
