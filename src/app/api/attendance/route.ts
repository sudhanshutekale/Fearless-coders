import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/rbac/auth';
import { getSupabase, isSupabaseConfigured, upsertToSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();

    if (user.role === 'accounts') {
      return NextResponse.json(
        { error: 'Forbidden: Accounts role is restricted from viewing detailed biometric and join logs.' },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const batchId = searchParams.get('batchId') || 'b_java_m1';
    const date = searchParams.get('date') || '2026-10-14';

    // 1. Try Supabase Cloud if configured
    if (isSupabaseConfigured()) {
      const client = getSupabase();
      if (client) {
        const studentId = user.role === 'student' ? (user.studentId || 's_001') : null;

        // Fetch batches
        const { data: batches } = await client.from('batches').select('id, name, mode').order('name');

        // Fetch enrolled students for this batch
        let enrollQuery = client
          .from('enrollments')
          .select(`
            preferred_mode,
            student_id,
            students ( id, name, phone )
          `)
          .eq('batch_id', batchId);

        if (studentId) {
          enrollQuery = enrollQuery.eq('student_id', studentId);
        }

        const { data: enrollments } = await enrollQuery;

        // Fetch attendance records for this batch & date
        let attQuery = client
          .from('attendance')
          .select('id, student_id, mode, check_in_time, status, ip_or_location')
          .eq('batch_id', batchId)
          .eq('date', date);

        if (studentId) {
          attQuery = attQuery.eq('student_id', studentId);
        }

        const { data: attRecords } = await attQuery;

        const attMap = new Map();
        (attRecords || []).forEach((a: any) => {
          attMap.set(a.student_id, a);
        });

        if (enrollments && enrollments.length > 0) {
          const rows = enrollments.map((en: any) => {
            const st = en.students || {};
            const att = attMap.get(st.id);
            return {
              student_id: st.id,
              student_name: st.name,
              student_phone: st.phone,
              preferred_mode: en.preferred_mode,
              attendance_id: att?.id || null,
              checkin_mode: att?.mode || null,
              check_in_time: att?.check_in_time || null,
              attendance_status: att?.status || null,
              ip_or_location: att?.ip_or_location || null
            };
          });

          return NextResponse.json({
            rows,
            batches: batches || [],
            selectedBatchId: batchId,
            selectedDate: date
          });
        }
      }
    }

    // 2. Fallback to SQLite
    const db = getDb();
    if (user.role === 'student') {
      const studentId = user.studentId || 's_001';
      const studentBatch = db.prepare('SELECT batch_id FROM enrollments WHERE student_id = ? LIMIT 1').get(studentId) as any;
      const effectiveBatchId = studentBatch?.batch_id || batchId;

      const rows = db.prepare(`
        SELECT 
          s.id as student_id, s.name as student_name, s.phone as student_phone,
          en.preferred_mode,
          a.id as attendance_id, a.mode as checkin_mode, a.check_in_time, a.status as attendance_status,
          a.ip_or_location
        FROM enrollments en
        JOIN students s ON s.id = en.student_id
        LEFT JOIN attendance a ON a.student_id = s.id AND a.batch_id = en.batch_id AND a.date = ?
        WHERE en.batch_id = ? AND s.id = ?
        ORDER BY s.name ASC
      `).all(date, effectiveBatchId, studentId);

      const batches = db.prepare('SELECT id, name, mode FROM batches WHERE id = ?').all(effectiveBatchId);
      return NextResponse.json({ rows, batches, selectedBatchId: effectiveBatchId, selectedDate: date });
    }

    const rows = db.prepare(`
      SELECT 
        s.id as student_id, s.name as student_name, s.phone as student_phone,
        en.preferred_mode,
        a.id as attendance_id, a.mode as checkin_mode, a.check_in_time, a.status as attendance_status,
        a.ip_or_location
      FROM enrollments en
      JOIN students s ON s.id = en.student_id
      LEFT JOIN attendance a ON a.student_id = s.id AND a.batch_id = en.batch_id AND a.date = ?
      WHERE en.batch_id = ?
      ORDER BY s.name ASC
    `).all(date, batchId);

    const batches = db.prepare('SELECT id, name, mode FROM batches').all();
    return NextResponse.json({ rows, batches, selectedBatchId: batchId, selectedDate: date });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (user.role === 'accounts' || user.role === 'student') {
      return NextResponse.json({ error: 'Forbidden: Attendance mark or override is restricted to academic staff.' }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, batchId, date, status, mode } = body;

    if (!studentId || !batchId || !date || !status) {
      return NextResponse.json({ error: 'Missing required attendance fields' }, { status: 400 });
    }

    const checkInTime = status === 'absent' ? null : new Date().toLocaleTimeString('en-US', { hour12: false });
    const ipLocation = mode === 'online' ? 'Zoom WebSDK (IP: 49.36.12.8)' : 'Room Biometric Console 01';
    const attId = `att_${Date.now()}`;

    // 1. Persist to Supabase Cloud
    if (isSupabaseConfigured()) {
      await upsertToSupabase('attendance', {
        id: attId,
        student_id: studentId,
        batch_id: batchId,
        date,
        mode: mode || 'classroom',
        check_in_time: checkInTime,
        status,
        ip_or_location: ipLocation
      });
    }

    // 2. Also persist to SQLite if available
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO attendance (id, student_id, batch_id, date, mode, check_in_time, status, ip_or_location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(student_id, batch_id, date) DO UPDATE SET
          status = excluded.status,
          check_in_time = excluded.check_in_time,
          mode = excluded.mode
      `).run(
        attId,
        studentId,
        batchId,
        date,
        mode || 'classroom',
        checkInTime,
        status,
        ipLocation
      );
    } catch (e) {
      // Ignore SQLite write error in serverless
    }

    return NextResponse.json({ success: true, status, checkInTime });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
