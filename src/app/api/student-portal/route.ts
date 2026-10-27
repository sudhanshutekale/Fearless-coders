import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/rbac/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const studentId = user.studentId || 's_001';

    // 1. Try Supabase Cloud
    if (isSupabaseConfigured()) {
      const client = getSupabase();
      if (client) {
        const [
          stRes,
          enrRes,
          attRes,
          feeRes,
          emiRes,
          payRes,
          proofRes
        ] = await Promise.all([
          client.from('students').select('*').eq('id', studentId).single(),
          client.from('enrollments').select(`
            id, preferred_mode, enrolled_at, batch_id,
            batches (
              id, name, days, start_time, end_time, mode, start_date, end_date,
              courses ( id, code, name, duration_weeks, total_fee ),
              trainers ( name, email, phone ),
              rooms ( name, type )
            )
          `).eq('student_id', studentId).limit(1).maybeSingle(),
          client.from('attendance').select('*').eq('student_id', studentId).order('date', { ascending: false }),
          client.from('fee_plans').select('*').eq('student_id', studentId).limit(1).maybeSingle(),
          client.from('emi_installments').select('*').eq('student_id', studentId).order('installment_no', { ascending: true }),
          client.from('payments').select('*').eq('student_id', studentId).order('date', { ascending: false }),
          client.from('payment_proofs').select('*').eq('student_id', studentId).order('created_at', { ascending: false })
        ]);

        if (stRes.data) {
          const student = stRes.data;
          const enr: any = enrRes.data;
          const batch = Array.isArray(enr?.batches) ? enr?.batches[0] : enr?.batches;
          const course = Array.isArray(batch?.courses) ? batch?.courses[0] : batch?.courses;
          const trainer = Array.isArray(batch?.trainers) ? batch?.trainers[0] : batch?.trainers;
          const room = Array.isArray(batch?.rooms) ? batch?.rooms[0] : batch?.rooms;

          const attendanceLogs = attRes.data || [];
          const totalAtt = attendanceLogs.length;
          const presentAtt = attendanceLogs.filter((a: any) => a.status === 'present').length;
          const absentAtt = attendanceLogs.filter((a: any) => a.status === 'absent').length;
          const lateAtt = attendanceLogs.filter((a: any) => a.status === 'late').length;
          const attRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

          // Fetch schedule and recordings for batch
          let schedule: any[] = [];
          let recordings: any[] = [];
          if (batch?.id) {
            const [schedRes, recRes] = await Promise.all([
              client.from('timetable_slots').select('id, day_of_week, start_time, end_time, room_id, notes').eq('batch_id', batch.id),
              client.from('recordings').select('*').eq('batch_id', batch.id).order('date', { ascending: false }).limit(6)
            ]);
            schedule = (schedRes.data || []).map((s: any) => ({
              id: s.id,
              day: s.day_of_week,
              start_time: s.start_time,
              end_time: s.end_time,
              room_id: s.room_id,
              topic: s.notes
            }));
            recordings = recRes.data || [];
          }

          return NextResponse.json({
            student,
            enrollment: enr ? {
              enrollment_id: enr.id,
              preferred_mode: enr.preferred_mode,
              enrolled_at: enr.enrolled_at,
              batch_id: batch?.id,
              batch_name: batch?.name,
              days: batch?.days,
              start_time: batch?.start_time,
              end_time: batch?.end_time,
              batch_mode: batch?.mode,
              start_date: batch?.start_date,
              end_date: batch?.end_date,
              course_id: course?.id,
              course_code: course?.code,
              course_name: course?.name,
              duration_weeks: course?.duration_weeks,
              total_fee: course?.total_fee,
              trainer_name: trainer?.name,
              trainer_email: trainer?.email,
              trainer_phone: trainer?.phone,
              room_name: room?.name,
              room_type: room?.type
            } : null,
            attendance: {
              rate: attRate,
              totalSessions: totalAtt,
              present: presentAtt,
              absent: absentAtt,
              late: lateAtt,
              recentLogs: attendanceLogs.slice(0, 15)
            },
            financials: {
              feePlan: feeRes.data || null,
              installments: emiRes.data || [],
              payments: payRes.data || [],
              proofs: proofRes.data || []
            },
            schedule,
            recordings,
            assignments: []
          });
        }
      }
    }

    // 2. Fallback to SQLite
    const db = getDb();
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

    let assignments: any[] = [];
    if (enrollment?.batch_id) {
      assignments = db.prepare(`
        SELECT a.id, a.title, a.description, a.due_date, a.max_marks,
               sub.id as submission_id, sub.status as sub_status, sub.marks as marks_awarded, sub.feedback
        FROM assignments a
        LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
        WHERE a.batch_id = ?
        ORDER BY a.due_date DESC
      `).all(studentId, enrollment.batch_id);
    }

    return NextResponse.json({
      student,
      enrollment,
      attendance: {
        rate: attRate,
        totalSessions: totalSessions.total,
        present: totalSessions.present,
        absent: totalSessions.absent,
        late: totalSessions.late,
        recentLogs: attendanceLogs
      },
      financials: {
        feePlan,
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
