import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let impl;
let driver;

const normalize = (params = []) => params.map((p) => (p === undefined ? null : p));

async function initSqlite() {
  const { DatabaseSync } = await import('node:sqlite');
  fs.mkdirSync(path.dirname(config.sqliteFile), { recursive: true });
  const database = new DatabaseSync(config.sqliteFile);
  database.exec('PRAGMA foreign_keys = ON;');
  database.exec(fs.readFileSync(path.join(__dirname, 'schema.sqlite.sql'), 'utf8'));
  return {
    name: 'sqlite',
    all: (sql, params = []) => database.prepare(sql).all(...normalize(params)),
    get: (sql, params = []) => database.prepare(sql).get(...normalize(params)) ?? null,
    run: (sql, params = []) => {
      const info = database.prepare(sql).run(...normalize(params));
      return { insertId: Number(info.lastInsertRowid), affectedRows: Number(info.changes) };
    },
    begin: () => database.exec('BEGIN'),
    commit: () => database.exec('COMMIT'),
    rollback: () => database.exec('ROLLBACK'),
    close: () => database.close(),
  };
}

async function initMysql() {
  const mysql = await import('mysql2/promise');
  const pool = mysql.createPool({
    ...config.mysql,
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true,
    dateStrings: true,
  });
  await pool.query(fs.readFileSync(path.join(__dirname, 'schema.mysql.sql'), 'utf8'));
  return {
    name: 'mysql',
    all: async (sql, params = []) => (await pool.execute(sql, normalize(params)))[0],
    get: async (sql, params = []) => ((await pool.execute(sql, normalize(params)))[0])[0] ?? null,
    run: async (sql, params = []) => {
      const [result] = await pool.execute(sql, normalize(params));
      return { insertId: Number(result.insertId), affectedRows: Number(result.affectedRows) };
    },
    begin: async () => { const conn = await pool.getConnection(); await conn.beginTransaction(); return conn; },
    commit: async (conn) => { await conn.commit(); conn.release(); },
    rollback: async (conn) => { await conn.rollback(); conn.release(); },
    close: () => pool.end(),
  };
}

export async function initDb() {
  driver = config.dbDriver === 'mysql' ? await initMysql() : await initSqlite();
  return driver;
}

export function db() {
  if (!driver) throw new Error('Database not initialized. Call initDb() first.');
  return driver;
}

export const all = (...args) => db().all(...args);
export const get = (...args) => db().get(...args);
export const run = (...args) => db().run(...args);

/** Run a set of statements atomically. Callback receives a scoped query object. */
export async function transaction(fn) {
  const d = db();
  if (d.name === 'mysql') {
    const conn = await d.begin();
    try {
      const result = await fn({
        all: (sql, params = []) => conn.execute(sql, normalize(params)).then((r) => r[0]),
        get: (sql, params = []) => conn.execute(sql, normalize(params)).then((r) => r[0][0] ?? null),
        run: (sql, params = []) => conn.execute(sql, normalize(params)).then(([r]) => ({
          insertId: Number(r.insertId), affectedRows: Number(r.affectedRows),
        })),
      });
      await d.commit(conn);
      return result;
    } catch (error) {
      await d.rollback(conn);
      throw error;
    }
  }
  d.begin();
  try {
    const result = await fn(d);
    d.commit();
    return result;
  } catch (error) {
    d.rollback();
    throw error;
  }
}

/** UTC timestamp understood by both SQLite and MySQL. */
export const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
export const shiftDays = (days, from = new Date()) =>
  new Date(from.getTime() + days * 86400000).toISOString().slice(0, 19).replace('T', ' ');

/** JSON fields are stored as TEXT in SQLite and as JSON in MySQL; always return a string. */
export const json = (value) => JSON.stringify(value ?? []);
export const parseJson = (value, fallback = []) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value || 'null') ?? fallback; } catch { return fallback; }
};

export function shapeResource(row) {
  if (!row) return null;
  return {
    ...row,
    authors: parseJson(row.authors, []),
    tags: parseJson(row.tags, []),
    pages: parseJson(row.pages_json, []),
    is_digital: row.format !== 'physical',
    is_available: row.format !== 'physical' || row.available_copies > 0,
    cover_url: row.cover_url || `/covers/${slug(row.title)}.svg`,
  };
}

export function slug(text = '') {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}
