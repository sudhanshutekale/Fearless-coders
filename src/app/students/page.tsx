'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Phone, 
  Mail, 
  AlertTriangle, 
  Award, 
  CheckCircle2, 
  X, 
  Download,
  Calendar,
  Building,
  GraduationCap,
  Sparkles
} from 'lucide-react';

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [filterRiskOnly, setFilterRiskOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [generatingCertId, setGeneratingCertId] = useState<string | null>(null);

  // New Student Form State
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    phone: '+91 ',
    guardianName: '',
    guardianPhone: '+91 ',
    city: 'Pune',
    college: '',
    batchId: 'b_java_m1'
  });
  const [savingStudent, setSavingStudent] = useState(false);

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedBatch) params.set('batchId', selectedBatch);

      const res = await fetch(`/api/students?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setStudents(json.students || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, selectedBatch]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStudent(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewStudent({
          name: '',
          email: '',
          phone: '+91 ',
          guardianName: '',
          guardianPhone: '+91 ',
          city: 'Pune',
          college: '',
          batchId: 'b_java_m1'
        });
        fetchStudents();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingStudent(false);
    }
  };

  const handleDownloadCertificate = async (student: any) => {
    setGeneratingCertId(student.id);
    try {
      const res = await fetch(`/api/certificates/generate?studentId=${student.id}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `InstiPilot_Certificate_${student.name.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingCertId(null);
    }
  };

  const filteredStudents = filterRiskOnly
    ? students.filter(s => s.riskScore >= 70)
    : students;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400">
              Student Directory & Academic Roster
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Students & Enrollment Roster
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {students.length} Total
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time biometric attendance, multi-factor dropout risk radar, and payment telemetry.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-medium text-xs flex items-center gap-2 shadow-neon-cyan hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" />
          Enroll New Student
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, email, phone, city..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/80 transition-colors"
            />
          </div>

          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/80"
          >
            <option value="">All Batches</option>
            <option value="b_java_m1">Java Morning (Alpha)</option>
            <option value="b_java_fast">Java Fast-Track</option>
            <option value="b_java_e1">Java Evening Pro</option>
            <option value="b_py_m2">Python Data Eng</option>
            <option value="b_mern_e2">Modern MERN</option>
            <option value="b_ai_w2">Weekend AI/ML</option>
            <option value="b_iot_m3">IoT Hardware Lab</option>
            <option value="b_dbms_w1">Database Global</option>
          </select>
        </div>

        {/* Risk Radar Filter Chip */}
        <button
          onClick={() => setFilterRiskOnly(!filterRiskOnly)}
          className={`py-2 px-3.5 rounded-xl border text-xs font-mono flex items-center gap-2 transition-all ${
            filterRiskOnly
              ? 'bg-rose-950/70 border-rose-500 text-rose-300 shadow-sm'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${filterRiskOnly ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
          High Dropout Risk Only (Score ≥ 70)
        </button>
      </div>

      {/* Students Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl overflow-hidden shadow-glass">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Student & Contact</th>
                <th className="py-3 px-4">Batch & Course</th>
                <th className="py-3 px-4">Attendance Rate</th>
                <th className="py-3 px-4">Fee / EMI Status</th>
                <th className="py-3 px-4">Dropout Risk Score</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Loading student rosters...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const attRate = st.total_attendance_sessions > 0
                    ? Math.round((st.present_sessions / st.total_attendance_sessions) * 100)
                    : 100;

                  return (
                    <tr key={st.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{st.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{st.phone}</span> &bull; <span>{st.city}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[200px]">
                          {st.email}
                        </div>
                      </td>

                      {/* Batch */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{st.batch_name}</div>
                        <div className="text-[11px] text-cyan-400/80 mt-0.5">{st.course_name}</div>
                      </td>

                      {/* Attendance */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${
                            attRate >= 80 ? 'text-emerald-400' : attRate >= 60 ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {attRate}%
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({st.present_sessions}/{st.total_attendance_sessions} classes)
                          </span>
                        </div>
                        {st.absent_sessions > 0 && (
                          <div className="text-[10px] text-rose-400/80 mt-0.5">
                            {st.absent_sessions} absences logged
                          </div>
                        )}
                      </td>

                      {/* Fee / EMI Status */}
                      <td className="py-3.5 px-4 text-xs font-mono">
                        {st.overdue_emi_count > 0 ? (
                          <div>
                            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px]">
                              {st.overdue_emi_count} Overdue (₹{st.overdue_emi_amount?.toLocaleString('en-IN')})
                            </span>
                          </div>
                        ) : st.next_emi_date ? (
                          <div className="text-slate-300 text-[11px]">
                            Next: <span className="text-amber-400">{st.next_emi_date}</span>
                          </div>
                        ) : (
                          <span className="text-emerald-400 text-[11px]">All Settled</span>
                        )}
                      </td>

                      {/* Dropout Risk Score */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                            st.riskScore >= 75
                              ? 'bg-rose-950/80 text-rose-300 border-rose-500 animate-risk-pulse'
                              : st.riskScore >= 40
                              ? 'bg-amber-950/80 text-amber-300 border-amber-500'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500'
                          }`}>
                            {st.riskScore}/100
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            {st.riskScore >= 75 ? 'Critical' : st.riskScore >= 40 ? 'Moderate' : 'Low'}
                          </span>
                        </div>
                        {st.riskReasons && st.riskReasons.length > 0 && (
                          <div className="text-[10px] text-slate-400 mt-1 max-w-[220px] truncate" title={st.riskReasons.join('; ')}>
                            {st.riskReasons[0]}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Outreach WhatsApp */}
                          <a
                            href={`https://wa.me/${st.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `Hello ${st.name}, this is from InstiPilot Academy regarding your ${st.course_name} batch. Please connect with your academic mentor for updates.`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 transition-colors"
                            title="Direct WhatsApp Outreach"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>

                          {/* Generate Certificate */}
                          <button
                            onClick={() => handleDownloadCertificate(st)}
                            disabled={generatingCertId === st.id}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-violet-600 hover:text-white text-slate-300 transition-colors"
                            title="Download Verified Course Certificate (PDF)"
                          >
                            <Award className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-command-darkest p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-display font-bold text-base">
                <Users className="w-4 h-4 text-cyan-400" />
                Enroll New Student
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    placeholder="e.g. Yash Vardhan"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    placeholder="yash@example.com"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Phone Number (WhatsApp) *</label>
                  <input
                    type="text"
                    required
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">City</label>
                  <input
                    type="text"
                    value={newStudent.city}
                    onChange={(e) => setNewStudent({ ...newStudent, city: e.target.value })}
                    placeholder="Pune"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Guardian Name</label>
                  <input
                    type="text"
                    value={newStudent.guardianName}
                    onChange={(e) => setNewStudent({ ...newStudent, guardianName: e.target.value })}
                    placeholder="Mr. Suresh Vardhan"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Guardian Phone</label>
                  <input
                    type="text"
                    value={newStudent.guardianPhone}
                    onChange={(e) => setNewStudent({ ...newStudent, guardianPhone: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Assign Initial Batch *</label>
                <select
                  value={newStudent.batchId}
                  onChange={(e) => setNewStudent({ ...newStudent, batchId: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="b_java_m1">Java Fullstack Morning (Alpha)</option>
                  <option value="b_java_fast">Java Sprint Fast-Track</option>
                  <option value="b_java_e1">Java Evening Pro</option>
                  <option value="b_py_m2">Python Data Engineering</option>
                  <option value="b_mern_e2">Modern MERN & Cloud</option>
                  <option value="b_ai_w2">Weekend AI/ML Masterclass</option>
                  <option value="b_iot_m3">Embedded Systems & IoT Lab</option>
                  <option value="b_dbms_w1">Database Engineering Global</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                Automatic workflow: InstiPilot creates a standard 2-EMI fee plan (with ₹10,000 verified down payment) and adds student to active biometric roster.
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
                  disabled={savingStudent}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-medium shadow-neon-cyan hover:brightness-110"
                >
                  {savingStudent ? 'Enrolling...' : 'Confirm Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
