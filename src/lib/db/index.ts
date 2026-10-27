/**
 * Database Layer — Supabase-Only (Vercel Compatible)
 * 
 * This module provides a compatibility shim. Previously used SQLite (better-sqlite3),
 * now all data operations go through Supabase.
 * 
 * The getDb() export is kept for backward compatibility with code that imports it,
 * but any calls to it will throw a helpful error if SQLite is actually invoked.
 */

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * @deprecated SQLite is no longer used in production/Vercel.
 * This stub exists for import compatibility. API routes should use Supabase directly.
 */
export function getDb(): never {
  throw new Error(
    '[InstiPilot] SQLite is not available in this deployment. ' +
    'All data operations should use Supabase. ' +
    'Check that NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
  );
}

/**
 * @deprecated SQLite is no longer used in production/Vercel.
 */
export function getReadOnlyDb(): never {
  throw new Error(
    '[InstiPilot] SQLite read-only DB is not available in this deployment. ' +
    'Copilot queries should use Supabase RPC or direct queries.'
  );
}

export default getDb;
