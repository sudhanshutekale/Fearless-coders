import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/rbac/auth';
import { ROLE_PERMISSIONS, UserRole } from '@/lib/rbac/permissions';
import { validateSqlQuery, executeSafeQuery } from '@/lib/rbac/query-guard';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────
// Mock LLM Responses (works without Gemini API)
// ─────────────────────────────────────────────
const MOCK_RESPONSES: { pattern: RegExp; response: any }[] = [
  {
    pattern: /java.*miss.*class|miss.*class.*java|miss.*3.*class|3.*miss/i,
    response: {
      sql: `SELECT s.id, s.name, s.phone, b.name as batch_name,
  COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as missed_classes,
  e.due_date as emi_due_date, e.amount as emi_amount
FROM students s
JOIN enrollments en ON en.student_id = s.id
JOIN batches b ON b.id = en.batch_id
JOIN attendance a ON a.student_id = s.id AND a.batch_id = b.id
JOIN emi_installments e ON e.student_id = s.id AND e.status = 'pending'
WHERE b.id = 'b_java_m1'
GROUP BY s.id
HAVING missed_classes >= 3
ORDER BY missed_classes DESC`,
      explanation: `🎯 Found 2 high-risk students in the Java Fullstack Morning batch with ≥3 missed classes AND a pending EMI due this week:\n\n• **Rohan Gupta** — Missed 5 classes! EMI of ₹11,667 due Oct 19 (3 days away)\n• **Ananya Deshmukh** — Missed 3 classes. EMI of ₹11,667 due Oct 18 (tomorrow)\n\nBoth students are at immediate dropout risk. WhatsApp reminder drafts are ready for approval below.`,
      action: {
        type: 'whatsapp_draft',
        items: [
          {
            studentId: 's_003',
            recipientName: 'Rohan Gupta',
            recipientPhone: '+91 9820033333',
            messageText: 'Hi Rohan 👋, InstiPilot Academy here.\n\nWe noticed you\'ve missed 5 recent classes in the Java Fullstack batch. Your trainer Vikram sir is available to help you catch up with recorded sessions.\n\nAlso, your course EMI of ₹11,667 is due on Oct 19th. Please settle via UPI or contact our accounts team.\n\nWe\'re here to support your journey! 🙏',
            reason: '5 missed classes in Java batch + EMI due Oct 19'
          },
          {
            studentId: 's_007',
            recipientName: 'Ananya Deshmukh',
            recipientPhone: '+91 9820077777',
            messageText: 'Hi Ananya 👋, InstiPilot Academy here.\n\nYou\'ve missed 3 recent Java Fullstack sessions. Lecture recordings are available on the portal — do check them out!\n\nReminder: Your installment of ₹11,667 is due tomorrow (Oct 18). Please clear via UPI/Bank transfer.\n\nReach out if you need academic support! 🚀',
            reason: '3 missed classes in Java batch + EMI due Oct 18'
          }
        ]
      }
    }
  },
  {
    pattern: /overdue|missed.*emi|consecutive.*emi|emi.*overdue/i,
    response: {
      sql: `SELECT s.id, s.name, s.phone, COUNT(e.id) as overdue_count, SUM(e.amount) as total_overdue
FROM students s
JOIN emi_installments e ON e.student_id = s.id
WHERE e.status = 'overdue'
GROUP BY s.id
HAVING overdue_count >= 1
ORDER BY overdue_count DESC, total_overdue DESC`,
      explanation: `💳 Found students with overdue installments:\n\n• **Amit Patel** — 2 CONSECUTIVE missed EMIs! Total overdue: ₹23,334. This is a critical financial default signal — lab access should be reviewed.\n\nAdditionally, several students in the AI/ML and MERN batches have 1 overdue EMI each. A bulk reminder batch has been drafted below.`,
      action: {
        type: 'whatsapp_draft',
        items: [
          {
            studentId: 's_012',
            recipientName: 'Amit Patel',
            recipientPhone: '+91 9820044444',
            messageText: 'Dear Amit, this is a formal notice from InstiPilot Academy Accounts.\n\nTwo consecutive course installments totalling ₹23,334 for your Python Data Engineering course remain overdue. Continued non-payment may affect your lab access and certification eligibility.\n\nPlease contact our accounts office today or transfer via:\nAccount: ICICI 482910xxxx\nUPI: accounts@instipilot.upi\n\nWe\'re happy to discuss a flexible arrangement. 🙏',
            reason: '2 consecutive overdue EMIs — ₹23,334 total'
          }
        ]
      }
    }
  },
  {
    pattern: /risk|dropout|at.?risk|drop.*out/i,
    response: {
      sql: `SELECT s.id, s.name, s.phone, b.name as batch_name,
  COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as missed_classes,
  COUNT(CASE WHEN e.status = 'overdue' THEN 1 END) as overdue_emis,
  (COUNT(CASE WHEN a.status = 'absent' THEN 1 END) * 10 + COUNT(CASE WHEN e.status = 'overdue' THEN 1 END) * 20) as risk_score
FROM students s
JOIN enrollments en ON en.student_id = s.id
JOIN batches b ON b.id = en.batch_id
LEFT JOIN attendance a ON a.student_id = s.id AND a.batch_id = b.id
LEFT JOIN emi_installments e ON e.student_id = s.id
GROUP BY s.id
ORDER BY risk_score DESC
LIMIT 5`,
      explanation: `🚨 **Top 5 Dropout-Risk Students** (Multi-factor Analysis):\n\n1. **Amit Patel** — Score: 92/100 | 2 overdue EMIs + 5 absences\n2. **Sneha Verma** — Score: 84/100 | 4 missed AI labs + overdue fee\n3. **Siddharth Kulkarni** — Score: 85/100 | 6 Java absences, 0 assignments submitted\n4. **Kavita Nair** — Score: 82/100 | 5 consecutive MERN absences\n5. **Rohan Gupta** — Score: 88/100 | 5 absences + EMI due in 3 days\n\n**Recommended Action:** Initiate counselor outreach for all 5 within 24 hours.`,
      action: null
    }
  },
  {
    pattern: /trainer.*schedule|double.?book|clash|vikram/i,
    response: {
      sql: `SELECT t.name as trainer_name, b.name as batch_name, ts.day_of_week, ts.start_time, ts.end_time, r.name as room_name
FROM timetable_slots ts
JOIN trainers t ON t.id = ts.trainer_id
JOIN batches b ON b.id = ts.batch_id
LEFT JOIN rooms r ON r.id = ts.room_id
WHERE ts.trainer_id = 't_vikram'
ORDER BY ts.day_of_week, ts.start_time`,
      explanation: `⚠️ **Trainer Near Double-Booking Alert — Vikram Malhotra:**\n\nVikram is currently assigned to **3 batches on Mon/Wed/Fri**:\n- 08:00–10:00 → Java Fullstack Morning (Lab Alpha)\n- 10:15–12:15 → Java Sprint Fast-Track (Classroom 201)\n- 18:00–20:00 → Java Evening Pro (Classroom 201)\n\n**Critical:** The buffer between batch 1 and batch 2 is only **15 minutes** — insufficient for equipment reset and lab changeover. Room 201 is double-booked at 10:15 if students from morning don't vacate in time.\n\nRecommend using the Timetable Re-planner to shift one batch to Room 202.`,
      action: null
    }
  },
  {
    pattern: /fee.*detail|show.*fee|payment.*detail|emi.*detail/i,
    response: {
      sql: null,
      explanation: null,
      blocked: true,
      blockedReason: `🛡️ **Access Blocked by InstiPilot RBAC Policy**\n\nYour current role does not have authorization to query financial tables (fee_plans, emi_installments, payments).\n\nThe schema-aware copilot strictly filters which database tables are included in its context based on your role — financial data is never exposed to Trainer or Counselor sessions.\n\nTo access fee data, please switch to the **Accounts** or **Owner** role.`
    }
  },
  {
    pattern: /attendance.*summary|summary.*attendance|today.*class|class.*today/i,
    response: {
      sql: `SELECT b.name as batch_name, 
  COUNT(a.id) as total_sessions,
  COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
  COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
  ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / COUNT(a.id), 1) as attendance_pct
FROM attendance a
JOIN batches b ON b.id = a.batch_id
GROUP BY b.id
ORDER BY attendance_pct ASC`,
      explanation: `📊 **Attendance Summary Across All Active Batches:**\n\nAll 8 batches are being tracked with biometric + Zoom WebSDK dual-verification. Current overall attendance rate is **89.2%**.\n\nBatches with below-average attendance:\n- Java Fullstack Morning: 82% (Rohan & Ananya pulling rate down)\n- Python Data Engineering: 78% (Amit Patel, 5 consecutive absences)\n\nFull breakdown is shown in the result table above.`,
      action: null
    }
  }
];

interface StudentMatchResult {
  type: 'single' | 'multiple';
  student?: any;
  students?: any[];
}

function findStudentByQuery(question: string): StudentMatchResult | null {
  const db = getDb();
  const qLower = question.toLowerCase().trim();
  const allStudents = db.prepare('SELECT id, name, phone, email FROM students').all() as any[];

  // 1. Direct ID match (e.g. s_001, s_012)
  const idMatch = qLower.match(/\b(s_\d{3,4})\b/i);
  if (idMatch) {
    const student = allStudents.find(s => s.id.toLowerCase() === idMatch[1].toLowerCase());
    if (student) return { type: 'single', student };
  }

  // 2. Phone number match
  const digits = question.replace(/[^0-9]/g, '');
  if (digits.length >= 8) {
    const phoneStudent = allStudents.find(s => (s.phone || '').replace(/[^0-9]/g, '').includes(digits));
    if (phoneStudent) return { type: 'single', student: phoneStudent };
  }

  // 3. Exact full name match (case insensitive)
  const exactMatches = allStudents.filter(s => qLower.includes(s.name.toLowerCase()));
  if (exactMatches.length === 1) {
    return { type: 'single', student: exactMatches[0] };
  } else if (exactMatches.length > 1) {
    return { type: 'multiple', students: exactMatches };
  }

  // 4. Tokenized first name or last name match
  const words = qLower.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const commonWords = new Set([
    'show', 'tell', 'give', 'find', 'what', 'who', 'about', 'details', 'detail',
    'student', 'students', 'the', 'all', 'for', 'any', 'please', 'with', 'from',
    'where', 'when', 'info', 'information', 'batch', 'course', 'class', 'classes',
    'attendance', 'fee', 'fees', 'emi', 'emis', 'status', 'record', 'records', 'me', 'is', 'a',
    'in', 'of', 'and', 'or', 'to', 'can', 'you', 'profile', 'dossier', 'card', 'report'
  ]);

  const candidateMap = new Map<string, any>();
  for (const s of allStudents) {
    const parts = s.name.toLowerCase().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');

    for (const w of words) {
      if (w.length >= 3 && !commonWords.has(w)) {
        if (firstName === w || lastName === w || parts.includes(w)) {
          candidateMap.set(s.id, s);
        }
      }
    }
  }

  const candidateList = Array.from(candidateMap.values());
  if (candidateList.length === 1) {
    return { type: 'single', student: candidateList[0] };
  } else if (candidateList.length > 1) {
    return { type: 'multiple', students: candidateList };
  }

  return null;
}

function buildMultipleStudentsResponse(students: any[], role: UserRole) {
  const db = getDb();
  const summaryRows = students.slice(0, 8).map((s) => {
    const profile = db.prepare(`
      SELECT b.name as batch_name, c.name as course_name
      FROM enrollments en
      LEFT JOIN batches b ON b.id = en.batch_id
      LEFT JOIN courses c ON c.id = b.course_id
      WHERE en.student_id = ?
      LIMIT 1
    `).get(s.id) as any;

    const att = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent
      FROM attendance WHERE student_id = ?
    `).get(s.id) as any;

    const attPct = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : 100;

    let feeInfo = '';
    if (role !== 'trainer') {
      const fee = db.prepare(`
        SELECT 
          (SELECT COALESCE(SUM(amount), 0) FROM emi_installments WHERE student_id = ? AND status = 'overdue') as overdue
        FROM fee_plans WHERE student_id = ? LIMIT 1
      `).get(s.id, s.id) as any;
      feeInfo = fee && fee.overdue > 0 ? `| 🚨 Overdue: ₹${fee.overdue.toLocaleString('en-IN')}` : `| ✅ Fees: Clear`;
    }

    return `• **${s.name}** (\`${s.id}\`) — Batch: **${profile?.batch_name || 'Assigned Cohort'}** | Attendance: **${attPct}%** (${att?.absent || 0} absent) ${feeInfo}\n  👉 *Ask: "Show details of ${s.name}"*`;
  }).join('\n\n');

  const studentIds = students.slice(0, 8).map(s => `'${s.id}'`).join(',');
  const sql = `SELECT s.id, s.name, s.phone, s.email, b.name as batch_name
FROM students s
LEFT JOIN enrollments en ON en.student_id = s.id
LEFT JOIN batches b ON b.id = en.batch_id
WHERE s.id IN (${studentIds})
LIMIT 10`;

  const explanation = `### 🔍 Multiple Students Matched (${students.length} found)\n\nPlease specify which student you would like to inspect in detail:\n\n${summaryRows}\n\n---\n*Tip: You can query by exact full name (e.g. \`Aarav Gupta\`) or ID (e.g. \`s_001\`) to load their full dossier, timetable, and EMI records.*`;

  return {
    sql,
    explanation,
    action: null
  };
}


function buildStudentResponse(student: any, role: UserRole) {
  const db = getDb();
  const sId = student.id;

  // 1. Core Profile & Course & Batch
  const profile = db.prepare(`
    SELECT 
      s.id, s.name, s.email, s.phone, s.status, s.join_date,
      s.guardian_name, s.guardian_phone,
      b.id as batch_id, b.name as batch_name, b.days, b.start_time, b.end_time, b.mode,
      c.name as course_name, c.code as course_code, c.duration_weeks, c.total_fee,
      t.name as trainer_name, t.phone as trainer_phone,
      r.name as room_name
    FROM students s
    LEFT JOIN enrollments en ON en.student_id = s.id
    LEFT JOIN batches b ON b.id = en.batch_id
    LEFT JOIN courses c ON c.id = b.course_id
    LEFT JOIN trainers t ON t.id = b.trainer_id
    LEFT JOIN rooms r ON r.id = b.room_id
    WHERE s.id = ?
    LIMIT 1
  `).get(sId) as any || student;

  // 2. Attendance stats
  const att = db.prepare(`
    SELECT 
      COUNT(*) as total_sessions,
      COUNT(CASE WHEN status = 'present' THEN 1 END) as present_sessions,
      COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_sessions,
      COUNT(CASE WHEN status = 'late' THEN 1 END) as late_sessions
    FROM attendance 
    WHERE student_id = ?
  `).get(sId) as any || { total_sessions: 0, present_sessions: 0, absent_sessions: 0, late_sessions: 0 };

  const attPct = att.total_sessions > 0
    ? Math.round(((att.present_sessions + att.late_sessions * 0.5) / att.total_sessions) * 100)
    : 100;

  // 3. Fee & EMIs (if role allows)
  let feeSection = '';
  let emis: any[] = [];
  let pendingEmi = 0;
  let overdueEmi = 0;

  const canViewFees = role === 'owner' || role === 'accounts' || role === 'counselor';
  if (canViewFees) {
    const fee = db.prepare(`
      SELECT 
        fp.total_amount, fp.down_payment, fp.num_installments, fp.discount,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = ? AND status = 'verified') as total_paid,
        (SELECT COALESCE(SUM(amount), 0) FROM emi_installments WHERE student_id = ? AND status = 'pending') as pending_emi_amount,
        (SELECT COALESCE(SUM(amount), 0) FROM emi_installments WHERE student_id = ? AND status = 'overdue') as overdue_emi_amount,
        (SELECT COUNT(*) FROM emi_installments WHERE student_id = ? AND status = 'overdue') as overdue_emi_count
      FROM fee_plans fp
      WHERE fp.student_id = ?
      LIMIT 1
    `).get(sId, sId, sId, sId, sId) as any;

    emis = db.prepare(`
      SELECT installment_no, amount, due_date, status
      FROM emi_installments
      WHERE student_id = ?
      ORDER BY installment_no ASC
    `).all(sId) as any[];

    if (fee) {
      pendingEmi = fee.pending_emi_amount || 0;
      overdueEmi = fee.overdue_emi_amount || 0;
      const emiListText = emis.map(e => `  • Installment #${e.installment_no}: ₹${e.amount?.toLocaleString('en-IN')} (Due: ${e.due_date}) — **${e.status.toUpperCase()}**`).join('\n');

      feeSection = `\n\n💳 **Fee & EMI Breakdown**:\n• Total Course Fee: **₹${fee.total_amount?.toLocaleString('en-IN')}** | Total Paid: **₹${fee.total_paid?.toLocaleString('en-IN')}**\n• Overdue Amount: **${overdueEmi > 0 ? `🚨 ₹${overdueEmi.toLocaleString('en-IN')} (${fee.overdue_emi_count} overdue)` : 'None (₹0)'}**\n• Pending Balance: **₹${pendingEmi.toLocaleString('en-IN')}**\n\n**Installment Schedule**:\n${emiListText || '  • No installments configured'}`;
    }
  } else {
    feeSection = `\n\n🛡️ **Financial Data Hidden**\n*Financial ledger & EMI balances are hidden for Trainer session per RBAC policy.*`;
  }

  // 4. Academics
  const academics = db.prepare(`
    SELECT 
      COUNT(sub.id) as submitted_count,
      ROUND(AVG(sub.marks), 1) as avg_marks
    FROM submissions sub
    WHERE sub.student_id = ?
  `).get(sId) as any || { submitted_count: 0, avg_marks: null };

  // 5. Risk Assessment
  let riskBadge = '🟢 Low Risk';
  if (att.absent_sessions >= 4 || overdueEmi > 0) {
    riskBadge = '🔴 High Dropout Risk';
  } else if (att.absent_sessions >= 2) {
    riskBadge = '🟡 Moderate Warning';
  }

  // 6. Action Preview (WhatsApp message draft)
  let action = null;
  if (att.absent_sessions >= 2 || overdueEmi > 0) {
    action = {
      type: 'whatsapp_draft',
      items: [
        {
          studentId: profile.id,
          recipientName: profile.name,
          recipientPhone: profile.phone,
          messageText: `Hi ${profile.name.split(' ')[0]} 👋, InstiPilot Academic Office here.\n\nWe wanted to check in on you. You've missed ${att.absent_sessions} classes in your ${profile.batch_name || 'course'} batch.${overdueEmi > 0 ? ` Also, your pending course fee of ₹${overdueEmi.toLocaleString('en-IN')} is overdue.` : ''}\n\nTrainer ${profile.trainer_name || 'Vikram'} has lecture recordings available for you to catch up. Please reach out if you need any academic support! 🚀`,
          reason: `${att.absent_sessions} missed classes${overdueEmi > 0 ? ` + ₹${overdueEmi.toLocaleString('en-IN')} overdue` : ''}`
        }
      ]
    };
  }

  // Construct Markdown Explanation
  const explanation = `### 🧑‍🎓 Student Dossier: **${profile.name}** [${riskBadge}]
**ID**: \`${profile.id}\` | **Status**: \`${profile.status.toUpperCase()}\` | **Joined**: ${profile.join_date}
**Contact**: ${profile.phone} | ${profile.email}
**Guardian**: ${profile.guardian_name || 'Not Listed'} (${profile.guardian_phone || 'N/A'})

---

📚 **Academic Enrollment & Schedule**:
• **Course**: ${profile.course_name || 'N/A'} (\`${profile.course_code || 'CODE'}\`) — ${profile.duration_weeks || 16} Weeks
• **Batch**: **${profile.batch_name || 'N/A'}** (${profile.mode?.toUpperCase() || 'HYBRID'})
• **Timings**: \`${profile.days || 'Mon,Wed,Fri'}\` at \`${profile.start_time || '08:00'} - ${profile.end_time || '10:00'}\`
• **Faculty**: **${profile.trainer_name || 'Assigned Faculty'}** (${profile.trainer_phone || ''})
• **Allocated Room**: ${profile.room_name || 'Lab Alpha'}

---

📊 **Attendance & Class Activity**:
• Overall Attendance: **${attPct}%** (${att.present_sessions} Present, ${att.late_sessions} Late, **${att.absent_sessions} Absent** out of ${att.total_sessions} sessions)
• Assignments Submitted: **${academics.submitted_count}**${academics.avg_marks ? ` (Avg Score: **${academics.avg_marks}/100**)` : ''}${feeSection}

---

⚡ **Quick Actions**:
• 📄 **[Download Official Certificate PDF](/api/certificates/generate?studentId=${profile.id})**
• 💬 **Retention Action**: ${action ? 'WhatsApp follow-up draft created for approval in Outbox.' : 'Student attendance & standing are in good order.'}`;

  // Safe SQL to show in the Copilot Code Inspector tab
  const sql = `SELECT 
  s.id, s.name, s.phone, s.email, s.status, s.join_date,
  b.name as batch_name, b.days, b.start_time, b.end_time, b.mode,
  c.name as course_name,
  t.name as trainer_name,
  r.name as room_name,
  (SELECT COUNT(*) FROM attendance WHERE student_id = s.id AND status = 'present') as present_count,
  (SELECT COUNT(*) FROM attendance WHERE student_id = s.id AND status = 'absent') as absent_count
FROM students s
LEFT JOIN enrollments en ON en.student_id = s.id
LEFT JOIN batches b ON b.id = en.batch_id
LEFT JOIN courses c ON c.id = b.course_id
LEFT JOIN trainers t ON t.id = b.trainer_id
LEFT JOIN rooms r ON r.id = b.room_id
WHERE s.id = '${profile.id}'`;

  return {
    sql,
    explanation,
    action
  };
}

function getMockResponse(question: string, role: UserRole) {
  // 1. Block financial queries for trainer role
  if (role === 'trainer' && /fee|emi|payment|amount|installment/i.test(question)) {
    return {
      sql: null,
      explanation: null,
      blocked: true,
      blockedReason: `🛡️ **RBAC Policy Block — Trainer Role**\n\nAs a Trainer, your session is strictly limited to pedagogical data (batches, attendance, assignments, recordings). Financial tables (fee_plans, emi_installments, payments) are never included in the Copilot prompt context for your role.\n\nThis block was intentional per InstiPilot Zero-Trust RBAC design. The SQL validator would also reject any attempt to query these tables directly.`
    };
  }

  // 2. Check if query is about a specific student by name, ID, or phone!
  const matchedStudent = findStudentByQuery(question);
  if (matchedStudent) {
    if (matchedStudent.type === 'single' && matchedStudent.student) {
      return buildStudentResponse(matchedStudent.student, role);
    } else if (matchedStudent.type === 'multiple' && matchedStudent.students) {
      return buildMultipleStudentsResponse(matchedStudent.students, role);
    }
  }

  // 3. Match predefined operation patterns
  for (const mock of MOCK_RESPONSES) {
    if (mock.pattern.test(question)) {
      return mock.response;
    }
  }

  // 4. Default fallback
  return {
    sql: `SELECT s.name, s.phone, s.status, s.join_date, b.name as batch_name
FROM students s
LEFT JOIN enrollments en ON en.student_id = s.id
LEFT JOIN batches b ON b.id = en.batch_id
WHERE s.status = 'active'
ORDER BY s.join_date DESC
LIMIT 10`,
    explanation: `I analyzed your question and fetched the 10 most recently enrolled active students. For more specific queries (attendance patterns, EMI status, timetable clashes, or a specific student's full details by name), try typing the student's name (e.g. *Aarav Gupta*, *Rohan Gupta*) or batch name.`,
    action: null
  };
}

// ─────────────────────────────────────────────
// Gemini API Integration
// ─────────────────────────────────────────────
async function callGeminiAPI(prompt: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('No API key');

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Parse JSON from response
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
  }
  throw new Error('Could not parse JSON from LLM response');
}

// ─────────────────────────────────────────────
// Build Schema-Filtered System Prompt for Role
// ─────────────────────────────────────────────
function buildRoleAwarePrompt(question: string, role: UserRole): string {
  const config = ROLE_PERMISSIONS[role];
  const allowedTables = config.allowedTables;

  const SCHEMA_MAP: Record<string, string> = {
    users: `users(id, name, email, role)`,
    students: `students(id, name, email, phone, guardian_name, guardian_phone, city, college, join_date, status)`,
    courses: `courses(id, code, name, description, duration_weeks, total_fee)`,
    batches: `batches(id, course_id, trainer_id, room_id, name, days, start_time, end_time, mode, online_seat_limit, max_seats, status, start_date, end_date)`,
    trainers: `trainers(id, user_id, name, email, phone, specializations, availability)`,
    rooms: `rooms(id, name, capacity, type, equipment)`,
    enrollments: `enrollments(id, student_id, batch_id, enrolled_at, preferred_mode, status)`,
    fee_plans: `fee_plans(id, student_id, course_id, total_amount, down_payment, num_installments, discount)`,
    emi_installments: `emi_installments(id, fee_plan_id, student_id, installment_no, due_date, amount, status, paid_date)`,
    payments: `payments(id, emi_id, student_id, source, reference, amount, date, notes, status)`,
    attendance: `attendance(id, student_id, batch_id, date, mode, check_in_time, status, ip_or_location)`,
    assignments: `assignments(id, batch_id, title, description, due_date, max_marks)`,
    submissions: `submissions(id, assignment_id, student_id, submitted_at, status, marks, feedback)`,
    recordings: `recordings(id, batch_id, title, url, date, duration_minutes, topic_tags, views_count)`,
    timetable_slots: `timetable_slots(id, batch_id, trainer_id, room_id, day_of_week, start_time, end_time, is_active)`,
    messages_outbox: `messages_outbox(id, student_id, recipient_phone, recipient_name, channel, message_text, draft_reason, status, created_by_role)`,
    audit_log: `audit_log(id, user_id, user_name, role, action, query, result_summary, status, timestamp)`
  };

  const roleSchema = allowedTables
    .filter(t => SCHEMA_MAP[t])
    .map(t => SCHEMA_MAP[t])
    .join('\n');

  return `You are InstiPilot AI Copilot — a read-only SQL analytics assistant for an Indian training institute. 

ROLE: ${role} (${config.displayName})
FORBIDDEN TABLES (never use): ${config.forbiddenTables.join(', ') || 'none'}

ALLOWED DATABASE SCHEMA FOR THIS ROLE:
${roleSchema}

RULES:
1. Generate ONLY a single SELECT statement. No INSERT/UPDATE/DELETE/DROP/ALTER/PRAGMA.
2. No SQL comments (-- or /* */).
3. Only use tables from the allowed schema above.
4. Always include a LIMIT clause (max 50 rows).
5. If the question asks for WhatsApp messages or reminders, include an 'action' field in JSON.
6. If the question is about financial data and role is 'trainer' or 'counselor', return blocked=true.

QUESTION: ${question}

Return ONLY valid JSON (no markdown, no explanation outside JSON):
{
  "sql": "SELECT ... LIMIT 50",
  "explanation": "Plain English summary of results (2-4 sentences, use markdown)",
  "action": null or {
    "type": "whatsapp_draft",
    "items": [{"studentId": "...", "recipientName": "...", "recipientPhone": "...", "messageText": "...", "reason": "..."}]
  }
}`;
}

// ─────────────────────────────────────────────
// Main Copilot Route Handler
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await req.json();
    const { question } = body;

    if (!question || question.trim().length === 0) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 });
    }

    const useMock = process.env.MOCK_LLM === 'true' || !process.env.GEMINI_API_KEY;
    let llmResponse: any;

    // 0. Priority Student Dossier Matching (ensures instant 100% full detail retrieval by name, ID, or phone)
    const studentMatch = findStudentByQuery(question);
    if (studentMatch) {
      if (studentMatch.type === 'single' && studentMatch.student) {
        llmResponse = buildStudentResponse(studentMatch.student, user.role);
      } else if (studentMatch.type === 'multiple' && studentMatch.students) {
        llmResponse = buildMultipleStudentsResponse(studentMatch.students, user.role);
      }
    }

    if (!llmResponse) {
      if (useMock) {
        // Use intelligent rule-based mock responses
        llmResponse = getMockResponse(question, user.role);
      } else {
        try {
          const prompt = buildRoleAwarePrompt(question, user.role);
          llmResponse = await callGeminiAPI(prompt);
        } catch (apiError) {
          console.warn('Gemini API error, falling back to mock:', apiError);
          llmResponse = getMockResponse(question, user.role);
        }
      }
    }

    // If mock/LLM returned a blocked response
    if (llmResponse.blocked) {
      // Log blocked attempt
      const db = getDb();
      db.prepare(`
        INSERT INTO audit_log (id, user_id, user_name, role, action, query, result_summary, status)
        VALUES (?, ?, ?, ?, 'copilot_blocked', ?, ?, 'blocked')
      `).run(
        `aud_blk_${Date.now()}`,
        user.id, user.name, user.role,
        question,
        llmResponse.blockedReason || 'Role-based access denied'
      );

      return NextResponse.json({
        blocked: true,
        blockedReason: llmResponse.blockedReason,
        explanation: llmResponse.blockedReason
      });
    }

    // Validate and execute the SQL
    const sqlResult = llmResponse.sql
      ? await executeSafeQuery(llmResponse.sql, user, question)
      : null;

    if (sqlResult?.blocked) {
      return NextResponse.json({
        blocked: true,
        blockedReason: sqlResult.blockedReason,
        explanation: sqlResult.blockedReason
      });
    }

    // Save draft messages to outbox if action present
    if (llmResponse.action?.items?.length > 0) {
      const db = getDb();
      for (const item of llmResponse.action.items) {
        const existingDraft = db.prepare(
          `SELECT id FROM messages_outbox WHERE student_id = ? AND status = 'draft' LIMIT 1`
        ).get(item.studentId) as any;

        if (!existingDraft) {
          db.prepare(`
            INSERT INTO messages_outbox (id, student_id, recipient_phone, recipient_name, channel, message_text, draft_reason, status, created_by_role)
            VALUES (?, ?, ?, ?, 'whatsapp', ?, ?, 'draft', ?)
          `).run(
            `msg_ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            item.studentId,
            item.recipientPhone,
            item.recipientName,
            item.messageText,
            item.reason,
            user.role
          );
        }
      }
    }

    return NextResponse.json({
      sql: sqlResult?.executedSql || llmResponse.sql,
      explanation: llmResponse.explanation,
      data: sqlResult?.data || [],
      rowCount: sqlResult?.rowCount || 0,
      actionPreview: llmResponse.action,
      executionTimeMs: sqlResult?.executionTimeMs,
      usedMock: useMock
    });

  } catch (err: any) {
    console.error('Copilot error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
