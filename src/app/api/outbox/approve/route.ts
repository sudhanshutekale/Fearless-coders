import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/rbac/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();

    if (user.role === 'trainer') {
      return NextResponse.json({ error: 'Trainers cannot dispatch outbox messages.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, studentId, recipientPhone, recipientName, messageText, draftReason, channel } = body;

    const db = getDb();
    let msgId = id || `msg_${Date.now()}`;

    if (id) {
      db.prepare(`
        UPDATE messages_outbox
        SET status = 'approved', approved_by = ?, approved_at = datetime('now')
        WHERE id = ?
      `).run(user.name, id);
    } else {
      if (!recipientPhone || !messageText) {
        return NextResponse.json({ error: 'Missing required outbox fields.' }, { status: 400 });
      }

      db.prepare(`
        INSERT INTO messages_outbox (id, student_id, recipient_phone, recipient_name, channel, message_text, draft_reason, status, created_by_role, approved_by, approved_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, datetime('now'))
      `).run(
        msgId,
        studentId || null,
        recipientPhone,
        recipientName || 'Student',
        channel || 'whatsapp',
        messageText,
        draftReason || 'Approved via Copilot or Dashboard',
        user.role,
        user.name
      );
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_log (id, user_id, user_name, role, action, query, result_summary, status)
      VALUES (?, ?, ?, ?, 'action_approved', ?, ?, 'success')
    `).run(
      `aud_approve_${Date.now()}`,
      user.id, user.name, user.role,
      `Approved WhatsApp message to ${recipientName || 'Student'} (${recipientPhone || 'N/A'})`,
      `Message: ${(messageText || 'Outbox message approved').slice(0, 80)}...`
    );

    return NextResponse.json({ success: true, msgId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (user.role === 'trainer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getDb();
    const messages = db.prepare(`
      SELECT o.*, s.name as student_name_linked
      FROM messages_outbox o
      LEFT JOIN students s ON s.id = o.student_id
      ORDER BY o.created_at DESC
      LIMIT 50
    `).all();

    return NextResponse.json({ messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
