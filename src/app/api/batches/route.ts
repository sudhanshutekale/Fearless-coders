import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/rbac/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    const db = getDb();

    let query = `
      SELECT 
        b.id, b.name, b.days, b.start_time, b.end_time, b.mode,
        b.online_seat_limit, b.max_seats, b.status, b.start_date, b.end_date,
        c.id as course_id, c.name as course_name, c.code as course_code, c.duration_weeks,
        t.id as trainer_id, t.name as trainer_name, t.phone as trainer_phone,
        r.id as room_id, r.name as room_name, r.capacity as room_capacity,
        (SELECT COUNT(*) FROM enrollments WHERE batch_id = b.id) as enrolled_students
      FROM batches b
      JOIN courses c ON c.id = b.course_id
      JOIN trainers t ON t.id = b.trainer_id
      LEFT JOIN rooms r ON r.id = b.room_id
    `;

    const courses = db.prepare('SELECT id, name, code FROM courses').all();
    const trainers = db.prepare('SELECT id, name, specializations FROM trainers').all();
    const rooms = db.prepare('SELECT id, name, capacity FROM rooms').all();

    // If role is trainer, restrict to assigned batches
    if (user.role === 'trainer') {
      query += ` WHERE t.email = ?`;
      const batches = db.prepare(query).all(user.email);
      return NextResponse.json({ batches, courses, trainers, rooms });
    }

    query += ` ORDER BY b.status ASC, b.start_time ASC`;
    const batches = db.prepare(query).all();

    return NextResponse.json({ batches, courses, trainers, rooms });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();


    const body = await req.json();
    const { courseId, trainerId, roomId, name, days, startTime, endTime, mode, maxSeats, onlineSeatLimit } = body;

    if (!courseId || !trainerId || !name || !days || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required batch fields.' }, { status: 400 });
    }

    const db = getDb();
    const batchId = `b_${Date.now()}`;

    // Clash detection check on existing timetable slots
    const dayArray = days.split(',').map((d: string) => d.trim());
    let clashWarning = null;

    for (const day of dayArray) {
      const existingClash = db.prepare(`
        SELECT ts.id, b.name as batch_name, t.name as trainer_name, r.name as room_name
        FROM timetable_slots ts
        JOIN batches b ON b.id = ts.batch_id
        JOIN trainers t ON t.id = ts.trainer_id
        LEFT JOIN rooms r ON r.id = ts.room_id
        WHERE ts.day_of_week = ?
          AND (ts.trainer_id = ? OR (ts.room_id IS NOT NULL AND ts.room_id = ?))
          AND NOT (? >= ts.end_time OR ? <= ts.start_time)
      `).get(day, trainerId, roomId, startTime, endTime) as any;

      if (existingClash) {
        clashWarning = `Clash detected on ${day} with batch "${existingClash.batch_name}". Automatic timetable replanning advised.`;
        break;
      }
    }

    db.prepare(`
      INSERT INTO batches (id, course_id, trainer_id, room_id, name, days, start_time, end_time, mode, online_seat_limit, max_seats, status, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', date('now'), date('now', '+90 days'))
    `).run(
      batchId,
      courseId,
      trainerId,
      roomId || null,
      name,
      days,
      startTime,
      endTime,
      mode || 'hybrid',
      onlineSeatLimit || 30,
      maxSeats || 30
    );

    // Create default slots for each day
    for (const day of dayArray) {
      db.prepare(`
        INSERT INTO timetable_slots (id, batch_id, trainer_id, room_id, day_of_week, start_time, end_time, is_active, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'Regular Schedule')
      `).run(`slot_${Date.now()}_${day}`, batchId, trainerId, roomId || null, day, startTime, endTime);
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_log (id, user_id, user_name, role, action, query, result_summary, status)
      VALUES (?, ?, ?, ?, 'create_batch', ?, ?, ?)
    `).run(
      `aud_batch_${Date.now()}`,
      user.id,
      user.name,
      user.role,
      `Created batch ${name} (${startTime}-${endTime}, ${days})`,
      clashWarning || 'Batch created cleanly with default slots',
      clashWarning ? 'warning' : 'success'
    );

    return NextResponse.json({ success: true, batchId, clashWarning });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
