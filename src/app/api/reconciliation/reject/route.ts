import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/rbac/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();

    // STRICT OWNER CHECK: Only the Director/Owner can reject student photo proofs
    if (user.role !== 'owner') {
      return NextResponse.json(
        { 
          error: 'Forbidden: Only the Institute Director / Owner is authorized to reject student payment proofs.' 
        }, 
        { status: 403 }
      );
    }

    const body = await req.json();
    const { proofId, rejectionReason } = body;

    if (!proofId || !rejectionReason) {
      return NextResponse.json({ error: 'Missing proofId or rejectionReason' }, { status: 400 });
    }

    const db = getDb();

    const proof = db.prepare(`
      SELECT p.*, s.name as student_name
      FROM payment_proofs p
      JOIN students s ON s.id = p.student_id
      WHERE p.id = ?
    `).get(proofId) as any;

    if (!proof) {
      return NextResponse.json({ error: 'Payment proof not found' }, { status: 404 });
    }

    db.prepare(`
      UPDATE payment_proofs
      SET status = 'rejected',
          rejection_reason = ?,
          verified_by = ?,
          verified_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(rejectionReason, user.id, proofId);

    // Audit log
    db.prepare(`
      INSERT INTO audit_log (id, user_id, user_name, role, action, result_summary, status)
      VALUES (?, ?, ?, 'owner', 'OWNER_REJECTED_PAYMENT_PROOF', ?, 'success')
    `).run(
      `aud_${Date.now()}`,
      user.id,
      user.name,
      `Owner rejected photo proof for ${proof.student_name}: "${rejectionReason}" (UTR: ${proof.reference})`
    );

    return NextResponse.json({
      success: true,
      message: `Payment proof for ${proof.student_name} rejected with reason: "${rejectionReason}". Student can re-upload proof in their portal.`
    });
  } catch (error: any) {
    console.error('Error rejecting payment proof:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
