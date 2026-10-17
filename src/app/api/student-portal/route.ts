import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/rbac/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const db = getDb();

    // Default to s_001 (Aarav Gupta) if student role or fallback
    const studentId = user.studentId || 's_001';

    // 1. Student Profile
    const student = db.prepare(`
      SELECT 
        s.id, s.name, s.email, s.phone, s.guardian_name, s.guardian_phone,
        s.city, s.college, s.join_date, s.status, s.notes
      FROM students s
      WHERE s.id = ?
    `).get(studentId) as any;

    if (!student) {
      return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    }

    // 2. Enrolled Batch & Course Details
    const enrollment = db.prepare(`
      SELECT 
        en.id as enrollment_id, en.preferred_mode, en.enrolled_at,
        b.id as batch_id, b.name as batch_name, b.days, b.start_time, b.end_time,
        b.mode as batch_mode, b.start_date, b.end_date,
        c.id as course_id, c.code as course_code, c.name as course_name, c.duration_weeks, c.total_fee,
        t.name as trainer_name, t.email as trainer_email, t.phone as trainer_phone,
        r.name as room_name, r.type as room_type
      FROM enrollments en
      JOIN batches b ON b.id = en.batch_id
      JOIN courses c ON c.id = b.course_id
      JOIN trainers t ON t.id = b.trainer_id
      LEFT JOIN rooms r ON r.id = b.room_id
      WHERE en.student_id = ?
      LIMIT 1
    `).get(studentId) as any;

    // 3. Attendance Metrics & History
    const attendanceLogs = db.prepare(`
      SELECT id, date, mode, check_in_time, status, ip_or_location
      FROM attendance
      WHERE student_id = ?
      ORDER BY date DESC
      LIMIT 15
    `).all(studentId) as any[];

    const totalSessions = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late
      FROM attendance
      WHERE student_id = ?
    `).get(studentId) as any;

    const attRate = totalSessions.total > 0
      ? Math.round((totalSessions.present / totalSessions.total) * 100)
      : 100;

    // 4. Fees & Installments
    const feePlan = db.prepare(`
      SELECT id, total_amount, down_payment, num_installments, discount
      FROM fee_plans
      WHERE student_id = ?
      LIMIT 1
    `).get(studentId) as any;

    const installments = db.prepare(`
      SELECT id, installment_no, due_date, amount, status, paid_date
      FROM emi_installments
      WHERE student_id = ?
      ORDER BY installment_no ASC
    `).all(studentId) as any[];

    const payments = db.prepare(`
      SELECT id, source, reference, amount, date, status
      FROM payments
      WHERE student_id = ?
      ORDER BY date DESC
    `).all(studentId) as any[];

    const proofs = db.prepare(`
      SELECT id, emi_id, amount, reference, proof_image_url, payment_mode, notes, status, rejection_reason, created_at, verified_at
      FROM payment_proofs
      WHERE student_id = ?
      ORDER BY created_at DESC
    `).all(studentId) as any[];

    // 5. Timetable Schedule for Batch
    let schedule: any[] = [];
    if (enrollment?.batch_id) {
      schedule = db.prepare(`
        SELECT id, day_of_week as day, start_time, end_time, room_id, notes as topic
        FROM timetable_slots
        WHERE batch_id = ?
        ORDER BY 
          CASE day_of_week 
            WHEN 'Mon' THEN 1 
            WHEN 'Tue' THEN 2 
            WHEN 'Wed' THEN 3 
            WHEN 'Thu' THEN 4 
            WHEN 'Fri' THEN 5 
            WHEN 'Sat' THEN 6 
            WHEN 'Sun' THEN 7 
          END,
          start_time ASC
      `).all(enrollment.batch_id);
    }

    // 6. Recordings for Batch
    let recordings: any[] = [];
    if (enrollment?.batch_id) {
      recordings = db.prepare(`
        SELECT id, title, url, date, duration_minutes, topic_tags, views_count
        FROM recordings
        WHERE batch_id = ?
        ORDER BY date DESC
        LIMIT 6
      `).all(enrollment.batch_id);
    }

    // 7. Assignments & Submissions
    let assignments: any[] = [];
    if (enrollment?.batch_id) {
      assignments = db.prepare(`
        SELECT 
          a.id, a.title, a.description, a.due_date, a.max_marks,
          s.id as submission_id, s.submitted_at, s.status as submission_status,
          s.marks, s.feedback
        FROM assignments a
        LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
        WHERE a.batch_id = ?
        ORDER BY a.due_date DESC
      `).all(studentId, enrollment.batch_id);
    }

    return NextResponse.json({
      student,
      enrollment,
      attendance: {
        rate: attRate,
        summary: totalSessions,
        logs: attendanceLogs
      },
      fees: {
        plan: feePlan,
        installments,
        payments,
        proofs
      },
      schedule,
      recordings,
      assignments
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
