import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/rbac/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: Audit Log is restricted to Owner/Director role only.' }, { status: 403 });
    }

    const db = getDb();
    const searchParams = req.nextUrl.searchParams;
    const role = searchParams.get('role') || '';
    const action = searchParams.get('action') || '';
    const status = searchParams.get('status') || '';

    let query = `SELECT * FROM audit_log WHERE 1=1`;
    const params: string[] = [];

    if (role) { query += ` AND role = ?`; params.push(role); }
    if (action) { query += ` AND action = ?`; params.push(action); }
    if (status) { query += ` AND status = ?`; params.push(status); }

    query += ` ORDER BY timestamp DESC LIMIT 100`;

    const logs = db.prepare(query).all(...params);
    return NextResponse.json({ logs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
