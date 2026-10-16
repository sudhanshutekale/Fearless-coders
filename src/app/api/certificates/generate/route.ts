import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/rbac/auth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId required' }, { status: 400 });
    }

    const db = getDb();

    const student = db.prepare(`
      SELECT s.*, b.name as batch_name, c.name as course_name, c.code as course_code,
             t.name as trainer_name
      FROM students s
      JOIN enrollments en ON en.student_id = s.id
      JOIN batches b ON b.id = en.batch_id
      JOIN courses c ON c.id = b.course_id
      JOIN trainers t ON t.id = b.trainer_id
      WHERE s.id = ?
      LIMIT 1
    `).get(studentId) as any;

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const verificationId = `INSTP-${Date.now().toString(36).toUpperCase()}-${studentId.slice(-4).toUpperCase()}`;
    const issueDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([841.89, 595.28]); // A4 Landscape
    const { width, height } = page.getSize();

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Background gradient simulation (dark navy)
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.04, 0.06, 0.11) });

    // Border accent lines
    page.drawRectangle({ x: 30, y: 30, width: width - 60, height: height - 60, borderColor: rgb(0, 0.94, 1), borderWidth: 2 });
    page.drawRectangle({ x: 38, y: 38, width: width - 76, height: height - 76, borderColor: rgb(0.53, 0.36, 0.97), borderWidth: 0.5 });

    // Title
    page.drawText('CERTIFICATE OF COMPLETION', {
      x: 200,
      y: height - 110,
      size: 28,
      font: helveticaBold,
      color: rgb(0, 0.94, 1),
    });

    page.drawText('InstiPilot Institute of Technology & Digital Learning', {
      x: 190,
      y: height - 138,
      size: 13,
      font: helvetica,
      color: rgb(0.6, 0.7, 0.9),
    });

    // Decorative line
    page.drawLine({ start: { x: 80, y: height - 160 }, end: { x: width - 80, y: height - 160 }, thickness: 1, color: rgb(0.53, 0.36, 0.97) });

    // Presented to
    page.drawText('This is to certify that', {
      x: 300,
      y: height - 200,
      size: 12,
      font: helvetica,
      color: rgb(0.6, 0.7, 0.8),
    });

    // Student Name
    page.drawText(student.name, {
      x: (width - student.name.length * 16) / 2,
      y: height - 245,
      size: 38,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    page.drawText('has successfully completed the course', {
      x: 280,
      y: height - 280,
      size: 12,
      font: helvetica,
      color: rgb(0.6, 0.7, 0.8),
    });

    // Course Name
    page.drawText(student.course_name, {
      x: (width - student.course_name.length * 10) / 2,
      y: height - 320,
      size: 22,
      font: helveticaBold,
      color: rgb(0, 0.94, 1),
    });

    page.drawText(`Course Code: ${student.course_code}  |  Batch: ${student.batch_name}`, {
      x: 250,
      y: height - 348,
      size: 11,
      font: helvetica,
      color: rgb(0.5, 0.6, 0.7),
    });

    page.drawText(`Lead Trainer: ${student.trainer_name}`, {
      x: 330,
      y: height - 367,
      size: 11,
      font: helvetica,
      color: rgb(0.5, 0.6, 0.7),
    });

    // Decorative line
    page.drawLine({ start: { x: 80, y: height - 395 }, end: { x: width - 80, y: height - 395 }, thickness: 0.5, color: rgb(0.3, 0.35, 0.45) });

    // Signatures section
    page.drawText('Director, InstiPilot Academy', {
      x: 120,
      y: height - 450,
      size: 10,
      font: helveticaBold,
      color: rgb(0.7, 0.8, 0.9),
    });
    page.drawLine({ start: { x: 100, y: height - 435 }, end: { x: 310, y: height - 435 }, thickness: 0.5, color: rgb(0.3, 0.4, 0.5) });

    page.drawText('Lead Technical Trainer', {
      x: 550,
      y: height - 450,
      size: 10,
      font: helveticaBold,
      color: rgb(0.7, 0.8, 0.9),
    });
    page.drawLine({ start: { x: 520, y: height - 435 }, end: { x: 730, y: height - 435 }, thickness: 0.5, color: rgb(0.3, 0.4, 0.5) });

    // Footer
    page.drawText(`Issue Date: ${issueDate}`, { x: 120, y: 65, size: 10, font: helvetica, color: rgb(0.4, 0.5, 0.6) });
    page.drawText(`Verification ID: ${verificationId}`, { x: 500, y: 65, size: 9, font: helvetica, color: rgb(0.4, 0.5, 0.6) });
    page.drawText('Verify at: verify.instipilot.com', { x: 310, y: 50, size: 9, font: helvetica, color: rgb(0, 0.6, 0.8) });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="InstiPilot_Certificate_${student.name.replace(/\s+/g, '_')}.pdf"`,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
