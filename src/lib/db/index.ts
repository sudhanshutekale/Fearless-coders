import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'instipilot.db');

declare global {
  var _instipilotDb: Database.Database | undefined;
  var _instipilotReadOnlyDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (!globalThis._instipilotDb) {
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
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
