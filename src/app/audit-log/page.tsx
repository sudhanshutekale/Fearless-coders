'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, Filter, Search, Terminal, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ role: '', action: '', status: '' });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.role) params.set('role', filters.role);
      if (filters.action) params.set('action', filters.action);
      if (filters.status) params.set('status', filters.status);
      const res = await fetch(`/api/audit-log?${params.toString()}`);
      if (res.status === 403) {
        setError('Access Denied: Audit Log is strictly restricted to Owner/Director role.');
        setLoading(false);
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs || []);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [filters]);

  if (error) {
    return (
      <div className="p-8 rounded-2xl border border-rose-500/40 bg-rose-950/20 text-center max-w-lg mx-auto space-y-3">
        <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="font-display text-lg font-bold text-white">RBAC Security Block</h3>
        <p className="text-xs text-rose-300/90 leading-relaxed">{error}</p>
        <p className="text-[11px] text-slate-400">Switch to the Owner/Director role to access the Audit Log.</p>
      </div>
    );
  }

  const statusIcon = (status: string) => {
    if (status === 'success') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (status === 'blocked') return <XCircle className="w-4 h-4 text-rose-400" />;
    if (status === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    return <Info className="w-4 h-4 text-slate-400" />;
  };

  const statusColors: Record<string, string> = {
    success: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    blocked: 'bg-rose-950 text-rose-400 border-rose-800',
    warning: 'bg-amber-950 text-amber-400 border-amber-800',
    error: 'bg-slate-800 text-slate-400 border-slate-700'
  };

  const actionLabels: Record<string, string> = {
    copilot_query: 'Copilot Query',
    copilot_blocked: 'Blocked Query',
    action_approved: 'Action Approved',
    action_rejected: 'Action Rejected',
    timetable_replan: 'Timetable Re-plan',
    login: 'Login',
    student_enrolled: 'Student Enrolled',
    create_batch: 'Batch Created',
    record_payment: 'Payment Recorded',
    system_init: 'System Init'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-rose-400 block mb-1">
            Owner-Only Security & Compliance Trail
          </span>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Immutable Audit Log
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-rose-950/60 text-rose-400 border border-rose-800">
              {logs.length} Events Loaded
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Every Copilot query, blocked attempt, approval, and system action is logged here immutably.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 rounded-2xl border border-slate-800 bg-slate-900/80">
        <select
          value={filters.role}
          onChange={(e) => setFilters({...filters, role: e.target.value})}
          className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Roles</option>
          <option value="owner">Owner</option>
          <option value="counselor">Counselor</option>
          <option value="trainer">Trainer</option>
          <option value="accounts">Accounts</option>
        </select>
        <select
          value={filters.action}
          onChange={(e) => setFilters({...filters, action: e.target.value})}
          className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Actions</option>
          <option value="copilot_query">Copilot Queries</option>
          <option value="copilot_blocked">Blocked Attempts</option>
          <option value="action_approved">Approvals</option>
          <option value="timetable_replan">Timetable Re-plans</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
          className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="blocked">Blocked</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Events', val: logs.length, color: 'text-white' },
          { label: 'Copilot Queries', val: logs.filter(l => l.action === 'copilot_query').length, color: 'text-cyan-400' },
          { label: 'Blocked Attempts', val: logs.filter(l => l.status === 'blocked').length, color: 'text-rose-400' },
          { label: 'Approvals', val: logs.filter(l => l.action === 'action_approved').length, color: 'text-emerald-400' },
        ].map((stat, i) => (
          <div key={i} className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 text-center">
            <div className={`font-display text-2xl font-bold ${stat.color}`}>{stat.val}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Log Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl overflow-hidden shadow-glass">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User / Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Query / Context</th>
                <th className="py-3 px-4">Result Summary</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-500">Loading audit records...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-500">No audit events found.</td></tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 text-[10px] whitespace-nowrap">
                      {log.timestamp ? log.timestamp.slice(0, 16).replace('T', ' ') : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-sans">{log.user_name || 'System'}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{log.role}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-sans">
                      {actionLabels[log.action] || log.action}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[10px] max-w-[220px]">
                      <div className="truncate" title={log.query}>{log.query || '-'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[10px] max-w-[200px]">
                      <div className="truncate" title={log.result_summary}>{log.result_summary || '-'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(log.status)}
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${statusColors[log.status] || statusColors.error}`}>
                          {log.status?.toUpperCase()}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
