-- InstiPilot Core SQLite Schema
-- Designed for comprehensive Institute Operations & AI Copilot queries

PRAGMA foreign_keys = ON;

-- 1. Users (Staff & Admin)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner', 'counselor', 'trainer', 'accounts')),
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Rooms
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    type TEXT NOT NULL, -- e.g. 'Lab', 'Classroom', 'Seminar Hall'
    equipment TEXT,      -- JSON or CSV string e.g. 'Projector, 35 High-End PCs, Audio Rig'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Trainers
CREATE TABLE IF NOT EXISTS trainers (
    id TEXT PRIMARY KEY,
    user_id TEXT, -- nullable link to users table if staff account exists
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    specializations TEXT NOT NULL, -- e.g. 'Java, DBMS, Spring Boot'
    availability TEXT NOT NULL,    -- JSON string e.g. {"mon":["08:00-14:00"], ...}
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Courses
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    duration_weeks INTEGER NOT NULL,
    total_fee REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Batches
CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    trainer_id TEXT NOT NULL,
    room_id TEXT,
    name TEXT NOT NULL,
    days TEXT NOT NULL, -- e.g. 'Mon,Wed,Fri' or 'Sat,Sun'
    start_time TEXT NOT NULL, -- '08:00'
    end_time TEXT NOT NULL,   -- '10:00'
    mode TEXT NOT NULL CHECK(mode IN ('classroom', 'online', 'hybrid')),
    online_seat_limit INTEGER DEFAULT 50,
    max_seats INTEGER NOT NULL DEFAULT 35,
    status TEXT NOT NULL DEFAULT 'ongoing' CHECK(status IN ('upcoming', 'ongoing', 'completed')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(course_id) REFERENCES courses(id),
    FOREIGN KEY(trainer_id) REFERENCES trainers(id),
    FOREIGN KEY(room_id) REFERENCES rooms(id)
);

-- 6. Students
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    guardian_name TEXT,
    guardian_phone TEXT,
    city TEXT,
    college TEXT,
    join_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'dropped', 'on_leave')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    batch_id TEXT NOT NULL,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    preferred_mode TEXT NOT NULL DEFAULT 'hybrid' CHECK(preferred_mode IN ('classroom', 'online', 'hybrid')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    UNIQUE(student_id, batch_id)
);

-- 8. Fee Plans
CREATE TABLE IF NOT EXISTS fee_plans (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    total_amount REAL NOT NULL,
    down_payment REAL NOT NULL DEFAULT 0,
    num_installments INTEGER NOT NULL DEFAULT 1,
    discount REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(course_id) REFERENCES courses(id)
);

-- 9. EMI Installments
CREATE TABLE IF NOT EXISTS emi_installments (
    id TEXT PRIMARY KEY,
    fee_plan_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    installment_no INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('paid', 'pending', 'overdue')),
    paid_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(fee_plan_id) REFERENCES fee_plans(id) ON DELETE CASCADE,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 10. Payments
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    emi_id TEXT,
    student_id TEXT NOT NULL,
    source TEXT NOT NULL CHECK(source IN ('upi', 'bank', 'cash', 'card')),
    reference TEXT NOT NULL,
    amount REAL NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'verified' CHECK(status IN ('verified', 'pending', 'flagged')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(emi_id) REFERENCES emi_installments(id) ON DELETE SET NULL,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 11. Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    batch_id TEXT NOT NULL,
    date DATE NOT NULL,
    mode TEXT NOT NULL CHECK(mode IN ('classroom', 'online')),
    check_in_time TEXT, -- e.g. '08:04:12'
    status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late')),
    ip_or_location TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    UNIQUE(student_id, batch_id, date)
);

-- 12. Assignments
CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    max_marks INTEGER NOT NULL DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE CASCADE
);

-- 13. Submissions
CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    submitted_at DATETIME,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted', 'graded', 'pending', 'late')),
    marks INTEGER,
    feedback TEXT,
    submission_url TEXT,
    FOREIGN KEY(assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(assignment_id, student_id)
);

-- 14. Recordings
CREATE TABLE IF NOT EXISTS recordings (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    date DATE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    topic_tags TEXT,
    views_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE CASCADE
);

-- 15. Timetable Slots
CREATE TABLE IF NOT EXISTS timetable_slots (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    trainer_id TEXT NOT NULL,
    room_id TEXT,
    day_of_week TEXT NOT NULL CHECK(day_of_week IN ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY(trainer_id) REFERENCES trainers(id) ON DELETE CASCADE,
    FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- 16. Messages Outbox (Human-in-the-loop approvals for WhatsApp/SMS/Email)
CREATE TABLE IF NOT EXISTS messages_outbox (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK(channel IN ('whatsapp', 'sms', 'email')),
    template_name TEXT,
    message_text TEXT NOT NULL,
    draft_reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'approved', 'rejected', 'sent')),
    created_by_role TEXT NOT NULL,
    approved_by TEXT,
    approved_at DATETIME,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE SET NULL
);

-- 17. Audit Log (Security & Copilot tracking)
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    role TEXT NOT NULL,
    action TEXT NOT NULL, -- 'copilot_query', 'copilot_blocked', 'action_approved', 'action_rejected', 'timetable_replan', 'login'
    query TEXT,           -- Plain text or SQL
    result_summary TEXT,  -- Short summary or error explanation
    status TEXT NOT NULL CHECK(status IN ('success', 'blocked', 'warning', 'error')),
    ip_address TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_batches_course ON batches(course_id);
CREATE INDEX IF NOT EXISTS idx_batches_trainer ON batches(trainer_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_batch ON enrollments(batch_id);
CREATE INDEX IF NOT EXISTS idx_emi_student ON emi_installments(student_id);
CREATE INDEX IF NOT EXISTS idx_emi_due_status ON emi_installments(due_date, status);
CREATE INDEX IF NOT EXISTS idx_attendance_batch_date ON attendance(batch_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_timetable_trainer ON timetable_slots(trainer_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
