'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import CopilotDrawer from '../copilot/CopilotDrawer';
import { AuthUser } from '@/lib/rbac/user-types';

interface AppShellProps {
  currentUser: AuthUser;
  children: React.ReactNode;
}

export default function AppShell({ currentUser, children }: AppShellProps) {
  const pathname = usePathname();
  const [copilotOpen, setCopilotOpen] = useState(false);

  // If on login page, don't show navigation shell
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-command-darkest bg-grid-pattern text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Top Command Navbar */}
      <Navbar
        currentUser={currentUser}
        onOpenCopilot={() => setCopilotOpen(true)}
      />

      {/* Main Workspace with Sidebar & Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentUser={currentUser}
          onOpenCopilot={() => setCopilotOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Slide-in AI Operations Copilot Drawer */}
      <CopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
}
