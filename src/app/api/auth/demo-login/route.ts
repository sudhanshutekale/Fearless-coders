import { NextRequest, NextResponse } from 'next/server';
import { authenticateDemoUser, authenticateUserById } from '@/lib/rbac/auth';
import { UserRole } from '@/lib/rbac/permissions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, userId } = body;

    let user;
    if (userId) {
      user = authenticateUserById(userId);
    } else if (role && ['owner', 'counselor', 'trainer', 'accounts'].includes(role)) {
      user = authenticateDemoUser(role as UserRole);
    } else {
      return NextResponse.json({ error: 'Valid role or userId must be specified' }, { status: 400 });
    }

    const response = NextResponse.json({ success: true, user });
    response.cookies.set('instipilot_session', JSON.stringify(user), {
      path: '/',
      httpOnly: false, // accessible to client for fast UX updates
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
