import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// On Railway: use /data (persistent volume). Locally: use project root.
const DB_DIR = process.env.RAILWAY_ENVIRONMENT
  ? '/data'
  : process.env.DB_DIR || process.cwd();
const DB_PATH = path.join(DB_DIR, 'instipilot.db');

declare global {
  var _instipilotDb: Database.Database | undefined;
  var _instipilotReadOnlyDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (!globalThis._instipilotDb) {
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Auto-initialize schema if database is brand new in deployment
    try {
      const tableCheck = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table'").get() as { count: number };
      if (!tableCheck || tableCheck.count === 0) {
        const schemaPath = path.join(process.cwd(), 'src/lib/db/schema.sql');
        if (fs.existsSync(schemaPath)) {
          const schema = fs.readFileSync(schemaPath, 'utf-8');
          db.exec(schema);
        }
      }
    } catch (e) {
      console.warn('Could not check or run initial schema migration', e);
    }

    globalThis._instipilotDb = db;
  }
  return globalThis._instipilotDb;
}

/**
 * Returns a strictly read-only database connection for Copilot SQL sandbox.
 * This guarantees that even if a query manages to bypass regex filters,
 * the database engine will strictly forbid any writes/mutations.
 */
export function getReadOnlyDb(): Database.Database {
  if (!globalThis._instipilotReadOnlyDb) {
    if (!fs.existsSync(DB_PATH)) {
      // Initialize writable db first if not exists
      getDb();
    }
    const readOnlyDb = new Database(DB_PATH, { readonly: true, fileMustExist: false });
    readOnlyDb.pragma('query_only = ON');
    globalThis._instipilotReadOnlyDb = readOnlyDb;
  }
  return globalThis._instipilotReadOnlyDb;
}

export default getDb;
