import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/rbac/auth';
import { getSupabase, isSupabaseConfigured, upsertToSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();

    if (user.role === 'trainer' || user.role === 'counselor') {
      return NextResponse.json(
        { error: `Forbidden: Financial tables are blocked for ${user.role} role.` },
        { status: 403 }
      );
    }

    // 1. Try Supabase Cloud
    if (isSupabaseConfigured()) {
      const client = getSupabase();
      if (client) {
        const studentId = user.role === 'student' ? (user.studentId || 's_001') : null;

        let overdueQuery = client
          .from('emi_installments')
          .select(`
            id, installment_no, due_date, amount, status,
            students ( id, name, phone ),
            fee_plans (
              courses ( name )
            )
          `)
          .eq('status', 'overdue')
          .order('due_date', { ascending: true });

        let pendingQuery = client
          .from('emi_installments')
          .select(`
            id, installment_no, due_date, amount, status,
            students ( id, name, phone ),
            fee_plans (
              courses ( name )
            )
          `)
          .eq('status', 'pending')
          .order('due_date', { ascending: true });

        let paymentsQuery = client
          .from('payments')
          .select(`
            id, source, reference, amount, date, notes, status,
            students ( name, phone )
          `)
          .order('date', { ascending: false });

        if (studentId) {
          overdueQuery = overdueQuery.eq('student_id', studentId);
          pendingQuery = pendingQuery.eq('student_id', studentId);
          paymentsQuery = paymentsQuery.eq('student_id', studentId);
        } else {
          pendingQuery = pendingQuery.limit(30);
          paymentsQuery = paymentsQuery.limit(40);
        }

        const [overdueRes, pendingRes, paymentsRes, allPayments, allOverdue, allPending] = await Promise.all([
          overdueQuery,
          pendingQuery,
          paymentsQuery,
          client.from('payments').select('amount').eq('status', 'verified'),
          client.from('emi_installments').select('amount').eq('status', 'overdue'),
          client.from('emi_installments').select('amount').eq('status', 'pending')
        ]);

        if (overdueRes.data && pendingRes.data && paymentsRes.data) {
          const mapEmi = (e: any) => ({
            id: e.id,
            installment_no: e.installment_no,
            due_date: e.due_date,
            amount: e.amount,
            status: e.status,
            student_id: e.students?.id,
            student_name: e.students?.name,
            student_phone: e.students?.phone,
            batch_name: '',
            course_name: e.fee_plans?.courses?.name || ''
          });

          const mapPayment = (p: any) => ({
            id: p.id,
            source: p.source,
            reference: p.reference,
            amount: p.amount,
            date: p.date,
            notes: p.notes,
            status: p.status,
            student_name: p.students?.name,
            student_phone: p.students?.phone
          });

          const totalCollected = (allPayments.data || []).reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
          const totalOverdue = (allOverdue.data || []).reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
          const totalPending = (allPending.data || []).reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);

          return NextResponse.json({
            summary: { totalCollected, totalOverdue, totalPending },
            overdueEmis: overdueRes.data.map(mapEmi),
            upcomingEmis: pendingRes.data.map(mapEmi),
            recentPayments: paymentsRes.data.map(mapPayment)
          });
        }
      }
    }

    // 2. Fallback to SQLite
    const db = getDb();

    if (user.role === 'student') {
      const studentId = user.studentId || 's_001';

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
        WHERE e.status = 'overdue' AND s.id = ?
        ORDER BY e.due_date ASC
      `).all(studentId);

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
        WHERE e.status = 'pending' AND s.id = ?
        ORDER BY e.due_date ASC
      `).all(studentId);

      const recentPayments = db.prepare(`
        SELECT 
          p.id, p.source, p.reference, p.amount, p.date, p.notes, p.status,
          s.name as student_name, s.phone as student_phone
        FROM payments p
        JOIN students s ON s.id = p.student_id
        WHERE s.id = ?
        ORDER BY p.date DESC
      `).all(studentId);

      const totalPaid = (db.prepare("SELECT SUM(amount) as s FROM payments WHERE student_id = ?").get(studentId) as any)?.s || 0;
      const totalPending = (db.prepare("SELECT SUM(amount) as s FROM emi_installments WHERE student_id = ? AND status != 'paid'").get(studentId) as any)?.s || 0;

      return NextResponse.json({
        summary: { totalCollected: totalPaid, totalOverdue: 0, totalPending },
        overdueEmis,
        upcomingEmis,
        recentPayments
      });
    }

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

    const recentPayments = db.prepare(`
      SELECT 
        p.id, p.source, p.reference, p.amount, p.date, p.notes, p.status,
        s.name as student_name, s.phone as student_phone
      FROM payments p
      JOIN students s ON s.id = p.student_id
      ORDER BY p.date DESC, p.created_at DESC
      LIMIT 40
    `).all();

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

    const paymentId = `pay_${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    // 1. Persist to Supabase Cloud
    if (isSupabaseConfigured()) {
      await upsertToSupabase('payments', {
        id: paymentId,
        emi_id: emiId || null,
        student_id: studentId,
        source,
        reference,
        amount: Number(amount),
        date: today,
        notes: notes || 'Manual entry',
        status: 'verified'
      });

      if (emiId) {
        await upsertToSupabase('emi_installments', {
          id: emiId,
          status: 'paid',
          paid_date: today
        });
      }

      await upsertToSupabase('audit_log', {
        id: `aud_pay_${Date.now()}`,
        user_id: user.id || 'u_accounts',
        user_name: user.name || 'Accounts Manager',
        role: user.role || 'accounts',
        action: 'record_payment',
        query: `Recorded ₹${amount} (${source}) for student ${studentId}`,
        result_summary: `Reference: ${reference}`,
        status: 'success'
      });
    }

    // 2. Also persist to SQLite if available
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO payments (id, emi_id, student_id, source, reference, amount, date, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, date('now'), ?, 'verified')
      `).run(paymentId, emiId || null, studentId, source, reference, amount, notes || 'Manual entry');

      if (emiId) {
        db.prepare(`
          UPDATE emi_installments
          SET status = 'paid', paid_date = date('now')
          WHERE id = ?
        `).run(emiId);
      }

      db.prepare(`
        INSERT INTO audit_log (id, user_id, user_name, role, action, query, result_summary, status)
        VALUES (?, ?, ?, ?, 'record_payment', ?, ?, 'success')
      `).run(`aud_pay_${Date.now()}`, user.id || 'u_accounts', user.name || 'Accounts Manager', user.role || 'accounts', `Recorded ₹${amount} (${source}) for student ${studentId}`, `Reference: ${reference}`);
    } catch (e) {
      // Ignore SQLite write error in serverless
    }

    return NextResponse.json({ success: true, paymentId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
