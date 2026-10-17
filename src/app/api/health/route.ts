import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    return NextResponse.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}
