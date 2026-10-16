# 🎓 InstiPilot — AI-Powered Institute Operations Copilot
> **Hackathon Track: PS1 — Institute Operations Copilot**  
> *Transforming fragmented spreadsheets, WhatsApp groups, and memory into an autonomous, intelligence-guided institute operating system.*

---

## ⚡ Executive Summary

Training institutes and coaching centres lose revenue, student retention, and trainer trust because operations live across disjointed silos:
* Trainer schedules clash silently
* Students drop off due to unattended absences
* EMIs slip past their due dates
* Class recordings are scattered across unorganized drives
* Sensitive fee margins are exposed to unauthorized staff

**InstiPilot** solves this by putting a **Role-Aware AI Operations Copilot** at the center of institute management, fortified with **Zero-Trust SQL Sandboxing**, **Multi-Source Attendance Reconciliation**, **Automated WhatsApp Outbox queues**, and **Instant PDF Certificate Generation**.

---

## 🌟 Key Pillars & Features

### 1. 🤖 Context-Aware AI Operations Copilot (`Ctrl+K`)
* **Natural Language to Safe SQL**: Ask complex operational questions in plain English (*"Which students missed 3 classes in Java and have pending EMI?"*, *"Show trainer workload for Vikram this week"*).
* **Zero-Setup Resilience**: Works out of the box with intelligent semantic query resolution and full Google Gemini 1.5 Flash support when `GEMINI_API_KEY` is provided.
* **Proactive Action Proposals**: The copilot doesn't just display data; it generates pre-formatted WhatsApp recovery messages queued directly into the approval outbox.

### 2. 🛡️ Military-Grade Zero-Trust RBAC & Prompt Injection Guard
* **Role-Based Table & Column Censoring**:
  * **Institute Owner**: Unrestricted cross-functional visibility.
  * **Academic Counselor**: Access to attendance, dropout risk, and student contact info; financial ledger access blocked.
  * **Trainer**: Pedagogical data only (batches, recordings, attendance); fee tables and salary figures strictly forbidden.
  * **Accounts / Finance**: Fee structures, EMI tracking, bank reconciliation; biometric logs blocked.
* **Prompt Injection Defense**: Strips and blocks SQL comments (`--`, `/* */`), multiple statements (`DROP TABLE`, `UPDATE`, `;`), and destructive mutations.
* **Immutable Audit Trail**: Every AI query, role context, SQL string, execution duration, and blocked violation is recorded in SQLite.

### 3. 📅 Intelligent Timetable & Clash Detection
* **Real-time Conflict Detection**: Automatically highlights double-booked trainers or room overlapping across Morning, Afternoon, and Evening batches.
* **Conflict Cards**: Direct visual indicators with severity levels (`Room Overlap`, `Trainer Double-Booked`).

### 4. 📲 Human-in-the-Loop WhatsApp Outbox
* **Zero Accidental Sends**: AI generates drafts with student-tailored context, but humans review and approve before dispatch.
* **Direct `wa.me` Deep-Linking**: One-click opening into WhatsApp Web / Desktop with populated, polite templates.

### 5. 🔍 Multi-Source Attendance & Bank Reconciliation
* **Hybrid Attendance Diffing**: Compares biometric biometric fingerprint machine logs with Zoom/Google Meet online attendance to detect proxy attendance or technical dropouts.
* **Smart Bank Statement Matcher**: Automated reconciliation between UPI/NEFT transaction UTRs and student pending EMIs.

### 6. 📜 Instant PDF Certificate Generation
* **Built-in PDF Engine (`pdf-lib`)**: One-click professional vector certificate generation with unique verification hashes (`INSTP-...`), issuing authority, and cryptographic layout.

---

## 👥 Demo Personas (Instant Switcher in Navbar)

InstiPilot includes built-in one-click demo personas to test role-based access control:

| Persona | Name | Role | Primary Responsibility & Permissions |
|---|---|---|---|
| 👑 **Owner** | Priya Sharma | `owner` | Master Admin — Full operational and financial visibility. |
| 🧑‍🏫 **Trainer** | Vikram Malhotra | `trainer` | Batches, recordings, and attendance only. **Fees are blocked.** |
| 🎯 **Counselor** | Rajesh Rao | `counselor` | Student success, attendance alerts, retention outbox. |
| 💼 **Accounts** | Neha Joshi | `accounts` | Fee plans, bank reconciliation, receipts, EMI tracking. |

---

## 🛠️ Technology Stack

* **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Framer Motion
* **Database**: SQLite via `better-sqlite3` (single file, zero external cloud dependencies)
* **LLM Engine**: Google Gemini API (`@google/generative-ai`) with intelligent local Mock engine fallback
* **PDF Generation**: `pdf-lib` vector rendering engine
* **Testing**: TSX automated RBAC security test suite

---

## 🚀 Quickstart & Verification

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Database
Seeds 60 realistic students, 6 courses, 8 batches, 6 trainers, fee plans, biometric attendance, recordings, and clash edge cases:
```bash
npm run seed
```

### 3. Run Security & RBAC Test Suite
Validates all 14 role-based SQL guard assertions and prompt-injection blocks:
```bash
npm run test:rbac
```

### 4. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Production Build
```bash
npm run build
npm run start
```

---

## 📁 Project Structure

```
├── instipilot.db               # Pre-seeded SQLite database
├── src
│   ├── app
│   │   ├── api                 # REST API endpoints (Copilot, Outbox, Timetable, etc.)
│   │   ├── attendance          # Hybrid attendance tracking page
│   │   ├── audit-log           # Immutable security audit log
│   │   ├── batches             # Batch schedules & status
│   │   ├── dashboard           # Command centre & KPI analytics
│   │   ├── fees                # Installments & payment tracking
│   │   ├── login               # Persona selection & session login
│   │   ├── outbox              # Human-in-the-loop WhatsApp queue
│   │   ├── reconciliation      # Bank & attendance reconciliation
│   │   ├── recordings          # Class video hub with tags & topics
│   │   ├── students            # Student directory & PDF certificates
│   │   └── timetable           # Interactive timetable & clash detector
│   ├── components
│   │   ├── copilot             # AI Copilot Drawer (Ctrl+K)
│   │   └── layout              # Navbar, Sidebar, AppShell
│   └── lib
│       ├── db                  # SQLite connection & schema
│       └── rbac                # Query Guard, Auth, Permissions, AST rules
```

---

*Built with precision for institute managers, trainers, counselors, and accountants.*
