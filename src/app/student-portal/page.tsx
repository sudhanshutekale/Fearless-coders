'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  CalendarClock, 
  UserCheck, 
  CreditCard, 
  Video, 
  FileCode2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ChevronRight, 
  ExternalLink,
  BookOpen,
  MapPin,
  Calendar,
  Layers,
  ShieldCheck,
  QrCode,
  X,
  Send,
  Upload,
  Image as ImageIcon,
  Eye,
  Loader2,
  Check,
  Copy,
  FileText
} from 'lucide-react';

export default function StudentPortalPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'attendance' | 'fees' | 'recordings' | 'assignments'>('overview');
  const [showPayModal, setShowPayModal] = useState<any>(null);
  const [paySuccess, setPaySuccess] = useState(false);
  
  // Payment Proof photo upload state (Student only)
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [utrRef, setUtrRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [submittingProof, setSubmittingProof] = useState<boolean>(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [viewingProof, setViewingProof] = useState<any | null>(null);

  const fetchStudentData = async () => {
    try {
      const res = await fetch('/api/student-portal');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const errJson = await res.json();
        setError(errJson.error || 'Failed to load student portal.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  const openPayModal = (inst: any) => {
    setShowPayModal(inst);
    setProofImage(null);
    setUtrRef(`UPI/GPY/${Math.floor(100000000000 + Math.random() * 900000000000)}`);
    setPaymentNotes('');
    setSubmitSuccessMsg(null);
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateSampleReceipt = () => {
    const studentName = data?.student?.name || 'Aarav Gupta';
    const amount = showPayModal?.amount || 11667;
    const ref = utrRef || `UPI/HDFC/${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    setUtrRef(ref);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" fill="none">
      <rect width="400" height="600" rx="24" fill="#0F172A"/>
      <rect x="20" y="20" width="360" height="560" rx="16" fill="#1E293B" stroke="#334155" stroke-width="2"/>
      <circle cx="200" cy="110" r="40" fill="#065F46"/>
      <path d="M185 110L195 120L215 100" stroke="#34D399" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="200" y="180" font-family="sans-serif" font-size="15" fill="#94A3B8" text-anchor="middle">Payment to InstiPilot Academy</text>
      <text x="200" y="225" font-family="sans-serif" font-weight="bold" font-size="34" fill="#F8FAFC" text-anchor="middle">₹${amount.toLocaleString('en-IN')}.00</text>
      <text x="200" y="255" font-family="sans-serif" font-size="13" fill="#34D399" text-anchor="middle">✓ Completed • Today</text>
      <line x1="45" y1="285" x2="355" y2="285" stroke="#334155" stroke-width="1.5" stroke-dasharray="4 4"/>
      <text x="45" y="325" font-family="sans-serif" font-size="12" fill="#64748B">UPI Transaction ID (UTR)</text>
      <text x="45" y="348" font-family="monospace" font-size="14" fill="#E2E8F0" font-weight="600">${ref}</text>
      <text x="45" y="390" font-family="sans-serif" font-size="12" fill="#64748B">Paid by Student</text>
      <text x="45" y="413" font-family="sans-serif" font-size="14" fill="#E2E8F0">${studentName}</text>
      <text x="45" y="455" font-family="sans-serif" font-size="12" fill="#64748B">To Institute UPI</text>
      <text x="45" y="478" font-family="sans-serif" font-size="14" fill="#38BDF8">instipilot.academy@hdfcbank</text>
      <rect x="45" y="515" width="310" height="42" rx="8" fill="#0F172A" stroke="#334155"/>
      <text x="200" y="541" font-family="sans-serif" font-size="12" fill="#94A3B8" text-anchor="middle">Google Pay Digital Receipt • Verified</text>
    </svg>`;
    const dataUri = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    setProofImage(dataUri);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayModal || !proofImage || !utrRef.trim()) return;

    setSubmittingProof(true);
    try {
      const res = await fetch('/api/student-portal/payment-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: data?.student?.id,
          emiId: showPayModal.id,
          amount: showPayModal.amount,
          reference: utrRef.trim(),
          proofImageUrl: proofImage,
          paymentMode: 'upi',
          notes: paymentNotes.trim()
        })
      });

      const json = await res.json();
      if (res.ok) {
        setSubmitSuccessMsg(json.message || 'Payment photo submitted successfully for Owner verification!');
        fetchStudentData();
        setTimeout(() => {
          setShowPayModal(null);
          setSubmitSuccessMsg(null);
        }, 2200);
      } else {
        alert(json.error || 'Failed to submit payment proof');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit proof');
    } finally {
      setSubmittingProof(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-2xl bg-slate-900/80 border border-slate-800"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/80 border border-slate-800"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-2xl border border-rose-500/40 bg-rose-950/20 text-center max-w-lg mx-auto space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="font-display text-lg font-bold text-white">Student Portal Access</h3>
        <p className="text-xs text-rose-300/90 leading-relaxed">{error || 'Unable to retrieve student profile.'}</p>
      </div>
    );
  }

  const { student, enrollment, attendance, fees, schedule, recordings, assignments } = data;
  const isAttendanceGood = attendance.rate >= 80;
  const pendingInstallment = fees?.installments?.find((i: any) => i.status === 'pending' || i.status === 'overdue');

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-violet-950/40 p-6 sm:p-8 backdrop-blur-xl shadow-glass">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-neon-cyan flex-shrink-0">
              <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center overflow-hidden">
                <GraduationCap className="w-10 h-10 text-cyan-400" />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30 uppercase tracking-wider">
                  STUDENT ID: {student.id}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 uppercase">
                  STATUS: {student.status}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-500/30 uppercase">
                  MODE: {enrollment?.preferred_mode || 'Hybrid'}
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Welcome back, {student.name}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {enrollment?.course_name} &bull; <span className="text-cyan-400">{enrollment?.batch_name}</span>
              </p>
            </div>
          </div>

          {/* Quick Guardian & Contact Info */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 text-xs font-mono space-y-1.5 min-w-[240px]">
            <div className="text-[10px] uppercase text-slate-400 font-semibold flex items-center justify-between">
              <span>Academic Contact</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-slate-200">
              Trainer: <span className="text-cyan-300">{enrollment?.trainer_name}</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Guardian: {student.guardian_name || 'Recorded on file'} ({student.guardian_phone || 'N/A'})
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-mono overflow-x-auto whitespace-nowrap">
        {[
          { key: 'overview', label: 'Dashboard Overview', icon: BookOpen },
          { key: 'schedule', label: 'My Class Schedule', icon: CalendarClock },
          { key: 'attendance', label: `Attendance Log (${attendance.rate}%)`, icon: UserCheck },
          { key: 'fees', label: 'Fees & Payment EMI', icon: CreditCard },
          { key: 'recordings', label: `Recordings (${recordings?.length || 0})`, icon: Video },
          { key: 'assignments', label: `Assignments (${assignments?.length || 0})`, icon: FileCode2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-3.5 rounded-xl flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Contents */}

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Attendance */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Attendance Rate</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isAttendanceGood ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-rose-950 text-rose-400 border border-rose-500/30'}`}>
                  {isAttendanceGood ? 'Good Standing' : 'Risk Alert'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-white">{attendance.rate}%</span>
                <span className="text-xs text-slate-400 font-mono">({attendance.summary.present}/{attendance.summary.total} classes)</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${isAttendanceGood ? 'bg-emerald-400 shadow-neon-cyan' : 'bg-rose-400'}`}
                  style={{ width: `${attendance.rate}%` }}
                />
              </div>
            </div>

            {/* Card 2: Batch Schedule */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Batch Timing</span>
                <Clock className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="font-display text-xl font-bold text-white">{enrollment?.days}</div>
                <div className="text-xs text-cyan-300 font-mono mt-0.5">{enrollment?.start_time} - {enrollment?.end_time}</div>
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-2">
                Room: <span className="text-slate-200">{enrollment?.room_name || 'Virtual Lab 1'}</span>
              </div>
            </div>

            {/* Card 3: Fee Status */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Next Installment</span>
                <CreditCard className="w-4 h-4 text-violet-400" />
              </div>
              {pendingInstallment ? (
                <div>
                  <div className="font-display text-2xl font-bold text-white">₹{pendingInstallment.amount.toLocaleString('en-IN')}</div>
                  <div className={`text-xs font-mono mt-0.5 ${pendingInstallment.status === 'overdue' ? 'text-rose-400' : 'text-amber-400'}`}>
                    Due: {pendingInstallment.due_date} ({pendingInstallment.status.toUpperCase()})
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-display text-xl font-bold text-emerald-400">All Settled</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">No pending EMIs</div>
                </div>
              )}
              {pendingInstallment && (
                <button
                  onClick={() => setShowPayModal(pendingInstallment)}
                  className="mt-2 py-1 px-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium transition-colors w-full text-center"
                >
                  Pay Installment Online &rarr;
                </button>
              )}
            </div>

            {/* Card 4: Assignments */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Assignments</span>
                <FileCode2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="font-display text-3xl font-bold text-white">
                  {assignments.filter((a: any) => a.submission_id).length} / {assignments.length}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">Submissions Evaluated</div>
              </div>
              <div className="text-[11px] text-emerald-400 mt-2">
                Course Completion on Track &bull; Active
              </div>
            </div>
          </div>

          {/* Quick Schedule Preview & Recent Recordings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Classes */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-display text-sm font-bold text-white">Weekly Class Schedule</h3>
                </div>
                <button onClick={() => setActiveTab('schedule')} className="text-xs text-cyan-400 hover:underline">
                  View Full Timetable &rarr;
                </button>
              </div>

              <div className="space-y-2.5">
                {schedule?.slice(0, 3).map((slot: any) => (
                  <div key={slot.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60">
                          {slot.day}
                        </span>
                        <span className="text-xs font-semibold text-slate-200">{slot.topic || enrollment?.batch_name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center gap-2">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{slot.start_time} - {slot.end_time}</span>
                        <span>&bull;</span>
                        <span>{enrollment?.room_name || 'Room Alpha'}</span>
                      </div>
                    </div>

                    <a
                      href="https://zoom.us"
                      target="_blank"
                      rel="noreferrer"
                      className="py-1 px-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-medium shadow-sm hover:brightness-110 flex items-center gap-1"
                    >
                      <Video className="w-3 h-3" />
                      Join Live
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Video Lectures */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-violet-400" />
                  <h3 className="font-display text-sm font-bold text-white">Latest Lecture Recordings</h3>
                </div>
                <button onClick={() => setActiveTab('recordings')} className="text-xs text-violet-400 hover:underline">
                  View All Recordings &rarr;
                </button>
              </div>

              <div className="space-y-2.5">
                {recordings?.slice(0, 3).map((rec: any) => (
                  <div key={rec.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{rec.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {rec.date} &bull; {rec.duration_minutes} mins &bull; {rec.views_count} views
                      </div>
                    </div>

                    <a
                      href={rec.url}
                      target="_blank"
                      rel="noreferrer"
                      className="py-1 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-mono flex items-center gap-1 transition-colors"
                    >
                      <span>Watch</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-white">Weekly Academic Timetable</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Batch: {enrollment?.batch_name} &bull; Instructor: {enrollment?.trainer_name}
              </p>
            </div>
            <Link
              href="/timetable"
              className="py-1.5 px-3 rounded-xl bg-slate-800 text-cyan-300 text-xs font-mono hover:bg-slate-700"
            >
              Interactive Schedule Grid &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedule?.map((slot: any) => (
              <div key={slot.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-400 px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-800">
                    {slot.day}
                  </span>
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {slot.start_time} - {slot.end_time}
                  </span>
                </div>
                <div className="font-semibold text-sm text-white pt-1">{slot.topic || enrollment?.course_name}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
                  <MapPin className="w-3 h-3 text-cyan-400" />
                  <span>{enrollment?.room_name || 'Computer Lab Alpha'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-white">Biometric & Join Attendance History</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Official check-in logs recorded via institute biometric sensors and Zoom SDK join events.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-3 py-1 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300">
                Present: {attendance.summary.present}
              </span>
              <span className="px-3 py-1 rounded-xl bg-rose-950 border border-rose-800 text-rose-300">
                Absent: {attendance.summary.absent}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-4">Date of Session</th>
                  <th className="py-3 px-4">Check-in Mode</th>
                  <th className="py-3 px-4">Punch / Join Time</th>
                  <th className="py-3 px-4">Biometric Sensor / IP</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {attendance.logs?.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-semibold text-slate-200">{log.date}</td>
                    <td className="py-3 px-4 text-slate-300 uppercase text-[11px]">{log.mode}</td>
                    <td className="py-3 px-4 text-slate-300">{log.check_in_time || '—'}</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">{log.ip_or_location || 'Campus Gate 1 Biometric'}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        log.status === 'present'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : log.status === 'late'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: FEES & EMIS */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-white">Fee Plan & Installment Schedule</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Transparent fee ledger with online UPI payments and automated instant receipts.
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 font-mono">Total Course Fee</div>
                <div className="text-xl font-bold font-display text-white">
                  ₹{(fees?.plan?.total_amount || enrollment?.total_fee || 45000).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="py-3 px-4">Installment</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action / Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {fees?.installments?.map((inst: any) => {
                    const proof = fees?.proofs?.find((p: any) => p.emi_id === inst.id);
                    const isPaid = inst.status === 'paid' || proof?.status === 'verified';
                    const isPendingProof = proof?.status === 'pending';
                    const isRejectedProof = proof?.status === 'rejected';

                    return (
                      <tr key={inst.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-slate-200">
                          <div className="font-medium">Installment #{inst.installment_no}</div>
                          {proof && (
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                              <ImageIcon className="w-3 h-3 text-cyan-400" />
                              <span>Photo proof: {proof.reference}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">₹{inst.amount.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-slate-300">{inst.due_date}</td>
                        <td className="py-3 px-4">
                          {isPaid ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" />
                              Verified & Paid
                            </span>
                          ) : isPendingProof ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 w-fit animate-pulse">
                              <Clock className="w-3 h-3" />
                              Pending Owner Verification
                            </span>
                          ) : isRejectedProof ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 w-fit">
                              <AlertCircle className="w-3 h-3" />
                              Proof Rejected
                            </span>
                          ) : (
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              inst.status === 'overdue'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}>
                              {inst.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isPaid ? (
                            <button
                              onClick={() => proof && setViewingProof(proof)}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center justify-end gap-1 ml-auto"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verified Receipt</span>
                              {proof && <Eye className="w-3 h-3 ml-0.5" />}
                            </button>
                          ) : isPendingProof ? (
                            <button
                              onClick={() => setViewingProof(proof)}
                              className="py-1 px-2.5 rounded-lg border border-amber-500/40 hover:bg-amber-950/40 text-amber-300 text-[11px] font-medium flex items-center gap-1 ml-auto transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View Submitted Proof</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => openPayModal(inst)}
                              className="py-1 px-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white text-[11px] font-medium flex items-center gap-1 ml-auto shadow-sm"
                            >
                              <Upload className="w-3 h-3" />
                              <span>{isRejectedProof ? 'Re-upload Photo' : 'Pay & Upload Photo'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: RECORDINGS */}
      {activeTab === 'recordings' && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-white">Classroom & Hybrid Lecture Recordings</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                HD video archives of all sessions conducted in {enrollment?.batch_name}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recordings?.map((rec: any) => (
              <div key={rec.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 mb-1">
                    <span>{rec.date}</span>
                    <span>{rec.duration_minutes} min</span>
                  </div>
                  <h4 className="font-semibold text-sm text-white">{rec.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {rec.topic_tags || 'Spring Boot Architecture, Microservices, REST Endpoints'}
                  </p>
                </div>

                <a
                  href={rec.url}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono text-center flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Stream Lecture</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-white">Assignments & Lab Evaluations</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Weekly coding sprints, project submissions, and instructor code reviews.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {assignments?.map((a: any) => (
              <div key={a.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">{a.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Max Marks: {a.max_marks}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{a.description}</p>
                  <div className="text-[11px] font-mono text-amber-400">
                    Due Date: {a.due_date}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                    a.submission_id
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {a.submission_id ? `Evaluated: ${a.marks || 90}/${a.max_marks}` : 'Pending Submission'}
                  </span>

                  <button className="py-1 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 font-mono transition-colors">
                    {a.submission_id ? 'View Feedback' : 'Submit Code'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Online UPI Payment Simulation Modal */}
      {/* Student Payment & Photo Proof Upload Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-command-darkest p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-display font-bold text-base">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <span>Pay Installment #{showPayModal.installment_no}</span>
              </div>
              <button 
                onClick={() => {
                  setShowPayModal(null);
                  setProofImage(null);
                  setSubmitSuccessMsg(null);
                }} 
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitSuccessMsg ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-display font-bold text-lg text-white">Payment Proof Submitted!</h4>
                <p className="text-xs text-emerald-300 leading-relaxed">
                  Your transaction receipt photo (UTR: <strong className="font-mono text-white">{utrRef}</strong>) has been queued for Owner verification in the Fee Reconciliation Engine.
                </p>
                <div className="text-[11px] text-slate-400 font-mono">
                  Once verified by the Director / Owner, your installment will be marked as settled.
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitProof} className="space-y-4 text-xs">
                {/* Summary Info */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-slate-400 text-[11px]">Installment #{showPayModal.installment_no} • {enrollment?.course_name}</div>
                    <div className="text-white font-semibold text-sm">{student.name} ({student.id})</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Amount Due</div>
                    <div className="text-cyan-300 font-bold font-mono text-base">₹{showPayModal.amount.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                {/* Step 1: Scan QR */}
                <div className="p-3.5 rounded-xl border border-dashed border-slate-700 bg-slate-950/80 flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-white">
                    <QrCode className="w-16 h-16 text-slate-900" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="text-[11px] font-mono text-cyan-400 font-semibold">1. Scan & Pay via any UPI App</div>
                    <div className="text-slate-200 font-mono text-[11px] bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      instipilot.academy@hdfcbank
                    </div>
                    <p className="text-[10px] text-slate-400">GPay, PhonePe, Paytm, BHIM or Netbanking</p>
                  </div>
                </div>

                {/* Step 2: Photo Option (Student Only) */}
                <div className="space-y-2 pt-1 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono uppercase font-semibold text-amber-400 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>2. Upload Payment Photo / Screenshot (Required)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateSampleReceipt}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-mono"
                    >
                      + Use Demo Receipt Photo
                    </button>
                  </div>

                  {proofImage ? (
                    <div className="p-3 rounded-xl border border-cyan-500/50 bg-slate-950 flex items-center gap-3">
                      <img
                        src={proofImage}
                        alt="Uploaded preview"
                        className="w-16 h-20 object-cover rounded-lg border border-slate-700"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Photo Screenshot Attached</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Ready for Owner verification in the Reconciliation Engine.</p>
                        <button
                          type="button"
                          onClick={() => setProofImage(null)}
                          className="text-[10px] text-rose-400 hover:text-rose-300 underline"
                        >
                          Remove / Change Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div className="p-4 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/60 hover:border-cyan-500/60 text-center space-y-1.5 transition-colors">
                        <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                        <div className="text-[11px] text-slate-300 font-medium">Click to upload payment screenshot from phone / PC</div>
                        <div className="text-[10px] text-slate-500 font-mono">PNG, JPG, WEBP accepted</div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Step 3: UPI Reference / UTR */}
                <div>
                  <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
                    3. UPI Reference / UTR Number (12 Digits)
                  </label>
                  <input
                    type="text"
                    required
                    value={utrRef}
                    onChange={(e) => setUtrRef(e.target.value)}
                    placeholder="e.g. UPI/HDFC/982731827419 or 471029481023"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Optional Note */}
                <div>
                  <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
                    Remarks / Sender Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Paid from father's Google Pay account"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submittingProof || !proofImage}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 disabled:opacity-50 text-white font-bold text-xs shadow-neon-amber transition-all flex items-center justify-center gap-2"
                >
                  {submittingProof ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Photo Proof...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Photo Proof for Owner Verification</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* View Submitted Proof Modal */}
      {viewingProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-command-darkest p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-display font-bold text-base">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                Submitted Payment Proof
              </div>
              <button onClick={() => setViewingProof(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Receipt Image */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-2 flex items-center justify-center max-h-[300px] overflow-hidden">
                {viewingProof.proof_image_url ? (
                  <img
                    src={viewingProof.proof_image_url}
                    alt="Receipt preview"
                    className="max-h-[280px] w-auto object-contain rounded-lg"
                  />
                ) : (
                  <span className="text-slate-500">No image record</span>
                )}
              </div>

              {/* Status Banner */}
              <div className={`p-3 rounded-xl border text-center font-mono ${
                viewingProof.status === 'verified'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : viewingProof.status === 'rejected'
                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
              }`}>
                <div className="font-bold uppercase text-xs">
                  {viewingProof.status === 'verified' ? '✓ Verified by Institute Owner' : viewingProof.status === 'rejected' ? '❌ Proof Rejected by Owner' : '⏳ Verification Pending'}
                </div>
                {viewingProof.rejection_reason && (
                  <div className="text-[11px] text-rose-200 mt-1">Reason: {viewingProof.rejection_reason}</div>
                )}
                {viewingProof.status === 'pending' && (
                  <div className="text-[10px] text-amber-400/90 mt-0.5">Awaiting Owner review in Fee Reconciliation Engine</div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount:</span>
                  <span className="text-white font-bold">₹{viewingProof.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">UTR / Ref:</span>
                  <span className="text-cyan-300 font-semibold truncate ml-2">{viewingProof.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Submitted:</span>
                  <span className="text-slate-300">{viewingProof.created_at}</span>
                </div>
              </div>

              <button
                onClick={() => setViewingProof(null)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
