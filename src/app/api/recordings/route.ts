import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/rbac/auth';
import { getSupabase, isSupabaseConfigured, upsertToSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const searchParams = req.nextUrl.searchParams;
    const batchId = searchParams.get('batchId') || '';

    // 1. Try Supabase Cloud
    if (isSupabaseConfigured()) {
      const client = getSupabase();
      if (client) {
        let recQuery = client
          .from('recordings')
          .select(`
            *,
            batches (
              id, name, mode,
              courses ( name ),
              trainers ( name )
            )
          `)
          .order('date', { ascending: false })
          .limit(50);

        if (batchId) {
          recQuery = recQuery.eq('batch_id', batchId);
        }

        const [recRes, batchesRes] = await Promise.all([
          recQuery,
          client.from('batches').select('id, name, course_id').order('name')
        ]);

        if (recRes.data) {
          const formattedRecordings = recRes.data.map((r: any) => ({
            id: r.id,
            title: r.title,
            url: r.url,
            date: r.date,
            duration_minutes: r.duration_minutes,
            topic_tags: r.topic_tags,
            views_count: r.views_count,
            batch_id: r.batches?.id || r.batch_id,
            batch_name: r.batches?.name || '',
            mode: r.batches?.mode || 'hybrid',
            course_name: r.batches?.courses?.name || '',
            trainer_name: r.batches?.trainers?.name || ''
          }));

          return NextResponse.json({
            recordings: formattedRecordings,
            batches: batchesRes.data || []
          });
        }
      }
    }

    // 2. Fallback to SQLite
    const db = getDb();
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

    if (user.role === 'student') {
      const studentId = user.studentId || 's_001';
      query += ` AND b.id IN (SELECT batch_id FROM enrollments WHERE student_id = ?)`;
      params.push(studentId);
    }

    query += ` ORDER BY rec.date DESC, rec.created_at DESC LIMIT 50`;

    const recordings = db.prepare(query).all(...params);
    const batches = user.role === 'student'
      ? db.prepare('SELECT b.id, b.name, b.course_id FROM batches b JOIN enrollments en ON en.batch_id = b.id WHERE en.student_id = ?').all(user.studentId || 's_001')
      : db.prepare('SELECT id, name, course_id FROM batches ORDER BY name').all();

    return NextResponse.json({ recordings, batches });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (user.role === 'student') {
      return NextResponse.json({ error: 'Forbidden: Students cannot upload or publish class recordings.' }, { status: 403 });
    }
    const body = await req.json();
    const { batchId, title, url, date, durationMinutes, topicTags } = body;

    if (!batchId || !title || !url || !date) {
      return NextResponse.json({ error: 'Missing required recording fields.' }, { status: 400 });
    }

    const recordingId = `rec_${Date.now()}`;

    // 1. Persist to Supabase Cloud
    if (isSupabaseConfigured()) {
      await upsertToSupabase('recordings', {
        id: recordingId,
        batch_id: batchId,
        title,
        url,
        date,
        duration_minutes: durationMinutes || 90,
        topic_tags: topicTags || '',
        views_count: 0
      });
    }

    // 2. Also persist to SQLite if available
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO recordings (id, batch_id, title, url, date, duration_minutes, topic_tags, views_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `).run(recordingId, batchId, title, url, date, durationMinutes || 90, topicTags || '');
    } catch (e) {
      // Ignore SQLite write error in serverless
    }

    return NextResponse.json({ success: true, recordingId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
