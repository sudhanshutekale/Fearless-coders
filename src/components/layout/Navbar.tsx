'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Sparkles, 
  Command, 
  ChevronDown, 
  LogOut, 
  UserCheck, 
  CreditCard, 
  GraduationCap, 
  Crown,
  Bell,
  Search,
  Check
} from 'lucide-react';
import { UserRole, ROLE_PERMISSIONS } from '@/lib/rbac/permissions';
import { DEMO_USERS, AuthUser } from '@/lib/rbac/user-types';

interface NavbarProps {
  currentUser: AuthUser;
  onOpenCopilot: () => void;
}

export default function Navbar({ currentUser, onOpenCopilot }: NavbarProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const roleConfig = ROLE_PERMISSIONS[currentUser.role] || ROLE_PERMISSIONS.owner;

  // Handle Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenCopilot();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenCopilot]);

  const switchRole = async (targetRole: UserRole) => {
    setSwitching(true);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole }),
      });
      if (res.ok) {
        setDropdownOpen(false);
        router.refresh();
        window.location.reload();
      }
    } catch (e) {
      console.error('Failed to switch role', e);
    } finally {
      setSwitching(false);
    }
  };

  const roleIcons = {
    owner: <Crown className="w-4 h-4 text-emerald-400" />,
    counselor: <UserCheck className="w-4 h-4 text-cyan-400" />,
    trainer: <GraduationCap className="w-4 h-4 text-violet-400" />,
    accounts: <CreditCard className="w-4 h-4 text-amber-400" />
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-command-darkest/85 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-neon-cyan group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold tracking-tight bg-gradient-to-r from-white via-cyan-200 to-violet-300 bg-clip-text text-transparent">
                InstiPilot
              </span>
              <span className="text-[10px] tracking-widest uppercase text-slate-400 font-mono -mt-1">
                Ops Copilot
              </span>
            </div>
          </Link>
        </div>

        {/* Global AI Copilot Command Search Bar */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <button
            onClick={onOpenCopilot}
            className="w-full flex items-center justify-between px-3.5 py-2 text-sm rounded-lg bg-slate-900/90 border border-slate-700/70 text-slate-300 hover:border-cyan-500/60 hover:text-white transition-all shadow-inner group"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-slate-400 group-hover:text-slate-200">
                Ask Copilot anything... (e.g. Java attendance, overdue EMIs)
              </span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-800/80 rounded border border-slate-700">
              <Command className="w-3 h-3" /> K
            </kbd>
          </button>
        </div>

        {/* User Role Switcher & Profile Dropdown */}
        <div className="flex items-center gap-3">
          {/* Quick Copilot Mobile Button */}
          <button
            onClick={onOpenCopilot}
            className="md:hidden p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-900/50"
            title="Ask Copilot"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Role Badge & Switcher */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all text-left"
            >
              <div className="relative">
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                />
                <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-command-darkest"></span>
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200 leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[11px] text-cyan-400 font-mono capitalize">
                  {roleConfig.displayName}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {/* Role Switcher Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-800">
                  <div className="text-xs font-semibold text-slate-300">Quick Demo Role Switcher</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Instantly test permission isolation & Copilot responses per role
                  </div>
                </div>

                <div className="space-y-1 mt-2">
                  {(Object.keys(DEMO_USERS) as UserRole[]).map((r) => {
                    const demo = DEMO_USERS[r];
                    const isCurrent = currentUser.role === r;
                    return (
                      <button
                        key={r}
                        onClick={() => switchRole(r)}
                        disabled={switching}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                          isCurrent
                            ? 'bg-cyan-950/50 text-cyan-300 border border-cyan-500/30'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-md bg-slate-800/80 border border-slate-700/60">
                            {roleIcons[r]}
                          </div>
                          <div>
                            <div className="font-medium text-slate-200">{demo.name}</div>
                            <div className="text-[10px] text-slate-400">{ROLE_PERMISSIONS[r].displayName}</div>
                          </div>
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800 flex flex-col gap-1 px-2 text-[11px]">
                  <Link
                    href="/team"
                    onClick={() => setDropdownOpen(false)}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center justify-between py-1 font-medium"
                  >
                    <span>Manage Staff & Add Owners</span>
                    <span className="text-[10px] font-mono bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">RBAC</span>
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setDropdownOpen(false)}
                    className="text-slate-400 hover:text-white flex items-center gap-1.5 py-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Full Demo Login Page
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
