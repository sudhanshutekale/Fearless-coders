import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'instipilot.db');
const SCHEMA_PATH = path.join(process.cwd(), 'src/lib/db/schema.sql');

export function seedDatabase() {
  console.log('🌱 Starting InstiPilot Database Seeding...');

  // Remove existing DB to ensure clean repeatable seed
  if (fs.existsSync(DB_PATH)) {
    try {
      fs.unlinkSync(DB_PATH);
      console.log('🗑️  Removed previous database file.');
    } catch {
      // might be open
    }
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // 1. Initialize schema
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schemaSql);
  console.log('✅ Schema tables and indexes created.');

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertRoom = db.prepare(`
    INSERT INTO rooms (id, name, capacity, type, equipment)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertTrainer = db.prepare(`
    INSERT INTO trainers (id, user_id, name, email, phone, specializations, availability)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCourse = db.prepare(`
    INSERT INTO courses (id, code, name, description, duration_weeks, total_fee)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertBatch = db.prepare(`
    INSERT INTO batches (id, course_id, trainer_id, room_id, name, days, start_time, end_time, mode, online_seat_limit, max_seats, status, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertStudent = db.prepare(`
    INSERT INTO students (id, name, email, phone, guardian_name, guardian_phone, city, college, join_date, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertEnrollment = db.prepare(`
    INSERT INTO enrollments (id, student_id, batch_id, enrolled_at, preferred_mode, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertFeePlan = db.prepare(`
    INSERT INTO fee_plans (id, student_id, course_id, total_amount, down_payment, num_installments, discount, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertEmi = db.prepare(`
    INSERT INTO emi_installments (id, fee_plan_id, student_id, installment_no, due_date, amount, status, paid_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPayment = db.prepare(`
    INSERT INTO payments (id, emi_id, student_id, source, reference, amount, date, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAttendance = db.prepare(`
    INSERT INTO attendance (id, student_id, batch_id, date, mode, check_in_time, status, ip_or_location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAssignment = db.prepare(`
    INSERT INTO assignments (id, batch_id, title, description, due_date, max_marks)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertSubmission = db.prepare(`
    INSERT INTO submissions (id, assignment_id, student_id, submitted_at, status, marks, feedback, submission_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRecording = db.prepare(`
    INSERT INTO recordings (id, batch_id, title, url, date, duration_minutes, topic_tags, views_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTimetableSlot = db.prepare(`
    INSERT INTO timetable_slots (id, batch_id, trainer_id, room_id, day_of_week, start_time, end_time, is_active, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOutbox = db.prepare(`
    INSERT INTO messages_outbox (id, student_id, recipient_phone, recipient_name, channel, template_name, message_text, draft_reason, status, created_by_role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAudit = db.prepare(`
    INSERT INTO audit_log (id, user_id, user_name, role, action, query, result_summary, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Execute in single transaction for speed
  const seedTransaction = db.transaction(() => {
    // 1. Staff Users (4 roles)
    insertUser.run('u_owner', 'Priya Sharma (Director)', 'owner@instipilot.com', 'demo_hash_owner', 'owner', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150');
    insertUser.run('u_counselor', 'Rajesh Rao (Counselor)', 'counselor@instipilot.com', 'demo_hash_counselor', 'counselor', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
    insertUser.run('u_trainer', 'Vikram Malhotra (Lead Trainer)', 'trainer@instipilot.com', 'demo_hash_trainer', 'trainer', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150');
    insertUser.run('u_accounts', 'Neha Joshi (Accounts Manager)', 'accounts@instipilot.com', 'demo_hash_accounts', 'accounts', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150');

    // 2. Rooms (5 rooms)
    const rooms = [
      { id: 'room_1', name: 'Lab Alpha (PC-35)', capacity: 35, type: 'Computer Lab', equipment: '35 Dell OptiPlex i7, Dual Projectors, Gigabit LAN, AC' },
      { id: 'room_2', name: 'Lab Beta (GPU-30)', capacity: 30, type: 'AI/ML Lab', equipment: '30 RTX-4070 Workstations, 4K Display, Fiber LAN, AC' },
      { id: 'room_3', name: 'Seminar Hall 1', capacity: 60, type: 'Hybrid Auditorium', equipment: 'PTZ Tracking Cameras, Yamaha Audio Rig, 65" Confidence Monitor' },
      { id: 'room_4', name: 'Classroom 201', capacity: 25, type: 'Lecture Hall', equipment: 'Interactive Touch Whiteboard, Soundbar, AC' },
      { id: 'room_5', name: 'Classroom 202', capacity: 20, type: 'Discussion Studio', equipment: 'Motorized Screen, Epson Laser Projector, Mic System' },
    ];
    for (const r of rooms) {
      insertRoom.run(r.id, r.name, r.capacity, r.type, r.equipment);
    }

    // 3. Trainers (6 trainers with availability JSON)
    const trainers = [
      {
        id: 't_vikram',
        userId: 'u_trainer',
        name: 'Vikram Malhotra',
        email: 'vikram.malhotra@instipilot.com',
        phone: '+91 98201 11223',
        specializations: 'Java Fullstack, Spring Boot, Microservices, Enterprise Architecture',
        availability: JSON.stringify({
          Mon: ['08:00-14:00', '18:00-20:30'],
          Tue: ['10:00-16:00'],
          Wed: ['08:00-14:00', '18:00-20:30'],
          Thu: ['10:00-16:00'],
          Fri: ['08:00-14:00', '18:00-20:30'],
          Sat: ['09:00-14:00'],
          Sun: ['09:00-14:00']
        })
      },
      {
        id: 't_sunita',
        userId: null,
        name: 'Sunita Deshmukh',
        email: 'sunita.deshmukh@instipilot.com',
        phone: '+91 98202 22334',
        specializations: 'Python, Data Engineering, Pandas, PySpark, Airflow',
        availability: JSON.stringify({
          Mon: ['09:00-17:00'],
          Tue: ['09:00-17:00'],
          Wed: ['09:00-17:00'],
          Thu: ['09:00-17:00'],
          Fri: ['09:00-17:00'],
          Sat: ['10:00-15:00'],
          Sun: []
        })
      },
      {
        id: 't_arjun',
        userId: null,
        name: 'Arjun Mehta',
        email: 'arjun.mehta@instipilot.com',
        phone: '+91 98203 33445',
        specializations: 'MERN Stack, Next.js, TypeScript, Tailwind, System Design',
        availability: JSON.stringify({
          Mon: ['14:00-21:00'],
          Tue: ['14:00-21:00'],
          Wed: ['14:00-21:00'],
          Thu: ['14:00-21:00'],
          Fri: ['14:00-21:00'],
          Sat: ['10:00-18:00'],
          Sun: []
        })
      },
      {
        id: 't_pooja',
        userId: null,
        name: 'Pooja Sundaram',
        email: 'pooja.sundaram@instipilot.com',
        phone: '+91 98204 44556',
        specializations: 'Applied Data Science, Machine Learning, TensorFlow, SQL',
        availability: JSON.stringify({
          Mon: ['09:00-13:00'],
          Tue: ['09:00-13:00'],
          Wed: ['09:00-13:00'],
          Thu: ['09:00-13:00'],
          Fri: ['09:00-13:00'],
          Sat: ['10:00-19:00'],
          Sun: ['10:00-19:00']
        })
      },
      {
        id: 't_rahul',
        userId: null,
        name: 'Rahul Kulkarni',
        email: 'rahul.kulkarni@instipilot.com',
        phone: '+91 98205 55667',
        specializations: 'Embedded Systems, IoT, C/C++, ARM Cortex, Firmware Architecture',
        availability: JSON.stringify({
          Mon: ['08:00-15:00'],
          Tue: ['08:00-15:00'],
          Wed: ['08:00-15:00'],
          Thu: ['08:00-15:00'],
          Fri: ['08:00-15:00'],
          Sat: [],
          Sun: []
        })
      },
      {
        id: 't_aniket',
        userId: null,
        name: 'Aniket Patil',
        email: 'aniket.patil@instipilot.com',
        phone: '+91 98206 66778',
        specializations: 'Advanced DBMS, PostgreSQL, MySQL Internals, Query Optimization',
        availability: JSON.stringify({
          Mon: ['10:00-18:00'],
          Tue: ['10:00-18:00'],
          Wed: ['10:00-18:00'],
          Thu: ['10:00-18:00'],
          Fri: ['10:00-18:00'],
          Sat: ['09:00-16:00'],
          Sun: ['09:00-16:00']
        })
      }
    ];
    for (const t of trainers) {
      insertTrainer.run(t.id, t.userId, t.name, t.email, t.phone, t.specializations, t.availability);
    }

    // 4. Courses (6 courses)
    const courses = [
      { id: 'c_java', code: 'FS-JAVA', name: 'Java Fullstack & Cloud Microservices', description: 'Comprehensive Java, Spring Boot, Hibernate, AWS & Docker for enterprise scale.', duration_weeks: 16, total_fee: 45000 },
      { id: 'c_dbms', code: 'DB-SQL', name: 'Advanced DBMS & Database Engineering', description: 'Index architecture, query tuning, transaction isolation, PostgreSQL and MySQL.', duration_weeks: 8, total_fee: 25000 },
      { id: 'c_pydata', code: 'PY-DATA', name: 'Python for Data Engineering & Cloud', description: 'Python OOP, Pandas, Apache Airflow, ETL pipelines and Big Data streaming.', duration_weeks: 12, total_fee: 38000 },
      { id: 'c_mern', code: 'WEB-MERN', name: 'Modern Fullstack Web Dev (MERN + Next.js)', description: 'React 18, Next.js 14, Node.js, Express, MongoDB, Tailwind and Realtime WebSockets.', duration_weeks: 14, total_fee: 42000 },
      { id: 'c_aiml', code: 'AI-ML', name: 'Applied Data Science & Generative AI Systems', description: 'Statistical foundations, Scikit-learn, PyTorch, LLM agents and Vector Databases.', duration_weeks: 16, total_fee: 52000 },
      { id: 'c_iot', code: 'EMB-IOT', name: 'Embedded Systems & IoT Engineering', description: 'Bare-metal C, RTOS, ESP32, MQTT protocols, PCB design and Sensor Interfacing.', duration_weeks: 12, total_fee: 36000 }
    ];
    for (const c of courses) {
      insertCourse.run(c.id, c.code, c.name, c.description, c.duration_weeks, c.total_fee);
    }

    // 5. Batches (8 batches)
    // Note: Vikram Malhotra is intentionally loaded heavily on Mon/Wed/Fri (08:00-10:00 & 10:15-12:15 & 18:00-20:00)
    const batches = [
      {
        id: 'b_java_m1',
        course_id: 'c_java',
        trainer_id: 't_vikram',
        room_id: 'room_1',
        name: 'Java Fullstack Morning (Alpha)',
        days: 'Mon,Wed,Fri',
        start_time: '08:00',
        end_time: '10:00',
        mode: 'hybrid',
        online_seat_limit: 30,
        max_seats: 32,
        status: 'ongoing',
        start_date: '2026-09-01',
        end_date: '2026-12-24'
      },
      {
        id: 'b_java_fast',
        course_id: 'c_java',
        trainer_id: 't_vikram',
        room_id: 'room_4',
        name: 'Java Sprint Fast-Track',
        days: 'Mon,Wed,Fri',
        start_time: '10:15',
        end_time: '12:15',
        mode: 'classroom',
        online_seat_limit: 0,
        max_seats: 24,
        status: 'ongoing',
        start_date: '2026-09-15',
        end_date: '2026-12-15'
      },
      {
        id: 'b_java_e1',
        course_id: 'c_java',
        trainer_id: 't_vikram',
        room_id: 'room_4',
        name: 'Java Fullstack Evening Pro',
        days: 'Mon,Wed,Fri',
        start_time: '18:00',
        end_time: '20:00',
        mode: 'classroom',
        online_seat_limit: 0,
        max_seats: 25,
        status: 'ongoing',
        start_date: '2026-08-15',
        end_date: '2026-12-05'
      },
      {
        id: 'b_py_m2',
        course_id: 'c_pydata',
        trainer_id: 't_sunita',
        room_id: 'room_2',
        name: 'Python Data Engineering Cohort 4',
        days: 'Tue,Thu,Sat',
        start_time: '09:00',
        end_time: '11:00',
        mode: 'hybrid',
        online_seat_limit: 30,
        max_seats: 30,
        status: 'ongoing',
        start_date: '2026-09-05',
        end_date: '2026-11-28'
      },
      {
        id: 'b_mern_e2',
        course_id: 'c_mern',
        trainer_id: 't_arjun',
        room_id: 'room_1',
        name: 'Modern MERN & Cloud Cohort 7',
        days: 'Mon,Tue,Thu',
        start_time: '16:30',
        end_time: '18:30',
        mode: 'hybrid',
        online_seat_limit: 35,
        max_seats: 35,
        status: 'ongoing',
        start_date: '2026-09-10',
        end_date: '2026-12-20'
      },
      {
        id: 'b_ai_w2',
        course_id: 'c_aiml',
        trainer_id: 't_pooja',
        room_id: 'room_3',
        name: 'Weekend AI & GenAI Masterclass',
        days: 'Sat,Sun',
        start_time: '14:00',
        end_time: '18:00',
        mode: 'hybrid',
        online_seat_limit: 50,
        max_seats: 55,
        status: 'ongoing',
        start_date: '2026-08-20',
        end_date: '2026-12-15'
      },
      {
        id: 'b_iot_m3',
        course_id: 'c_iot',
        trainer_id: 't_rahul',
        room_id: 'room_5',
        name: 'Embedded Systems & IoT Hardware Lab',
        days: 'Tue,Thu',
        start_time: '08:00',
        end_time: '11:00',
        mode: 'classroom',
        online_seat_limit: 0,
        max_seats: 20,
        status: 'ongoing',
        start_date: '2026-09-02',
        end_date: '2026-11-25'
      },
      {
        id: 'b_dbms_w1',
        course_id: 'c_dbms',
        trainer_id: 't_aniket',
        room_id: null,
        name: 'Database Engineering Online Global',
        days: 'Sat,Sun',
        start_time: '10:00',
        end_time: '13:00',
        mode: 'online',
        online_seat_limit: 60,
        max_seats: 60,
        status: 'ongoing',
        start_date: '2026-09-12',
        end_date: '2026-11-08'
      }
    ];

    for (const b of batches) {
      insertBatch.run(
        b.id,
        b.course_id,
        b.trainer_id,
        b.room_id,
        b.name,
        b.days,
        b.start_time,
        b.end_time,
        b.mode,
        b.online_seat_limit,
        b.max_seats,
        b.status,
        b.start_date,
        b.end_date
      );
    }

    // 6. Timetable Slots (Initial clash-free baseline schedule)
    const slotList = [
      // Java Morning: Mon, Wed, Fri 08:00 - 10:00 Room 1
      { batchId: 'b_java_m1', trainerId: 't_vikram', roomId: 'room_1', day: 'Mon', start: '08:00', end: '10:00' },
      { batchId: 'b_java_m1', trainerId: 't_vikram', roomId: 'room_1', day: 'Wed', start: '08:00', end: '10:00' },
      { batchId: 'b_java_m1', trainerId: 't_vikram', roomId: 'room_1', day: 'Fri', start: '08:00', end: '10:00' },
      // Java Sprint: Mon, Wed, Fri 10:15 - 12:15 Room 4
      { batchId: 'b_java_fast', trainerId: 't_vikram', roomId: 'room_4', day: 'Mon', start: '10:15', end: '12:15' },
      { batchId: 'b_java_fast', trainerId: 't_vikram', roomId: 'room_4', day: 'Wed', start: '10:15', end: '12:15' },
      { batchId: 'b_java_fast', trainerId: 't_vikram', roomId: 'room_4', day: 'Fri', start: '10:15', end: '12:15' },
      // Java Evening: Mon, Wed, Fri 18:00 - 20:00 Room 4
      { batchId: 'b_java_e1', trainerId: 't_vikram', roomId: 'room_4', day: 'Mon', start: '18:00', end: '20:00' },
      { batchId: 'b_java_e1', trainerId: 't_vikram', roomId: 'room_4', day: 'Wed', start: '18:00', end: '20:00' },
      { batchId: 'b_java_e1', trainerId: 't_vikram', roomId: 'room_4', day: 'Fri', start: '18:00', end: '20:00' },
      // Python: Tue, Thu, Sat 09:00 - 11:00 Room 2
      { batchId: 'b_py_m2', trainerId: 't_sunita', roomId: 'room_2', day: 'Tue', start: '09:00', end: '11:00' },
      { batchId: 'b_py_m2', trainerId: 't_sunita', roomId: 'room_2', day: 'Thu', start: '09:00', end: '11:00' },
      { batchId: 'b_py_m2', trainerId: 't_sunita', roomId: 'room_2', day: 'Sat', start: '09:00', end: '11:00' },
      // MERN: Mon, Tue, Thu 16:30 - 18:30 Room 1
      { batchId: 'b_mern_e2', trainerId: 't_arjun', roomId: 'room_1', day: 'Mon', start: '16:30', end: '18:30' },
      { batchId: 'b_mern_e2', trainerId: 't_arjun', roomId: 'room_1', day: 'Tue', start: '16:30', end: '18:30' },
      { batchId: 'b_mern_e2', trainerId: 't_arjun', roomId: 'room_1', day: 'Thu', start: '16:30', end: '18:30' },
      // AI Weekend: Sat, Sun 14:00 - 18:00 Room 3
      { batchId: 'b_ai_w2', trainerId: 't_pooja', roomId: 'room_3', day: 'Sat', start: '14:00', end: '18:00' },
      { batchId: 'b_ai_w2', trainerId: 't_pooja', roomId: 'room_3', day: 'Sun', start: '14:00', end: '18:00' },
      // IoT Morning: Tue, Thu 08:00 - 11:00 Room 5
      { batchId: 'b_iot_m3', trainerId: 't_rahul', roomId: 'room_5', day: 'Tue', start: '08:00', end: '11:00' },
      { batchId: 'b_iot_m3', trainerId: 't_rahul', roomId: 'room_5', day: 'Thu', start: '08:00', end: '11:00' },
      // DBMS Online: Sat, Sun 10:00 - 13:00 (Virtual room/Online)
      { batchId: 'b_dbms_w1', trainerId: 't_aniket', roomId: null, day: 'Sat', start: '10:00', end: '13:00' },
      { batchId: 'b_dbms_w1', trainerId: 't_aniket', roomId: null, day: 'Sun', start: '10:00', end: '13:00' }
    ];

    let slotCounter = 1;
    for (const s of slotList) {
      insertTimetableSlot.run(`slot_${slotCounter++}`, s.batchId, s.trainerId, s.roomId, s.day, s.start, s.end, 1, 'Regular Schedule');
    }

    // 7. Seed 60 Students with realistic Indian profiles
    const indianFirstNames = [
      'Aarav', 'Ananya', 'Rohan', 'Sneha', 'Aditya', 'Pooja', 'Amit', 'Divya', 'Vikram', 'Isha',
      'Kunal', 'Neha', 'Rahul', 'Tanvi', 'Siddharth', 'Meera', 'Gaurav', 'Riya', 'Akash', 'Shruti',
      'Varun', 'Kavita', 'Manish', 'Priyanka', 'Nikhil', 'Simran', 'Harsh', 'Swati', 'Karan', 'Deepika',
      'Arjun', 'Shreya', 'Sachin', 'Anjali', 'Mayank', 'Sonali', 'Vivek', 'Pallavi', 'Pranav', 'Ritu',
      'Abhishek', 'Monika', 'Dev', 'Aditi', 'Alok', 'Bhavna', 'Chetan', 'Geeta', 'Dhiraj', 'Hema',
      'Jatin', 'Kiran', 'Lalit', 'Mansi', 'Mohit', 'Nandini', 'Omkar', 'Payal', 'Raj', 'Sandhya'
    ];

    const indianLastNames = [
      'Gupta', 'Deshmukh', 'Patel', 'Nair', 'Verma', 'Kulkarni', 'Sharma', 'Mehta', 'Rao', 'Joshi',
      'Iyer', 'Chatterjee', 'Reddy', 'Chauhan', 'Bhatia', 'Mishra', 'Singh', 'Agarwal', 'Pillai', 'Pandey',
      'Trivedi', 'Bose', 'Shah', 'Nambiar', 'Shukla', 'Yadav', 'Saxena', 'Choudhury', 'Ghosh', 'Malhotra'
    ];

    const cities = ['Pune', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Nagpur', 'Nashik', 'Indore', 'Ahmedabad'];
    const colleges = ['COEP Tech', 'VJTI Mumbai', 'MIT-WPU', 'PICT Pune', 'BMS College', 'RVCE', 'VIT Vellore', 'DY Patil'];

    // Map batches to distribute students across 8 batches
    const batchDistribution = [
      'b_java_m1', 'b_java_m1', 'b_java_m1', 'b_java_m1', 'b_java_m1', 'b_java_m1', 'b_java_m1', 'b_java_m1', 'b_java_m1', 'b_java_m1', // 10 in Java M1
      'b_java_fast', 'b_java_fast', 'b_java_fast', 'b_java_fast', 'b_java_fast', 'b_java_fast', 'b_java_fast', // 7 in Java Fast
      'b_java_e1', 'b_java_e1', 'b_java_e1', 'b_java_e1', 'b_java_e1', 'b_java_e1', 'b_java_e1', // 7 in Java Evening
      'b_py_m2', 'b_py_m2', 'b_py_m2', 'b_py_m2', 'b_py_m2', 'b_py_m2', 'b_py_m2', 'b_py_m2', // 8 in Python
      'b_mern_e2', 'b_mern_e2', 'b_mern_e2', 'b_mern_e2', 'b_mern_e2', 'b_mern_e2', 'b_mern_e2', 'b_mern_e2', // 8 in MERN
      'b_ai_w2', 'b_ai_w2', 'b_ai_w2', 'b_ai_w2', 'b_ai_w2', 'b_ai_w2', 'b_ai_w2', 'b_ai_w2', // 8 in AI
      'b_iot_m3', 'b_iot_m3', 'b_iot_m3', 'b_iot_m3', 'b_iot_m3', 'b_iot_m3', // 6 in IoT
      'b_dbms_w1', 'b_dbms_w1', 'b_dbms_w1', 'b_dbms_w1', 'b_dbms_w1', 'b_dbms_w1' // 6 in DBMS
    ];

    const batchCourseMap: Record<string, { courseId: string; fee: number }> = {
      b_java_m1: { courseId: 'c_java', fee: 45000 },
      b_java_fast: { courseId: 'c_java', fee: 45000 },
      b_java_e1: { courseId: 'c_java', fee: 45000 },
      b_py_m2: { courseId: 'c_pydata', fee: 38000 },
      b_mern_e2: { courseId: 'c_mern', fee: 42000 },
      b_ai_w2: { courseId: 'c_aiml', fee: 52000 },
      b_iot_m3: { courseId: 'c_iot', fee: 36000 },
      b_dbms_w1: { courseId: 'c_dbms', fee: 25000 }
    };

    // Prepare 60 students
    for (let i = 1; i <= 60; i++) {
      const studentId = `s_${String(i).padStart(3, '0')}`;
      let firstName = indianFirstNames[(i - 1) % indianFirstNames.length];
      let lastName = indianLastNames[(i - 1) % indianLastNames.length];

      // Explicit names for mandatory edge cases
      if (i === 3) { firstName = 'Rohan'; lastName = 'Gupta'; } // Edge case 1 & 4 (Java, 4 missed classes, EMI due this week)
      if (i === 7) { firstName = 'Ananya'; lastName = 'Deshmukh'; } // Edge case 1 (Java, 3 missed classes, EMI due this week)
      if (i === 12) { firstName = 'Amit'; lastName = 'Patel'; } // Edge case 2 & 4 (Python, 2 consecutive missed EMIs)
      if (i === 25) { firstName = 'Kavita'; lastName = 'Nair'; } // Edge case 4 (MERN, 5 consecutive absences, high dropout risk)
      if (i === 38) { firstName = 'Sneha'; lastName = 'Verma'; } // Edge case 4 (AI, 4 missed weekend labs, high dropout risk)
      if (i === 51) { firstName = 'Siddharth'; lastName = 'Kulkarni'; } // Edge case 4 (Java Eve, 6 absences, high dropout risk)

      const fullName = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
      const phone = `+91 98${String(20000000 + i * 11111).slice(0, 8)}`;
      const guardianName = `Mr. Ramesh ${lastName}`;
      const guardianPhone = `+91 97${String(30000000 + i * 11111).slice(0, 8)}`;
      const city = cities[i % cities.length];
      const college = colleges[i % colleges.length];
      const assignedBatchId = batchDistribution[i - 1] || 'b_java_m1';
      const courseInfo = batchCourseMap[assignedBatchId];

      insertStudent.run(
        studentId,
        fullName,
        email,
        phone,
        guardianName,
        guardianPhone,
        city,
        college,
        '2026-08-25',
        'active',
        `Enrolled for ${courseInfo.courseId}`
      );

      // Enrollment
      const prefMode = (i % 3 === 0) ? 'online' : (i % 2 === 0 ? 'classroom' : 'hybrid');
      insertEnrollment.run(`enr_${i}`, studentId, assignedBatchId, '2026-08-28 10:00:00', prefMode, 'active');

      // Fee plan & EMIs
      const feePlanId = `fp_${i}`;
      const totalCourseFee = courseInfo.fee;
      const downPayment = 10000;
      const remainingFee = totalCourseFee - downPayment;
      const numInstallments = 3;
      const emiAmount = Math.round(remainingFee / numInstallments);

      insertFeePlan.run(feePlanId, studentId, courseInfo.courseId, totalCourseFee, downPayment, numInstallments, 0, 'Standard 3-EMI plan');

      // Down payment payment record
      insertPayment.run(
        `pay_dp_${i}`,
        null,
        studentId,
        'upi',
        `UPI/YESB/${90000000 + i}`,
        downPayment,
        '2026-08-28',
        'Admission Down Payment',
        'verified'
      );

      // Generate 3 EMIs per student
      // EMI 1: Sep 15, 2026
      // EMI 2: Oct 18, 2026 (THIS WEEK)
      // EMI 3: Nov 15, 2026

      // Edge case 1: Rohan Gupta (s_003) & Ananya Deshmukh (s_007)
      // Have an EMI due THIS WEEK (pending)
      if (i === 3) {
        // Rohan Gupta: EMI 1 paid, EMI 2 due 2026-10-19 (in 3 days, this week, pending)
        insertEmi.run(`emi_${i}_1`, feePlanId, studentId, 1, '2026-09-15', emiAmount, 'paid', '2026-09-14');
        insertPayment.run(`pay_emi_${i}_1`, `emi_${i}_1`, studentId, 'upi', `UPI/HDFC/${80000000 + i}`, emiAmount, '2026-09-14', 'EMI 1 Payment', 'verified');
        insertEmi.run(`emi_${i}_2`, feePlanId, studentId, 2, '2026-10-19', emiAmount, 'pending', null); // Due this week!
        insertEmi.run(`emi_${i}_3`, feePlanId, studentId, 3, '2026-11-15', emiAmount, 'pending', null);
      } else if (i === 7) {
        // Ananya Deshmukh: EMI 1 paid, EMI 2 due 2026-10-18 (in 2 days, this week, pending)
        insertEmi.run(`emi_${i}_1`, feePlanId, studentId, 1, '2026-09-15', emiAmount, 'paid', '2026-09-15');
        insertPayment.run(`pay_emi_${i}_1`, `emi_${i}_1`, studentId, 'bank', `NEFT/ICIC/${80000000 + i}`, emiAmount, '2026-09-15', 'EMI 1 Payment', 'verified');
        insertEmi.run(`emi_${i}_2`, feePlanId, studentId, 2, '2026-10-18', emiAmount, 'pending', null); // Due this week!
        insertEmi.run(`emi_${i}_3`, feePlanId, studentId, 3, '2026-11-15', emiAmount, 'pending', null);
      } else if (i === 12) {
        // Amit Patel: 2 consecutive missed EMIs (both overdue)
        insertEmi.run(`emi_${i}_1`, feePlanId, studentId, 1, '2026-09-15', emiAmount, 'overdue', null); // Missed #1
        insertEmi.run(`emi_${i}_2`, feePlanId, studentId, 2, '2026-10-12', emiAmount, 'overdue', null); // Missed #2
        insertEmi.run(`emi_${i}_3`, feePlanId, studentId, 3, '2026-11-15', emiAmount, 'pending', null);
      } else if (i === 25 || i === 38 || i === 51) {
        // Other high dropout risk students with overdue EMIs
        insertEmi.run(`emi_${i}_1`, feePlanId, studentId, 1, '2026-09-15', emiAmount, 'overdue', null);
        insertEmi.run(`emi_${i}_2`, feePlanId, studentId, 2, '2026-10-18', emiAmount, 'pending', null);
        insertEmi.run(`emi_${i}_3`, feePlanId, studentId, 3, '2026-11-15', emiAmount, 'pending', null);
      } else if (i <= 20) {
        // Most regular students have EMI 1 paid, EMI 2 pending (due Oct 25)
        insertEmi.run(`emi_${i}_1`, feePlanId, studentId, 1, '2026-09-15', emiAmount, 'paid', '2026-09-14');
        insertPayment.run(`pay_emi_${i}_1`, `emi_${i}_1`, studentId, 'upi', `UPI/SBI/${80000000 + i}`, emiAmount, '2026-09-14', 'EMI 1 Payment', 'verified');
        insertEmi.run(`emi_${i}_2`, feePlanId, studentId, 2, '2026-10-25', emiAmount, 'pending', null);
        insertEmi.run(`emi_${i}_3`, feePlanId, studentId, 3, '2026-11-25', emiAmount, 'pending', null);
      } else {
        // Others with EMI 1 paid or fully paid
        insertEmi.run(`emi_${i}_1`, feePlanId, studentId, 1, '2026-09-15', emiAmount, 'paid', '2026-09-10');
        insertPayment.run(`pay_emi_${i}_1`, `emi_${i}_1`, studentId, 'upi', `UPI/PAYTM/${80000000 + i}`, emiAmount, '2026-09-10', 'EMI 1 Payment', 'verified');
        insertEmi.run(`emi_${i}_2`, feePlanId, studentId, 2, '2026-10-28', emiAmount, 'pending', null);
        insertEmi.run(`emi_${i}_3`, feePlanId, studentId, 3, '2026-11-28', emiAmount, 'pending', null);
      }
    }

    // 8. Generate Realistic Attendance Logs for Past 4 Weeks
    // Recent dates: Oct 2, 5, 7, 9, 12, 14, 16
    const classDates = [
      '2026-09-25', '2026-09-28', '2026-09-30',
      '2026-10-02', '2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-14'
    ];

    let attId = 1;
    for (let sIdx = 1; sIdx <= 60; sIdx++) {
      const studentId = `s_${String(sIdx).padStart(3, '0')}`;
      const batchId = batchDistribution[sIdx - 1] || 'b_java_m1';

      for (let dIdx = 0; dIdx < classDates.length; dIdx++) {
        const date = classDates[dIdx];
        let status: 'present' | 'absent' | 'late' = 'present';
        let checkInTime = '08:04:22';
        let mode: 'classroom' | 'online' = (sIdx % 2 === 0) ? 'classroom' : 'online';

        // Deliberate Edge Cases:
        // Student 3 (Rohan Gupta, Java): Missed 4 of the last 6 classes
        if (sIdx === 3 && dIdx >= 3) {
          status = dIdx === 5 ? 'present' : 'absent'; // absent on Oct 2, 5, 9, 12, 14 -> 5 missed classes!
        }
        // Student 7 (Ananya Deshmukh, Java): Missed 3 classes (Oct 7, 9, 14)
        else if (sIdx === 7 && (dIdx === 5 || dIdx === 6 || dIdx === 8)) {
          status = 'absent';
        }
        // Student 12 (Amit Patel, Python): Missed 5 classes
        else if (sIdx === 12 && dIdx >= 4) {
          status = 'absent';
        }
        // Student 25 (Kavita Nair, MERN): 5 consecutive absences
        else if (sIdx === 25 && dIdx >= 4) {
          status = 'absent';
        }
        // Student 38 (Sneha Verma, AI): 4 absences
        else if (sIdx === 38 && dIdx >= 5) {
          status = 'absent';
        }
        // Student 51 (Siddharth Kulkarni, Java Eve): 6 absences
        else if (sIdx === 51 && dIdx >= 3) {
          status = 'absent';
        }
        // Normal random distribution for other students (90%+ attendance)
        else {
          const rand = (sIdx * 17 + dIdx * 31) % 100;
          if (rand < 8) {
            status = 'absent';
          } else if (rand < 18) {
            status = 'late';
            checkInTime = '08:18:45';
          } else {
            status = 'present';
            checkInTime = `08:0${(sIdx % 8) + 1}:1${dIdx}`;
          }
        }

        insertAttendance.run(
          `att_${attId++}`,
          studentId,
          batchId,
          date,
          mode,
          status === 'absent' ? null : checkInTime,
          status,
          mode === 'classroom' ? 'Room Biometric Console 01' : 'Zoom WebSDK (IP: 49.36.12.8)'
        );
      }
    }

    // 9. Assignments & Submissions
    const assignments = [
      { id: 'asg_java_1', batchId: 'b_java_m1', title: 'Spring Boot REST API with JWT Auth', desc: 'Build authenticated endpoints with refresh tokens and PostgreSQL repo.', dueDate: '2026-10-05', maxMarks: 100 },
      { id: 'asg_java_2', batchId: 'b_java_m1', title: 'Microservices & Kafka Event Bus', desc: 'Implement order and inventory pub/sub events with retry topics.', dueDate: '2026-10-18', maxMarks: 100 },
      { id: 'asg_py_1', batchId: 'b_py_m2', title: 'ETL Pipeline with Airflow & DuckDB', desc: 'Automate ingestion of 1M rows with data validation checks.', dueDate: '2026-10-08', maxMarks: 100 },
      { id: 'asg_mern_1', batchId: 'b_mern_e2', title: 'Realtime Chat with Socket.IO', desc: 'Multi-room chat with typing indicators and read receipts.', dueDate: '2026-10-10', maxMarks: 100 },
      { id: 'asg_ai_1', batchId: 'b_ai_w2', title: 'RAG Pipeline with LangChain & FAISS', desc: 'Build document QA system with chunking and reranking.', dueDate: '2026-10-12', maxMarks: 100 }
    ];

    for (const a of assignments) {
      insertAssignment.run(a.id, a.batchId, a.title, a.desc, a.dueDate, a.maxMarks);
    }

    // Submissions for Java batch students (s_001 to s_010)
    for (let s = 1; s <= 10; s++) {
      const studentId = `s_${String(s).padStart(3, '0')}`;
      // Student 3 (Rohan Gupta) missing both assignments
      if (s === 3) continue;
      insertSubmission.run(
        `sub_${s}_1`,
        'asg_java_1',
        studentId,
        '2026-10-04 19:30:00',
        'graded',
        s === 7 ? 68 : 88,
        s === 7 ? 'Good effort, improve error handling' : 'Excellent clean code and documentation',
        `https://github.com/instipilot-students/${studentId}/java-rest`
      );
    }

    // 10. Class Recordings
    const recordings = [
      { id: 'rec_1', batchId: 'b_java_m1', title: 'L12: Spring Security 6 & OAuth2 Filter Chain', url: 'https://cdn.instipilot.com/recordings/java-m1-lec12.mp4', date: '2026-10-14', duration: 115, tags: 'spring-security, oauth2, filters', views: 24 },
      { id: 'rec_2', batchId: 'b_java_m1', title: 'L11: Hibernate Caching & N+1 Problem Solver', url: 'https://cdn.instipilot.com/recordings/java-m1-lec11.mp4', date: '2026-10-12', duration: 120, tags: 'hibernate, orm, performance', views: 31 },
      { id: 'rec_3', batchId: 'b_java_m1', title: 'L10: Dockerizing Multi-module Spring App', url: 'https://cdn.instipilot.com/recordings/java-m1-lec10.mp4', date: '2026-10-09', duration: 110, tags: 'docker, devops, spring', views: 28 },
      { id: 'rec_4', batchId: 'b_py_m2', title: 'L08: Pandas Vectorization vs Cython Optimizations', url: 'https://cdn.instipilot.com/recordings/py-m2-lec08.mp4', date: '2026-10-13', duration: 105, tags: 'pandas, performance, python', views: 19 },
      { id: 'rec_5', batchId: 'b_mern_e2', title: 'L09: Server Actions & Next.js 14 App Router State', url: 'https://cdn.instipilot.com/recordings/mern-e2-lec09.mp4', date: '2026-10-13', duration: 118, tags: 'nextjs, react, server-actions', views: 22 },
      { id: 'rec_6', batchId: 'b_ai_w2', title: 'L06: Fine-tuning Llama-3 with LoRA and Unsloth', url: 'https://cdn.instipilot.com/recordings/ai-w2-lec06.mp4', date: '2026-10-11', duration: 230, tags: 'genai, lora, finetuning', views: 45 }
    ];

    for (const rec of recordings) {
      insertRecording.run(rec.id, rec.batchId, rec.title, rec.url, rec.date, rec.duration, rec.tags, rec.views);
    }

    // 11. Initial Outbox Drafts (Human-in-the-loop preview)
    insertOutbox.run(
      'msg_001',
      's_003',
      '+91 9820033333',
      'Rohan Gupta',
      'whatsapp',
      'attendance_and_fee_alert',
      'Hi Rohan, we noticed you missed 4 classes this month in the Java Fullstack batch. Also, your course EMI of ₹11,250 is due on 19th Oct. Please connect with your mentor Vikram sir or reply to this message for assistance.',
      'AI Copilot high-risk alert triggered by 4 missed classes & pending EMI due this week',
      'draft',
      'counselor'
    );

    insertOutbox.run(
      'msg_002',
      's_012',
      '+91 9820044444',
      'Amit Patel',
      'whatsapp',
      'overdue_emi_warning',
      'Dear Amit, two consecutive fee installments (total ₹19,000) for your Python Data Engineering course remain overdue. Please settle or speak to the accounts office today to maintain your lab access.',
      'Accounts flag: 2 consecutive missed EMIs',
      'draft',
      'accounts'
    );

    // 12. Initial Audit Log
    insertAudit.run(
      'aud_001',
      'u_owner',
      'Priya Sharma',
      'owner',
      'system_init',
      'System initialization and database seed',
      'Seeded 60 students, 6 courses, 8 batches, 6 trainers, 5 rooms, 17 tables',
      'success'
    );
  });

  seedTransaction();
  console.log('🎉 Successfully seeded InstiPilot with 60 students, 6 courses, 8 batches, 6 trainers, and required edge cases!');
  db.close();
}

// Run directly if invoked via CLI
if (require.main === module || process.argv[1]?.includes('seed')) {
  seedDatabase();
}
