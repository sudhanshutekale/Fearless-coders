import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/rbac/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();

    // Accounts is blocked from detailed biometric attendance logs
    if (user.role === 'accounts') {
      return NextResponse.json(
        { error: 'Forbidden: Accounts role is restricted from viewing detailed biometric and join logs.' },
        { status: 403 }
      );
    }

    const db = getDb();
    const searchParams = req.nextUrl.searchParams;
    const batchId = searchParams.get('batchId') || 'b_java_m1';
    const date = searchParams.get('date') || '2026-10-14';

    // If student, scope strictly to only their record
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

    // Fetch batch students and their attendance status on that date
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

    const db = getDb();
    const checkInTime = status === 'absent' ? null : new Date().toLocaleTimeString('en-US', { hour12: false });

    // Upsert attendance record
    db.prepare(`
      INSERT INTO attendance (id, student_id, batch_id, date, mode, check_in_time, status, ip_or_location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, batch_id, date) DO UPDATE SET
        status = excluded.status,
        check_in_time = excluded.check_in_time,
        mode = excluded.mode
    `).run(
      `att_${Date.now()}`,
      studentId,
      batchId,
      date,
      mode || 'classroom',
      checkInTime,
      status,
      mode === 'online' ? 'Zoom WebSDK (IP: 49.36.12.8)' : 'Room Biometric Console 01'
    );

    return NextResponse.json({ success: true, status, checkInTime });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
