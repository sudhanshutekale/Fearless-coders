import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/rbac/auth';
import { getSupabase, isSupabaseConfigured, upsertToSupabase } from '@/lib/supabase';

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

    let proof: any = null;

    if (isSupabaseConfigured()) {
      const client = getSupabase();
      if (client) {
        const { data } = await client
          .from('payment_proofs')
          .select('*, students(name)')
          .eq('id', proofId)
          .single();
        if (data) {
          proof = {
            ...data,
            student_name: data.students?.name
          };
        }
      }
    }

    if (!proof) {
      const db = getDb();
      proof = db.prepare(`
        SELECT p.*, s.name as student_name
        FROM payment_proofs p
        JOIN students s ON s.id = p.student_id
        WHERE p.id = ?
      `).get(proofId) as any;
    }

    if (!proof) {
      return NextResponse.json({ error: 'Payment proof not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();

    // 1. Persist to Supabase Cloud
    if (isSupabaseConfigured()) {
      await upsertToSupabase('payment_proofs', {
        id: proofId,
        status: 'rejected',
        rejection_reason: rejectionReason,
        verified_by: user.id || 'u_owner',
        verified_at: nowIso
      });

      await upsertToSupabase('audit_log', {
        id: `aud_${Date.now()}`,
        user_id: user.id || 'u_owner',
        user_name: user.name || 'Owner',
        role: 'owner',
        action: 'OWNER_REJECTED_PAYMENT_PROOF',
        result_summary: `Owner rejected photo proof for ${proof.student_name}: "${rejectionReason}" (UTR: ${proof.reference})`,
        status: 'success'
      });
    }

    // 2. Also persist to SQLite if available
    try {
      const db = getDb();
      db.prepare(`
        UPDATE payment_proofs
        SET status = 'rejected',
            rejection_reason = ?,
            verified_by = ?,
            verified_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(rejectionReason, user.id, proofId);

      db.prepare(`
        INSERT INTO audit_log (id, user_id, user_name, role, action, result_summary, status)
        VALUES (?, ?, ?, 'owner', 'OWNER_REJECTED_PAYMENT_PROOF', ?, 'success')
      `).run(
        `aud_${Date.now()}`,
        user.id,
        user.name,
        `Owner rejected photo proof for ${proof.student_name}: "${rejectionReason}" (UTR: ${proof.reference})`
      );
    } catch (e) {
      // Ignore SQLite write error in serverless
    }

    return NextResponse.json({
      success: true,
      message: `Payment proof for ${proof.student_name} rejected with reason: "${rejectionReason}". Student can re-upload proof in their portal.`
    });
  } catch (error: any) {
    console.error('Error rejecting payment proof:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
