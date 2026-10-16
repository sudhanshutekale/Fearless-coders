'use client';

import React, { useEffect, useState } from 'react';
import { 
  UserCheck, 
  Calendar, 
  Clock, 
  MapPin, 
  ShieldAlert, 
  Check, 
  X, 
  AlertCircle,
  Wifi,
  Building
} from 'lucide-react';

export default function AttendancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState('b_java_m1');
  const [selectedDate, setSelectedDate] = useState('2026-10-14');
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);

  const fetchAttendance = async () => {
    try {
      const res = await fetch(`/api/attendance?batchId=${selectedBatch}&date=${selectedDate}`);
      if (res.status === 403) {
        setError('Access Denied: Accounts role is restricted from viewing granular biometric logs.');
        setLoading(false);
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedBatch, selectedDate]);

  const handleMark = async (studentId: string, status: 'present' | 'absent' | 'late', mode: string) => {
    setUpdatingStudentId(studentId);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          batchId: selectedBatch,
          date: selectedDate,
          status,
          mode
        })
      });
      if (res.ok) {
        fetchAttendance();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStudentId(null);
    }
  };

  if (error) {
    return (
      <div className="p-8 rounded-2xl border border-rose-500/40 bg-rose-950/20 text-center max-w-lg mx-auto space-y-3">
        <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="font-display text-lg font-bold text-white">Security Block (RBAC)</h3>
        <p className="text-xs text-rose-300/90 leading-relaxed">{error}</p>
      </div>
    );
  }

  const { rows, batches } = data || {};
  const presentCount = rows?.filter((r: any) => r.attendance_status === 'present').length || 0;
  const absentCount = rows?.filter((r: any) => r.attendance_status === 'absent').length || 0;
  const lateCount = rows?.filter((r: any) => r.attendance_status === 'late').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400">
              Biometric Console & Hybrid Join Telemetry
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Attendance & Join Logs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time biometric check-in tracking with direct attendance marking.
          </p>
        </div>
      </div>

      {/* Filter and Date Bar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Select Batch</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {batches?.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Date of Session</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Attendance Summary Counters */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
            Present: <span className="font-bold">{presentCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300">
            Absent: <span className="font-bold">{absentCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-300">
            Late: <span className="font-bold">{lateCount}</span>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl overflow-hidden shadow-glass">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Enrollment Mode</th>
                <th className="py-3 px-4">Check-in Mode & Time</th>
                <th className="py-3 px-4">Biometric / SDK Location</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4 text-right">Mark / Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Loading attendance logs...
                  </td>
                </tr>
              ) : rows?.map((r: any) => {
                const status = r.attendance_status || 'unmarked';
                const isUpdating = updatingStudentId === r.student_id;

                return (
                  <tr key={r.student_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-semibold text-white">
                      {r.student_name}
                      <div className="text-[10px] font-mono text-slate-500">{r.student_phone}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 uppercase text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {r.preferred_mode}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      {r.check_in_time ? (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{r.check_in_time}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-[11px] truncate max-w-[200px]">
                      {r.ip_or_location || 'Pending sync'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        status === 'present'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : status === 'absent'
                          ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                          : status === 'late'
                          ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        <button
                          onClick={() => handleMark(r.student_id, 'present', r.checkin_mode || 'classroom')}
                          disabled={isUpdating}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${
                            status === 'present'
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-slate-800 hover:bg-emerald-950 text-slate-300 hover:text-emerald-400 border-slate-700'
                          }`}
                          title="Mark Present"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleMark(r.student_id, 'late', r.checkin_mode || 'classroom')}
                          disabled={isUpdating}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${
                            status === 'late'
                              ? 'bg-amber-600 text-white border-amber-500'
                              : 'bg-slate-800 hover:bg-amber-950 text-slate-300 hover:text-amber-400 border-slate-700'
                          }`}
                          title="Mark Late"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleMark(r.student_id, 'absent', r.checkin_mode || 'classroom')}
                          disabled={isUpdating}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${
                            status === 'absent'
                              ? 'bg-rose-600 text-white border-rose-500'
                              : 'bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border-slate-700'
                          }`}
                          title="Mark Absent"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
