import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/rbac/auth';
import { 
  getSupabase, 
  isSupabaseConfigured, 
  upsertToSupabase, 
  deleteFromSupabase 
} from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();

    // 1. Prioritize Supabase Cloud
    if (isSupabaseConfigured()) {
      const client = getSupabase();
      if (client) {
        const [coursesRes, trainersRes, roomsRes, batchesRes] = await Promise.all([
          client.from('courses').select('id, name, code'),
          client.from('trainers').select('id, name, specializations, email'),
          client.from('rooms').select('id, name, capacity'),
          client.from('batches').select(`
            *,
            courses ( id, name, code, duration_weeks ),
            trainers ( id, name, phone, email ),
            rooms ( id, name, capacity ),
            enrollments ( id )
          `).order('start_time', { ascending: true })
        ]);

        if (batchesRes.data && batchesRes.data.length > 0) {
          let batchList = batchesRes.data.map((b: any) => ({
            id: b.id,
            name: b.name,
            days: b.days,
            start_time: b.start_time,
            end_time: b.end_time,
            mode: b.mode,
            online_seat_limit: b.online_seat_limit,
            max_seats: b.max_seats,
            status: b.status,
            start_date: b.start_date,
            end_date: b.end_date,
            course_id: b.courses?.id || b.course_id,
            course_name: b.courses?.name || '',
            course_code: b.courses?.code || '',
            duration_weeks: b.courses?.duration_weeks || 12,
            trainer_id: b.trainers?.id || b.trainer_id,
            trainer_name: b.trainers?.name || '',
            trainer_phone: b.trainers?.phone || '',
            room_id: b.rooms?.id || b.room_id,
            room_name: b.rooms?.name || null,
            room_capacity: b.rooms?.capacity || null,
            enrolled_students: b.enrollments?.length || 0
          }));

          if (user.role === 'trainer') {
            batchList = batchList.filter((b: any) => b.trainer_id === user.id || b.trainer_name?.includes(user.name));
          }

          return NextResponse.json({
            batches: batchList,
            courses: coursesRes.data || [],
            trainers: trainersRes.data || [],
            rooms: roomsRes.data || []
          });
        }
      }
    }

    // 2. Fallback to SQLite
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

    if (user.role === 'trainer') {
      query += ` WHERE t.email = ?`;
      const batches = db.prepare(query).all(user.email);
      return NextResponse.json({ batches, courses, trainers, rooms });
    }

    if (user.role === 'student') {
      const studentId = user.studentId || 's_001';
      query += ` JOIN enrollments en ON en.batch_id = b.id WHERE en.student_id = ?`;
      const batches = db.prepare(query).all(studentId);
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
    if (user.role === 'student') {
      return NextResponse.json({ error: 'Forbidden: Students cannot schedule or create batches.' }, { status: 403 });
    }

    const body = await req.json();
    const { courseId, trainerId, roomId, name, days, startTime, endTime, mode, maxSeats, onlineSeatLimit } = body;

    if (!courseId || !trainerId || !name || !days || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required batch fields.' }, { status: 400 });
    }

    const batchId = `b_${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
    const dayArray = days.split(',').map((d: string) => d.trim());
    const validSeatLimit = Math.max(1, Number(onlineSeatLimit) || 30);

    // 1. Persist to Supabase
    if (isSupabaseConfigured()) {
      await upsertToSupabase('batches', {
        id: batchId,
        course_id: courseId,
        trainer_id: trainerId,
        room_id: roomId || null,
        name,
        days,
        start_time: startTime,
        end_time: endTime,
        mode: mode || 'hybrid',
        online_seat_limit: validSeatLimit,
        max_seats: maxSeats || 30,
        status: 'upcoming',
        start_date: today,
        end_date: endDate
      });

      const slots = dayArray.map((day: string) => ({
        id: `slot_${Date.now()}_${day}`,
        batch_id: batchId,
        trainer_id: trainerId,
        room_id: roomId || null,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        is_active: 1,
        notes: 'Regular Schedule'
      }));
      await upsertToSupabase('timetable_slots', slots);

      await upsertToSupabase('audit_log', {
        id: `aud_batch_${Date.now()}`,
        user_id: user.id || 'u_owner',
        user_name: user.name || 'Admin',
        role: user.role || 'owner',
        action: 'create_batch',
        query: `Created batch ${name} with days ${days} (${startTime}-${endTime})`,
        result_summary: `Batch ID: ${batchId}`,
        status: 'success'
      });
    }

    // 2. Also persist to SQLite if available
    try {
      const db = getDb();
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
        validSeatLimit,
        maxSeats || 30
      );

      for (const day of dayArray) {
        db.prepare(`
          INSERT INTO timetable_slots (id, batch_id, trainer_id, room_id, day_of_week, start_time, end_time, is_active, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'Regular Schedule')
        `).run(`slot_${Date.now()}_${day}`, batchId, trainerId, roomId || null, day, startTime, endTime);
      }

      db.prepare(`
        INSERT INTO audit_log (id, user_id, user_name, role, action, query, result_summary, status)
        VALUES (?, ?, ?, ?, 'create_batch', ?, ?, 'success')
      `).run(`aud_batch_${Date.now()}`, user.id || 'u_owner', user.name || 'Admin', user.role || 'owner', `Created batch ${name} with days ${days} (${startTime}-${endTime})`, `Batch ID: ${batchId}`);
    } catch (e) {
      // Ignore SQLite write error in serverless
    }

    return NextResponse.json({ success: true, batchId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
