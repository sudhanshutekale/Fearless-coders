'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  ShieldCheck, 
  Crown, 
  UserCheck, 
  GraduationCap, 
  CreditCard, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  Zap,
  Activity,
  Layers
} from 'lucide-react';
import { UserRole, ROLE_PERMISSIONS } from '@/lib/rbac/permissions';
import { DEMO_USERS } from '@/lib/rbac/user-types';

export default function LoginPage() {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState<UserRole | null>(null);

  const handleQuickLogin = async (role: UserRole) => {
    setLoadingRole(role);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRole(null);
    }
  };

  const roleCards = [
    {
      role: 'owner' as UserRole,
      title: 'Director / Owner',
      name: 'Priya Sharma',
      badge: 'Unrestricted Master Admin',
      icon: <Crown className="w-5 h-5 text-emerald-400" />,
      color: 'border-emerald-500/30 hover:border-emerald-400 bg-emerald-950/20 text-emerald-400',
      description: 'Complete visibility across finances, batch scheduling, student retention, outbox dispatch, and security audit trails.',
      permissions: ['All 17 SQLite tables accessible', 'Timetable Re-plan & Clash Resolution', 'Full Fee Collections & Audit Log']
    },
    {
      role: 'counselor' as UserRole,
      title: 'Academic Counselor',
      name: 'Rajesh Rao',
      badge: 'Student Success & Retention',
      icon: <UserCheck className="w-5 h-5 text-cyan-400" />,
      color: 'border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/20 text-cyan-400',
      description: 'Attendance tracking, dropout risk radar, class recordings, and drafting human-approved WhatsApp alerts to parents.',
      permissions: ['Students & Batch Attendance', 'WhatsApp Outreach Drafting', 'Strict Zero-Access to Payments & Banking']
    },
    {
      role: 'trainer' as UserRole,
      title: 'Lead Technical Trainer',
      name: 'Vikram Malhotra',
      badge: 'Curriculum & Delivery',
      icon: <GraduationCap className="w-5 h-5 text-violet-400" />,
      color: 'border-violet-500/30 hover:border-violet-400 bg-violet-950/20 text-violet-400',
      description: 'Daily timetable, lecture recordings, classroom/online attendance check-ins, and assignment evaluations.',
      permissions: ['Assigned Batches & Students', 'Mark Attendance & Upload Recordings', 'Never Sees Fees, EMIs or Collections']
    },
    {
      role: 'accounts' as UserRole,
      title: 'Accounts & Finance Manager',
      name: 'Neha Joshi',
      badge: 'Fee Collections & EMI Engine',
      icon: <CreditCard className="w-5 h-5 text-amber-400" />,
      color: 'border-amber-500/30 hover:border-amber-400 bg-amber-950/20 text-amber-400',
      description: 'Fee installments, overdue EMI alerts, UPI/Bank CSV reconciliation, payment receipts, and collection reminders.',
      permissions: ['Fee Plans, EMIs & Payments', 'Bank Statement CSV Auto-Matcher', 'No Biometric/Internal Attendance Logs']
    }
  ];

  return (
    <div className="min-h-screen bg-command-darkest bg-grid-pattern relative flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-cyan-500/15 via-violet-600/10 to-transparent blur-3xl pointer-events-none"></div>

      {/* Top Bar */}
      <header className="relative z-10 w-full border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-neon-cyan">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-white flex items-center gap-2">
              InstiPilot
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                PRO v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-400">Autonomous Institute Operations & AI Copilot</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Zero-Trust RBAC + AST Guard
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/60 text-xs text-cyan-300 mb-4 shadow-inner">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            Training Institute Operations Reimagined
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4 leading-tight">
            Stop running your institute on <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400 bg-clip-text text-transparent">
              spreadsheets, WhatsApp & memory.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            InstiPilot orchestrates batches, hybrid attendance, EMI installments, and timetable clashes in real-time — with an AI Operations Copilot that turns complex multi-table queries into verified actions.
          </p>
        </div>

        {/* 4 Demo Roles Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Select a Role for Instant 1-Click Demo Evaluation
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              No credentials needed &bull; Complete sandbox pre-seeded
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roleCards.map((rc) => {
              const isLoading = loadingRole === rc.role;
              return (
                <div
                  key={rc.role}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-xl transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/95 hover:shadow-xl hover:-translate-y-1"
                >
                  <div>
                    {/* Header with Icon and Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/60 group-hover:scale-105 transition-transform">
                        {rc.icon}
                      </div>
                      <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border ${rc.color}`}>
                        {rc.role.toUpperCase()}
                      </span>
                    </div>

                    <h4 className="font-display text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {rc.title}
                    </h4>
                    <p className="text-xs font-medium text-slate-400 mb-3">{rc.name}</p>
                    <p className="text-xs text-slate-300/80 leading-relaxed mb-4">
                      {rc.description}
                    </p>

                    {/* Key Capabilities */}
                    <div className="space-y-1.5 mb-5 border-t border-slate-800/80 pt-3">
                      {rc.permissions.map((p, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400/80 mt-0.5 flex-shrink-0" />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 1-Click Login CTA */}
                  <button
                    onClick={() => handleQuickLogin(rc.role)}
                    disabled={isLoading}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-cyan-500 hover:text-black text-slate-200 font-medium text-xs transition-all flex items-center justify-center gap-2 group-hover:bg-cyan-500 group-hover:text-black shadow-md"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                        Authenticating...
                      </span>
                    ) : (
                      <>
                        <span>Enter as {rc.role}</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Safety Callout Strip */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-200">Strict Server-Enforced RBAC</div>
              <div className="text-[11px] text-slate-400">
                Trainers can never access fees. Accounts can never access attendance logs. Enforced via DB AST validation.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">
              MOCK_LLM: Enabled
            </span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400">
              DB: better-sqlite3 WAL
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-slate-800/80 px-6 py-4 text-center text-xs text-slate-500">
        InstiPilot &bull; PS1: Institute Operations Copilot &bull; Built with Next.js 14, SQLite, Gemini AI & Recharts
      </footer>
    </div>
  );
}
