import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/rbac/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    
    // Students cannot view the administrative reconciliation queue
    if (user.role === 'student' || user.role === 'trainer' || user.role === 'counselor') {
      return NextResponse.json({ error: 'Forbidden: Access restricted to Owner and Finance team' }, { status: 403 });
    }

    let proofs: any[] = [];

    // 1. Try Supabase Cloud
    if (isSupabaseConfigured()) {
      const client = getSupabase();
      if (client) {
        const { data, error } = await client
          .from('payment_proofs')
          .select(`
            *,
            students ( id, name, email, phone, college ),
            emi_installments (
              id, installment_no, due_date, status,
              fee_plans (
                courses ( name )
              )
            ),
            users!payment_proofs_verified_by_fkey ( name )
          `)
          .order('created_at', { ascending: false });

        if (!error && data) {
          proofs = data.map((p: any) => ({
            id: p.id,
            student_id: p.student_id,
            emi_id: p.emi_id,
            amount: p.amount,
            reference: p.reference,
            proof_image_url: p.proof_image_url,
            payment_mode: p.payment_mode,
            notes: p.notes,
            status: p.status,
            rejection_reason: p.rejection_reason,
            verified_by: p.verified_by,
            verified_at: p.verified_at,
            created_at: p.created_at,
            student_name: p.students?.name,
            student_email: p.students?.email,
            student_phone: p.students?.phone,
            student_college: p.students?.college,
            installment_no: p.emi_installments?.installment_no,
            emi_due_date: p.emi_installments?.due_date,
            emi_status: p.emi_installments?.status,
            course_name: p.emi_installments?.fee_plans?.courses?.name || '',
            verified_by_name: p.users?.name || null
          }));
        }
      }
    }

    // 2. Fallback to SQLite
    if (proofs.length === 0) {
      try {
        const db = getDb();
        proofs = db.prepare(`
          SELECT 
            p.id,
            p.student_id,
            p.emi_id,
            p.amount,
            p.reference,
            p.proof_image_url,
            p.payment_mode,
            p.notes,
            p.status,
            p.rejection_reason,
            p.verified_by,
            p.verified_at,
            p.created_at,
            s.name as student_name,
            s.email as student_email,
            s.phone as student_phone,
            s.college as student_college,
            e.installment_no,
            e.due_date as emi_due_date,
            e.status as emi_status,
            b.name as batch_name,
            c.name as course_name,
            u.name as verified_by_name
          FROM payment_proofs p
          JOIN students s ON s.id = p.student_id
          JOIN emi_installments e ON e.id = p.emi_id
          JOIN fee_plans fp ON fp.id = e.fee_plan_id
          JOIN courses c ON c.id = fp.course_id
          LEFT JOIN enrollments en ON en.student_id = s.id
          LEFT JOIN batches b ON b.id = en.batch_id
          LEFT JOIN users u ON u.id = p.verified_by
          ORDER BY 
            CASE p.status 
              WHEN 'pending' THEN 1 
              WHEN 'rejected' THEN 2 
              WHEN 'verified' THEN 3 
            END,
            p.created_at DESC
        `).all() as any[];
      } catch (e) {
        console.warn('SQLite fallback query error:', e);
      }
    }

    const pendingCount = proofs.filter(p => p.status === 'pending').length;
    const verifiedCount = proofs.filter(p => p.status === 'verified').length;
    const rejectedCount = proofs.filter(p => p.status === 'rejected').length;

    return NextResponse.json({
      proofs,
      stats: {
        total: proofs.length,
        pending: pendingCount,
        verified: verifiedCount,
        rejected: rejectedCount
      },
      currentRole: user.role
    });
  } catch (error: any) {
    console.error('Error fetching reconciliation proofs:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
