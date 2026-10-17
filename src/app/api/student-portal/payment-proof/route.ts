import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/rbac/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    
    // Only student role (or owner simulating) can upload payment proof
    if (user.role !== 'student' && user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Forbidden: Payment photo proof upload is restricted to students only.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { studentId, emiId, amount, reference, proofImageUrl, paymentMode, notes } = body;

    if (!studentId || !emiId || !amount || !reference || !proofImageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, emiId, amount, reference, and proof photo are required.' },
        { status: 400 }
      );
    }

    // Security check: Student can only upload proof for their own studentId
    if (user.role === 'student' && user.studentId && user.studentId !== studentId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only upload payment proofs for your own student record.' },
        { status: 403 }
      );
    }

    const db = getDb();

    // Verify student and emi exist
    const emi = db.prepare(`
      SELECT e.id, e.amount, e.status, e.installment_no, s.name as student_name
      FROM emi_installments e
      JOIN students s ON s.id = e.student_id
      WHERE e.id = ? AND e.student_id = ?
    `).get(emiId, studentId) as any;

    if (!emi) {
      return NextResponse.json(
        { error: 'Installment record not found for this student.' },
        { status: 404 }
      );
    }

    if (emi.status === 'paid') {
      return NextResponse.json(
        { error: 'This installment is already paid and verified.' },
        { status: 400 }
      );
    }

    // Check if there is already a pending proof for this EMI
    const existingPending = db.prepare(`
      SELECT id FROM payment_proofs
      WHERE emi_id = ? AND status = 'pending'
    `).get(emiId) as any;

    const proofId = `proof_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (existingPending) {
      // Update existing pending proof with new photo / UTR
      db.prepare(`
        UPDATE payment_proofs
        SET amount = ?, reference = ?, proof_image_url = ?, payment_mode = ?, notes = ?, created_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(amount, reference, proofImageUrl, paymentMode || 'upi', notes || '', existingPending.id);
    } else {
      // Insert new proof
      db.prepare(`
        INSERT INTO payment_proofs (
          id, student_id, emi_id, amount, reference, proof_image_url, payment_mode, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(proofId, studentId, emiId, amount, reference, proofImageUrl, paymentMode || 'upi', notes || '');
    }

    // Log to audit log
    db.prepare(`
      INSERT INTO audit_log (id, user_id, user_name, role, action, result_summary, status)
      VALUES (?, ?, ?, ?, 'STUDENT_UPLOAD_PAYMENT_PROOF', ?, 'success')
    `).run(
      `aud_${Date.now()}`,
      user.id,
      user.name,
      user.role,
      `Student ${emi.student_name} uploaded payment photo proof for Installment #${emi.installment_no} (₹${amount.toLocaleString('en-IN')}, UTR: ${reference})`
    );

    return NextResponse.json({
      success: true,
      message: 'Payment proof photo submitted successfully. Awaiting Director/Owner verification in the Fee Reconciliation Engine.',
      proofId: existingPending?.id || proofId
    });
  } catch (error: any) {
    console.error('Error submitting payment proof:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
