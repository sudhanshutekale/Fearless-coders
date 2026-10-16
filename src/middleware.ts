import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UserRole } from '@/lib/rbac/permissions';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and internal next routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') ||
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  // Read session cookie
  const sessionCookie = request.cookies.get('instipilot_session')?.value;
  let userRole: UserRole = 'owner'; // default to owner if first visit without login

  if (sessionCookie) {
    try {
      const parsed = JSON.parse(sessionCookie);
      if (parsed && parsed.role) {
        userRole = parsed.role;
      }
    } catch {
      // ignore parse error
    }
  }

  // 1. Audit Log is strictly Owner-only
  if (pathname.startsWith('/audit-log') || pathname.startsWith('/api/audit-log')) {
    if (userRole !== 'owner') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden: Audit Log is restricted to Director/Owner role only.' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/dashboard?error=restricted_role', request.url));
    }
  }

  // 2. Fees & Reconciliation are restricted from Counselor and Trainer
  if (
    pathname.startsWith('/fees') ||
    pathname.startsWith('/reconciliation') ||
    pathname.startsWith('/api/fees') ||
    pathname.startsWith('/api/reconciliation')
  ) {
    if (userRole === 'counselor' || userRole === 'trainer') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: `Forbidden: Financial modules are restricted from ${userRole} role.` },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/dashboard?error=restricted_financials', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
