'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  CalendarClock, 
  CreditCard, 
  UserCheck, 
  Video, 
  Send, 
  FileSpreadsheet, 
  ShieldAlert,
  FileCode2,
  Lock,
  Sparkles,
  UserCog
} from 'lucide-react';
import { UserRole, ROLE_PERMISSIONS } from '@/lib/rbac/permissions';
import { AuthUser } from '@/lib/rbac/user-types';

interface SidebarProps {
  currentUser: AuthUser;
  onOpenCopilot: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  Layers: <Layers className="w-4 h-4" />,
  CalendarClock: <CalendarClock className="w-4 h-4" />,
  CreditCard: <CreditCard className="w-4 h-4" />,
  UserCheck: <UserCheck className="w-4 h-4" />,
  Video: <Video className="w-4 h-4" />,
  Send: <Send className="w-4 h-4" />,
  FileSpreadsheet: <FileSpreadsheet className="w-4 h-4" />,
  ShieldAlert: <ShieldAlert className="w-4 h-4" />,
  FileCode2: <FileCode2 className="w-4 h-4" />,
  UserCog: <UserCog className="w-4 h-4" />
};

export default function Sidebar({ currentUser, onOpenCopilot }: SidebarProps) {
  const pathname = usePathname();
  const roleConfig = ROLE_PERMISSIONS[currentUser.role] || ROLE_PERMISSIONS.owner;

  return (
    <aside className="w-64 flex-shrink-0 hidden md:flex flex-col border-r border-slate-800/80 bg-command-darkest/95 backdrop-blur-xl h-[calc(100vh-4rem)] sticky top-16 select-none">
      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-[10px] uppercase font-mono tracking-wider text-slate-500">
          Navigation & Operations
        </div>

        {roleConfig.navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>
                {iconMap[item.icon] || <LayoutDashboard className="w-4 h-4" />}
              </span>
              <span>{item.name}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-neon-cyan"></span>
              )}
            </Link>
          );
        })}

        {/* AI Copilot Quick Callout */}
        <div className="pt-4 px-1">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-950/40 via-violet-950/20 to-slate-900 border border-cyan-500/20">
            <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              AI Ops Copilot
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
              Instant schema-aware intelligence with human approval guards.
            </p>
            <button
              onClick={onOpenCopilot}
              className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-xs font-medium hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-neon-cyan"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Launch Copilot
            </button>
          </div>
        </div>
      </div>

      {/* Role Security Footprint */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-slate-400">
            <Lock className="w-3 h-3 text-cyan-400" />
            RBAC Enforcement
          </span>
          <span className="text-[10px] font-mono text-emerald-400">ACTIVE</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px]">
          <div className="font-semibold text-slate-200">{roleConfig.displayName}</div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5" title={roleConfig.description}>
            {roleConfig.description}
          </div>
        </div>
      </div>
    </aside>
  );
}
