'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Layers, 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  Building, 
  Video, 
  CheckCircle, 
  AlertTriangle,
  X,
  Sparkles
} from 'lucide-react';

export default function BatchesPage() {
  const [data, setData] = useState<any>({ batches: [], courses: [], trainers: [], rooms: [] });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [clashNotification, setClashNotification] = useState<string | null>(null);

  const [newBatch, setNewBatch] = useState({
    courseId: 'c_java',
    trainerId: 't_vikram',
    roomId: 'room_1',
    name: 'Java Evening Cohort Pro 2',
    days: 'Mon,Wed,Fri',
    startTime: '14:00',
    endTime: '16:00',
    mode: 'hybrid',
    maxSeats: 30,
    onlineSeatLimit: 25
  });
  const [creating, setCreating] = useState(false);

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/batches');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setClashNotification(null);
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBatch)
      });
      const resJson = await res.json();
      if (res.ok) {
        if (resJson.clashWarning) {
          setClashNotification(resJson.clashWarning);
        }
        setShowAddModal(false);
        fetchBatches();
      } else {
        alert(resJson.error || 'Failed to create batch');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-violet-400">
              Cohorts, Labs & Capacity Allocation
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Active Batches & Cohorts
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {data.batches.length} Batches
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor room capacity constraints, hybrid online limits, and instructor assignments.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="py-2 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-medium text-xs flex items-center gap-2 shadow-neon-violet hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create New Batch
        </button>
      </div>

      {/* Clash Notification Banner if triggered */}
      {clashNotification && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/30 flex items-start justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-300">Timetable Clash Notice</div>
              <div>{clashNotification}</div>
            </div>
          </div>
          <Link
            href="/timetable"
            className="py-1 px-3 rounded-lg bg-amber-600 text-white text-[11px] font-medium hover:bg-amber-500 flex-shrink-0"
          >
            Launch Re-planner
          </Link>
        </div>
      )}

      {/* Batches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-slate-900/80 border border-slate-800 animate-pulse"></div>
          ))
        ) : (
          data.batches.map((b: any) => {
            const occupancyPct = Math.round((b.enrolled_students / b.max_seats) * 100);
            return (
              <div
                key={b.id}
                className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl hover:border-slate-700 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {b.days}
                    </span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                      b.mode === 'hybrid'
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/30'
                        : b.mode === 'online'
                        ? 'bg-violet-950 text-violet-400 border border-violet-500/30'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {b.mode}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-base text-white group-hover:text-cyan-300 transition-colors mb-1">
                    {b.name}
                  </h3>
                  <div className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
                    <span>{b.course_name}</span>
                  </div>

                  {/* Timings and Room */}
                  <div className="space-y-1.5 mb-4 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono text-[11px]">{b.start_time} - {b.end_time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[11px]">{b.room_name || 'Online Global Studio'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[11px]">Trainer: <span className="text-white font-medium">{b.trainer_name}</span></span>
                    </div>
                  </div>

                  {/* Seat Occupancy Meter */}
                  <div className="space-y-1 pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Occupancy</span>
                      <span className="text-white font-semibold">{b.enrolled_students} / {b.max_seats} ({occupancyPct}%)</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          occupancyPct > 90 ? 'bg-amber-400' : 'bg-gradient-to-r from-cyan-400 to-violet-500'
                        }`}
                        style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <Link
                    href={`/attendance?batchId=${b.id}`}
                    className="text-cyan-400 hover:text-cyan-300 text-[11px] font-medium"
                  >
                    Attendance Logs &rarr;
                  </Link>
                  <Link
                    href={`/recordings?batchId=${b.id}`}
                    className="text-violet-400 hover:text-violet-300 text-[11px] font-medium"
                  >
                    Recordings &rarr;
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Batch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-command-darkest p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-display font-bold text-base">
                <Layers className="w-4 h-4 text-violet-400" />
                Schedule New Batch
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Batch Title *</label>
                <input
                  type="text"
                  required
                  value={newBatch.name}
                  onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
                  placeholder="e.g. Advanced Java Evening Sprint"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Course *</label>
                  <select
                    value={newBatch.courseId}
                    onChange={(e) => setNewBatch({ ...newBatch, courseId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {data.courses?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Assigned Trainer *</label>
                  <select
                    value={newBatch.trainerId}
                    onChange={(e) => setNewBatch({ ...newBatch, trainerId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {data.trainers?.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Physical Room</label>
                  <select
                    value={newBatch.roomId}
                    onChange={(e) => setNewBatch({ ...newBatch, roomId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {data.rooms?.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name} (Cap: {r.capacity})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Delivery Mode *</label>
                  <select
                    value={newBatch.mode}
                    onChange={(e) => setNewBatch({ ...newBatch, mode: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="hybrid">Hybrid (Classroom + Online)</option>
                    <option value="classroom">Classroom In-Person Only</option>
                    <option value="online">Online Virtual Studio</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Days *</label>
                  <input
                    type="text"
                    required
                    value={newBatch.days}
                    onChange={(e) => setNewBatch({ ...newBatch, days: e.target.value })}
                    placeholder="Mon,Wed,Fri"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={newBatch.startTime}
                    onChange={(e) => setNewBatch({ ...newBatch, startTime: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={newBatch.endTime}
                    onChange={(e) => setNewBatch({ ...newBatch, endTime: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                Safety Guard: InstiPilot automatically evaluates trainer availability and room constraints upon submission.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-medium shadow-neon-violet hover:brightness-110"
                >
                  {creating ? 'Scheduling...' : 'Save & Allocate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
