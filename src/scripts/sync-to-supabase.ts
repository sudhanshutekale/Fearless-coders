import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'instipilot.db');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bpjejfgxqrydrfumaoek.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const tablesInOrder = [
  'users',
  'rooms',
  'trainers',
  'courses',
  'batches',
  'students',
  'enrollments',
  'fee_plans',
  'emi_installments',
  'payments',
  'payment_proofs',
  'attendance',
  'assignments',
  'submissions',
  'recordings',
  'timetable_slots',
  'messages_outbox',
  'audit_log'
];

async function postChunk(table: string, rows: any[]) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(rows)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[${res.status}] ${text}`);
  }
}

async function syncAll() {
  const db = new Database(DB_PATH, { readonly: true });
  console.log('🔄 Starting data sync from local SQLite to Supabase...');

  // Ensure system user exists in users table
  try {
    await postChunk('users', [{
      id: 'system',
      name: 'System Bot',
      email: 'system@instipilot.internal',
      password_hash: 'system_lock',
      role: 'owner',
      avatar_url: null
    }]);
  } catch (e) {
    // ignore if already exists
  }

  for (const table of tablesInOrder) {
    try {
      let rows = db.prepare(`SELECT * FROM ${table}`).all() as any[];
      if (!rows || rows.length === 0) {
        console.log(`⏩ [${table}] 0 local rows, skipping.`);
        continue;
      }

      // Transformations for table-specific Postgres constraints
      if (table === 'batches') {
        rows = rows.map(b => ({
          ...b,
          online_seat_limit: Math.max(1, Number(b.online_seat_limit) || 1)
        }));
      }

      if (table === 'messages_outbox') {
        rows = rows.map(m => ({
          ...m,
          approved_by: m.approved_by === 'Priya Sharma' ? 'u_owner' : m.approved_by
        }));
      }

      console.log(`📦 [${table}] Found ${rows.length} rows to upload...`);

      // Batch upload in chunks of 50
      const chunkSize = 50;
      let inserted = 0;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        await postChunk(table, chunk);
        inserted += chunk.length;
      }
      console.log(`✅ [${table}] Successfully synced ${inserted}/${rows.length} rows.`);
    } catch (err: any) {
      console.error(`❌ [${table}] Error during sync:`, err.message);
    }
  }

  db.close();
  console.log('🏁 Full database sync to Supabase finished successfully!');
}

syncAll().catch(console.error);
