import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/rbac/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();

    // STRICT OWNER CHECK: Only the Director/Owner can verify student photo proofs
    if (user.role !== 'owner') {
      return NextResponse.json(
        { 
          error: 'Forbidden: Only the Institute Director / Owner is authorized to verify and approve student payment proofs.' 
        }, 
        { status: 403 }
      );
    }

    const body = await req.json();
    const { proofId } = body;

    if (!proofId) {
      return NextResponse.json({ error: 'Missing proofId' }, { status: 400 });
    }

    const db = getDb();

    // Fetch the proof
    const proof = db.prepare(`
      SELECT p.*, s.name as student_name, s.email as student_email, e.installment_no
      FROM payment_proofs p
      JOIN students s ON s.id = p.student_id
      JOIN emi_installments e ON e.id = p.emi_id
      WHERE p.id = ?
    `).get(proofId) as any;

    if (!proof) {
      return NextResponse.json({ error: 'Payment proof not found' }, { status: 404 });
    }

    if (proof.status === 'verified') {
      return NextResponse.json({ error: 'This payment proof has already been verified by the Owner.' }, { status: 400 });
    }

    // Execute atomic verification transaction
    const verifyTxn = db.transaction(() => {
      // 1. Mark proof as verified
      db.prepare(`
        UPDATE payment_proofs
        SET status = 'verified',
            verified_by = ?,
            verified_at = CURRENT_TIMESTAMP,
            rejection_reason = NULL
        WHERE id = ?
      `).run(user.id, proof.id);

      // 2. Mark EMI installment as paid
      db.prepare(`
        UPDATE emi_installments
        SET status = 'paid',
            paid_date = CURRENT_DATE
        WHERE id = ?
      `).run(proof.emi_id);

      // 3. Insert official verified payment record
      const paymentId = `pay_verified_${Date.now()}`;
      db.prepare(`
        INSERT INTO payments (id, emi_id, student_id, source, reference, amount, date, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE, ?, 'verified')
      `).run(
        paymentId,
        proof.emi_id,
        proof.student_id,
        proof.payment_mode || 'upi',
        proof.reference,
        proof.amount,
        `Owner verified photo proof (UTR: ${proof.reference})`
      );

      // 4. Record in Audit Log
      db.prepare(`
        INSERT INTO audit_log (id, user_id, user_name, role, action, result_summary, status)
        VALUES (?, ?, ?, 'owner', 'OWNER_VERIFIED_PAYMENT_PROOF', ?, 'success')
      `).run(
        `aud_${Date.now()}`,
        user.id,
        user.name,
        `Owner verified photo proof for ${proof.student_name} (Installment #${proof.installment_no}, ₹${proof.amount.toLocaleString('en-IN')}, UTR: ${proof.reference})`
      );
    });

    verifyTxn();

    return NextResponse.json({
      success: true,
      message: `Payment proof for ${proof.student_name} (₹${proof.amount.toLocaleString('en-IN')}) successfully verified and settled by Owner!`,
      proofId: proof.id
    });
  } catch (error: any) {
    console.error('Error verifying payment proof:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
