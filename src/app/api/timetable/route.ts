import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ──────────────────────────────────────────────────────────────
// Timetable Scheduler: Constraint-Based Greedy Solver
// ──────────────────────────────────────────────────────────────
interface Slot {
  id: string;
  batchId: string;
  trainerId: string;
  roomId: string | null;
  day: string;
  startTime: string;
  endTime: string;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return timeToMinutes(s1) < timeToMinutes(e2) && timeToMinutes(e1) > timeToMinutes(s2);
}

function hasTrainerClash(slots: Slot[], trainerId: string, day: string, start: string, end: string, excludeSlotId?: string): boolean {
  return slots.some(s =>
    s.id !== excludeSlotId &&
    s.trainerId === trainerId &&
    s.day === day &&
    timesOverlap(start, end, s.startTime, s.endTime)
  );
}

function hasRoomClash(slots: Slot[], roomId: string | null, day: string, start: string, end: string, excludeSlotId?: string): boolean {
  if (!roomId) return false;
  return slots.some(s =>
    s.id !== excludeSlotId &&
    s.roomId === roomId &&
    s.day === day &&
    timesOverlap(start, end, s.startTime, s.endTime)
  );
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const searchParams = req.nextUrl.searchParams;
    const trainerId = searchParams.get('trainerId') || '';
    const roomId = searchParams.get('roomId') || '';

    let query = `
      SELECT 
        ts.id, ts.day_of_week, ts.start_time, ts.end_time, ts.is_active, ts.notes,
        b.id as batch_id, b.name as batch_name, b.mode, b.max_seats, b.online_seat_limit,
        c.id as course_id, c.name as course_name, c.code as course_code,
        t.id as trainer_id, t.name as trainer_name, t.availability,
        r.id as room_id, r.name as room_name, r.capacity as room_capacity
      FROM timetable_slots ts
      JOIN batches b ON b.id = ts.batch_id
      JOIN courses c ON c.id = b.course_id
      JOIN trainers t ON t.id = ts.trainer_id
      LEFT JOIN rooms r ON r.id = ts.room_id
      WHERE ts.is_active = 1 AND b.status != 'completed'
    `;
    const params: string[] = [];
    if (trainerId) { query += ` AND ts.trainer_id = ?`; params.push(trainerId); }
    if (roomId) { query += ` AND ts.room_id = ?`; params.push(roomId); }
    query += ` ORDER BY CASE ts.day_of_week WHEN 'Mon' THEN 1 WHEN 'Tue' THEN 2 WHEN 'Wed' THEN 3 WHEN 'Thu' THEN 4 WHEN 'Fri' THEN 5 WHEN 'Sat' THEN 6 WHEN 'Sun' THEN 7 END, ts.start_time`;

    const slots = db.prepare(query).all(...params);
    const trainers = db.prepare('SELECT id, name FROM trainers ORDER BY name').all();
    const rooms = db.prepare('SELECT id, name, capacity FROM rooms ORDER BY name').all();

    return NextResponse.json({ slots, trainers, rooms });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'mark_unavailable') {
      return await handleMarkUnavailable(body);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function handleMarkUnavailable(body: any) {
  const db = getDb();
  const { trainerId, day, startTime, endTime } = body;

  if (!trainerId || !day || !startTime || !endTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Find all slots that would be affected (trainer is scheduled during this period)
  const affectedSlots = db.prepare(`
    SELECT ts.*, b.name as batch_name, b.max_seats, b.online_seat_limit, b.course_id, b.mode,
           r.capacity as room_capacity
    FROM timetable_slots ts
    JOIN batches b ON b.id = ts.batch_id
    LEFT JOIN rooms r ON r.id = ts.room_id
    WHERE ts.trainer_id = ? AND ts.day_of_week = ? AND ts.is_active = 1
      AND (
        (ts.start_time < ? AND ts.end_time > ?)
        OR (ts.start_time >= ? AND ts.start_time < ?)
      )
  `).all(trainerId, day, endTime, startTime, startTime, endTime) as any[];

  if (affectedSlots.length === 0) {
    return NextResponse.json({
      message: 'No schedule conflicts found for this time window.',
      changes: [],
      affectedCount: 0
    });
  }

  // Get all trainers who can cover
  const allTrainers = db.prepare('SELECT * FROM trainers').all() as any[];
  const allRooms = db.prepare('SELECT * FROM rooms').all() as any[];
  const existingSlots = db.prepare(
    'SELECT id, batch_id, trainer_id, room_id, day_of_week as day, start_time as startTime, end_time as endTime FROM timetable_slots WHERE is_active = 1'
  ).all() as Slot[];

  const changes: any[] = [];

  for (const slot of affectedSlots) {
    // Try to find an alternative trainer with matching specialization
    const batchCourse = db.prepare('SELECT c.name, c.code FROM courses c JOIN batches b ON b.id = ? WHERE c.id = b.course_id').get(slot.batch_id) as any;

    let alternativeTrainer = null;
    let alternativeRoom = slot.room_id;
    let reason = '';

    // Check if another trainer is available and not clashing
    for (const trainer of allTrainers) {
      if (trainer.id === trainerId) continue;

      // Check availability JSON
      const avail = JSON.parse(trainer.availability || '{}') as Record<string, string[]>;
      const dayAvail = avail[day] || [];
      const isAvailable = dayAvail.some((range: string) => {
        const [rs, re] = range.split('-');
        return timeToMinutes(rs) <= timeToMinutes(slot.start_time) &&
               timeToMinutes(re) >= timeToMinutes(slot.end_time);
      });

      if (!isAvailable) continue;

      // Check trainer clash
      if (hasTrainerClash(existingSlots, trainer.id, day, slot.start_time, slot.end_time, slot.id)) continue;

      alternativeTrainer = trainer;
      reason = `Trainer ${trainer.name} is available ${day} ${slot.start_time}-${slot.end_time} and has no conflicts.`;
      break;
    }

    if (!alternativeTrainer) {
      // Try moving to a different time (same trainer, earlier or later)
      changes.push({
        slotId: slot.id,
        batchName: slot.batch_name,
        originalDay: day,
        originalStart: slot.start_time,
        originalEnd: slot.end_time,
        action: 'could_not_replan',
        reason: 'No alternative trainer or time slot found. Manual intervention required.'
      });
      continue;
    }

    // Check room availability for alternative trainer
    if (slot.room_id && hasRoomClash(existingSlots, slot.room_id, day, slot.start_time, slot.end_time, slot.id)) {
      // Find alternative room
      for (const room of allRooms) {
        if (room.id === slot.room_id) continue;
        if (room.capacity < (slot.max_seats || 20)) continue;
        if (!hasRoomClash(existingSlots, room.id, day, slot.start_time, slot.end_time, slot.id)) {
          alternativeRoom = room.id;
          reason += ` Room ${room.name} was free and has sufficient capacity.`;
          break;
        }
      }
    }

    // Apply the change
    db.prepare(`
      UPDATE timetable_slots
      SET trainer_id = ?, room_id = ?,
          notes = ?
      WHERE id = ?
    `).run(
      alternativeTrainer.id,
      alternativeRoom,
      `Replanned: ${trainerId} unavailable ${day} ${startTime}-${endTime}. Assigned to ${alternativeTrainer.name}.`,
      slot.id
    );

    // Update existingSlots in-memory too
    const slotIdx = existingSlots.findIndex(s => s.id === slot.id);
    if (slotIdx >= 0) {
      existingSlots[slotIdx].trainerId = alternativeTrainer.id;
      existingSlots[slotIdx].roomId = alternativeRoom;
    }

    changes.push({
      slotId: slot.id,
      batchName: slot.batch_name,
      originalDay: day,
      originalStart: slot.start_time,
      originalEnd: slot.end_time,
      originalTrainer: trainerId,
      newTrainer: alternativeTrainer.name,
      newTrainerId: alternativeTrainer.id,
      originalRoom: slot.room_id,
      newRoom: alternativeRoom,
      action: 'reassigned',
      reason
    });
  }

  // Log replan in audit
  db.prepare(`
    INSERT INTO audit_log (id, user_id, user_name, role, action, query, result_summary, status)
    VALUES (?, 'system', 'Scheduler', 'owner', 'timetable_replan', ?, ?, 'success')
  `).run(
    `aud_replan_${Date.now()}`,
    `Trainer ${trainerId} marked unavailable on ${day} ${startTime}-${endTime}`,
    `Replanned ${changes.filter(c => c.action === 'reassigned').length} slot(s)`
  );

  return NextResponse.json({
    message: `Timetable re-planned. ${changes.filter(c => c.action === 'reassigned').length} slot(s) reassigned.`,
    changes,
    affectedCount: affectedSlots.length
  });
}
