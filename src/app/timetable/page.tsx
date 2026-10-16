'use client';

import React, { useEffect, useState } from 'react';
import { 
  CalendarClock, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  X, 
  RefreshCw,
  Sparkles,
  User,
  Building,
  Clock,
  Layers
} from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const COURSE_COLORS: Record<string, string> = {
  'c_java': 'from-orange-500/30 to-amber-500/20 border-orange-500/40 text-orange-300',
  'c_pydata': 'from-blue-500/30 to-cyan-500/20 border-blue-500/40 text-blue-300',
  'c_mern': 'from-cyan-500/30 to-sky-500/20 border-cyan-500/40 text-cyan-300',
  'c_aiml': 'from-violet-500/30 to-purple-500/20 border-violet-500/40 text-violet-300',
  'c_iot': 'from-rose-500/30 to-pink-500/20 border-rose-500/40 text-rose-300',
  'c_dbms': 'from-emerald-500/30 to-teal-500/20 border-emerald-500/40 text-emerald-300',
};

const DEFAULT_COLOR = 'from-slate-500/30 to-slate-600/20 border-slate-500/40 text-slate-300';

export default function TimetablePage() {
  const [data, setData] = useState<any>({ slots: [], trainers: [], rooms: [] });
  const [loading, setLoading] = useState(true);
  const [filterTrainer, setFilterTrainer] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [showUnavailModal, setShowUnavailModal] = useState(false);
  const [replanResult, setReplanResult] = useState<any>(null);
  const [replanning, setReplanning] = useState(false);

  const [unavailForm, setUnavailForm] = useState({
    trainerId: 't_vikram',
    day: 'Mon',
    startTime: '08:00',
    endTime: '10:00'
  });

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTrainer) params.set('trainerId', filterTrainer);
      if (filterRoom) params.set('roomId', filterRoom);
      const res = await fetch(`/api/timetable?${params.toString()}`);
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
    fetchTimetable();
  }, [filterTrainer, filterRoom]);

  const handleReplan = async (e: React.FormEvent) => {
    e.preventDefault();
    setReplanning(true);
    setReplanResult(null);
    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_unavailable', ...unavailForm })
      });
      if (res.ok) {
        const result = await res.json();
        setReplanResult(result);
        fetchTimetable();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReplanning(false);
    }
  };

  // Build a grid: days × time-blocks
  const slotsByDay: Record<string, any[]> = {};
  for (const day of DAYS) {
    slotsByDay[day] = data.slots.filter((s: any) => s.day_of_week === day);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-violet-400 block mb-1">
            Clash-Free Constraint Scheduler
          </span>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Weekly Timetable Grid
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Greedy backtracking solver enforces no trainer clashes, no room clashes, and respects capacity.
          </p>
        </div>
        <button
          onClick={() => { setShowUnavailModal(true); setReplanResult(null); }}
          className="py-2 px-4 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-2 transition-all shadow-md"
        >
          <X className="w-4 h-4" />
          Mark Trainer Unavailable & Re-Plan
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center p-4 rounded-2xl border border-slate-800 bg-slate-900/80">
        <select
          value={filterTrainer}
          onChange={(e) => setFilterTrainer(e.target.value)}
          className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Trainers</option>
          {data.trainers?.map((t: any) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={filterRoom}
          onChange={(e) => setFilterRoom(e.target.value)}
          className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Rooms</option>
          {data.rooms?.map((r: any) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <button
          onClick={fetchTimetable}
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[11px] font-mono">
        {Object.entries({
          'Java Fullstack': 'c_java',
          'Python Data Eng': 'c_pydata',
          'MERN Stack': 'c_mern',
          'AI / ML': 'c_aiml',
          'IoT & Embedded': 'c_iot',
          'Database Eng': 'c_dbms',
        }).map(([label, key]) => (
          <span key={key} className={`px-2.5 py-1 rounded-lg bg-gradient-to-r border ${COURSE_COLORS[key]}`}>
            {label}
          </span>
        ))}
      </div>

      {/* Weekly Grid */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl overflow-x-auto shadow-glass">
        <div className="grid grid-cols-7 min-w-[900px]">
          {DAYS.map((day) => (
            <div key={day} className="border-r border-slate-800 last:border-r-0">
              {/* Day header */}
              <div className="text-center py-2.5 border-b border-slate-800 bg-slate-950/70 text-xs font-mono uppercase text-slate-400 tracking-wider">
                {day}
              </div>

              {/* Slots for this day */}
              <div className="p-2 space-y-2 min-h-[280px]">
                {loading ? (
                  <div className="space-y-1.5 animate-pulse">
                    {[1, 2].map(i => (
                      <div key={i} className="h-16 bg-slate-800/60 rounded-xl"></div>
                    ))}
                  </div>
                ) : slotsByDay[day].length === 0 ? (
                  <div className="h-16 flex items-center justify-center text-[11px] text-slate-600 font-mono">
                    No sessions
                  </div>
                ) : (
                  slotsByDay[day].map((slot: any) => {
                    const color = COURSE_COLORS[slot.course_id] || DEFAULT_COLOR;
                    return (
                      <div
                        key={slot.id}
                        className={`p-2.5 rounded-xl bg-gradient-to-br border text-[11px] hover:brightness-110 transition-all ${color}`}
                      >
                        <div className="font-semibold text-xs leading-tight mb-1 text-white">{slot.batch_name}</div>
                        <div className="flex items-center gap-1 text-[10px] opacity-80">
                          <Clock className="w-2.5 h-2.5" />
                          {slot.start_time}–{slot.end_time}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] opacity-80 mt-0.5">
                          <User className="w-2.5 h-2.5" />
                          {slot.trainer_name}
                        </div>
                        {slot.room_name && (
                          <div className="flex items-center gap-1 text-[10px] opacity-70 mt-0.5">
                            <Building className="w-2.5 h-2.5" />
                            {slot.room_name}
                          </div>
                        )}
                        <div className="text-[9px] mt-1 opacity-60 font-mono uppercase">
                          {slot.mode}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unavailable Modal */}
      {showUnavailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-command-darkest p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-display font-bold text-base">
                <X className="w-4 h-4 text-rose-400" />
                Mark Trainer Unavailable
              </div>
              <button onClick={() => setShowUnavailModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!replanResult ? (
              <form onSubmit={handleReplan} className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-[11px]">
                  Marking a trainer unavailable will trigger the constraint-based re-planner. All affected sessions in the selected window will be reassigned to a qualified, clash-free alternative trainer and room.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Trainer *</label>
                    <select
                      value={unavailForm.trainerId}
                      onChange={(e) => setUnavailForm({ ...unavailForm, trainerId: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    >
                      {data.trainers?.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Day *</label>
                    <select
                      value={unavailForm.day}
                      onChange={(e) => setUnavailForm({ ...unavailForm, day: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    >
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">From Time *</label>
                    <input
                      type="time"
                      value={unavailForm.startTime}
                      onChange={(e) => setUnavailForm({ ...unavailForm, startTime: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Until Time *</label>
                    <input
                      type="time"
                      value={unavailForm.endTime}
                      onChange={(e) => setUnavailForm({ ...unavailForm, endTime: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setShowUnavailModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={replanning}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium flex items-center gap-2"
                  >
                    {replanning ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                        Re-Planning...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Trigger Re-Plan
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Re-plan Results & Diff Explanation */
              <div className="space-y-4 text-xs">
                <div className={`p-3 rounded-xl border ${
                  replanResult.changes?.some((c: any) => c.action === 'reassigned')
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                }`}>
                  <div className="font-semibold mb-0.5">Re-Plan Complete</div>
                  <div className="text-[11px] opacity-90">{replanResult.message}</div>
                </div>

                <div>
                  <div className="text-[11px] font-mono uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Changes Explanation (Audit Trail)
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {replanResult.changes?.map((ch: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{ch.batchName}</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            ch.action === 'reassigned'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : 'bg-amber-950 text-amber-400 border-amber-800'
                          }`}>
                            {ch.action === 'reassigned' ? 'REASSIGNED' : 'UNRESOLVED'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                          <span>{ch.originalDay} {ch.originalStart}–{ch.originalEnd}</span>
                          {ch.newTrainer && (
                            <>
                              <ArrowRight className="w-3 h-3 text-cyan-400" />
                              <span className="text-cyan-300">→ {ch.newTrainer}</span>
                            </>
                          )}
                        </div>
                        {ch.reason && (
                          <div className="text-[11px] text-slate-400 italic">{ch.reason}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => { setShowUnavailModal(false); setReplanResult(null); }}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => setReplanResult(null)}
                    className="px-4 py-2 rounded-xl bg-rose-600/60 text-rose-200 hover:bg-rose-600"
                  >
                    Re-Plan Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
