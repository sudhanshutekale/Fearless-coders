import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/rbac/auth';

export const dynamic = 'force-dynamic';

/**
 * Simple fuzzy name match: checks if any word in the sender name
 * matches the beginning of any word in a student name.
 */
function fuzzyNameMatch(senderName: string, studentName: string): number {
  if (!senderName || !studentName) return 0;
  const senderWords = senderName.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
  const studentWords = studentName.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);

  let matchCount = 0;
  for (const sw of senderWords) {
    for (const stw of studentWords) {
      if (stw.startsWith(sw) || sw.startsWith(stw)) {
        matchCount++;
        break;
      }
    }
  }

  if (senderWords.length === 0) return 0;
  return Math.round((matchCount / Math.max(senderWords.length, 1)) * 100);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (user.role === 'trainer' || user.role === 'counselor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { transactions } = body;

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Invalid transactions array' }, { status: 400 });
    }

    const db = getDb();

    // Get all pending/overdue EMIs with student info
    const pendingEmis = db.prepare(`
      SELECT e.id as emi_id, e.student_id, e.amount, e.due_date, e.status,
             s.name as student_name, s.phone as student_phone
      FROM emi_installments e
      JOIN students s ON s.id = e.student_id
      WHERE e.status IN ('pending', 'overdue')
      ORDER BY e.due_date ASC
    `).all() as any[];

    const matches = transactions.map((txn: any) => {
      const { reference, amount, date, senderName } = txn;

      let bestMatch: any = null;
      let bestConfidence = 0;

      for (const emi of pendingEmis) {
        let confidence = 0;

        // 1. Exact amount match (strongest signal, +50)
        if (Math.abs(emi.amount - amount) < 1) {
          confidence += 50;
        }
        // Close amount (within 5%, +20)
        else if (Math.abs(emi.amount - amount) / emi.amount < 0.05) {
          confidence += 20;
        }

        // 2. Name fuzzy match (+40 max)
        if (senderName) {
          const nameScore = fuzzyNameMatch(senderName, emi.student_name);
          confidence += Math.round(nameScore * 0.4);
        }

        // 3. Reference contains student ID fragment (+10)
        if (reference && emi.student_id) {
          const idFragment = emi.student_id.replace('s_', '');
          if (reference.toLowerCase().includes(idFragment)) {
            confidence += 10;
          }
        }

        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatch = emi;
        }
      }

      let status: 'matched' | 'unmatched' | 'suspicious' = 'unmatched';
      if (bestConfidence >= 80) {
        status = 'matched';
      } else if (bestConfidence >= 40) {
        status = 'suspicious';
      }

      return {
        reference,
        amount,
        date,
        matchedStudentName: bestMatch?.student_name || null,
        matchedStudentId: bestMatch?.student_id || null,
        matchedEmiId: bestMatch?.emi_id || null,
        confidence: bestConfidence,
        status,
        reason: bestConfidence >= 80
          ? `Exact amount match (₹${amount}) + name match for ${bestMatch?.student_name}`
          : bestConfidence >= 40
          ? `Partial match: amount close to expected EMI for ${bestMatch?.student_name}`
          : 'No matching EMI found — manual review needed'
      };
    });

    return NextResponse.json({ matches });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
