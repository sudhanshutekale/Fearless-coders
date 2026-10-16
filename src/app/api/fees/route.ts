import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/rbac/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();

    // Strict server-side RBAC enforcement
    if (user.role === 'trainer' || user.role === 'counselor') {
      return NextResponse.json(
        { error: `Forbidden: Financial tables are blocked for ${user.role} role.` },
        { status: 403 }
      );
    }

    const db = getDb();

    // 1. All Overdue EMIs
    const overdueEmis = db.prepare(`
      SELECT 
        e.id, e.installment_no, e.due_date, e.amount, e.status,
        s.id as student_id, s.name as student_name, s.phone as student_phone,
        b.name as batch_name, c.name as course_name
      FROM emi_installments e
      JOIN students s ON s.id = e.student_id
      JOIN fee_plans fp ON fp.id = e.fee_plan_id
      JOIN courses c ON c.id = fp.course_id
      LEFT JOIN enrollments en ON en.student_id = s.id
      LEFT JOIN batches b ON b.id = en.batch_id
      WHERE e.status = 'overdue'
      ORDER BY e.due_date ASC
    `).all();

    // 2. Upcoming EMIs (Due this week / next 14 days)
    const upcomingEmis = db.prepare(`
      SELECT 
        e.id, e.installment_no, e.due_date, e.amount, e.status,
        s.id as student_id, s.name as student_name, s.phone as student_phone,
        b.name as batch_name, c.name as course_name
      FROM emi_installments e
      JOIN students s ON s.id = e.student_id
      JOIN fee_plans fp ON fp.id = e.fee_plan_id
      JOIN courses c ON c.id = fp.course_id
      LEFT JOIN enrollments en ON en.student_id = s.id
      LEFT JOIN batches b ON b.id = en.batch_id
      WHERE e.status = 'pending'
      ORDER BY e.due_date ASC
      LIMIT 30
    `).all();

    // 3. Verified Payments
    const recentPayments = db.prepare(`
      SELECT 
        p.id, p.source, p.reference, p.amount, p.date, p.notes, p.status,
        s.name as student_name, s.phone as student_phone
      FROM payments p
      JOIN students s ON s.id = p.student_id
      ORDER BY p.date DESC, p.created_at DESC
      LIMIT 40
    `).all();

    // Summary totals
    const totalCollected = (db.prepare("SELECT SUM(amount) as s FROM payments WHERE status = 'verified'").get() as any).s || 0;
    const totalOverdue = (db.prepare("SELECT SUM(amount) as s FROM emi_installments WHERE status = 'overdue'").get() as any).s || 0;
    const totalPending = (db.prepare("SELECT SUM(amount) as s FROM emi_installments WHERE status = 'pending'").get() as any).s || 0;

    return NextResponse.json({
      summary: { totalCollected, totalOverdue, totalPending },
      overdueEmis,
      upcomingEmis,
      recentPayments
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (user.role === 'trainer' || user.role === 'counselor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, emiId, amount, source, reference, notes } = body;

    if (!studentId || !amount || !source || !reference) {
      return NextResponse.json({ error: 'Missing required payment details' }, { status: 400 });
    }

    const db = getDb();
    const paymentId = `pay_${Date.now()}`;

    const tx = db.transaction(() => {
      // Insert payment record
      db.prepare(`
        INSERT INTO payments (id, emi_id, student_id, source, reference, amount, date, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, date('now'), ?, 'verified')
      `).run(paymentId, emiId || null, studentId, source, reference, amount, notes || 'Manual entry');

      // If tied to an EMI installment, mark it paid
      if (emiId) {
        db.prepare(`
          UPDATE emi_installments
          SET status = 'paid', paid_date = date('now')
          WHERE id = ?
        `).run(emiId);
      }

      // Audit log
      db.prepare(`
        INSERT INTO audit_log (id, user_id, user_name, role, action, query, result_summary, status)
        VALUES (?, ?, ?, ?, 'record_payment', ?, ?, 'success')
      `).run(
        `aud_pay_${Date.now()}`,
        user.id,
        user.name,
        user.role,
        `Recorded ₹${amount} (${source}) for student ${studentId}`,
        `Reference: ${reference}`,
        'success'
      );
    });

    tx();
    return NextResponse.json({ success: true, paymentId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
