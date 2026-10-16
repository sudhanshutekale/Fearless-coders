import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/rbac/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const searchParams = req.nextUrl.searchParams;
    const batchId = searchParams.get('batchId') || '';

    let query = `
      SELECT 
        rec.id, rec.title, rec.url, rec.date, rec.duration_minutes, 
        rec.topic_tags, rec.views_count,
        b.id as batch_id, b.name as batch_name, b.mode,
        c.name as course_name, t.name as trainer_name
      FROM recordings rec
      JOIN batches b ON b.id = rec.batch_id
      JOIN courses c ON c.id = b.course_id
      JOIN trainers t ON t.id = b.trainer_id
      WHERE 1=1
    `;
    const params: string[] = [];

    if (batchId) {
      query += ` AND rec.batch_id = ?`;
      params.push(batchId);
    }

    query += ` ORDER BY rec.date DESC, rec.created_at DESC LIMIT 50`;

    const recordings = db.prepare(query).all(...params);
    const batches = db.prepare('SELECT id, name, course_id FROM batches ORDER BY name').all();

    return NextResponse.json({ recordings, batches });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await req.json();
    const { batchId, title, url, date, durationMinutes, topicTags } = body;

    if (!batchId || !title || !url || !date) {
      return NextResponse.json({ error: 'Missing required recording fields.' }, { status: 400 });
    }

    const db = getDb();
    const recordingId = `rec_${Date.now()}`;

    db.prepare(`
      INSERT INTO recordings (id, batch_id, title, url, date, duration_minutes, topic_tags, views_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(recordingId, batchId, title, url, date, durationMinutes || 90, topicTags || '');

    return NextResponse.json({ success: true, recordingId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
